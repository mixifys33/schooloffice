/**
 * Terms API Route
 * CRUD operations for academic terms
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const academicYearId = searchParams.get('academicYearId')

    const terms = await prisma.term.findMany({
      where: {
        academicYear: {
          schoolId,
          ...(academicYearId && { id: academicYearId }),
        },
      },
      include: {
        academicYear: { select: { id: true, name: true, isActive: true } },
      },
      orderBy: [
        { academicYear: { startDate: 'desc' } },
        { startDate: 'asc' },
      ],
    })

    return NextResponse.json({
      terms: terms.map(t => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        weekCount: t.weekCount,
        academicYearId: t.academicYearId,
        academicYearName: t.academicYear.name,
        isCurrentYear: t.academicYear.isActive,
      })),
    })
  } catch (error) {
    console.error('Error fetching terms:', error)
    return NextResponse.json({ error: 'Failed to fetch terms' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const { academicYearId, name, startDate, endDate, weekCount } = body

    if (!academicYearId || !name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify academic year belongs to school
    const academicYear = await prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    })

    if (!academicYear) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }

    const term = await prisma.term.create({
      data: {
        academicYearId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        weekCount: weekCount || 12,
      },
      include: {
        academicYear: { select: { name: true, isActive: true } },
      },
    })

    return NextResponse.json({
      id: term.id,
      name: term.name,
      startDate: term.startDate.toISOString(),
      endDate: term.endDate.toISOString(),
      weekCount: term.weekCount,
      academicYearId: term.academicYearId,
      academicYearName: term.academicYear.name,
      isCurrentYear: term.academicYear.isActive,
    })
  } catch (error: any) {
    console.error('Error creating term:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Term with this name already exists for this academic year' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create term' }, { status: 500 })
  }
}
