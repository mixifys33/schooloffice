/**
 * Teacher Messages History API Route
 * GET /api/teacher/messages/history - Get message history for teacher
 * Requirement 8.8: Show only messages sent by logged-in teacher
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as { id?: string }).id
    const schoolId = (session.user as { schoolId?: string }).schoolId

    if (!userId || !schoolId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        userId,
        schoolId,
      },
      select: {
        id: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Requirement 8.8: Get only messages sent by this teacher
    // Query notifications where metadata contains this teacher as sender
    const notifications = await prisma.inAppNotification.findMany({
      where: {
        schoolId,
        type: 'MESSAGE',
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
      skip: offset,
    })

    // Filter to only messages sent by this teacher (check metadata)
    const teacherMessages = notifications.filter((notif) => {
      const metadata = notif.metadata as { senderId?: string } | null
      return metadata?.senderId === teacher.id
    })

    // Get recipient names
    const messages = await Promise.all(
      teacherMessages.map(async (notif) => {
        const metadata = notif.metadata as {
          recipientType?: string
          recipientId?: string
          senderName?: string
        } | null
        
        let recipientName = 'Unknown'
        const recipientType = metadata?.recipientType || 'student'
        const recipientId = metadata?.recipientId

        if (recipientId) {
          if (recipientType === 'student') {
            const student = await prisma.student.findUnique({
              where: { id: recipientId },
              select: { firstName: true, lastName: true },
            })
            if (student) {
              recipientName = `${student.firstName} ${student.lastName}`
            }
          } else if (recipientType === 'parent') {
            const guardian = await prisma.guardian.findUnique({
              where: { id: recipientId },
              select: { firstName: true, lastName: true },
            })
            if (guardian) {
              recipientName = `${guardian.firstName} ${guardian.lastName}`
            }
          }
        }

        return {
          id: notif.id,
          content: notif.content,
          recipientName,
          recipientType: recipientType as 'student' | 'parent',
          sentAt: notif.createdAt.toISOString(),
          status: notif.readAt ? 'delivered' : 'sent',
        }
      })
    )

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching message history:', error)
    return NextResponse.json({ error: 'Failed to load message history' }, { status: 500 })
  }
}
