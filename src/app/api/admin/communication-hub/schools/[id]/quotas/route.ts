/**
 * Communication Hub School Quotas API Route
 * Requirements: 4.1-4.3, 4.7, 4.8
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { communicationHubService } from '@/services/communication-hub.service'
import { QuotaUpdate } from '@/types/communication-hub'

/**
 * GET /api/admin/communication-hub/schools/[id]/quotas
 * Fetches quota configuration for a specific school
 * Only accessible by Super Admin role
 * Requirements: 4.1, 4.2, 4.3, 4.8
 */
export async function GET(
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

    // Get school quotas
    const quotas = await communicationHubService.getSchoolQuotas(schoolId)

    return NextResponse.json(quotas)
  } catch (error) {
    console.error('Error fetching school quotas:', error)
    
    if (error instanceof Error) {
      if (error.message === 'School not found') {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch school quotas' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/communication-hub/schools/[id]/quotas
 * Updates quota configuration for a specific school
 * Only accessible by Super Admin role
 * Requirements: 4.1, 4.2, 4.3, 4.7
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
    const quotas: QuotaUpdate = await request.json()

    // Validate required fields
    const validFields = [
      'smsLimitDaily', 'smsLimitMonthly',
      'whatsappLimitDaily', 'whatsappLimitMonthly',
      'emailLimitDaily', 'emailLimitMonthly'
    ]

    const hasValidField = validFields.some(field => 
      quotas[field as keyof QuotaUpdate] !== undefined
    )

    if (!hasValidField) {
      return NextResponse.json({ 
        error: 'At least one quota field must be provided' 
      }, { status: 400 })
    }

    // Get client IP for audit logging
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Update school quotas
    await communicationHubService.updateSchoolQuotas(schoolId, quotas, {
      adminId: session.user.id,
      adminEmail: session.user.email || 'unknown',
      ipAddress,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'School quotas updated successfully' 
    })
  } catch (error) {
    console.error('Error updating school quotas:', error)
    
    if (error instanceof Error) {
      if (error.message === 'School not found') {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }
      if (error.message.includes('limit cannot exceed')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      if (error.message.includes('cannot be negative')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to update school quotas' },
      { status: 500 }
    )
  }
}