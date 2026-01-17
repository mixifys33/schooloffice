/**
 * Communication Hub Alerts API Route
 * Requirements: 6.1-6.8
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubAlertService } from '@/services/hub-alert.service'

/**
 * GET /api/admin/communication-hub/alerts
 * Fetches all active (non-dismissed) alerts
 * Only accessible by Super Admin role
 * Requirements: 6.7, 6.8
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

    // Get active alerts
    const alerts = await hubAlertService.getActiveAlerts()

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Error fetching active alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch active alerts' },
      { status: 500 }
    )
  }
}