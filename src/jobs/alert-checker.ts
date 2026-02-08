/**
 * Alert Checker Background Job
 * 
 * This job checks alert conditions for all schools on an hourly basis.
 * It can be run:
 * 1. As a standalone script: `npx ts-node src/jobs/alert-checker.ts`
 * 2. Via cron scheduler: See src/jobs/scheduler.ts
 * 3. Via external cron: Add to system crontab
 * 
 * Requirements: 5.6 - Background job for hourly alert checking
 */

import { alertService } from '@/services/alert.service'

/**
 * Main job execution function
 */
export async function runAlertChecking(): Promise<void> {
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] Starting alert checking job...`)

  try {
    // Check alerts for all schools
    await alertService.checkAlerts()

    const duration = Date.now() - startTime
    console.log(
      `[${new Date().toISOString()}] Alert checking completed successfully in ${duration}ms`
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(
      `[${new Date().toISOString()}] Alert checking failed after ${duration}ms:`,
      error
    )
    
    // Log detailed error information
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }

    // Re-throw to allow caller to handle
    throw error
  }
}

/**
 * Run the job if this file is executed directly
 */
if (require.main === module) {
  runAlertChecking()
    .then(() => {
      console.log('Job completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Job failed:', error)
      process.exit(1)
    })
}
