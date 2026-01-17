/**
 * Communication Hub School Credits API Route
 * Requirements: 4.4, 4.6
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { communicationHubService } from '@/services/communication-hub.service'
import { MessageChannel } from '@/types/communication-hub'

interface AddCreditsRequestBody {
  channel: MessageChannel
  amount: number
}

interface EmergencyOverrideRequestBody {
  enabled: boolean
  reason?: string
}

/**
 * POST /api/admin/communication-hub/schools/[id]/credits
 * Adds credits to a school's balance for a specific channel
 * Only accessible by Super Admin role
 * Requirements: 4.4
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

    const schoolId = params.id
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    // Parse request body
    const body: AddCreditsRequestBody = await request.json()
    
    if (!body.channel) {
      return NextResponse.json({ 
        error: 'Channel is required' 
      }, { status: 400 })
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be a positive number' 
      }, { status: 400 })
    }

    // Validate channel
    const validChannels = Object.values(MessageChannel)
    if (!validChannels.includes(body.channel)) {
      return NextResponse.json({ 
        error: 'Invalid channel. Must be SMS, WHATSAPP, or EMAIL' 
      }, { status: 400 })
    }

    // Get client IP for audit logging
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Add credits
    await communicationHubService.addCredits(
      schoolId, 
      body.channel, 
      body.amount,
      {
        adminId: session.user.id,
        adminEmail: session.user.email || 'unknown',
        ipAddress,
      }
    )

    return NextResponse.json({ 
      success: true, 
      message: `${body.amount} credits added to ${body.channel} successfully` 
    })
  } catch (error) {
    console.error('Error adding school credits:', error)
    
    if (error instanceof Error) {
      if (error.message === 'School not found') {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }
      if (error.message.includes('not yet implemented')) {
        return NextResponse.json({ error: error.message }, { status: 501 })
      }
      if (error.message === 'Credit amount must be positive') {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to add school credits' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/communication-hub/schools/[id]/credits
 * Sets emergency override for a school
 * Only accessible by Super Admin role
 * Requirements: 4.6
 */
export async function PUT(
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

    const schoolId = params.id
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 })
    }

    // Parse request body
    const body: EmergencyOverrideRequestBody = await request.json()
    
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ 
        error: 'enabled field must be a boolean' 
      }, { status: 400 })
    }

    // Get client IP for audit logging
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Set emergency override
    await communicationHubService.setEmergencyOverride(
      schoolId, 
      body.enabled,
      {
        adminId: session.user.id,
        adminEmail: session.user.email || 'unknown',
        ipAddress,
        reason: body.reason,
      }
    )

    return NextResponse.json({ 
      success: true, 
      message: `Emergency override ${body.enabled ? 'enabled' : 'disabled'} successfully` 
    })
  } catch (error) {
    console.error('Error setting emergency override:', error)
    
    if (error instanceof Error) {
      if (error.message === 'School not found') {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to set emergency override' },
      { status: 500 }
    )
  }
}