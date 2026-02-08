/**
 * Job Scheduler
 * 
 * This module sets up scheduled background jobs using node-cron.
 * 
 * To use this scheduler:
 * 1. Install node-cron: `npm install node-cron @types/node-cron`
 * 2. Import and call startScheduler() in your application startup
 * 3. Or run as standalone: `npx ts-node src/jobs/scheduler.ts`
 * 
 * Cron Schedule Format:
 * ┌────────────── second (optional, 0-59)
 * │ ┌──────────── minute (0-59)
 * │ │ ┌────────── hour (0-23)
 * │ │ │ ┌──────── day of month (1-31)
 * │ │ │ │ ┌────── month (1-12)
 * │ │ │ │ │ ┌──── day of week (0-7, 0 and 7 are Sunday)
 * │ │ │ │ │ │
 * * * * * * *
 * 
 * Examples:
 * - Daily at midnight
 * - Daily at 2:00 AM  
 * - Every 6 hours
 * - Every 30 minutes
 */

import { runHealthScoreCalculation } from './health-score-calculator'
import { runAlertChecking } from './alert-checker'
import { financeNotificationService } from '../services/finance-notification.service'
import { prisma } from '@/lib/db'

// Type definitions for node-cron (if not installed, this will be ignored)
type CronJob = {
  start: () => void
  stop: () => void
}

type CronSchedule = (
  schedule: string,
  func: () => void | Promise<void>,
  options?: { timezone?: string }
) => CronJob

/**
 * Job registry to track all scheduled jobs
 */
const jobs: Map<string, CronJob> = new Map()

/**
 * Start all scheduled jobs
 * 
 * Note: This function requires node-cron to be installed.
 * If node-cron is not available, jobs must be scheduled externally.
 */
export function startScheduler(): void {
  console.log(`[${new Date().toISOString()}] Starting job scheduler...`)

  try {
    // Try to load node-cron
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cron = require('node-cron') as { schedule: CronSchedule }

    // Schedule health score calculation job
    // Runs daily at 2:00 AM
    const healthScoreJob = cron.schedule(
      '0 2 * * *',
      async () => {
        try {
          await runHealthScoreCalculation()
        } catch (error) {
          console.error('Health score calculation job failed:', error)
          // Don't throw - let the job continue to run on schedule
        }
      },
      {
        timezone: 'Africa/Kampala', // Uganda timezone
      }
    )

    jobs.set('health-score-calculation', healthScoreJob)
    healthScoreJob.start()

    console.log(
      `[${new Date().toISOString()}] Scheduled health score calculation job (daily at 2:00 AM Africa/Kampala)`
    )

    // Schedule alert checking job
    // Runs every hour at the top of the hour
    const alertCheckJob = cron.schedule(
      '0 * * * *',
      async () => {
        try {
          await runAlertChecking()
        } catch (error) {
          console.error('Alert checking job failed:', error)
          // Don't throw - let the job continue to run on schedule
        }
      },
      {
        timezone: 'Africa/Kampala', // Uganda timezone
      }
    )

    jobs.set('alert-checking', alertCheckJob)
    alertCheckJob.start()

    console.log(
      `[${new Date().toISOString()}] Scheduled alert checking job (hourly at :00 Africa/Kampala)`
    )

    // Schedule Automated Fee Reminders
    // Runs daily at 8:00 AM
    const feeAutomationJob = cron.schedule(
      '0 8 * * *',
      async () => {
        try {
          console.log(`[${new Date().toISOString()}] Starting daily fee automation job...`)
          const schools = await prisma.school.findMany({ where: { isActive: true } })

          for (const school of schools) {
            await financeNotificationService.runAutomatedFeeReminders(school.id)
          }
          console.log(`[${new Date().toISOString()}] Daily fee automation job completed`)
        } catch (error) {
          console.error('Fee automation job failed:', error)
        }
      },
      {
        timezone: 'Africa/Kampala',
      }
    )

    jobs.set('fee-automation', feeAutomationJob)
    feeAutomationJob.start()

    console.log(
      `[${new Date().toISOString()}] Scheduled fee automation job (daily at 8:00 AM Africa/Kampala)`
    )

    console.log(`[${new Date().toISOString()}] Job scheduler started successfully`)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      console.warn(
        '[WARN] node-cron is not installed. Background jobs must be scheduled externally.'
      )
      console.warn('To enable built-in scheduling, run: npm install node-cron @types/node-cron')
      console.warn('Alternatively, use system cron or a task scheduler to run:')
      console.warn('  npx ts-node src/jobs/health-score-calculator.ts')
      console.warn('  npx ts-node src/jobs/alert-checker.ts')
    } else {
      console.error('Failed to start job scheduler:', error)
      throw error
    }
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler(): void {
  console.log(`[${new Date().toISOString()}] Stopping job scheduler...`)

  for (const [name, job] of jobs.entries()) {
    job.stop()
    console.log(`[${new Date().toISOString()}] Stopped job: ${name}`)
  }

  jobs.clear()
  console.log(`[${new Date().toISOString()}] Job scheduler stopped`)
}

/**
 * Get status of all scheduled jobs
 */
export function getSchedulerStatus(): {
  running: boolean
  jobs: string[]
} {
  return {
    running: jobs.size > 0,
    jobs: Array.from(jobs.keys()),
  }
}

/**
 * Run the scheduler if this file is executed directly
 */
if (require.main === module) {
  startScheduler()

  // Keep the process running
  console.log('Scheduler is running. Press Ctrl+C to stop.')

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT, stopping scheduler...')
    stopScheduler()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM, stopping scheduler...')
    stopScheduler()
    process.exit(0)
  })
}
