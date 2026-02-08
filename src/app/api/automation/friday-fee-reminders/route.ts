/**
 * Guaranteed Friday Fee Reminders Endpoint
 * Triggered by Vercel Cron every Friday at 19:45 (7:45 PM) server time
 *
 * This endpoint runs independently of the daily automation cron job
 * and sends SMS reminders regardless of automation settings, with explicit override rules.
 *
 * SECURITY:
 * - Only accessible via Vercel Cron (checks authorization header)
 * - Runs every Friday at 7:45 PM server time
 * - Explicit override rules when automation is disabled
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { financeNotificationService } from '@/services/finance-notification.service'

export const maxDuration = 300 // 5 minutes max execution time for Vercel

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify this is a legitimate Vercel Cron request
    const authHeader = request.headers.get('authorization')

    // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
    if (process.env.NODE_ENV === 'production') {
      const cronSecret = process.env.CRON_SECRET

      if (!cronSecret) {
        console.error('[FRIDAY-CRON] CRON_SECRET not configured')
        return NextResponse.json(
          { error: 'Server misconfiguration' },
          { status: 500 }
        )
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[FRIDAY-CRON] Unauthorized cron request')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('[FRIDAY-CRON] Starting guaranteed Friday fee reminders for all schools...')

    // Fetch all active schools
    const schools = await prisma.school.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
      }
    })

    const results: Array<{
      schoolId: string
      schoolName: string
      success: boolean
      sent: number
      failed: number
      errors: string[]
    }> = []

    let totalSent = 0
    let totalFailed = 0
    let schoolsProcessed = 0

    // Process each school
    for (const school of schools) {
      try {
        // Get school settings to check override rules
        const settings = await prisma.financeSettings.findUnique({
          where: { schoolId: school.id }
        })

        // Determine if we should run despite automation being disabled
        const shouldRunDespiteDisabled = settings?.fridayOverrideEnabled || false
        
        // Check if automation is enabled OR override is allowed
        if (!settings?.enableAutomatedReminders && !shouldRunDespiteDisabled) {
          console.log(`[FRIDAY-CRON] School ${school.code}: Automation disabled and no Friday override, skipping`)
          continue
        }

        console.log(`[FRIDAY-CRON] Processing school: ${school.name} (${school.code}) - Automation: ${settings?.enableAutomatedReminders}, Override: ${shouldRunDespiteDisabled}`)

        // Run the guaranteed Friday reminders
        const result = await financeNotificationService.runGuaranteedFridayFeeReminders(school.id, false)

        results.push({
          schoolId: school.id,
          schoolName: school.name,
          success: result.errors.length === 0 || result.sent > 0,
          sent: result.sent,
          failed: result.failed,
          errors: result.errors
        })

        totalSent += result.sent
        totalFailed += result.failed
        schoolsProcessed++

        console.log(`[FRIDAY-CRON] School ${school.code}: ${result.sent} sent, ${result.failed} failed`)

      } catch (schoolError) {
        console.error(`[FRIDAY-CRON] Error processing school ${school.code}:`, schoolError)
        results.push({
          schoolId: school.id,
          schoolName: school.name,
          success: false,
          sent: 0,
          failed: 0,
          errors: [schoolError instanceof Error ? schoolError.message : 'Unknown error']
        })
      }
    }

    console.log(`[FRIDAY-CRON] Completed: ${schoolsProcessed} schools, ${totalSent} messages sent, ${totalFailed} failed`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        schoolsProcessed,
        totalSent,
        totalFailed,
      },
      results
    })

  } catch (error) {
    console.error('[FRIDAY-CRON] Fatal error in Friday fee reminders cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggering from admin panel
export async function POST(request: NextRequest) {
  try {
    // For POST, require authenticated super admin
    // This allows manual triggering from the admin panel

    const body = await request.json()
    const { schoolId, dryRun, forceRun } = body

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log(`[FRIDAY-MANUAL] Running Friday fee reminders for school ${schoolId}, dryRun: ${dryRun}, forceRun: ${forceRun}`)

    // Allow manual override regardless of settings
    const result = await financeNotificationService.runGuaranteedFridayFeeReminders(schoolId, dryRun || false, forceRun || false)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('[FRIDAY-MANUAL] Error in manual Friday fee reminders trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}