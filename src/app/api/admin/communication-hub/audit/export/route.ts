/**
 * Communication Hub Audit Export API Route
 * Requirements: 9.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubAuditService } from '@/services/hub-audit.service'
import { AuditFilters, HubAuditActionType } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/audit/export
 * Exports audit logs as CSV for compliance purposes
 * Only accessible by Super Admin role
 * Requirements: 9.7
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters (same as audit route)
    const { searchParams } = new URL(request.url)
    
    // Build filters from query parameters
    const filters: AuditFilters = {}

    // Admin ID filter
    const adminId = searchParams.get('adminId')
    if (adminId) {
      filters.adminId = adminId
    }

    // Action filter
    const action = searchParams.get('action')
    if (action && Object.values(HubAuditActionType).includes(action as HubAuditActionType)) {
      filters.action = action as HubAuditActionType
    }

    // Target type filter
    const targetType = searchParams.get('targetType')
    if (targetType) {
      const validTargetTypes = ['school', 'queue', 'template', 'quota', 'alert']
      if (validTargetTypes.includes(targetType)) {
        filters.targetType = targetType as 'school' | 'queue' | 'template' | 'quota' | 'alert'
      }
    }

    // Target ID filter
    const targetId = searchParams.get('targetId')
    if (targetId) {
      filters.targetId = targetId
    }

    // Date range filter
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate || endDate) {
      filters.dateRange = {}
      if (startDate) {
        filters.dateRange.start = new Date(startDate)
      }
      if (endDate) {
        filters.dateRange.end = new Date(endDate)
      }
    }

    // Export audit logs
    const csvBuffer = await hubAuditService.exportAuditLogs(filters)

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `communication-hub-audit-export-${timestamp}.csv`

    // Return CSV file
    return new NextResponse(csvBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': csvBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid date')) {
        return NextResponse.json({ 
          error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)' 
        }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    )
  }
}