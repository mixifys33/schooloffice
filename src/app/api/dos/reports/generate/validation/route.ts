/**
 * GET /api/dos/reports/generate/validation
 * Get validation status for all classes in a term
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reportValidationService } from '@/services/report-validation.service'
import { Role, StaffRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get school context
    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 })
    }

    // Authorization - DoS only
    const userRole = session.user.activeRole || session.user.role
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY

    // Check staff DoS role
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId')

    if (!termId) {
      return NextResponse.json({ error: 'Term ID required' }, { status: 400 })
    }

    // Get validation status for all classes
    const validationStatus = await reportValidationService.getValidationStatus(
      schoolId,
      termId
    )

    // Transform response to match frontend expectations
    // Flatten the validation data structure
    const classes = validationStatus.map(classData => ({
      classId: classData.classId,
      className: classData.className,
      studentCount: classData.studentCount,
      isReady: classData.validation.isReady,
      blockers: classData.validation.blockers,
      validationChecks: classData.validation.validationChecks
    }))

    return NextResponse.json({ classes }, { status: 200 })
  } catch (error) {
    console.error('Error fetching validation status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch validation status' },
      { status: 500 }
    )
  }
}
