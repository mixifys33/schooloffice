/**
 * Time Slots Generation API
 * 
 * Generates preview of time slots based on configuration
 * Requirements: 2.1-2.8, 7.3-7.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { calculateTimeSlots, validateConfiguration } from '@/services/timetable-time-slot.service';

/**
 * POST /api/dos/timetable/config/generate-slots
 * Generate time slots preview for all days of the week
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startTime, endTime, periodDurationMinutes, specialPeriods } = body;

    // Validate configuration
    const validation = validateConfiguration({
      startTime,
      endTime,
      periodDurationMinutes,
      specialPeriods: specialPeriods || [],
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid configuration',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    console.log('🔧 [Timetable Config] Generating time slots preview...');

    // Generate slots for each day of the week
    const slotsByDay: Record<number, any[]> = {};

    for (let day = 1; day <= 5; day++) {
      // Monday to Friday
      const slots = calculateTimeSlots(
        {
          startTime,
          endTime,
          periodDurationMinutes,
          specialPeriods: specialPeriods || [],
        },
        day
      );
      slotsByDay[day] = slots;
    }

    console.log('✅ [Timetable Config] Time slots generated successfully');

    return NextResponse.json({
      success: true,
      slotsByDay,
      summary: {
        totalDays: 5,
        slotsPerDay: Object.values(slotsByDay).map((slots) => slots.length),
        assignableSlotsPerDay: Object.values(slotsByDay).map(
          (slots) => slots.filter((s) => s.isAssignable).length
        ),
      },
    });
  } catch (error) {
    console.error('❌ [Timetable Config] Error generating time slots:', error);
    return NextResponse.json(
      { error: 'Failed to generate time slots' },
      { status: 500 }
    );
  }
}
