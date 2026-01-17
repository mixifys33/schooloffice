/**
 * Teacher Marks Entry API Route
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 6.7
 * - Validate teacher subject assignment
 * - Check term active status and publication state
 * - Support draft save and final submission
 * - Lock marks after results publication
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'
import { systemStateService } from '@/services/system-state.service'
import { examinationService } from '@/services/examination.service'
import { auditService } from '@/services/audit.service'

/**
 * GET /api/teacher/marks
 * Returns marks data for a specific class, subject, and exam
 * Requirements: 6.1, 6.4, 6.6 - Display only students in assigned class, show read-only after publication
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const subjectId = searchParams.get('subjectId')
    const examId = searchParams.get('examId')

    if (!classId || !subjectId || !examId) {
      return NextResponse.json(
        { error: 'Missing required parameters: classId, subjectId, examId' },
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

    // Requirements: 6.1 - Validate teacher is assigned to class and subject
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
        term: {
          include: {
            academicYear: true,
          },
        },
      },
    })

    if (!exam || exam.schoolId !== schoolId) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      )
    }

    // Get class and subject details
    const [classData, subjectData] = await Promise.all([
      prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true },
      }),
      prisma.subject.findUnique({
        where: { id: subjectId },
        select: { id: true, name: true },
      }),
    ])

    if (!classData || !subjectData) {
      return NextResponse.json(
        { error: 'Class or subject not found' },
        { status: 404 }
      )
    }


    // Check term active status
    const today = new Date()
    const isTermActive = exam.term.startDate <= today && exam.term.endDate >= today

    // Requirements: 6.4 - Check if results are published
    const isPublished = await systemStateService.areResultsPublished(exam.termId)

    // Determine if editing is allowed
    // Requirements: 6.2, 6.4 - Allow edits while term active and results unpublished
    const canEdit = exam.isOpen && isTermActive && !isPublished

    // Build lock message
    let lockMessage: string | null = null
    if (isPublished) {
      // Requirements: 6.5 - Display lock message when attempting edit after publication
      lockMessage = 'Results have been published. Marks cannot be modified.'
    } else if (!exam.isOpen) {
      lockMessage = 'This exam is closed for marks entry.'
    } else if (!isTermActive) {
      lockMessage = 'The term has ended. Marks cannot be modified.'
    }

    // Get students in the class
    // Requirements: 6.1 - Display only students in assigned class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: StudentStatus.ACTIVE,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    })

    // Get existing marks for this exam, subject, and class students
    // Requirements: 6.6 - Only show marks entered by this teacher
    const existingMarks = await prisma.mark.findMany({
      where: {
        examId,
        subjectId,
        studentId: { in: students.map(s => s.id) },
        enteredBy: teacher.id, // Only show marks entered by this teacher
      },
    })

    const marksMap = new Map(existingMarks.map(m => [m.studentId, m]))

    // Get default max score (from existing marks or default to 100)
    const maxScore = existingMarks.length > 0 ? existingMarks[0].maxScore : 100

    // Check if marks have been submitted (not draft)
    const submittedMark = existingMarks.find(m => m.enteredAt !== null)
    const submittedAt = submittedMark?.enteredAt?.toISOString() || null

    // Build student marks data
    const studentMarks = students.map(student => {
      const mark = marksMap.get(student.id)
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        score: mark?.score ?? null,
        maxScore: mark?.maxScore ?? maxScore,
        grade: mark?.grade ?? null,
        isDraft: mark ? false : true, // If mark exists, it's saved
      }
    })

    return NextResponse.json({
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        isOpen: exam.isOpen,
      },
      subject: {
        id: subjectData.id,
        name: subjectData.name,
      },
      class: {
        id: classData.id,
        name: classData.name,
        streamName: null,
      },
      students: studentMarks,
      maxScore,
      isPublished,
      isTermActive,
      canEdit,
      lockMessage,
      hasUnsavedChanges: false,
      submittedAt,
    })
  } catch (error) {
    console.error('Error fetching marks data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch marks data' },
      { status: 500 }
    )
  }
}


/**
 * POST /api/teacher/marks
 * Save marks for students
 * Requirements: 6.2, 6.3, 6.4 - Support draft save and final submission, lock after publication
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
    const { examId, subjectId, classId, marks, isDraft } = body

    if (!examId || !subjectId || !classId || !marks || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: 'Missing required fields: examId, subjectId, classId, marks' },
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
        { error: 'The term has ended. Marks cannot be modified.' },
        { status: 403 }
      )
    }

    // Requirements: 6.4 - Check if results are published
    const isPublished = await systemStateService.areResultsPublished(exam.termId)
    if (isPublished) {
      return NextResponse.json(
        { error: 'Results have been published. Marks cannot be modified.' },
        { status: 403 }
      )
    }

    // Get staff record for audit logging
    const staff = await prisma.staff.findFirst({
      where: {
        userId: session.user.id,
        schoolId,
      },
      select: { id: true },
    })

    const enteredBy = staff?.id || teacher.id
    const now = new Date()

    // Process marks
    const savedMarks = []
    const errors = []

    for (const markEntry of marks) {
      const { studentId, score, maxScore } = markEntry

      // Skip if score is null (not entered)
      if (score === null || score === undefined) {
        continue
      }

      // Validate score
      if (score < 0 || score > maxScore) {
        errors.push({
          studentId,
          error: `Score must be between 0 and ${maxScore}`,
        })
        continue
      }

      // Verify student belongs to the class
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, classId: true, schoolId: true },
      })

      if (!student || student.classId !== classId) {
        errors.push({
          studentId,
          error: 'Student not found in this class',
        })
        continue
      }

      try {
        // Calculate grade
        const grade = await examinationService.calculateGrade(subjectId, score, maxScore)

        // Upsert mark
        const mark = await prisma.mark.upsert({
          where: {
            examId_studentId_subjectId: {
              examId,
              studentId,
              subjectId,
            },
          },
          update: {
            score,
            maxScore,
            grade,
            enteredBy,
            enteredAt: now,
          },
          create: {
            examId,
            studentId,
            subjectId,
            score,
            maxScore,
            grade,
            enteredBy,
            enteredAt: now,
          },
        })

        savedMarks.push(mark)

        // Log audit entry
        await auditService.logMarksEntry({
          schoolId,
          teacherId: enteredBy,
          examId,
          studentId,
          subjectId,
          newScore: score,
          maxScore,
          newGrade: grade,
        })
      } catch (err) {
        errors.push({
          studentId,
          error: err instanceof Error ? err.message : 'Failed to save mark',
        })
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: savedMarks.length,
      errors: errors.length > 0 ? errors : undefined,
      isDraft,
    })
  } catch (error) {
    console.error('Error saving marks:', error)
    return NextResponse.json(
      { error: 'Failed to save marks' },
      { status: 500 }
    )
  }
}
