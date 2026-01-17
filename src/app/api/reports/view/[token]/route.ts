/**
 * Report Card View API Route
 * GET: Fetch report card data via secure link token
 * Requirements: 7.5 - Deliver via SMS link or email for paid students
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { secureLinkService } from '@/services/secure-link.service'
import { ResultsService } from '@/services/results.service'

const resultsService = new ResultsService()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Get client IP for logging
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0] || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    // Validate and access the secure link
    const accessResult = await secureLinkService.accessReportCard(
      token,
      ipAddress,
      userAgent
    )

    if (!accessResult.success) {
      const errorMessage = accessResult.error?.message || 'Invalid or expired link'
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      )
    }

    const reportCardId = accessResult.reportCardId
    if (!reportCardId) {
      return NextResponse.json(
        { error: 'Report card not found' },
        { status: 404 }
      )
    }

    // Get the published report card
    const publishedReport = await prisma.publishedReportCard.findUnique({
      where: { id: reportCardId },
      include: {
        result: true,
      },
    })

    if (!publishedReport) {
      return NextResponse.json(
        { error: 'Report card not found' },
        { status: 404 }
      )
    }

    if (!publishedReport.isAccessible) {
      return NextResponse.json(
        { error: 'Report card access has been revoked' },
        { status: 403 }
      )
    }

    // Generate fresh report card data
    const reportCardData = await resultsService.generateReportCardData(
      publishedReport.studentId,
      publishedReport.termId
    )

    if (!reportCardData) {
      return NextResponse.json(
        { error: 'Unable to load report card data' },
        { status: 500 }
      )
    }

    // Return the report card data
    return NextResponse.json({
      reportCard: {
        student: reportCardData.student,
        school: reportCardData.school,
        term: reportCardData.term,
        subjects: reportCardData.subjects,
        summary: reportCardData.summary,
        remarks: reportCardData.remarks,
        generatedAt: reportCardData.generatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error fetching report card:', error)
    return NextResponse.json(
      { error: 'Failed to load report card' },
      { status: 500 }
    )
  }
}
