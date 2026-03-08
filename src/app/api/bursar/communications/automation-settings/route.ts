import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    // Get automation settings for the school
    const settings = await prisma.feeReminderAutomation.findUnique({
      where: { schoolId: session.user.schoolId }
    });

    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        success: true,
        settings: {
          enabled: false,
          frequency: 'weekly',
          dayOfWeek: 5, // Friday
          time: '09:00',
          minBalance: 10000,
          lastRun: null,
          nextRun: null
        }
      });
    }

    // Calculate next run time
    const nextRun = calculateNextRun(settings);

    return NextResponse.json({
      success: true,
      settings: {
        enabled: settings.enabled,
        frequency: settings.frequency,
        dayOfWeek: settings.dayOfWeek,
        dayOfMonth: settings.dayOfMonth,
        time: settings.time,
        minBalance: settings.minBalance,
        lastRun: settings.lastRun?.toISOString(),
        nextRun: nextRun?.toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching automation settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation settings', success: false },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const body = await request.json();
    const { enabled, frequency, dayOfWeek, dayOfMonth, time, minBalance } = body;

    // Validate inputs
    if (frequency && !['daily', 'weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency', success: false },
        { status: 400 }
      );
    }

    if (frequency === 'weekly' && (dayOfWeek < 0 || dayOfWeek > 6)) {
      return NextResponse.json(
        { error: 'Invalid day of week', success: false },
        { status: 400 }
      );
    }

    if (frequency === 'monthly' && (dayOfMonth < 1 || dayOfMonth > 31)) {
      return NextResponse.json(
        { error: 'Invalid day of month', success: false },
        { status: 400 }
      );
    }

    // Upsert automation settings
    const settings = await prisma.feeReminderAutomation.upsert({
      where: { schoolId: session.user.schoolId },
      update: {
        enabled,
        frequency,
        dayOfWeek,
        dayOfMonth,
        time,
        minBalance,
        updatedAt: new Date()
      },
      create: {
        schoolId: session.user.schoolId,
        enabled,
        frequency,
        dayOfWeek,
        dayOfMonth,
        time,
        minBalance
      }
    });

    // Calculate next run time
    const nextRun = calculateNextRun(settings);

    return NextResponse.json({
      success: true,
      message: 'Automation settings saved successfully',
      settings: {
        enabled: settings.enabled,
        frequency: settings.frequency,
        dayOfWeek: settings.dayOfWeek,
        dayOfMonth: settings.dayOfMonth,
        time: settings.time,
        minBalance: settings.minBalance,
        lastRun: settings.lastRun?.toISOString(),
        nextRun: nextRun?.toISOString()
      }
    });
  } catch (error) {
    console.error('Error saving automation settings:', error);
    return NextResponse.json(
      { error: 'Failed to save automation settings', success: false },
      { status: 500 }
    );
  }
}

function calculateNextRun(settings: any): Date | null {
  if (!settings.enabled) return null;

  const now = new Date();
  const [hours, minutes] = settings.time.split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (settings.frequency) {
    case 'daily':
      // If time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;

    case 'weekly':
      // Find next occurrence of the specified day of week
      const targetDay = settings.dayOfWeek;
      const currentDay = nextRun.getDay();
      let daysUntilTarget = targetDay - currentDay;
      
      if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
        daysUntilTarget += 7;
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTarget);
      break;

    case 'biweekly':
      // Similar to weekly but every 2 weeks
      const targetDayBi = settings.dayOfWeek;
      const currentDayBi = nextRun.getDay();
      let daysUntilTargetBi = targetDayBi - currentDayBi;
      
      if (daysUntilTargetBi < 0 || (daysUntilTargetBi === 0 && nextRun <= now)) {
        daysUntilTargetBi += 14;
      }
      
      nextRun.setDate(nextRun.getDate() + daysUntilTargetBi);
      break;

    case 'monthly':
      // Find next occurrence of the specified day of month
      nextRun.setDate(settings.dayOfMonth);
      
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
      }
      break;
  }

  return nextRun;
}
