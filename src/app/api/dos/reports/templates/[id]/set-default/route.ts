/**
 * POST /api/dos/reports/templates/[id]/set-default
 * Set template as default for its type
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

export async function POST(
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

    // Get template
    const template = await prisma.reportTemplate.findFirst({
      where: { id, schoolId },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Unset other defaults of same type
    await prisma.reportTemplate.updateMany({
      where: { schoolId, type: template.type, isDefault: true },
      data: { isDefault: false },
    })

    // Set this template as default
    const updated = await prisma.reportTemplate.update({
      where: { id },
      data: { isDefault: true },
    })

    return NextResponse.json(
      {
        message: 'Template set as default successfully',
        template: updated,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error setting default template:', error)
    return NextResponse.json(
      { error: 'Failed to set default template' },
      { status: 500 }
    )
  }
}
