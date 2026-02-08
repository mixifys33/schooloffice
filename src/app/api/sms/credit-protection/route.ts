/**
 * SMS Credit Protection API
 * Manage SMS credit protection settings
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * GET /api/sms/credit-protection
 * Get credit protection settings for school
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const schoolId = searchParams.get('schoolId')

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School ID is required' },
        { status: 400 }
      )
    }

    const protection = await prisma.sMSCreditProtection.findUnique({
      where: { schoolId }
    })

    // Return default settings if none exist
    const defaultProtection = {
      schoolId,
      enableProtection: true,
      minimumBalance: 50,
      emergencyReserve: 20,
      blockOnZeroBalance: true,
      dailyLimits: {
        announcement: 5,
        emergency: 3,
        feesReminder: 50
      },
      termLimits: {
        emergency: 10,
        maxPerStudent: 20
      }
    }

    return NextResponse.json({
      success: true,
      protection: protection || defaultProtection
    })
  } catch (error) {
    console.error('Error fetching credit protection:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit protection settings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sms/credit-protection
 * Update credit protection settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const userRole = (session.user as { role?: string })?.role
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(userRole || '')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const { schoolId, settings } = await request.json()

    if (!schoolId || !settings) {
      return NextResponse.json(
        { error: 'School ID and settings are required' },
        { status: 400 }
      )
    }

    const protection = await prisma.sMSCreditProtection.upsert({
      where: { schoolId },
      update: {
        enableProtection: settings.enableProtection,
        minimumBalance: settings.minimumBalance,
        emergencyReserve: settings.emergencyReserve,
        blockOnZeroBalance: settings.blockOnZeroBalance,
        dailyLimits: settings.dailyLimits,
        termLimits: settings.termLimits,
        updatedAt: new Date()
      },
      create: {
        schoolId,
        enableProtection: settings.enableProtection,
        minimumBalance: settings.minimumBalance,
        emergencyReserve: settings.emergencyReserve,
        blockOnZeroBalance: settings.blockOnZeroBalance,
        dailyLimits: settings.dailyLimits,
        termLimits: settings.termLimits
      }
    })

    return NextResponse.json({
      success: true,
      protection
    })
  } catch (error) {
    console.error('Error updating credit protection:', error)
    return NextResponse.json(
      { error: 'Failed to update credit protection settings' },
      { status: 500 }
    )
  }
}