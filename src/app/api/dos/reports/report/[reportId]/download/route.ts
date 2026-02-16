/**
 * GET /api/dos/reports/report/[reportId]/download
 * Download individual report PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params

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

    // Get report card
    const reportCard = await prisma.reportCard.findFirst({
      where: { id: reportId, schoolId },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    })

    if (!reportCard) {
      return NextResponse.json({ error: 'Report card not found' }, { status: 404 })
    }

    if (!reportCard.pdfUrl) {
      return NextResponse.json(
        { error: 'PDF not yet generated for this report' },
        { status: 404 }
      )
    }

    // Increment download count
    await prisma.reportCard.update({
      where: { id: reportId },
      data: {
        downloadCount: { increment: 1 },
        lastDownloadAt: new Date(),
      },
    })

    // Redirect to PDF URL (Cloudinary)
    return NextResponse.redirect(reportCard.pdfUrl)
  } catch (error) {
    console.error('Error downloading report:', error)
    return NextResponse.json(
      { error: 'Failed to download report' },
      { status: 500 }
    )
  }
}
