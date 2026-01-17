/**
 * Communication Hub Alert Settings API Route
 * Requirements: 6.4, 6.5, 6.6
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hubAlertService } from '@/services/hub-alert.service'
import { AlertSettingsUpdate } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/alerts/settings
 * Fetches current alert settings
 * Only accessible by Super Admin role
 * Requirements: 6.4
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

    // Get alert settings
    const settings = await hubAlertService.getAlertSettings()

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching alert settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alert settings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/communication-hub/alerts/settings
 * Updates alert settings
 * Only accessible by Super Admin role
 * Requirements: 6.4, 6.5, 6.6
 */
export async function PUT(request: NextRequest) {
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

    // Parse request body
    const updates: AlertSettingsUpdate = await request.json()

    // Validate settings
    if (updates.deliveryFailureThreshold !== undefined) {
      if (updates.deliveryFailureThreshold < 0 || updates.deliveryFailureThreshold > 100) {
        return NextResponse.json({ 
          error: 'Delivery failure threshold must be between 0 and 100' 
        }, { status: 400 })
      }
    }

    if (updates.queueStuckThreshold !== undefined) {
      if (updates.queueStuckThreshold < 60) {
        return NextResponse.json({ 
          error: 'Queue stuck threshold must be at least 60 seconds' 
        }, { status: 400 })
      }
    }

    if (updates.lowBalanceThreshold !== undefined) {
      if (updates.lowBalanceThreshold < 0) {
        return NextResponse.json({ 
          error: 'Low balance threshold must be non-negative' 
        }, { status: 400 })
      }
    }

    if (updates.abnormalUsageMultiplier !== undefined) {
      if (updates.abnormalUsageMultiplier < 1.0) {
        return NextResponse.json({ 
          error: 'Abnormal usage multiplier must be at least 1.0' 
        }, { status: 400 })
      }
    }

    if (updates.notificationEmails !== undefined) {
      if (!Array.isArray(updates.notificationEmails)) {
        return NextResponse.json({ 
          error: 'Notification emails must be an array' 
        }, { status: 400 })
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = updates.notificationEmails.filter(email => !emailRegex.test(email))
      if (invalidEmails.length > 0) {
        return NextResponse.json({ 
          error: `Invalid email addresses: ${invalidEmails.join(', ')}` 
        }, { status: 400 })
      }
    }

    if (updates.slackWebhookUrl !== undefined && updates.slackWebhookUrl) {
      try {
        new URL(updates.slackWebhookUrl)
      } catch {
        return NextResponse.json({ 
          error: 'Invalid Slack webhook URL' 
        }, { status: 400 })
      }
    }

    // Update alert settings
    await hubAlertService.updateAlertSettings(updates)

    return NextResponse.json({ 
      success: true, 
      message: 'Alert settings updated successfully' 
    })
  } catch (error) {
    console.error('Error updating alert settings:', error)
    return NextResponse.json(
      { error: 'Failed to update alert settings' },
      { status: 500 }
    )
  }
}