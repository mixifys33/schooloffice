/**
 * Teacher Assessment Results API Routes
 * Requirements: 20/80 calculation logic, CA aggregation, student results
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StudentStatus } from '@/types/enums'

/**
 * GET /api/teacher/assessments/results
 * Returns assessment results for a specific assessment
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
    const assessmentId = searchParams.get('assessmentId')

    if (!assessmentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: assessmentId' },
        { status: 400 }
      )
    }

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Get the assessment
    const assessment = await prisma.teacherAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        staff: { select: { firstName: true, lastName: true } },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Verify teacher owns this assessment
    if (assessment.staffId !== teacher.id) {
      return NextResponse.json(
        { error: 'Access denied. You do not own this assessment.' },
        { status: 403 }
      )
    }

    // Get students in the class
    const students = await prisma.student.findMany({
      where: {
        classId: assessment.classId,
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

    // Get existing results for this assessment
    const existingResults = await prisma.teacherAssessmentResult.findMany({
      where: {
        assessmentId,
      },
    })

    const resultsMap = new Map(existingResults.map(r => [r.studentId, r]))

    // Build student results data
    const studentResults = students.map(student => {
      const result = resultsMap.get(student.id)
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        score: result?.score ?? null,
        percentage: result?.percentage ?? null,
        teacherRemarks: result?.teacherRemarks ?? null,
        enteredAt: result?.enteredAt?.toISOString() ?? null,
      }
    })

    return NextResponse.json({
      assessment: {
        id: assessment.id,
        name: assessment.name,
        type: assessment.assessmentType,
        maxScore: assessment.maxScore,
        dateAssigned: assessment.dateAssigned.toISOString(),
        dueDate: assessment.dueDate?.toISOString() || null,
        isLocked: assessment.isLocked,
      },
      students: studentResults,
      class: assessment.class,
      subject: assessment.subject,
    })
  } catch (error) {
    console.error('Error fetching assessment results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assessment results' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/assessments/results
 * Saves assessment results for students
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
    const { assessmentId, results } = body

    if (!assessmentId || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: 'Missing required fields: assessmentId, results' },
        { status: 400 }
      )
    }

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Get the assessment
    const assessment = await prisma.teacherAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        class: { select: { id: true } },
      },
    })

    if (!assessment) {
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    // Verify teacher owns this assessment
    if (assessment.staffId !== teacher.id) {
      return NextResponse.json(
        { error: 'Access denied. You do not own this assessment.' },
        { status: 403 }
      )
    }

    // Check if assessment is locked
    if (assessment.isLocked) {
      return NextResponse.json(
        { error: 'This assessment is locked and cannot be modified.' },
        { status: 403 }
      )
    }

    // Process results
    const savedResults = []
    const errors = []

    for (const resultEntry of results) {
      const { studentId, score, teacherRemarks } = resultEntry

      // Skip if score is null (not entered)
      if (score === null || score === undefined) {
        continue
      }

      // Validate score
      if (score < 0 || score > assessment.maxScore) {
        errors.push({
          studentId,
          error: `Score must be between 0 and ${assessment.maxScore}`,
        })
        continue
      }

      // Verify student belongs to the class
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, classId: true, schoolId: true },
      })

      if (!student || student.classId !== assessment.classId) {
        errors.push({
          studentId,
          error: 'Student not found in this class',
        })
        continue
      }

      try {
        // Calculate percentage
        const percentage = (score / assessment.maxScore) * 100

        // Upsert assessment result
        const result = await prisma.teacherAssessmentResult.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId,
              studentId,
            },
          },
          update: {
            score,
            percentage,
            teacherRemarks: teacherRemarks || null,
            enteredAt: new Date(),
            enteredBy: teacher.id,
          },
          create: {
            assessmentId,
            studentId,
            score,
            percentage,
            teacherRemarks: teacherRemarks || null,
            enteredBy: teacher.id,
          },
        })

        savedResults.push(result)
      } catch (err) {
        errors.push({
          studentId,
          error: err instanceof Error ? err.message : 'Failed to save result',
        })
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: savedResults.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully saved ${savedResults.length} results`,
    })
  } catch (error) {
    console.error('Error saving assessment results:', error)
    return NextResponse.json(
      { error: 'Failed to save assessment results' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/teacher/assessments/ca-summary
 * Returns CA summary for a class and subject with 20/80 calculation
 */
export async function GET_CA_SUMMARY(request: NextRequest) {
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

    if (!classId || !subjectId) {
      return NextResponse.json(
        { error: 'Missing required parameters: classId, subjectId' },
        { status: 400 }
      )
    }

    // Get teacher record
    const teacher = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      include: {
        staffSubjects: {
          where: {
            classId,
            subjectId,
          },
        },
      },
    })

    if (!teacher || teacher.staffSubjects.length === 0) {
      return NextResponse.json(
        { error: 'You are not assigned to this class and subject combination' },
        { status: 403 }
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

    // Get all assessments for this class and subject
    const assessments = await prisma.teacherAssessment.findMany({
      where: {
        classId,
        subjectId,
        staffId: teacher.id,
      },
      include: {
        results: {
          include: {
            student: {
              select: {
                id: true,
              }
            }
          }
        }
      },
    })

    // Calculate CA summary for each student
    const caSummary = students.map(student => {
      // Get all assessment results for this student
      const studentResults = assessments.flatMap(assessment => 
        assessment.results.filter(result => result.studentId === student.id)
      )

      // Calculate average percentage across all assessments
      let totalPercentage = 0
      let validAssessments = 0

      for (const result of studentResults) {
        if (result.percentage !== null) {
          totalPercentage += result.percentage
          validAssessments++
        }
      }

      const averagePercentage = validAssessments > 0 
        ? totalPercentage / validAssessments 
        : 0

      // Convert to CA contribution (out of 20)
      const caContribution = (averagePercentage / 100) * 20

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        totalAssessments: assessments.length,
        completedAssessments: studentResults.length,
        averagePercentage: parseFloat(averagePercentage.toFixed(2)),
        caContribution: parseFloat(caContribution.toFixed(2)), // Out of 20
      }
    })

    return NextResponse.json({
      caSummary,
      classId,
      subjectId,
      totalAssessments: assessments.length,
      assessmentTypes: [...new Set(assessments.map(a => a.assessmentType))],
    })
  } catch (error) {
    console.error('Error fetching CA summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CA summary' },
      { status: 500 }
    )
  }
}