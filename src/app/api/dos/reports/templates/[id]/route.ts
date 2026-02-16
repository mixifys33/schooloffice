/**
 * GET /api/dos/reports/templates/[id] - Get template details
 * PUT /api/dos/reports/templates/[id] - Update template
 * DELETE /api/dos/reports/templates/[id] - Delete template
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

// GET - Get template details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    const template = await prisma.reportTemplate.findFirst({
      where: { id, schoolId },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json({ template }, { status: 200 })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

// PUT - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Authorization
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { primaryRole: true, secondaryRoles: true },
    })

    const isDoS =
      staff &&
      (staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS))

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      )
    }

    // Check template exists
    const existing = await prisma.reportTemplate.findFirst({
      where: { id, schoolId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { name, content, variables, isActive, isDefault } = body

    // If setting as default, unset other defaults of same type
    if (isDefault && !existing.isDefault) {
      await prisma.reportTemplate.updateMany({
        where: { schoolId, type: existing.type, isDefault: true },
        data: { isDefault: false },
      })
    }

    // Update template
    const template = await prisma.reportTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(content && { content }),
        ...(variables && { variables }),
        ...(isActive !== undefined && { isActive }),
        ...(isDefault !== undefined && { isDefault }),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'Template updated successfully',
        template,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Authorization
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { primaryRole: true, secondaryRoles: true },
    })

    const isDoS =
      staff &&
      (staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS))

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      )
    }

    // Check template exists
    const template = await prisma.reportTemplate.findFirst({
      where: { id, schoolId },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Prevent deletion of default template
    if (template.isDefault) {
      return NextResponse.json(
        { error: 'Cannot delete default template. Set another template as default first.' },
        { status: 400 }
      )
    }

    // Delete template
    await prisma.reportTemplate.delete({
      where: { id },
    })

    return NextResponse.json(
      { message: 'Template deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}
