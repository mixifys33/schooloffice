/**
 * Communication Hub Report Export API Route
 * Requirements: 8.5
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubReportService } from '@/services/hub-report.service'

/**
 * GET /api/admin/communication-hub/reports/[id]/export
 * Exports a specific report as CSV or PDF
 * Only accessible by Super Admin role
 * Requirements: 8.5
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Super Admin access required' 
      }, { status: 403 })
    }

    const reportId = params.id
    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'csv'

    // Validate format
    if (!['csv', 'pdf'].includes(format)) {
      return NextResponse.json({ 
        error: 'Invalid format. Must be csv or pdf' 
      }, { status: 400 })
    }

    // Export the report
    const exportBuffer = await hubReportService.exportReport(reportId, format as 'csv' | 'pdf')

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `communication-hub-report-${reportId}-${timestamp}.${format}`

    // Set appropriate content type and headers
    const contentType = format === 'csv' ? 'text/csv' : 'application/pdf'

    return new NextResponse(exportBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': exportBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error exporting report:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }
      if (error.message.includes('Unsupported export format')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    )
  }
}