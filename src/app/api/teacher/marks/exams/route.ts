/**
 * Teacher Marks Exams API Route
 * Requirements: 6.2 - Return exams for the current term
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

/**
 * GET /api/teacher/marks/exams
 * Returns exams for the current term
 * Requirements: 6.2 - Allow marks entry while term is active
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

    // Get examType filter from query params
    const { searchParams } = new URL(request.url)
    const examTypeFilter = searchParams.get('examType') // 'CA' or 'EXAM'

    // Get current academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    if (!academicYear) {
      return NextResponse.json({ exams: [] })
    }

    // Get current term
    const today = new Date()
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: academicYear.id,
        startDate: { lte: today },
        endDate: { gte: today },
      },
      select: {
        id: true,
      },
    })

    if (!currentTerm) {
      return NextResponse.json({ exams: [] })
    }

    // Build where clause based on examType filter
    const whereClause: any = {
      schoolId,
      termId: currentTerm.id,
    }

    if (examTypeFilter === 'CA') {
      // Only show CA type exams
      whereClause.type = 'CA'
    } else if (examTypeFilter === 'EXAM') {
      // Show BOT, MID, EOT exams (exclude CA)
      whereClause.type = {
        in: ['BOT', 'MID', 'EOT']
      }
    }
    // If no filter, show all exams

    // Get exams for the current term
    const exams = await prisma.exam.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true,
        isOpen: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      exams: exams.map(exam => ({
        id: exam.id,
        name: exam.name,
        type: exam.type,
        isOpen: exam.isOpen,
        startDate: exam.startDate?.toISOString() || null,
        endDate: exam.endDate?.toISOString() || null,
      })),
    })
  } catch (error) {
    console.error('Error fetching exams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exams' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teacher/marks/exams
 * Create a new CA assessment
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 [API] /api/teacher/marks/exams - POST - Starting request')
    
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

    // Parse request body
    const body = await request.json()
    const { classId, subjectId, name, type, maxScore, description, examType } = body

    if (!classId || !subjectId || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: classId, subjectId, name, type' },
        { status: 400 }
      )
    }

    if (examType === 'CA' && !maxScore) {
      return NextResponse.json(
        { error: 'Max score is required for CA entries' },
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
        { error: 'No teacher profile found' },
        { status: 404 }
      )
    }

    // Verify teacher has access to this class and subject
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

    // Get current term
    const today = new Date()
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
        endDate: true,
      },
    })

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'No active term found' },
        { status: 400 }
      )
    }

    // Create the exam/CA entry as a template
    // Note: For CA entries, maxScore is stored per Mark entry, not in the Exam template
    const exam = await prisma.exam.create({
      data: {
        schoolId,
        termId: currentTerm.id,
        name: examType === 'CA' ? `${name} (Max: ${maxScore})` : name, // Include maxScore in name for CA
        type: examType === 'CA' ? 'CA' : type,
        isOpen: true,
        startDate: new Date(),
        endDate: new Date(currentTerm.endDate),
      },
    })

    console.log('✅ [API] /api/teacher/marks/exams - POST - Successfully created exam:', exam.id)

    return NextResponse.json({
      success: true,
      message: `${examType === 'CA' ? 'CA assessment' : 'Exam'} created successfully`,
      exam: {
        id: exam.id,
        name: exam.name,
        type: exam.type,
        maxScore: maxScore || 100, // Return maxScore for frontend to use when creating marks
        isOpen: exam.isOpen,
      },
    })
  } catch (error: any) {
    console.error('❌ [API] /api/teacher/marks/exams - POST - Error:', error)
    return NextResponse.json(
      { error: 'Failed to create assessment', details: error.message },
      { status: 500 }
    )
  }
}