/**
 * Academic Year Detail API Route
 * Update and delete operations for a specific academic year
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const { id } = await params

    if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const { name, startDate, endDate, isActive } = body

    // Verify academic year belongs to school
    const existing = await prisma.academicYear.findFirst({
      where: { id, schoolId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }

    // If setting as active, deactivate other years
    if (isActive && !existing.isActive) {
      await prisma.academicYear.updateMany({
        where: { schoolId, isActive: true, id: { not: id } },
        data: { isActive: false },
      })
    }

    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
      include: { terms: { orderBy: { startDate: 'asc' } } },
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
    console.error('Error updating academic year:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Academic year with this name already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update academic year' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role
    const { id } = await params

    if (!['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    // Verify academic year belongs to school
    const existing = await prisma.academicYear.findFirst({
      where: { id, schoolId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Academic year not found' }, { status: 404 })
    }

    await prisma.academicYear.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting academic year:', error)
    return NextResponse.json({ error: 'Failed to delete academic year' }, { status: 500 })
  }
}
