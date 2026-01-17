/**
 * Communication Hub Message Logs API Route
 * Requirements: 3.1-3.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { messageLogService } from '@/services/message-log.service'
import { MessageLogFilters, MessageChannel } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/logs
 * Fetches unified message logs across all channels with filtering and search
 * Only accessible by Super Admin role
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7
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
    const filters: MessageLogFilters = {}

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

    // Channel filter
    const channel = searchParams.get('channel')
    if (channel && Object.values(MessageChannel).includes(channel as MessageChannel)) {
      filters.channel = channel as MessageChannel
    }

    // Status filter
    const status = searchParams.get('status')
    if (status) {
      filters.status = status
    }

    // Search query for recipient phone/email
    const searchQuery = searchParams.get('search')
    if (searchQuery) {
      filters.searchQuery = searchQuery
    }

    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)

    // Validate pagination parameters
    if (page < 1 || pageSize < 1 || pageSize > 1000) {
      return NextResponse.json({ 
        error: 'Invalid pagination parameters' 
      }, { status: 400 })
    }

    // Get paginated message logs
    const result = await messageLogService.getPaginatedMessageLogs(
      filters,
      page,
      pageSize
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching message logs:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid date')) {
        return NextResponse.json({ 
          error: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)' 
        }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch message logs' },
      { status: 500 }
    )
  }
}