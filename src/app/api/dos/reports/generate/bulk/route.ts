/**
 * POST /api/dos/reports/generate/bulk
 * Generate reports for multiple classes
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reportGenerationService } from '@/services/report-generation.service'
import { reportValidationService } from '@/services/report-validation.service'
import { Role, StaffRole } from '@prisma/client'

export async function POST(request: NextRequest) {
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
    const { classIds, termId, templateId } = body

    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json({ error: 'Class IDs required' }, { status: 400 })
    }

    if (!termId) {
      return NextResponse.json({ error: 'Term ID required' }, { status: 400 })
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Validate all classes before generation
    const validationResults = []
    for (const classId of classIds) {
      const validation = await reportValidationService.validateClassForReports(
        classId,
        termId
      )
      validationResults.push({ classId, ...validation })
    }

    // Check if any class is not ready
    const notReadyClasses = validationResults.filter((v) => !v.isReady)
    if (notReadyClasses.length > 0) {
      return NextResponse.json(
        {
          error: 'Some classes are not ready for report generation',
          notReadyClasses: notReadyClasses.map((c) => ({
            classId: c.classId,
            blockers: c.blockers,
          })),
        },
        { status: 400 }
      )
    }

    // Generate reports for all classes
    const results = []
    let totalSuccess = 0
    let totalFailure = 0
    const allErrors: string[] = []

    for (const classId of classIds) {
      try {
        const result = await reportGenerationService.generateClassReportCards(
          classId,
          termId,
          templateId,
          schoolId,
          staff.id
        )

        results.push({
          classId,
          successCount: result.successCount,
          failureCount: result.failureCount,
          errors: result.errors,
          reportIds: result.reportIds,
        })

        totalSuccess += result.successCount
        totalFailure += result.failureCount
        allErrors.push(...result.errors)
      } catch (error) {
        results.push({
          classId,
          successCount: 0,
          failureCount: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          reportIds: [],
        })
        allErrors.push(
          `Class ${classId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    }

    return NextResponse.json(
      {
        message: 'Bulk generation completed',
        totalClasses: classIds.length,
        totalSuccess,
        totalFailure,
        results,
        errors: allErrors.length > 0 ? allErrors : undefined,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in bulk generation:', error)
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    )
  }
}
