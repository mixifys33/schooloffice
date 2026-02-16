/**
 * POST /api/dos/reports/review/[classId]/publish
 * Publish approved reports (generate secure links)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reportPublishingService } from '@/services/report-publishing.service'
import { Role, StaffRole } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params

    // Authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Authorization - DoS only
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    const staff = await prisma.staff.findFirst({
      where: { schoolId, userId: session.user.id },
      select: { id: true, primaryRole: true, secondaryRoles: true },
    })

    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    const isDoS =
      staff.primaryRole === StaffRole.DOS ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { termId, linkExpiryDays = 90 } = body

    if (!termId) {
      return NextResponse.json({ error: 'Term ID required' }, { status: 400 })
    }

    // Check if publishing is possible
    const canPublish = await reportPublishingService.canPublishClassReports(
      classId,
      termId
    )

    if (!canPublish) {
      return NextResponse.json(
        { error: 'No approved reports available for publishing' },
        { status: 400 }
      )
    }

    // Publish reports
    const result = await reportPublishingService.publishClassReports(
      classId,
      termId,
      staff.id,
      linkExpiryDays
    )

    return NextResponse.json(
      {
        message: 'Reports published successfully',
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors.length > 0 ? result.errors : undefined,
        secureLinks: result.secureLinks,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error publishing reports:', error)
    return NextResponse.json(
      { error: 'Failed to publish reports' },
      { status: 500 }
    )
  }
}
