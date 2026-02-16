/**
 * Teacher Competencies API
 * Requirements: 31.1, 31.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { competencyService } from '@/services/competency.service';
import { CompetencyType, CompetencyLevel } from '@/types/competency';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');
    const classId = searchParams.get('classId');

    if (!subjectId || !classId) {
      return NextResponse.json(
        { error: 'Subject ID and Class ID are required' },
        { status: 400 }
      );
    }

    const competencies = await competencyService.getCompetenciesForSubject(
      subjectId,
      classId
    );

    return NextResponse.json({
      success: true,
      data: competencies,
    });
  } catch (error) {
    console.error('Error fetching competencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competencies' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      schoolId,
      subjectId,
      classId,
      code,
      title,
      description,
      type,
      level,
      parentCompetencyId,
    } = body;

    // Validate required fields
    if (!schoolId || !subjectId || !classId || !code || !title || !description || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate competency type
    if (!Object.values(CompetencyType).includes(type)) {
      return NextResponse.json(
        { error: 'Invalid competency type' },
        { status: 400 }
      );
    }

    // Validate competency level if provided
    if (level && !Object.values(CompetencyLevel).includes(level)) {
      return NextResponse.json(
        { error: 'Invalid competency level' },
        { status: 400 }
      );
    }

    const competency = await competencyService.createCompetency({
      schoolId,
      subjectId,
      classId,
      code,
      title,
      description,
      type,
      level,
      parentCompetencyId,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: competency,
    });
  } catch (error) {
    console.error('Error creating competency:', error);
    return NextResponse.json(
      { error: 'Failed to create competency' },
      { status: 500 }
    );
  }
}