/**
 * Teacher Exam Entry API Route
 * Handles ONE exam entry per term per subject per student
 * Based on class-teacher implementation
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'
import { calculateGradeSync, getGradingSystem } from '@/lib/grading'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exam-entry - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/teacher/marks/exam-entry - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access exam entry'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/teacher/marks/exam-entry - No school context')
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

    // Get teacher record (try both Teacher and Staff profiles)
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

    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!teacher && !staff) {
      return NextResponse.json(
        { 
          error: 'No teacher profile found',
          details: 'Your teacher profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    // Verify user has appropriate role
    const userRole = session.user.activeRole || session.user.role
    const isTeacher = userRole === Role.TEACHER
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    
    if (!isTeacher && !isAdmin) {
      console.log('❌ [API] /api/teacher/marks/exam-entry - Invalid role:', userRole)
      return NextResponse.json(
        { 
          error: 'Access denied. Teacher role required.',
          details: `Current role: ${userRole}. Teacher access required.`
        },
        { status: 403 }
      )
    }

    // Verify teacher has access to this class and subject
    if (teacher) {
      if (!teacher.assignedClassIds.includes(classId)) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            details: 'You are not assigned to this class.'
          },
          { status: 403 }
        )
      }

      if (!teacher.assignedSubjectIds.includes(subjectId)) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            details: 'You are not assigned to this subject.'
          },
          { status: 403 }
        )
      }
    } else if (staff) {
      // Check TeacherAssignment for staff
      const hasAccess = await prisma.teacherAssignment.findFirst({
        where: {
          staffId: staff.id,
          classId: classId,
          subjectId: subjectId,
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
    }

    // Get current term based on today's date (which term today falls into)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔍 Looking for current term with schoolId:', schoolId, 'and today:', today.toISOString())
    
    // Find the term where today's date falls between startDate and endDate
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })
    
    console.log('📆 Current Term (date-based):', currentTerm)

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No term is active for today\'s date. Please contact your school administrator.'
        },
        { status: 400 }
      )
    }
    
    console.log(`✅ Using term: ${currentTerm.name} from ${currentTerm.academicYear.name}`)

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

    // Check term active status - term is active if today falls within its date range
    const termStart = new Date(currentTerm.startDate)
    termStart.setHours(0, 0, 0, 0)
    const termEnd = new Date(currentTerm.endDate)
    termEnd.setHours(23, 59, 59, 999)
    
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

    // Fetch grading system for grade calculation
    // Try multiple strategies to find a grading system
    let gradingSystem = null
    
    // Strategy 1: Try EXAM_ONLY for this class and term
    console.log('🔍 Strategy 1: Looking for EXAM_ONLY grading system...')
    gradingSystem = await getGradingSystem(
      schoolId,
      'EXAM_ONLY',
      classId,
      currentTerm.id
    )
    
    // Strategy 2: If not found, try FINAL grading system
    if (!gradingSystem || !gradingSystem.grades || gradingSystem.grades.length === 0) {
      console.log('🔍 Strategy 2: Looking for FINAL grading system...')
      gradingSystem = await getGradingSystem(
        schoolId,
        'FINAL',
        classId,
        currentTerm.id
      )
    }
    
    // Strategy 3: If still not found, try any grading system for this school
    if (!gradingSystem || !gradingSystem.grades || gradingSystem.grades.length === 0) {
      console.log('🔍 Strategy 3: Looking for any grading system for this school...')
      
      // First, let's see ALL grading systems for this school
      const allSystems = await prisma.gradingSystem.findMany({
        where: { schoolId },
        include: {
          grades: {
            orderBy: { minScore: 'desc' },
          },
        },
      })
      
      console.log(`  Found ${allSystems.length} total grading systems for school`)
      allSystems.forEach(s => {
        console.log(`    - ${s.name}: classId=${s.classId}, termId=${s.termId}, category=${s.category}, grades=${s.grades.length}`)
      })
      
      // Try to find one that matches our class
      gradingSystem = allSystems.find(s => 
        s.classId === classId && s.grades.length > 0
      )
      
      if (!gradingSystem) {
        // Try to find a school-wide one
        gradingSystem = allSystems.find(s => 
          !s.classId && !s.termId && s.grades.length > 0
        )
      }
      
      if (gradingSystem) {
        console.log(`  ✅ Selected grading system: ${gradingSystem.name}`)
      } else {
        console.log('  ❌ No suitable grading system found')
      }
    }
    
    if (gradingSystem) {
      console.log(`📊 Grading system found: ${gradingSystem.name} (Category: ${gradingSystem.category}, ${gradingSystem.grades.length} grades)`)
    } else {
      console.log('⚠️ No grading system found')
    }

    // Calculate grades for all student scores
    if (gradingSystem && gradingSystem.grades.length > 0) {
      studentScores.forEach(studentScore => {
        if (studentScore.score !== null && studentScore.score !== undefined && studentScore.score > 0) {
          // Convert score to percentage if needed
          const percentage = (studentScore.score / studentScore.maxScore) * 100
          const gradeResult = calculateGradeSync(percentage, gradingSystem.grades)
          if (gradeResult) {
            studentScore.grade = gradeResult.grade
            console.log(`✅ Grade calculated for ${studentScore.studentName}: ${studentScore.score}/${studentScore.maxScore} (${percentage.toFixed(1)}%) = ${gradeResult.grade}`)
          } else {
            console.log(`⚠️ No grade result for ${studentScore.studentName}: ${percentage.toFixed(1)}%`)
          }
        }
      })
    } else {
      console.log('⚠️ No grading system available for grade calculation')
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
        id: sampleExamEntryId,
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

    console.log('✅ [API] /api/teacher/marks/exam-entry - Successfully returning exam data')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exam-entry - Error:', error)
    
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
 * POST /api/teacher/marks/exam-entry
 * Create exam entries for all students
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exam-entry - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
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

    // Get teacher or staff record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: { id: true },
    })

    const teacherId = teacher?.id || staff?.id

    if (!teacherId) {
      return NextResponse.json(
        { 
          error: 'No teacher profile found',
          details: 'Your teacher profile is not set up.'
        },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { classId, subjectId, scores } = body

    if (!classId || !subjectId) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'classId and subjectId are required'
        },
        { status: 400 }
      )
    }

    // Get current term based on today's date (which term today falls into)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔍 [POST] Looking for current term with schoolId:', schoolId, 'and today:', today.toISOString())
    
    // Find the term where today's date falls between startDate and endDate
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    })
    
    console.log('📆 [POST] Current Term (date-based):', currentTerm)

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No term is active for today\'s date. Please contact your school administrator.'
        },
        { status: 400 }
      )
    }
    
    console.log(`✅ [POST] Using term: ${currentTerm.name} from ${currentTerm.academicYear.name}`)

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: StudentStatus.ACTIVE,
      },
      select: {
        id: true,
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
              maxScore: 100,
              examScore: scoreValue,
              examDate: new Date(),
              status: 'DRAFT',
            },
          })
        } else {
          // Create new entry
          return await prisma.examEntry.create({
            data: {
              schoolId: schoolId,
              studentId: student.id,
              subjectId: subjectId,
              teacherId: teacherId,
              termId: currentTerm.id,
              maxScore: 100,
              examScore: scoreValue,
              examDate: new Date(),
              status: 'DRAFT',
            },
          })
        }
      })
    )

    console.log('✅ [API] /api/teacher/marks/exam-entry - POST - Successfully created exam entries')
    
    return NextResponse.json({
      success: true,
      message: `Exam entry created successfully for ${students.length} students`,
      examEntryId: examEntries[0]?.id,
      studentCount: students.length,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exam-entry - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create exam entry',
        details: error.message || 'An unexpected error occurred.'
      },
      { status: 500 }
    )
  }
}
