/**
 * TIMETABLE GENERATION API
 * 
 * DoS-only endpoint for generating timetable drafts using constraint engine.
 * This is where the real algorithmic work happens.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { timetableApprovalWorkflow } from '@/services/timetable-approval-workflow.service';
import type { GenerationRequest } from '@/types/timetable';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
      return NextResponse.json({
        error: 'Only Director of Studies can generate timetables'
      }, { status: 403 });
    }

    const body = await request.json();
    const { schoolId, termId, name, settings, regenerateFrom } = body;

    if (!schoolId || !termId || !name) {
      return NextResponse.json({ 
        error: 'Missing required fields: schoolId, termId, name' 
      }, { status: 400 });
    }

    const generationRequest: GenerationRequest = {
      schoolId,
      termId,
      dosUserId: session.user.id,
      name,
      regenerateFrom,
      settings: {
        populationSize: settings?.populationSize || 100,
        maxGenerations: settings?.maxGenerations || 1000,
        mutationRate: settings?.mutationRate || 0.1,
        crossoverRate: settings?.crossoverRate || 0.8
      }
    };

    console.log(`DoS ${session.user.email} initiating timetable generation: ${name}`);

    // This is the heavy lifting - constraint engine generation
    const draft = await timetableApprovalWorkflow.generateTimetableDraft(generationRequest);

    return NextResponse.json({
      success: true,
      draft: {
        id: draft.id,
        name: draft.name,
        status: draft.status,
        generationStatus: draft.generationStatus,
        qualityScore: draft.qualityScore,
        conflictCount: draft.conflictCount,
        totalSlots: draft.totalSlots,
        filledSlots: draft.filledSlots,
        createdAt: draft.createdAt
      }
    });

  } catch (error) {
    console.error('Timetable generation error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Generation failed'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');
    const termId = searchParams.get('termId');

    if (!schoolId || !termId) {
      return NextResponse.json({ 
        error: 'Missing schoolId or termId' 
      }, { status: 400 });
    }

    // Get generation status for ongoing operations
    const { db } = await import('@/lib/db');
    
    const drafts = await db.timetableDraft.findMany({
      where: {
        schoolId,
        termId,
        createdBy: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        generationStatus: true,
        qualityScore: true,
        conflictCount: true,
        totalSlots: true,
        filledSlots: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return NextResponse.json({ drafts });

  } catch (error) {
    console.error('Error fetching generation status:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch generation status'
    }, { status: 500 });
  }
}