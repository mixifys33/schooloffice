import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

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

    // Get current term
    const today = new Date()
    const currentYear = new Date().getFullYear()
    
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: session.user.schoolId,
        isCurrent: true
      }
    })

    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId: session.user.schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      return NextResponse.json(
        { error: 'No academic year found' },
        { status: 400 }
      )
    }

    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'No current term found' },
        { status: 400 }
      )
    }

    // Get fee structures
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        schoolId: session.user.schoolId,
        termId: currentTerm.id,
        isActive: true
      }
    })

    let sentCount = 0
    const errors: string[] = []

    // Send reminders to each student's guardians
    for (const student of students) {
      try {
        // Get primary guardian
        const primaryGuardian = student.studentGuardians.find(sg => sg.isPrimary)?.guardian

        if (!primaryGuardian?.phone) {
          errors.push(`${student.firstName} ${student.lastName}: No guardian phone number`)
          continue
        }

        // Calculate balance
        const feeStructure = feeStructures.find(fs => 
          fs.classId === student.classId && 
          fs.studentType === 'DAY'
        )

        const expectedFee = feeStructure?.totalAmount || 0
        
        const payments = await prisma.payment.findMany({
          where: {
            studentId: student.id,
            termId: currentTerm.id,
            status: 'CONFIRMED'
          }
        })

        const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0)
        const balance = expectedFee - paidAmount

        if (balance <= 0) {
          continue // Skip if already paid
        }

        // Create message record
        const message = await prisma.message.create({
          data: {
            schoolId: session.user.schoolId,
            recipientType: 'GUARDIAN',
            recipientId: primaryGuardian.id,
            phoneNumber: primaryGuardian.phone,
            content: `Dear ${primaryGuardian.firstName || 'Parent/Guardian'}, this is a reminder that ${student.firstName} ${student.lastName} (${student.class.name}) has an outstanding fee balance of UGX ${balance.toLocaleString()} for ${currentTerm.name}. Please make payment at your earliest convenience. Thank you.`,
            status: 'PENDING',
            templateType: 'PAYMENT_REMINDER',
            sentBy: session.user.id!
          }
        })

        sentCount++
      } catch (err) {
        console.error(`Error sending reminder for student ${student.id}:`, err)
        errors.push(`${student.firstName} ${student.lastName}: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      total: students.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully queued ${sentCount} payment reminder${sentCount !== 1 ? 's' : ''}`
    })
  } catch (error) {
    console.error('Error sending reminders:', error)
    return NextResponse.json(
      { error: 'Failed to send reminders' },
      { status: 500 }
    )
  }
}
