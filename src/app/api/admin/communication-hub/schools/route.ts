/**
 * Communication Hub Schools API Route
 * Requirements: 2.1-2.9
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { communicationHubService } from '@/services/communication-hub.service'

/**
 * GET /api/admin/communication-hub/schools
 * Fetches messaging statistics for all schools
 * Only accessible by Super Admin role
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin - Requirement 2.1-2.9
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ 
        error: 'Forbidden - Super Admin access required' 
      }, { status: 403 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    // Get school messaging statistics
    const schools = await communicationHubService.getSchoolMessagingStats(
      schoolId || undefined
    )

    return NextResponse.json({ schools })
  } catch (error) {
    console.error('Error fetching school messaging stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch school messaging statistics' },
      { status: 500 }
    )
  }
}