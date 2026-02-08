/**
 * Automated Finance Reminders Endpoint
 * Triggered by Vercel Cron at 08:00 AM daily
 * 
 * SECURITY:
 * - Only accessible via Vercel Cron (checks authorization header)
 * - Runs automation for ALL active schools
 * - Safe to run multiple times per day (internal checks prevent duplicates)
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
        console.error('[CRON] CRON_SECRET not configured')
        return NextResponse.json(
          { error: 'Server misconfiguration' },
          { status: 500 }
        )
      }

      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error('[CRON] Unauthorized cron request')
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    console.log('[CRON] Starting automated finance reminders for all schools...')

    // Fetch all active schools with automation enabled
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
        // Check if this school has automation enabled
        const settings = await prisma.financeSettings.findUnique({
          where: { schoolId: school.id }
        })

        if (!settings?.enableAutomatedReminders) {
          console.log(`[CRON] School ${school.code}: Automation disabled, skipping`)
          continue
        }

        console.log(`[CRON] Processing school: ${school.name} (${school.code})`)

        const result = await financeNotificationService.runAutomatedFeeReminders(school.id, false)

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

        console.log(`[CRON] School ${school.code}: ${result.sent} sent, ${result.failed} failed`)

      } catch (schoolError) {
        console.error(`[CRON] Error processing school ${school.code}:`, schoolError)
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

    console.log(`[CRON] Completed: ${schoolsProcessed} schools, ${totalSent} messages sent, ${totalFailed} failed`)

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
    console.error('[CRON] Fatal error in finance reminders cron:', error)
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
    const { schoolId, dryRun } = body

    if (!schoolId) {
      return NextResponse.json(
        { error: 'schoolId is required' },
        { status: 400 }
      )
    }

    console.log(`[MANUAL] Running finance reminders for school ${schoolId}, dryRun: ${dryRun}`)

    const result = await financeNotificationService.runAutomatedFeeReminders(schoolId, dryRun || false)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    })

  } catch (error) {
    console.error('[MANUAL] Error in manual finance reminders trigger:', error)
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
