/**
 * Bursar Automation Settings API
 * Manage automated fee reminder settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - Fetch automation settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId')

    if (!termId) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 })
    }

    const settings = await prisma.financeSettings.findUnique({
      where: { 
        schoolId_termId: { 
          schoolId: session.user.schoolId, 
          termId: termId 
        } 
      }
    })

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        enableAutomatedReminders: settings.enableAutomatedReminders,
        automationFrequency: settings.automationFrequency,
        automationDayOfWeek: settings.automationDayOfWeek,
        gracePeriodDays: settings.gracePeriodDays,
        maxRemindersPerMilestone: settings.maxRemindersPerMilestone,
        paymentMilestones: settings.paymentMilestones,
        lastAutomationRunAt: settings.lastAutomationRunAt,
        lockedAt: settings.lockedAt
      }
    })
  } catch (error) {
    console.error('Error fetching automation settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

// POST - Update automation settings
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is bursar or admin
    if (!['ACCOUNTANT', 'SCHOOL_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      enableAutomatedReminders,
      automationFrequency,
      automationDayOfWeek,
      gracePeriodDays,
      maxRemindersPerMilestone,
      paymentMilestones,
      termId
    } = body

    if (!termId) {
      return NextResponse.json({ error: 'Term ID is required' }, { status: 400 })
    }

    // Validate payment milestones if provided
    if (paymentMilestones) {
      const milestones = paymentMilestones as Array<{ week: number; percentage: number }>
      const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0)
      
      if (Math.abs(totalPercentage - 100) > 0.1) {
        return NextResponse.json(
          { error: `Payment milestones must total 100%. Current total: ${totalPercentage}%` },
          { status: 400 }
        )
      }
    }

    const settings = await prisma.financeSettings.findUnique({
      where: { schoolId_termId: { schoolId: session.user.schoolId, termId: termId } }
    })

    if (!settings) {
      return NextResponse.json({ error: 'Settings not found' }, { status: 404 })
    }

    // Check if settings are locked
    if (settings.lockedAt && paymentMilestones) {
      return NextResponse.json(
        { error: 'Settings are locked. Cannot change milestones after term has started.' },
        { status: 400 }
      )
    }

    const updated = await prisma.financeSettings.update({
      where: { schoolId_termId: { schoolId: session.user.schoolId, termId: termId } },
      data: {
        enableAutomatedReminders,
        automationFrequency,
        automationDayOfWeek,
        gracePeriodDays,
        maxRemindersPerMilestone,
        paymentMilestones: paymentMilestones || settings.paymentMilestones
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        schoolId: session.user.schoolId,
        userId: session.user.id,
        action: 'UPDATE_AUTOMATION_SETTINGS',
        resource: 'FinanceSettings',
        resourceId: settings.id,
        newValue: {
          enableAutomatedReminders,
          automationFrequency,
          gracePeriodDays,
          maxRemindersPerMilestone
        },
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      settings: {
        enableAutomatedReminders: updated.enableAutomatedReminders,
        automationFrequency: updated.automationFrequency,
        automationDayOfWeek: updated.automationDayOfWeek,
        gracePeriodDays: updated.gracePeriodDays,
        maxRemindersPerMilestone: updated.maxRemindersPerMilestone,
        paymentMilestones: updated.paymentMilestones,
        lastAutomationRunAt: updated.lastAutomationRunAt,
        lockedAt: updated.lockedAt
      }
    })
  } catch (error) {
    console.error('Error updating automation settings:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
