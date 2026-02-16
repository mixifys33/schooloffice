/**
 * GET /api/dos/reports/review
 * List all generated reports (pending approval/published)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole, ReportCardStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
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
    const status = searchParams.get('status') as ReportCardStatus | null
    const classId = searchParams.get('classId')

    // Build where clause
    const where: any = { schoolId }
    if (termId) where.termId = termId
    if (status) where.status = status
    if (classId) where.classId = classId

    // Get report cards grouped by class
    const reportCards = await prisma.reportCard.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        class: {
          select: { id: true, name: true },
        },
        term: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ classId: 'asc' }, { student: { lastName: 'asc' } }],
    })

    // Group by class
    const groupedByClass = reportCards.reduce((acc, report) => {
      const classId = report.classId
      if (!acc[classId]) {
        acc[classId] = {
          classId,
          className: report.class.name,
          termId: report.termId,
          termName: report.term.name,
          reports: [],
          stats: {
            total: 0,
            draft: 0,
            generated: 0,
            approved: 0,
            published: 0,
            revoked: 0,
          },
        }
      }

      acc[classId].reports.push({
        id: report.id,
        studentId: report.studentId,
        studentName: `${report.student.firstName} ${report.student.lastName}`,
        admissionNumber: report.student.admissionNumber,
        status: report.status,
        generatedAt: report.generatedAt,
        approvedAt: report.approvedAt,
        publishedAt: report.publishedAt,
        pdfUrl: report.pdfUrl,
        downloadCount: report.downloadCount,
        linkExpiresAt: report.linkExpiresAt,
      })

      acc[classId].stats.total++
      acc[classId].stats[report.status.toLowerCase() as keyof typeof acc[string]['stats']]++

      return acc
    }, {} as Record<string, any>)

    // Convert to array
    const classes = Object.values(groupedByClass)

    // Calculate overall statistics
    const overallStats = {
      totalClasses: classes.length,
      totalReports: reportCards.length,
      draft: reportCards.filter((r) => r.status === 'DRAFT').length,
      generated: reportCards.filter((r) => r.status === 'GENERATED').length,
      approved: reportCards.filter((r) => r.status === 'APPROVED').length,
      published: reportCards.filter((r) => r.status === 'PUBLISHED').length,
      revoked: reportCards.filter((r) => r.status === 'REVOKED').length,
      totalDownloads: reportCards.reduce((sum, r) => sum + r.downloadCount, 0),
    }

    return NextResponse.json(
      {
        classes,
        overallStats,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
