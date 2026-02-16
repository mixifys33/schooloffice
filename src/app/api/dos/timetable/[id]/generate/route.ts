import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';
import { generateTimetable, type GenerationOptions } from '@/services/timetable-generation.service';

/**
 * POST /api/dos/timetable/[id]/generate
 * Auto-generate timetable entries
 * 
 * Body:
 * - config: GenerationConfig (periods, duration, times, weights)
 * - preserveExisting: boolean (keep manual entries)
 * - clearExisting: boolean (remove all entries first)
 * 
 * Response:
 * - result: GenerationResult (entries, score, conflicts, suggestions, stats)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: timetableId } = await params;
    
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
    
    let isDoS = false;
    if (!isAdmin) {
      const staff = await prisma.staff.findFirst({
        where: { schoolId, userId: session.user.id },
        select: { primaryRole: true, secondaryRoles: true },
      });

      isDoS = staff && (
        staff.primaryRole === StaffRole.DOS ||
        ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
      );
    }

    if (!isAdmin && !isDoS) {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { config, preserveExisting, clearExisting, customPeriods } = body;

    console.log('🔧 [Timetable Generation] Generating timetable:', {
      timetableId,
      preserveExisting,
      clearExisting,
      periodsPerDay: config?.periodsPerDay,
      hasCustomPeriods: !!customPeriods,
    });

    // Validate required fields
    if (!config) {
      return NextResponse.json(
        { error: 'Configuration is required' },
        { status: 400 }
      );
    }

    // Fetch timetable
    const timetable = await prisma.doSTimetable.findUnique({
      where: { id: timetableId },
      select: { schoolId: true, isLocked: true },
    });

    if (!timetable) {
      console.log('❌ [Timetable Generation] Timetable not found:', timetableId);
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Verify school context
    if (timetable.schoolId !== schoolId) {
      console.log('❌ [Timetable Generation] School context mismatch');
      return NextResponse.json(
        { error: 'Timetable not found' },
        { status: 404 }
      );
    }

    // Prevent editing locked timetables
    if (timetable.isLocked) {
      console.log('❌ [Timetable Generation] Timetable is locked');
      return NextResponse.json(
        { error: 'Cannot generate entries for locked timetable' },
        { status: 400 }
      );
    }

    // Generate timetable
    const options: GenerationOptions = {
      config,
      preserveExisting: preserveExisting ?? true,
      clearExisting: clearExisting ?? false,
      customPeriods: customPeriods || undefined,
    };

    const result = await generateTimetable(timetableId, schoolId, options);

    console.log('✅ [Timetable Generation] Generation complete:', {
      entriesGenerated: result.entriesGenerated,
      score: result.score.toFixed(1),
    });

    return NextResponse.json({
      result,
      message: 'Timetable generated successfully',
    });
  } catch (error) {
    console.error('❌ [Timetable Generation] Error generating timetable:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate timetable',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
