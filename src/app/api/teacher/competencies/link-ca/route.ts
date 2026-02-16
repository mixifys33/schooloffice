/**
 * Link CA Entry to Competency API
 * Requirements: 31.1, 31.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { competencyService } from '@/services/competency.service';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      caEntryId,
      competencyId,
      evidenceType,
      weight,
      teacherComment,
    } = body;

    // Validate required fields
    if (!caEntryId || !competencyId || !evidenceType) {
      return NextResponse.json(
        { error: 'CA Entry ID, Competency ID, and Evidence Type are required' },
        { status: 400 }
      );
    }

    // Validate weight if provided
    if (weight !== undefined && (weight < 0 || weight > 10)) {
      return NextResponse.json(
        { error: 'Weight must be between 0 and 10' },
        { status: 400 }
      );
    }

    const mapping = await competencyService.linkCAEntryToCompetency({
      caEntryId,
      competencyId,
      evidenceType,
      weight,
      teacherComment,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: mapping,
    });
  } catch (error) {
    console.error('Error linking CA entry to competency:', error);
    return NextResponse.json(
      { error: 'Failed to link CA entry to competency' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      caEntryId,
      competencyId,
      comment,
    } = body;

    // Validate required fields
    if (!caEntryId || !competencyId || !comment) {
      return NextResponse.json(
        { error: 'CA Entry ID, Competency ID, and Comment are required' },
        { status: 400 }
      );
    }

    await competencyService.addCompetencyComment(
      caEntryId,
      competencyId,
      comment,
      session.user.id
    );

    return NextResponse.json({
      success: true,
      message: 'Competency comment added successfully',
    });
  } catch (error) {
    console.error('Error adding competency comment:', error);
    return NextResponse.json(
      { error: 'Failed to add competency comment' },
      { status: 500 }
    );
  }
}