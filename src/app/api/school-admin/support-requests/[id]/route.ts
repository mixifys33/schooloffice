/**
 * Support Request Detail API Route
 * Update support request status and resolution
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
    const userId = (session.user as { id?: string }).id
    const userRole = session.user.role as Role
    const { id } = await params

    if (!['SCHOOL_ADMIN', 'DEPUTY', 'SUPER_ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const { status, priority, resolution, assignedTo } = body

    // Verify request belongs to school
    const existing = await prisma.supportRequest.findFirst({
      where: { id, schoolId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Support request not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (resolution !== undefined) updateData.resolution = resolution
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo

    // If resolving, set resolved info
    if (status === 'RESOLVED' || status === 'CLOSED') {
      updateData.resolvedBy = userId
      updateData.resolvedAt = new Date()
    }

    const supportRequest = await prisma.supportRequest.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      id: supportRequest.id,
      name: supportRequest.name,
      email: supportRequest.email,
      phone: supportRequest.phone,
      issueType: supportRequest.issueType,
      message: supportRequest.message,
      status: supportRequest.status,
      priority: supportRequest.priority,
      resolution: supportRequest.resolution,
      createdAt: supportRequest.createdAt.toISOString(),
      resolvedAt: supportRequest.resolvedAt?.toISOString(),
    })
  } catch (error) {
    console.error('Error updating support request:', error)
    return NextResponse.json({ error: 'Failed to update support request' }, { status: 500 })
  }
}

// PATCH is an alias for PUT for convenience
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PUT(request, context)
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

    // Verify request belongs to school
    const existing = await prisma.supportRequest.findFirst({
      where: { id, schoolId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Support request not found' }, { status: 404 })
    }

    await prisma.supportRequest.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting support request:', error)
    return NextResponse.json({ error: 'Failed to delete support request' }, { status: 500 })
  }
}
