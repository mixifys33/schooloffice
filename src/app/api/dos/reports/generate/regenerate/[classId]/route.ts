/**
 * POST /api/dos/reports/generate/regenerate/[classId]
 * Regenerate reports for a class (after corrections)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reportGenerationService } from '@/services/report-generation.service'
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

    // Authorization
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
    const { termId } = body

    if (!termId) {
      return NextResponse.json({ error: 'Term ID required' }, { status: 400 })
    }

    // Check if reports exist
    const existingReports = await prisma.reportCard.count({
      where: { classId, termId, schoolId },
    })

    if (existingReports === 0) {
      return NextResponse.json(
        { error: 'No reports found to regenerate' },
        { status: 404 }
      )
    }

    // Regenerate reports
    const result = await reportGenerationService.regenerateClassReportCards(
      classId,
      termId,
      schoolId,
      staff.id
    )

    return NextResponse.json(
      {
        message: 'Reports regenerated successfully',
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error regenerating reports:', error)
    return NextResponse.json(
      { error: 'Failed to regenerate reports' },
      { status: 500 }
    )
  }
}
