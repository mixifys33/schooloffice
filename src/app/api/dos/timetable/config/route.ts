/**
 * Timetable Configuration API
 * 
 * Handles school-wide timetable configuration (start/end times, period duration, special periods)
 * Requirements: 1.1-1.8, 7.1-7.7, 12.10, 14.1-14.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';
import { validateConfiguration } from '@/services/timetable-time-slot.service';

/**
 * GET /api/dos/timetable/config
 * Fetch timetable configuration for the school
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // Verify DoS access
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;

    // Check if user has DoS role
    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        primaryRole: true,
        secondaryRoles: true,
      },
    });

    const isDoS =
      staff &&
      (staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS));

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Fetch configuration
    const config = await prisma.timetableConfiguration.findUnique({
      where: { schoolId },
    });

    if (!config) {
      // Return default configuration
      return NextResponse.json({
        exists: false,
        config: {
          startTime: '08:00',
          endTime: '16:00',
          periodDurationMinutes: 40,
          specialPeriods: [],
        },
      });
    }

    console.log('✅ [Timetable Config] Configuration fetched successfully');

    return NextResponse.json({
      exists: true,
      config: {
        startTime: config.startTime,
        endTime: config.endTime,
        periodDurationMinutes: config.periodDurationMinutes,
        specialPeriods: config.specialPeriods,
      },
    });
  } catch (error) {
    console.error('❌ [Timetable Config] Error fetching configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dos/timetable/config
 * Save timetable configuration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // Verify DoS access
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;

    const staff = await prisma.staff.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        primaryRole: true,
        secondaryRoles: true,
      },
    });

    const isDoS =
      staff &&
      (staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS));

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { startTime, endTime, periodDurationMinutes, specialPeriods } = body;

    console.log('🔍 [Timetable Config] Received configuration:', {
      startTime,
      endTime,
      periodDurationMinutes,
      specialPeriodsCount: (specialPeriods || []).length,
      specialPeriods: JSON.stringify(specialPeriods, null, 2),
    });

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

    console.log('🔧 [Timetable Config] Saving configuration...');

    // Upsert configuration
    const config = await prisma.timetableConfiguration.upsert({
      where: { schoolId },
      create: {
        schoolId,
        startTime,
        endTime,
        periodDurationMinutes,
        specialPeriods: specialPeriods || [],
      },
      update: {
        startTime,
        endTime,
        periodDurationMinutes,
        specialPeriods: specialPeriods || [],
      },
    });

    console.log('✅ [Timetable Config] Configuration saved successfully');

    return NextResponse.json({
      success: true,
      config: {
        startTime: config.startTime,
        endTime: config.endTime,
        periodDurationMinutes: config.periodDurationMinutes,
        specialPeriods: config.specialPeriods,
      },
    });
  } catch (error) {
    console.error('❌ [Timetable Config] Error saving configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    );
  }
}
