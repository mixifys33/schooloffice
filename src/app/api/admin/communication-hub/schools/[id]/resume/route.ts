/**
 * Communication Hub School Resume API Route
 * Requirements: 2.7, 2.8
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { communicationHubService } from '@/services/communication-hub.service'

/**
 * POST /api/admin/communication-hub/schools/[id]/resume
 * Resumes messaging for a specific school
 * Only accessible by Super Admin role
 * Requirements: 2.7, 2.8
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

    // Get client IP for audit logging
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Resume school messaging
    await communicationHubService.resumeSchoolMessaging(schoolId, {
      adminId: session.user.id,
      adminEmail: session.user.email || 'unknown',
      ipAddress,
    })

    return NextResponse.json({ 
      success: true, 
      message: 'School messaging resumed successfully' 
    })
  } catch (error) {
    console.error('Error resuming school messaging:', error)
    
    if (error instanceof Error) {
      if (error.message === 'School not found') {
        return NextResponse.json({ error: 'School not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to resume school messaging' },
      { status: 500 }
    )
  }
}