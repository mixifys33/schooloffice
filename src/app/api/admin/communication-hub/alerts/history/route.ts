/**
 * Communication Hub Alert History API Route
 * Requirements: 6.8
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubAlertService } from '@/services/hub-alert.service'
import { AlertFilters, HubAlertType, HubAlertSeverity } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/alerts/history
 * Fetches alert history with filtering support
 * Only accessible by Super Admin role
 * Requirements: 6.8
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
    const filters: AlertFilters = {}

    // Type filter
    const type = searchParams.get('type')
    if (type && Object.values(HubAlertType).includes(type as HubAlertType)) {
      filters.type = type as HubAlertType
    }

    // Severity filter
    const severity = searchParams.get('severity')
    if (severity && Object.values(HubAlertSeverity).includes(severity as HubAlertSeverity)) {
      filters.severity = severity as HubAlertSeverity
    }

    // School filter
    const schoolId = searchParams.get('schoolId')
    if (schoolId) {
      filters.schoolId = schoolId
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

    // Acknowledged filter
    const acknowledged = searchParams.get('acknowledged')
    if (acknowledged !== null) {
      filters.acknowledged = acknowledged === 'true'
    }

    // Get alert history with filters
    const alerts = await hubAlertService.getAlertHistory(filters)

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error fetching alert history:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid date')) {
        return NextResponse.json({ 
          error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)' 
        }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch alert history' },
      { status: 500 }
    )
  }
}