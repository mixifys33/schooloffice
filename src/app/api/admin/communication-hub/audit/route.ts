/**
 * Communication Hub Audit API Route
 * Requirements: 9.5-9.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubAuditService } from '@/services/hub-audit.service'
import { AuditFilters, HubAuditActionType } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/audit
 * Fetches audit logs with filtering support
 * Only accessible by Super Admin role
 * Requirements: 9.6, 9.7
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

    // Parse query parameters
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

    // Get audit logs with filters
    const auditLogs = await hubAuditService.getAuditLogs(filters)

    return NextResponse.json({ auditLogs })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid date')) {
        return NextResponse.json({ 
          error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)' 
        }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/communication-hub/audit
 * BLOCKED: Creating audit logs directly is not allowed
 * Requirements: 9.5 - Audit log must be immutable and tamper-evident
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Direct audit log creation is not allowed. Audit logs are created automatically by system actions.' 
  }, { status: 405 })
}

/**
 * PUT /api/admin/communication-hub/audit
 * BLOCKED: Updating audit logs is not allowed
 * Requirements: 9.5 - Audit log must be immutable and tamper-evident
 */
export async function PUT(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Audit log modification is not allowed. Audit logs are immutable and tamper-evident.' 
  }, { status: 405 })
}

/**
 * DELETE /api/admin/communication-hub/audit
 * BLOCKED: Deleting audit logs is not allowed
 * Requirements: 9.5 - Audit log must be immutable and tamper-evident
 */
export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Audit log deletion is not allowed. Audit logs are immutable and tamper-evident.' 
  }, { status: 405 })
}