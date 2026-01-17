/**
 * School SMS Limit API Route
 * Requirement 16.3: Set daily SMS limit for flagged schools
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/admin/schools/[id]/sms-limit
 * Set daily SMS limit for a school (throttling)
 * Only accessible by Super Admin role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id: schoolId } = await params
    const body = await request.json()
    const { dailyLimit } = body

    if (dailyLimit === undefined || dailyLimit === null) {
      return NextResponse.json(
        { error: 'dailyLimit is required' },
        { status: 400 }
      )
    }

    if (typeof dailyLimit !== 'number' || dailyLimit < 0) {
      return NextResponse.json(
        { error: 'dailyLimit must be a non-negative number' },
        { status: 400 }
      )
    }

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, features: true },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Update school features with daily SMS limit
    const currentFeatures = school.features as Record<string, unknown> || {}
    const updatedFeatures = {
      ...currentFeatures,
      dailySmsLimit: dailyLimit,
      smsThrottled: dailyLimit > 0,
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        features: updatedFeatures,
      },
      select: {
        id: true,
        name: true,
        features: true,
      },
    })

    // Log the action
    if (session.user.id) {
      await prisma.auditLog.create({
        data: {
          schoolId,
          userId: session.user.id,
          action: 'SET_SMS_LIMIT',
          resource: 'School',
          resourceId: schoolId,
          previousValue: { dailySmsLimit: currentFeatures.dailySmsLimit || null },
          newValue: { dailySmsLimit: dailyLimit },
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: dailyLimit > 0 
        ? `Daily SMS limit set to ${dailyLimit} for ${school.name}`
        : `SMS throttling removed for ${school.name}`,
      school: {
        id: updatedSchool.id,
        name: updatedSchool.name,
        dailySmsLimit: dailyLimit,
        smsThrottled: dailyLimit > 0,
      },
    })
  } catch (error) {
    console.error('Error setting SMS limit:', error)
    return NextResponse.json(
      { error: 'Failed to set SMS limit' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/schools/[id]/sms-limit
 * Get current SMS limit for a school
 * Only accessible by Super Admin role
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Super Admin
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Super Admin access required' }, { status: 403 })
    }

    const { id: schoolId } = await params

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        features: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    const features = school.features as Record<string, unknown> || {}

    return NextResponse.json({
      schoolId: school.id,
      schoolName: school.name,
      dailySmsLimit: features.dailySmsLimit || null,
      smsThrottled: features.smsThrottled || false,
    })
  } catch (error) {
    console.error('Error getting SMS limit:', error)
    return NextResponse.json(
      { error: 'Failed to get SMS limit' },
      { status: 500 }
    )
  }
}
