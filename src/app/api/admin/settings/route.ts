/**
 * Super Admin System Settings API Route
 * Requirements: 17.1, 17.2, 17.3, 17.4
 * - GET: Get system rules configuration
 * - PUT: Update system rules (grace period, feature lock order, pilot limits)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { SubscriptionService } from '@/services/subscription.service'
import type { SystemRules } from '@/types'

const subscriptionService = new SubscriptionService()

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is Super Admin
    const userRole = (session.user as { role?: string }).role
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super Admin privileges required.' },
        { status: 403 }
      )
    }

    const rules = await subscriptionService.getSystemRules()
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching system rules:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system rules' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is Super Admin
    const userRole = (session.user as { role?: string }).role
    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Access denied. Super Admin privileges required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      gracePeriodDays, 
      featureLockOrder, 
      pilotStudentLimit,
      pilotSmsLimit,
      pilotDurationDays 
    } = body

    // Validate grace period days
    if (gracePeriodDays !== undefined) {
      if (typeof gracePeriodDays !== 'number' || gracePeriodDays < 0 || gracePeriodDays > 90) {
        return NextResponse.json(
          { error: 'Grace period must be between 0 and 90 days' },
          { status: 400 }
        )
      }
    }

    // Validate feature lock order
    if (featureLockOrder !== undefined) {
      if (!Array.isArray(featureLockOrder)) {
        return NextResponse.json(
          { error: 'Feature lock order must be an array' },
          { status: 400 }
        )
      }
      const validFeatures = ['SMS', 'REPORTS', 'FULL_ACCESS']
      for (const feature of featureLockOrder) {
        if (!validFeatures.includes(feature)) {
          return NextResponse.json(
            { error: `Invalid feature: ${feature}. Valid features are: ${validFeatures.join(', ')}` },
            { status: 400 }
          )
        }
      }
    }

    // Validate pilot limits
    if (pilotStudentLimit !== undefined) {
      if (typeof pilotStudentLimit !== 'number' || pilotStudentLimit < 1 || pilotStudentLimit > 500) {
        return NextResponse.json(
          { error: 'Pilot student limit must be between 1 and 500' },
          { status: 400 }
        )
      }
    }

    if (pilotSmsLimit !== undefined) {
      if (typeof pilotSmsLimit !== 'number' || pilotSmsLimit < 0 || pilotSmsLimit > 1000) {
        return NextResponse.json(
          { error: 'Pilot SMS limit must be between 0 and 1000' },
          { status: 400 }
        )
      }
    }

    if (pilotDurationDays !== undefined) {
      if (typeof pilotDurationDays !== 'number' || pilotDurationDays < 7 || pilotDurationDays > 365) {
        return NextResponse.json(
          { error: 'Pilot duration must be between 7 and 365 days' },
          { status: 400 }
        )
      }
    }

    const userId = (session.user as { id?: string }).id || 'system'
    
    const updateData: Partial<SystemRules> = {
      updatedBy: userId
    }
    
    if (gracePeriodDays !== undefined) updateData.gracePeriodDays = gracePeriodDays
    if (featureLockOrder !== undefined) updateData.featureLockOrder = featureLockOrder
    if (pilotStudentLimit !== undefined) updateData.pilotStudentLimit = pilotStudentLimit
    if (pilotSmsLimit !== undefined) updateData.pilotSmsLimit = pilotSmsLimit
    if (pilotDurationDays !== undefined) updateData.pilotDurationDays = pilotDurationDays

    const updatedRules = await subscriptionService.updateSystemRules(updateData)

    return NextResponse.json({ 
      success: true, 
      message: 'System rules updated successfully. Changes will apply to all schools on next daily check.',
      rules: updatedRules
    })
  } catch (error) {
    console.error('Error updating system rules:', error)
    return NextResponse.json(
      { error: 'Failed to update system rules' },
      { status: 500 }
    )
  }
}
