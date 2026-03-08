/**
 * Cron Job for Automated Fee Reminders
 * 
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, or external cron)
 * to process automated fee reminders based on each school's automation settings.
 * 
 * Schedule: Run every hour to check if any school's automation should trigger
 * 
 * Vercel Cron Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/fee-reminders",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendSMS, formatPhoneNumber } from '@/services/sms.service';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CRON] Starting automated fee reminders check...');

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay(); // 0-6
    const currentDate = now.getDate(); // 1-31

    // Get all enabled automation settings
    const automationSettings = await prisma.feeReminderAutomation.findMany({
      where: { enabled: true },
      include: { school: true }
    });

    console.log(`[CRON] Found ${automationSettings.length} enabled automation(s)`);

    const results = [];

    for (const settings of automationSettings) {
      try {
        // Parse the time setting
        const [targetHour, targetMinute] = settings.time.split(':').map(Number);

        // Check if it's time to run based on frequency
        let shouldRun = false;

        // Check if we're within the target hour (allow 5-minute window)
        const isTargetTime = currentHour === targetHour && Math.abs(currentMinute - targetMinute) <= 5;

        if (!isTargetTime) {
          continue; // Skip if not the right time
        }

        switch (settings.frequency) {
          case 'daily':
            shouldRun = true;
            break;

          case 'weekly':
            shouldRun = currentDay === settings.dayOfWeek;
            break;

          case 'biweekly':
            // Check if it's been at least 13 days since last run
            if (settings.lastRun) {
              const daysSinceLastRun = Math.floor((now.getTime() - settings.lastRun.getTime()) / (1000 * 60 * 60 * 24));
              shouldRun = currentDay === settings.dayOfWeek && daysSinceLastRun >= 13;
            } else {
              shouldRun = currentDay === settings.dayOfWeek;
            }
            break;

          case 'monthly':
            shouldRun = currentDate === settings.dayOfMonth;
            break;
        }

        if (!shouldRun) {
          console.log(`[CRON] Skipping ${settings.school.name} - not scheduled to run now`);
          continue;
        }

        // Check if already run today
        if (settings.lastRun) {
          const lastRunDate = new Date(settings.lastRun);
          const isSameDay = lastRunDate.getDate() === now.getDate() &&
                           lastRunDate.getMonth() === now.getMonth() &&
                           lastRunDate.getFullYear() === now.getFullYear();
          
          if (isSameDay) {
            console.log(`[CRON] Skipping ${settings.school.name} - already run today`);
            continue;
          }
        }

        console.log(`[CRON] Processing ${settings.school.name}...`);

        // Get current term
        const currentTerm = await prisma.term.findFirst({
          where: {
            academicYear: {
              schoolId: settings.schoolId,
              isActive: true
            },
            startDate: { lte: now },
            endDate: { gte: now }
          }
        });

        if (!currentTerm) {
          console.log(`[CRON] No active term for ${settings.school.name}`);
          results.push({
            schoolId: settings.schoolId,
            schoolName: settings.school.name,
            success: false,
            error: 'No active term'
          });
          continue;
        }

        // Get student accounts with outstanding balances
        const studentAccounts = await prisma.studentAccount.findMany({
          where: {
            schoolId: settings.schoolId,
            termId: currentTerm.id,
            balance: {
              gte: settings.minBalance
            }
          },
          include: {
            student: {
              include: {
                class: true,
                studentGuardians: {
                  where: { isPrimary: true },
                  include: { guardian: true }
                }
              }
            }
          }
        });

        let sent = 0;
        let failed = 0;

        // Process each student account
        for (const account of studentAccounts) {
          try {
            const student = account.student;
            
            if (student.studentGuardians.length === 0) {
              failed++;
              continue;
            }

            const guardian = student.studentGuardians[0].guardian;

            // Build reminder message
            const message = `Dear ${guardian.firstName} ${guardian.lastName}, this is an automated reminder that ${student.firstName} ${student.lastName} (${student.class.name}) has an outstanding fee balance of UGX ${account.balance.toLocaleString()}. Kindly settle this amount at your earliest convenience. Thank you.`;

            // Send SMS
            const phoneNumber = formatPhoneNumber(guardian.phone);
            const smsResult = await sendSMS(phoneNumber, message);

            // Log the notification
            await prisma.financeNotificationLog.create({
              data: {
                schoolId: settings.schoolId,
                guardianId: guardian.id,
                studentId: student.id,
                type: 'FEE_REMINDER',
                channel: 'SMS',
                content: message,
                status: smsResult.success ? 'SENT' : 'FAILED',
                sentAt: smsResult.success ? now : null,
                error: smsResult.error,
                metadata: JSON.stringify({
                  balance: account.balance,
                  totalFees: account.totalFees,
                  totalPaid: account.totalPaid,
                  sentBy: 'AUTOMATION',
                  automationId: settings.id,
                  frequency: settings.frequency,
                  messageId: smsResult.messageId,
                  cost: smsResult.cost
                })
              }
            });

            if (smsResult.success) {
              sent++;
            } else {
              failed++;
              console.error(`[CRON] SMS failed for ${student.firstName} ${student.lastName}: ${smsResult.error}`);
            }
          } catch (error) {
            failed++;
            console.error(`[CRON] Error processing student ${account.studentId}:`, error);
          }
        }

        // Update last run time
        await prisma.feeReminderAutomation.update({
          where: { id: settings.id },
          data: { lastRun: now }
        });

        results.push({
          schoolId: settings.schoolId,
          schoolName: settings.school.name,
          success: true,
          sent,
          failed,
          total: studentAccounts.length
        });

        console.log(`[CRON] Completed ${settings.school.name}: ${sent} sent, ${failed} failed`);
      } catch (error) {
        console.error(`[CRON] Error processing school ${settings.schoolId}:`, error);
        results.push({
          schoolId: settings.schoolId,
          schoolName: settings.school?.name || 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log('[CRON] Automated fee reminders check completed');

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      processed: results.length,
      results
    });
  } catch (error) {
    console.error('[CRON] Fatal error in fee reminders cron:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Allow POST as well for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
