/**
 * Download Report API
 * POST - Download report as HTML (can be printed to PDF by browser)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { pdfGenerationService } from '@/services/pdf-generation.service'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get report data from request body
    const body = await request.json()
    const { report } = body

    if (!report || !report.reportType) {
      return NextResponse.json(
        { error: 'Invalid report data' },
        { status: 400 }
      )
    }

    // Generate HTML
    const html = pdfGenerationService.generateHTML(report)

    // Return HTML response
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="report-${report.student.admissionNumber}-${report.reportType}.html"`,
      },
    })

  } catch (error: any) {
    console.error('❌ [API] /api/class-teacher/reports/download - POST - Error:', error)
    
    return NextResponse.json(
      { error: 'Failed to download report', details: error.message },
      { status: 500 }
    )
  }
}
