/**
 * Communication Hub Dashboard Overview API Route
 * Requirements: 1.1-1.9
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { communicationHubService } from '@/services/communication-hub.service'

/**
 * GET /api/admin/communication-hub/overview
 * Fetches dashboard overview with real-time messaging statistics
 * Only accessible by Super Admin role
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin - Requirement 1.1-1.9
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Super Admin access required' 
      }, { status: 403 })
    }

    // Get dashboard overview data
    const overview = await communicationHubService.getDashboardOverview()

    return NextResponse.json(overview)
  } catch (error) {
    console.error('Error fetching communication hub overview:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communication hub overview' },
      { status: 500 }
    )
  }
}