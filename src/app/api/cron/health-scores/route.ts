/**
 * Vercel Cron Job API Route for Health Score Calculation
 * 
 * This API route is designed to be called by Vercel Cron Jobs.
 * 
 * Setup:
 * 1. Add to vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/cron/health-scores",
 *        "schedule": "0 2 * * *"
 *      }]
 *    }
 * 
 * 2. Set CRON_SECRET environment variable in Vercel
 * 
 * 3. Deploy to Vercel
 * 
 * Security:
 * - Requires CRON_SECRET in Authorization header
 * - Only accessible via Vercel Cron or with valid secret
 * 
 * Requirements: 4.8 - Background job for daily health score calculation
 */

import { NextRequest, NextResponse } from 'next/server'
import { runHealthScoreCalculation } from '@/jobs/health-score-calculator'

/**
 * GET handler for health score calculation cron job
 */
export async function GET(request: NextRequest) {
  // Verify the request is authorized
  const authHeader = request.headers.get('authorization')
  const expectedAuth = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null

  // If CRON_SECRET is not set, log a warning but allow execution in development
  if (!expectedAuth) {
    if (process.env.NODE_ENV === 'production') {
      console.error('CRON_SECRET is not set in production environment')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    } else {
      console.warn(
        'CRON_SECRET is not set. This is acceptable in development but required in production.'
      )
    }
  } else if (authHeader !== expectedAuth) {
    console.warn('Unauthorized cron job access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    console.log(`[${new Date().toISOString()}] Cron job triggered: health score calculation`)

    await runHealthScoreCalculation()

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      message: 'Health scores calculated successfully',
      duration,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const duration = Date.now() - startTime

    console.error('Cron job failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Job failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST handler (alternative method)
 */
export async function POST(request: NextRequest) {
  return GET(request)
}
