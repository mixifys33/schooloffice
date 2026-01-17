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

    // Get exams for the current term
    const exams = await prisma.exam.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
      },
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
