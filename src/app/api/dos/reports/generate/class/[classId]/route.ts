/**
 * POST /api/dos/reports/generate/class/[classId]
 * Generate reports for a single class
 * 
 * GET /api/dos/reports/generate/class/[classId]
 * Get generation status for a class
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reportGenerationService } from '@/services/report-generation.service'
import { reportValidationService } from '@/services/report-validation.service'
import { Role, StaffRole } from '@prisma/client'

// POST - Generate reports for class
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
    const { termId, templateId } = body

    if (!termId) {
      return NextResponse.json({ error: 'Term ID required' }, { status: 400 })
    }

    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    // Validate class is ready
    const validation = await reportValidationService.validateClassForReports(
      classId,
      termId
    )

    if (!validation.isReady) {
      return NextResponse.json(
        {
          error: 'Class is not ready for report generation',
          blockers: validation.blockers,
          validationChecks: validation.validationChecks,
        },
        { status: 400 }
      )
    }

    // Generate reports
    const result = await reportGenerationService.generateClassReportCards(
      classId,
      termId,
      templateId,
      schoolId,
      staff.id
    )

    return NextResponse.json(
      {
        message: 'Reports generated successfully',
        successCount: result.successCount,
        failureCount: result.failureCount,
        errors: result.errors.length > 0 ? result.errors : undefined,
        reportIds: result.reportIds,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error generating class reports:', error)
    return NextResponse.json(
      { error: 'Failed to generate reports' },
      { status: 500 }
    )
  }
}

// GET - Get generation status
export async function GET(
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId')

    if (!termId) {
      return NextResponse.json({ error: 'Term ID required' }, { status: 400 })
    }

    // Get report cards for class
    const reportCards = await prisma.reportCard.findMany({
      where: { classId, termId, schoolId },
      select: {
        id: true,
        studentId: true,
        status: true,
        generatedAt: true,
        approvedAt: true,
        publishedAt: true,
      },
    })

    // Get class details
    const classDetails = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true },
    })

    // Get student count
    const studentCount = await prisma.student.count({
      where: { classId, status: 'ACTIVE' },
    })

    // Calculate statistics
    const stats = {
      total: studentCount,
      draft: reportCards.filter((r) => r.status === 'DRAFT').length,
      generated: reportCards.filter((r) => r.status === 'GENERATED').length,
      approved: reportCards.filter((r) => r.status === 'APPROVED').length,
      published: reportCards.filter((r) => r.status === 'PUBLISHED').length,
    }

    return NextResponse.json(
      {
        classId,
        className: classDetails?.name,
        termId,
        studentCount,
        reportCount: reportCards.length,
        stats,
        reportCards,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching generation status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch generation status' },
      { status: 500 }
    )
  }
}
