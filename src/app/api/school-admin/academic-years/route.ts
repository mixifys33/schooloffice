/**
 * Academic Years API Route
 * CRUD operations for academic years and terms
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

    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      include: {
        terms: { orderBy: { startDate: 'asc' } },
      },
      orderBy: { startDate: 'desc' },
    })

    return NextResponse.json({
      academicYears: academicYears.map(ay => ({
        id: ay.id,
        name: ay.name,
        startDate: ay.startDate.toISOString(),
        endDate: ay.endDate.toISOString(),
        isActive: ay.isActive,
        terms: ay.terms.map(t => ({
          id: t.id,
          name: t.name,
          startDate: t.startDate.toISOString(),
          endDate: t.endDate.toISOString(),
          weekCount: t.weekCount,
        })),
      })),
    })
  } catch (error) {
    console.error('Error fetching academic years:', error)
    return NextResponse.json({ error: 'Failed to fetch academic years' }, { status: 500 })
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
    const { name, startDate, endDate, isActive, terms } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If setting as active, deactivate other years
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: { schoolId, isActive: true },
        data: { isActive: false },
      })
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: isActive || false,
        terms: terms?.length ? {
          create: terms.map((t: any) => ({
            name: t.name,
            startDate: new Date(t.startDate),
            endDate: new Date(t.endDate),
            weekCount: t.weekCount || 12,
          })),
        } : undefined,
      },
      include: { terms: true },
    })

    return NextResponse.json({
      id: academicYear.id,
      name: academicYear.name,
      startDate: academicYear.startDate.toISOString(),
      endDate: academicYear.endDate.toISOString(),
      isActive: academicYear.isActive,
      terms: academicYear.terms.map(t => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        weekCount: t.weekCount,
      })),
    })
  } catch (error: any) {
    console.error('Error creating academic year:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Academic year with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create academic year' }, { status: 500 })
  }
}
