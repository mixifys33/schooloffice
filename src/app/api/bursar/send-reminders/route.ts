import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { smsSendingService } from '@/services/sms-sending.service'
import { isCooldownActive, getRemainingCooldown, validateTimestamp } from '@/lib/cooldown-utils'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentIds } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Student IDs are required' },
        { status: 400 }
      )
    }

    // Check cooldown status
    const school = await prisma.school.findUnique({
      where: { id: session.user.schoolId },
      select: { lastReminderSent: true }
    })

    const validatedTimestamp = validateTimestamp(school?.lastReminderSent || null)

    if (isCooldownActive(validatedTimestamp)) {
      const remaining = getRemainingCooldown(validatedTimestamp!)
      return NextResponse.json(
        {
          error: `Cooldown period active. Next reminders available in ${remaining.days} day${remaining.days !== 1 ? 's' : ''}, ${remaining.hours} hour${remaining.hours !== 1 ? 's' : ''}`,
          remainingDays: remaining.days,
          remainingHours: remaining.hours,
          nextAvailableAt: remaining.nextAvailableAt.toISOString()
        },
        { status: 429 }
      )
    }

    // Get students with their guardians
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: session.user.schoolId,
        status: 'ACTIVE'
      },
      include: {
        class: true,
        studentGuardians: {
          include: {
            guardian: true
          }
        }
      }
    })

    if (students.length === 0) {
      return NextResponse.json(
        { error: 'No students found' },
        { status: 404 }
      )
    }

    // Call SMS sending service to send actual SMS messages
    const sendResult = await smsSendingService.sendFeesReminders(
      session.user.schoolId,
      session.user.id,
      session.user.role as string,
      { studentIds }
    )

    // Update lastReminderSent timestamp only if SMS send was successful
    if (sendResult.success && sendResult.sentCount > 0) {
      await prisma.school.update({
        where: { id: session.user.schoolId },
        data: { lastReminderSent: new Date() }
      })
    }

    const now = new Date()

    return NextResponse.json({
      success: sendResult.success,
      sent: sendResult.sentCount,
      failed: sendResult.failedCount,
      total: sendResult.totalRecipients,
      errors: sendResult.errors.length > 0 ? sendResult.errors : undefined,
      message: `Successfully sent ${sendResult.sentCount} payment reminder${sendResult.sentCount !== 1 ? 's' : ''}`,
      lastReminderSent: now.toISOString()
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
