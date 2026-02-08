/**
 * Teacher Assessment API Routes
 * Requirements: Multiple CA entries support, 20/80 calculation logic
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, AssessmentType } from '@/types/enums'

/**
 * GET /api/teacher/assessments
 * Returns teacher's assessments for classes/subjects
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
    const assessmentType = searchParams.get('type') as AssessmentType

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

    // Build query filters
    const whereClause: any = {
      staffId: teacher.id,
    }

    if (classId) {
      whereClause.classId = classId
    }

    if (subjectId) {
      whereClause.subjectId = subjectId
    }

    if (assessmentType) {
      whereClause.assessmentType = assessmentType
    }

    // Get teacher assessments
    const assessments = await prisma.teacherAssessment.findMany({
      where: whereClause,
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
        results: {
          include: {
            student: {
              select: {
                firstName: true,
                lastName: true,
                admissionNumber: true,
              }
            }
          }
        }
      },
      orderBy: {
        dateAssigned: 'desc',
      },
    })

    return NextResponse.json({ assessments })
  } catch (error) {
    console.error('Error fetching teacher assessments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher assessments' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/assessments
 * Creates a new teacher assessment entry
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
    const {
      classId,
      subjectId,
      assessmentType,
      name,
      maxScore,
      dateAssigned,
      dueDate,
      linkedCompetency,
      description
    } = body

    if (!classId || !subjectId || !assessmentType || !name || maxScore === undefined || !dateAssigned) {
      return NextResponse.json(
        { error: 'Missing required fields: classId, subjectId, assessmentType, name, maxScore, dateAssigned' },
        { status: 400 }
      )
    }

    // Validate teacher assignment to class and subject
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

    // Create teacher assessment
    const assessment = await prisma.teacherAssessment.create({
      data: {
        staffId: teacher.id,
        classId,
        subjectId,
        assessmentType,
        name,
        maxScore: parseFloat(maxScore),
        dateAssigned: new Date(dateAssigned),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        linkedCompetency: linkedCompetency || undefined,
        description: description || undefined,
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      assessment,
      message: 'Teacher assessment created successfully',
    })
  } catch (error) {
    console.error('Error creating teacher assessment:', error)
    return NextResponse.json(
      { error: 'Failed to create teacher assessment' },
      { status: 500 }
    )
  }
}