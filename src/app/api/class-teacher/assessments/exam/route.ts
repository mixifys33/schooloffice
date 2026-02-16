/**
 * Class Teacher Exam Entry API Route
 * Returns exam entry data for a specific class and subject
 * 
 * Requirements: Class teacher exam entry management
 * - Display exam entry form with student list
 * - Support exam score entry (80% of final grade)
 * - Handle draft and final submission
 * - Calculate and display grades based on grading system
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole, StudentStatus } from '@/types/enums'
import { calculateGradeSync, getGradingSystem } from '@/lib/grading'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/assessments/exam - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/class-teacher/assessments/exam - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access exam entry'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/class-teacher/assessments/exam - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school. Please contact support.'
        },
        { status: 400 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const subjectId = searchParams.get('subjectId')

    if (!classId || !subjectId) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          details: 'Both classId and subjectId are required'
        },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        primaryRole: true,
        secondaryRoles: true,
        status: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { 
          error: 'No staff profile found',
          details: 'Your staff profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isClassTeacher = userRole === Role.TEACHER || 
                           staff.primaryRole === StaffRole.CLASS_TEACHER ||
                           (staff.secondaryRoles as string[] || []).includes(StaffRole.CLASS_TEACHER)
    
    if (!isClassTeacher && !isAdmin) {
      console.log('❌ [API] /api/class-teacher/assessments/exam - Invalid role:', userRole, 'Staff role:', staff.primaryRole)
      return NextResponse.json(
        { 
          error: 'Access denied. Class teacher role required.',
          details: `Current role: ${userRole}. Class teacher access required.`
        },
        { status: 403 }
      )
    }

    // Verify teacher has access to this class and subject
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: classId,
        subjectId: subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: classId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to access this class and subject.'
        },
        { status: 403 }
      )
    }

    // Get current term based on today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No current academic term is active. Please contact your school administrator.'
        },
        { status: 400 }
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
        select: { id: true, name: true, code: true },
      }),
    ])

    if (!classData || !subjectData) {
      return NextResponse.json(
        { 
          error: 'Class or subject not found',
          details: 'The specified class or subject could not be found.'
        },
        { status: 404 }
      )
    }

    // Get students in the class
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

    // Get existing exam entries for this term, class, and subject
    const examEntries = await prisma.examEntry.findMany({
      where: {
        termId: currentTerm.id,
        subjectId: subjectId,
        studentId: { in: students.map(s => s.id) },
      },
      select: {
        id: true,
        studentId: true,
        examScore: true,
        maxScore: true,
        status: true,
        examDate: true,
      },
    })

    const examEntriesMap = new Map(examEntries.map(e => [e.studentId, e]))
    
    // Get a sample exam entry ID (if any exist) to use for auto-save
    // If no entries exist yet, we'll use a placeholder that the frontend will detect
    const sampleExamEntryId = examEntries.length > 0 ? examEntries[0].id : 'pending'

    // Check term active status
    // Note: today is already declared above when finding current term
    const termStart = new Date(currentTerm.startDate)
    termStart.setHours(0, 0, 0, 0)
    const termEnd = new Date(currentTerm.endDate)
    termEnd.setHours(23, 59, 59, 999) // Set to end of day
    const isTermActive = today >= termStart && today <= termEnd

    // For now, assume not published (you can add publication check later)
    const isPublished = false

    // Determine if editing is allowed
    const canEdit = isTermActive && !isPublished

    // Build lock message with accurate status
    let lockMessage: string | null = null
    if (isPublished) {
      lockMessage = 'Results have been published. Scores cannot be modified.'
    } else if (!isTermActive) {
      if (today < termStart) {
        lockMessage = `The term has not started yet (starts ${termStart.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })}). Scores cannot be entered until the term begins.`
      } else {
        lockMessage = `The term has ended (ended ${termEnd.toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' })}). Scores cannot be modified.`
      }
    }

    // Check if any scores have been submitted
    const hasSubmittedScores = examEntries.some(e => e.status === 'SUBMITTED' || e.status === 'APPROVED')
    const submittedAt = hasSubmittedScores ? examEntries.find(e => e.status === 'SUBMITTED' || e.status === 'APPROVED')?.examDate : null

    // Build student scores data
    const studentScores = students.map(student => {
      const examEntry = examEntriesMap.get(student.id)
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        score: examEntry?.examScore ?? null,
        maxScore: examEntry?.maxScore ?? 100,
        grade: null, // Will be calculated below
        isDraft: examEntry?.status === 'DRAFT',
      }
    })

    // Fetch EXAM grading system for grade calculation
    // Falls back to FINAL grading if EXAM_ONLY doesn't exist
    const gradingSystem = await getGradingSystem(
      schoolId,
      'EXAM_ONLY',
      classId,
      currentTerm.id
    )

    // Calculate grades for all student scores
    if (gradingSystem && gradingSystem.grades.length > 0) {
      studentScores.forEach(studentScore => {
        if (studentScore.score !== null && studentScore.score !== undefined) {
          // Convert score to percentage if needed
          const percentage = (studentScore.score / studentScore.maxScore) * 100
          const gradeResult = calculateGradeSync(percentage, gradingSystem.grades)
          if (gradeResult) {
            studentScore.grade = gradeResult.grade
          }
        }
      })
    }

    const response = {
      class: {
        id: classData.id,
        name: classData.name,
        streamName: null,
      },
      subject: {
        id: subjectData.id,
        name: subjectData.name,
      },
      examEntry: {
        id: sampleExamEntryId, // Use actual exam entry ID if exists, or 'pending' if not
        name: `${currentTerm.name} Exam`,
        maxScore: 100,
        date: new Date().toISOString(),
        type: 'exam',
        description: `Exam for ${subjectData.name} in ${classData.name}`,
        studentScores,
        isSubmitted: hasSubmittedScores,
        submittedAt: submittedAt?.toISOString() || null,
      },
      isPublished,
      isTermActive,
      canEdit,
      lockMessage,
    }

    console.log('✅ [API] /api/class-teacher/assessments/exam - Successfully returning exam data')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/assessments/exam - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch exam data',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}


/**
 * POST /api/class-teacher/assessments/exam
 * Create a new exam entry
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/class-teacher/assessments/exam - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/class-teacher/assessments/exam - POST - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to create exam entries'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school.'
        },
        { status: 400 }
      )
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    })

    if (!staff) {
      return NextResponse.json(
        { 
          error: 'No staff profile found',
          details: 'Your staff profile is not set up.'
        },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { classId, subjectId, maxScore, description, scores } = body

    if (!classId || !subjectId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'classId and subjectId are required'
        },
        { status: 400 }
      )
    }

    // Verify teacher has access to this class and subject
    const hasAccess = await prisma.staffSubject.findFirst({
      where: {
        staffId: staff.id,
        classId: classId,
        subjectId: subjectId,
      },
    }) || await prisma.staffClass.findFirst({
      where: {
        staffId: staff.id,
        classId: classId,
      },
    })

    if (!hasAccess) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to create exam entries for this class and subject.'
        },
        { status: 403 }
      )
    }

    // Get current term based on today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!currentTerm) {
      // If no term is active today, try to find the next upcoming term
      const upcomingTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId,
            isCurrent: true,
          },
          startDate: { gt: today },
        },
        orderBy: {
          startDate: 'asc',
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      })
      
      if (upcomingTerm) {
        return NextResponse.json(
          { 
            error: 'No active term',
            details: `The current term has not started yet. The next term "${upcomingTerm.name}" starts on ${upcomingTerm.startDate.toLocaleDateString('en-UG')}.`
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No current academic term is active. Please contact your administrator.'
        },
        { status: 400 }
      )
    }
    
    console.log(`✅ [API] Using current term: ${currentTerm.name} (${currentTerm.startDate.toLocaleDateString('en-UG')} - ${currentTerm.endDate.toLocaleDateString('en-UG')})`)

    // Get all students in the class
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
    })

    // Create a map of scores if provided
    const scoresMap = scores ? new Map(scores.map((s: { studentId: string; score: number | null }) => [s.studentId, s.score])) : new Map()

    // Create exam entries for all students
    const examEntries = await Promise.all(
      students.map(async student => {
        // Check if entry already exists
        const existing = await prisma.examEntry.findFirst({
          where: {
            studentId: student.id,
            subjectId: subjectId,
            termId: currentTerm.id,
          },
        })

        const scoreValue = scoresMap.get(student.id) ?? 0

        if (existing) {
          // Update existing entry
          return await prisma.examEntry.update({
            where: { id: existing.id },
            data: {
              maxScore: maxScore ? parseFloat(maxScore) : 100,
              examScore: scoreValue,
              examDate: new Date(),
              status: 'DRAFT',
            },
          })
        } else {
          // Create new entry
          return await prisma.examEntry.create({
            data: {
              schoolId: schoolId, // ✅ Added required schoolId field
              studentId: student.id,
              subjectId: subjectId,
              teacherId: staff.id,
              termId: currentTerm.id,
              maxScore: maxScore ? parseFloat(maxScore) : 100,
              examScore: scoreValue,
              examDate: new Date(),
              status: 'DRAFT',
            },
          })
        }
      })
    )

    console.log('✅ [API] /api/class-teacher/assessments/exam - POST - Successfully created exam entries')
    
    return NextResponse.json({
      success: true,
      message: `Exam entry created successfully for ${students.length} students`,
      examEntryId: examEntries[0]?.id,
      studentCount: students.length,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/assessments/exam - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create exam entry',
        details: error.message || 'An unexpected error occurred.'
      },
      { status: 500 }
    )
  }
}
