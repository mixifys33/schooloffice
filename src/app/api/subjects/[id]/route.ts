/**
 * Subject Detail API Route
 * Requirements: 11.2 - Subject management CRUD operations
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { canWrite, canUpdate } from '@/lib/rbac'
import { Role } from '@/types/enums'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET: Get subject details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
      include: {
        staffSubjects: {
          include: {
            staff: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        classSubjects: {
          include: {
            class: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      teachers: subject.staffSubjects.map(ss => ({
        id: ss.staff.id,
        name: `${ss.staff.firstName} ${ss.staff.lastName}`
      })),
      classes: subject.classSubjects.map(cs => ({
        id: cs.class.id,
        name: cs.class.name
      }))
    })
  } catch (error) {
    console.error('Error fetching subject:', error)
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
  }
}

// PUT: Update subject
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    if (!canUpdate(userRole, 'subject')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to update subjects' },
        { status: 403 }
      )
    }

    // Verify subject belongs to school
    const existingSubject = await prisma.subject.findFirst({
      where: { id, schoolId }
    })

    if (!existingSubject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, code } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    // Check for duplicate code (excluding current subject)
    const duplicateSubject = await prisma.subject.findFirst({
      where: {
        schoolId,
        code: code.toUpperCase(),
        NOT: { id }
      }
    })

    if (duplicateSubject) {
      return NextResponse.json(
        { error: 'A subject with this code already exists' },
        { status: 409 }
      )
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code.toUpperCase().trim(),
      }
    })

    return NextResponse.json({
      id: subject.id,
      name: subject.name,
      code: subject.code,
    })
  } catch (error) {
    console.error('Error updating subject:', error)
    return NextResponse.json({ error: 'Failed to update subject' }, { status: 500 })
  }
}

// DELETE: Delete subject
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    if (!canWrite(userRole, 'subject')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to delete subjects' },
        { status: 403 }
      )
    }

    // Verify subject belongs to school
    const subject = await prisma.subject.findFirst({
      where: { id, schoolId },
      include: {
        _count: {
          select: { marks: true, staffSubjects: true, classSubjects: true }
        }
      }
    })

    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Prevent deletion if subject has marks recorded
    if (subject._count.marks > 0) {
      return NextResponse.json(
        { error: 'Cannot delete subject with recorded marks. Archive it instead.' },
        { status: 400 }
      )
    }

    // Delete related records first
    await prisma.staffSubject.deleteMany({ where: { subjectId: id } })
    await prisma.classSubject.deleteMany({ where: { subjectId: id } })
    
    await prisma.subject.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting subject:', error)
    return NextResponse.json({ error: 'Failed to delete subject' }, { status: 500 })
  }
}
