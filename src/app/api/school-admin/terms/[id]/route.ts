/**
 * Term Detail API Route
 * Update and delete operations for a specific term
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
    const { name, startDate, endDate, weekCount } = body

    // Verify term belongs to school
    const existing = await prisma.term.findFirst({
      where: { id, academicYear: { schoolId } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    const term = await prisma.term.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(weekCount && { weekCount }),
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
    console.error('Error updating term:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Term with this name already exists for this academic year' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update term' }, { status: 500 })
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

    // Verify term belongs to school
    const existing = await prisma.term.findFirst({
      where: { id, academicYear: { schoolId } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Term not found' }, { status: 404 })
    }

    await prisma.term.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting term:', error)
    return NextResponse.json({ error: 'Failed to delete term' }, { status: 500 })
  }
}
