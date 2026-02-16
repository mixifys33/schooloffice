/**
 * GET /api/dos/reports/report/[reportId]/preview
 * Preview individual report PDF
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

    // Return report details with PDF URL
    return NextResponse.json(
      {
        id: reportCard.id,
        student: {
          id: reportCard.student.id,
          name: `${reportCard.student.firstName} ${reportCard.student.lastName}`,
          admissionNumber: reportCard.student.admissionNumber,
        },
        class: reportCard.class,
        term: reportCard.term,
        status: reportCard.status,
        pdfUrl: reportCard.pdfUrl,
        pdfSize: reportCard.pdfSize,
        generatedAt: reportCard.generatedAt,
        approvedAt: reportCard.approvedAt,
        publishedAt: reportCard.publishedAt,
        downloadCount: reportCard.downloadCount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error previewing report:', error)
    return NextResponse.json(
      { error: 'Failed to preview report' },
      { status: 500 }
    )
  }
}
