/**
 * Communication Hub Alert Dismiss API Route
 * Requirements: 6.7
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubAlertService } from '@/services/hub-alert.service'

/**
 * POST /api/admin/communication-hub/alerts/[id]/dismiss
 * Dismisses a specific alert
 * Only accessible by Super Admin role
 * Requirements: 6.7
 */
export async function POST(
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

    const alertId = params.id
    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    // Dismiss the alert
    await hubAlertService.dismissAlert(alertId)

    return NextResponse.json({ 
      success: true, 
      message: 'Alert dismissed successfully' 
    })
  } catch (error) {
    console.error('Error dismissing alert:', error)
    
    if (error instanceof Error) {
      if (error.message === 'Alert not found') {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
      }
      if (error.message === 'Alert already dismissed') {
        return NextResponse.json({ error: 'Alert already dismissed' }, { status: 409 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to dismiss alert' },
      { status: 500 }
    )
  }
}