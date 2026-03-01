/**
 * Teacher CA Entry API Route
 * Returns CA entry data for a specific class and subject
 * 
 * Requirements: Teacher CA entry management
 * - Display CA entry form with student list
 * - Support CA score entry (20% of final grade)
 * - Handle draft and final submission
 * - Calculate and display grades based on grading system
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'
import { calculateGradeSync, getGradingSystem } from '@/lib/grading'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/assessments/ca - GET - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/teacher/assessments/ca - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to access CA entry'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/teacher/assessments/ca - No school context')
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
        employmentStatus: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { 
          error: 'No teacher profile found',
          details: 'Your teacher profile is not set up. Please contact your school administrator.'
        },
        { status: 404 }
      )
    }

    // Verify user has appropriate role (teacher or admin)
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY
    const isTeacher = userRole === Role.TEACHER
    
    if (!isTeacher && !isAdmin) {
      console.log('❌ [API] /api/teacher/assessments/ca - Invalid role:', userRole)
      return NextResponse.json(
        { 
          error: 'Access denied. Teacher role required.',
          details: `Current role: ${userRole}. Teacher access required.`
        },
        { status: 403 }
      )
    }

    // Verify teacher has access to this class and subject via TeacherAssignment
    const hasAccess = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
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

    // Get current term based on today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔍 Looking for current term with schoolId:', schoolId, 'and today:', today.toISOString())
    
    // Strategy 1: Try to find term where today falls between start and end dates
    let currentTerm = await prisma.term.findFirst({
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

    // Strategy 2: If no term found by date, try isCurrent flag
    if (!currentTerm) {
      console.log('⚠️ No term found by date range, trying isCurrent flag...')
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId,
            isCurrent: true,
          },
          isCurrent: true,
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
      })
    }

    // Strategy 3: If still no term, get the most recent term
    if (!currentTerm) {
      console.log('⚠️ No current term found, getting most recent term...')
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId,
          },
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
    }

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No academic term is available. Please contact your school administrator.'
        },
        { status: 400 }
      )
    }

    console.log('📆 Current Term (date-based):', {
      id: currentTerm.id,
      name: currentTerm.name,
      startDate: currentTerm.startDate,
      endDate: currentTerm.endDate,
      academicYear: currentTerm.academicYear,
    })
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

    // Get existing CA entries for this term, class, and subject
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        termId: currentTerm.id,
        subjectId: subjectId,
        studentId: { in: students.map(s => s.id) },
      },
      select: {
        id: true,
        studentId: true,
        name: true,
        type: true,
        rawScore: true,
        maxScore: true,
        status: true,
        date: true,
      },
    })

    // Group CA entries by student
    const caEntriesByStudent = new Map<string, typeof caEntries>()
    caEntries.forEach(entry => {
      if (!caEntriesByStudent.has(entry.studentId)) {
        caEntriesByStudent.set(entry.studentId, [])
      }
      caEntriesByStudent.get(entry.studentId)!.push(entry)
    })

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
    const hasSubmittedScores = caEntries.some(e => e.status === 'SUBMITTED' || e.status === 'APPROVED')
    const submittedAt = hasSubmittedScores ? caEntries.find(e => e.status === 'SUBMITTED' || e.status === 'APPROVED')?.date : null

    // Build CA entries list (grouped by CA entry, not by student)
    const caEntriesMap = new Map<string, any>()
    
    caEntries.forEach(entry => {
      const key = `${entry.name}-${entry.type}`
      if (!caEntriesMap.has(key)) {
        caEntriesMap.set(key, {
          id: entry.id,
          name: entry.name,
          maxScore: entry.maxScore,
          date: entry.date.toISOString(),
          type: entry.type,
          description: `${entry.type} - ${entry.name}`,
          studentScores: [],
          isSubmitted: entry.status === 'SUBMITTED' || entry.status === 'APPROVED',
          submittedAt: (entry.status === 'SUBMITTED' || entry.status === 'APPROVED') ? entry.date.toISOString() : null,
        })
      }
    })

    // Add student scores to each CA entry
    students.forEach(student => {
      const studentEntries = caEntriesByStudent.get(student.id) || []
      
      studentEntries.forEach(entry => {
        const key = `${entry.name}-${entry.type}`
        const caEntry = caEntriesMap.get(key)
        
        if (caEntry) {
          caEntry.studentScores.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            score: entry.rawScore,
            maxScore: entry.maxScore,
            grade: null, // Will be calculated below
            isDraft: entry.status === 'DRAFT',
          })
        }
      })
    })

    // Fetch grading system for grade calculation with multiple fallback strategies
    console.log('🔍 Strategy 1: Looking for CA_ONLY grading system...')
    let gradingSystem = await getGradingSystem(
      schoolId,
      'CA_ONLY',
      classId,
      currentTerm.id
    )

    // Strategy 2: Try FINAL grading system
    if (!gradingSystem || !gradingSystem.grades || gradingSystem.grades.length === 0) {
      console.log('🔍 Strategy 2: Looking for FINAL grading system...')
      gradingSystem = await getGradingSystem(
        schoolId,
        'FINAL',
        classId,
        currentTerm.id
      )
    }

    // Strategy 3: Fetch ALL grading systems and find one that matches
    if (!gradingSystem || !gradingSystem.grades || gradingSystem.grades.length === 0) {
      console.log('🔍 Strategy 3: Looking for any grading system for this school...')
      const allGradingSystems = await prisma.gradingSystem.findMany({
        where: {
          schoolId: schoolId,
        },
        include: {
          grades: {
            orderBy: {
              minScore: 'desc',
            },
          },
        },
      })

      console.log(`Found ${allGradingSystems.length} grading systems total`)

      // Try to find one that matches our criteria
      // Priority: classId + termId match, then classId only, then termId only, then any
      const queries = [
        { classId, termId: currentTerm.id },
        { classId, termId: null },
        { classId: null, termId: currentTerm.id },
        { classId: null, termId: null },
      ]

      for (const query of queries) {
        console.log('Trying query:', query)
        const match = allGradingSystems.find(gs => 
          gs.classId === query.classId && gs.termId === query.termId
        )
        if (match && match.grades && match.grades.length > 0) {
          console.log('✅ Found matching grading system:', match.name)
          gradingSystem = match
          break
        }
      }
    }

    if (!gradingSystem || !gradingSystem.grades || gradingSystem.grades.length === 0) {
      console.log('⚠️ No grading system found')
    } else {
      console.log('📊 Grading system found:', gradingSystem.name, 'with', gradingSystem.grades.length, 'grades')
    }

    // Calculate grades for all student scores
    if (gradingSystem && gradingSystem.grades && gradingSystem.grades.length > 0) {
      caEntriesMap.forEach(caEntry => {
        caEntry.studentScores.forEach(studentScore => {
          if (studentScore.score !== null && studentScore.score !== undefined) {
            // Convert score to percentage if needed
            const percentage = (studentScore.score / studentScore.maxScore) * 100
            const gradeResult = calculateGradeSync(percentage, gradingSystem.grades)
            if (gradeResult) {
              studentScore.grade = gradeResult.grade
            }
          }
        })
      })
    } else {
      console.log('⚠️ No grading system available for grade calculation')
    }

    // If no CA entries exist, create an empty structure
    const caEntriesList = Array.from(caEntriesMap.values())
    
    // If no entries, add students with null scores to a default entry
    if (caEntriesList.length === 0) {
      caEntriesList.push({
        id: 'new',
        name: 'CA Entry 1',
        maxScore: 10,
        date: new Date().toISOString(),
        type: 'ASSIGNMENT',
        description: 'New CA Entry',
        studentScores: students.map(student => ({
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          score: null,
          maxScore: 10,
          grade: null,
          isDraft: true,
        })),
        isSubmitted: false,
        submittedAt: null,
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
      caEntries: caEntriesList,
      isPublished,
      isTermActive,
      canEdit,
      lockMessage,
    }

    console.log('✅ [API] /api/teacher/assessments/ca - Successfully returning CA data')
    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/assessments/ca - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch CA data',
        details: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    )
  }
}


/**
 * POST /api/teacher/assessments/ca
 * Create a new CA entry
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/assessments/ca - POST - Starting request')
    
    const session = await auth()
    if (!session?.user) {
      console.log('❌ [API] /api/teacher/assessments/ca - POST - No session found')
      return NextResponse.json({ 
        error: 'Authentication required',
        details: 'Please log in to create CA entries'
      }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      console.log('❌ [API] /api/teacher/assessments/ca - POST - No school context')
      return NextResponse.json(
        { 
          error: 'No school context found',
          details: 'Your account is not linked to a school.'
        },
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
      },
    })

    if (!teacher) {
      console.log('❌ [API] /api/teacher/assessments/ca - POST - No teacher profile')
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
    console.log('📝 [API] Request body:', body)
    const { classId, subjectId, name, type, maxScore, description } = body

    if (!classId || !subjectId || !name || !type || !maxScore) {
      console.log('❌ [API] Missing required fields:', { classId, subjectId, name, type, maxScore })
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          details: 'classId, subjectId, name, type, and maxScore are required'
        },
        { status: 400 }
      )
    }

    // Convert type to uppercase to match CAType enum (TEST, ASSIGNMENT)
    // Map various types to the two valid CAType enum values
    let caType: 'TEST' | 'ASSIGNMENT'
    const typeLower = type.toLowerCase()
    
    if (typeLower === 'test' || typeLower === 'quiz') {
      caType = 'TEST'
    } else if (typeLower === 'assignment' || typeLower === 'project' || typeLower === 'practical' || typeLower === 'observation') {
      caType = 'ASSIGNMENT'
    } else {
      console.log('❌ [API] Invalid type:', type)
      return NextResponse.json(
        { 
          error: 'Invalid type',
          details: 'Type must be one of: test, quiz, assignment, project, practical, observation'
        },
        { status: 400 }
      )
    }

    console.log('✅ [API] Type mapped:', type, '→', caType)
    console.log('✅ [API] Validation passed, checking access...')

    // Verify teacher has access to this class and subject via TeacherAssignment
    const hasAccess = await prisma.teacherAssignment.findFirst({
      where: {
        teacherId: teacher.id,
        classId: classId,
        subjectId: subjectId,
      },
    })

    if (!hasAccess) {
      console.log('❌ [API] Access denied for teacher:', teacher.id, 'class:', classId, 'subject:', subjectId)
      return NextResponse.json(
        { 
          error: 'Access denied',
          details: 'You do not have permission to create CA entries for this class and subject.'
        },
        { status: 403 }
      )
    }

    console.log('✅ [API] Access verified, finding current term...')

    // Get current term based on today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('🔍 Looking for current term with schoolId:', schoolId, 'and today:', today.toISOString())
    
    // Strategy 1: Try to find term where today falls between start and end dates
    let currentTerm = await prisma.term.findFirst({
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

    // Strategy 2: If no term found by date, try isCurrent flag
    if (!currentTerm) {
      console.log('⚠️ No term found by date range, trying isCurrent flag...')
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId,
            isCurrent: true,
          },
          isCurrent: true,
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
      })
    }

    // Strategy 3: If still no term, get the most recent term
    if (!currentTerm) {
      console.log('⚠️ No current term found, getting most recent term...')
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYear: {
            schoolId,
          },
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
    }

    if (!currentTerm) {
      return NextResponse.json(
        { 
          error: 'No active term found',
          details: 'No academic term is available. Please contact your administrator.'
        },
        { status: 400 }
      )
    }
    
    console.log(`✅ [API] Using current term: ${currentTerm.name} from ${currentTerm.academicYear.name} (${currentTerm.startDate.toLocaleDateString('en-UG')} - ${currentTerm.endDate.toLocaleDateString('en-UG')})`)


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

    // Create CA entries for all students
    const caEntries = await Promise.all(
      students.map(student =>
        prisma.cAEntry.create({
          data: {
            schoolId: schoolId, // ✅ Added required schoolId field
            studentId: student.id,
            subjectId: subjectId,
            teacherId: teacher.id,
            termId: currentTerm.id,
            name: name,
            type: caType, // Use uppercase CAType enum value
            maxScore: parseFloat(maxScore),
            rawScore: 0, // Default to 0, teacher will update
            date: new Date(),
            status: 'DRAFT',
          },
        })
      )
    )

    console.log('✅ [API] /api/teacher/assessments/ca - POST - Successfully created CA entries')
    
    return NextResponse.json({
      success: true,
      message: `CA entry "${name}" created successfully for ${students.length} students`,
      caEntryId: caEntries[0]?.id,
      studentCount: students.length,
    })

  } catch (error: any) {
    console.error('❌ [API] /api/teacher/assessments/ca - POST - Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create CA entry',
        details: error.message || 'An unexpected error occurred.'
      },
      { status: 500 }
    )
  }
}
