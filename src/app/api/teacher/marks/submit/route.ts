/**
 * Teacher Marks Submit API Route
 * Requirements: 6.3 - Final submission with administration notification
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, NotificationType } from '@/types/enums'
import { systemStateService } from '@/services/system-state.service'
import { auditService } from '@/services/audit.service'
import { inAppNotificationService } from '@/services/in-app-notification.service'

/**
 * POST /api/teacher/marks/submit
 * Submit final marks and notify administration
 * Requirements: 6.3 - Lock marks and notify administration on final submission
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { examId, subjectId, classId } = body

    if (!examId || !subjectId || !classId) {
      return NextResponse.json(
        { error: 'Missing required fields: examId, subjectId, classId' },
        { status: 400 }
      )
    }

    // Get teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Validate teacher assignment
    if (!teacher.assignedClassIds.includes(classId)) {
      return NextResponse.json(
        { error: 'You are not assigned to this class' },
        { status: 403 }
      )
    }

    if (!teacher.assignedSubjectIds.includes(subjectId)) {
      return NextResponse.json(
        { error: 'You are not assigned to this subject' },
        { status: 403 }
      )
    }

    // Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        term: true,
      },
    })

    if (!exam || exam.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    // Check if exam is open
    if (!exam.isOpen) {
      return NextResponse.json(
        { error: 'This exam is closed for marks entry' },
        { status: 403 }
      )
    }

    // Check term active status
    const today = new Date()
    const isTermActive = exam.term.startDate <= today && exam.term.endDate >= today
    if (!isTermActive) {
      return NextResponse.json(
        { error: 'The term has ended. Marks cannot be submitted.' },
        { status: 403 }
      )
    }

    // Check if results are published
    const isPublished = await systemStateService.areResultsPublished(exam.termId)
    if (isPublished) {
      return NextResponse.json(
        { error: 'Results have been published. Marks cannot be modified.' },
        { status: 403 }
      )
    }

    // Get class and subject details for notification
    const [classData, subjectData] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { name: true },
      }),
      prisma.subject.findUnique({
        where: { id: subjectId },
        select: { name: true },
      }),
    ])

    // Get staff record for audit logging
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: { id: true },
    })

    const teacherId = staff?.id || teacher.id
    const teacherName = `${teacher.firstName} ${teacher.lastName}`

    // Log the submission to audit
    await auditService.log({
      schoolId,
      userId: session.user.id,
      action: 'create',
      resource: 'mark',
      resourceId: `submission-${examId}-${subjectId}-${classId}`,
      newValue: {
        examId,
        examName: exam.name,
        subjectId,
        subjectName: subjectData?.name,
        classId,
        className: classData?.name,
        teacherId,
        teacherName,
        submittedAt: new Date().toISOString(),
        action: 'MARKS_SUBMITTED',
      },
    })

    // Create notification for administration
    // Find school admins to notify
    const schoolAdmins = await prisma.staff.findMany({
      where: {
        schoolId,
        role: { in: ['SCHOOL_ADMIN', 'DEPUTY', 'DOS'] },
      },
      select: {
        userId: true,
      },
    })

    // Create in-app notifications for admins using the notification service
    const notificationPromises = schoolAdmins.map(admin =>
      inAppNotificationService.createNotification({
        userId: admin.userId,
        schoolId,
        type: NotificationType.TASK,
        title: 'Marks Submitted',
        content: `${teacherName} has submitted marks for ${subjectData?.name || 'a subject'} - ${classData?.name || 'a class'} (${exam.name})`,
        metadata: {
          examId,
          subjectId,
          classId,
          teacherId,
        },
      }).catch(err => {
        // Log error but don't fail the submission
        console.error('Failed to create notification:', err)
        return null
      })
    )

    await Promise.all(notificationPromises)

    return NextResponse.json({
      success: true,
      message: 'Marks submitted successfully. Administration has been notified.',
      submittedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error submitting marks:', error)
    return NextResponse.json(
      { error: 'Failed to submit marks' },
      { status: 500 }
    )
  }
}
