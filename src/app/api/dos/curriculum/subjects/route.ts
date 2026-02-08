/**
 * DoS Curriculum Subjects API Route
 * 
 * Manages curriculum subjects - creation, listing, and updates.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { DoSCurriculumService } from '@/services/dos/dos-curriculum.service';

const curriculumService = new DoSCurriculumService();

export async function GET(request: NextRequest) {
  try {
    // Get session and validate authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Get school ID from session
    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    // Get optional class ID from query parameters
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');

    let subjects;
    if (classId) {
      // Get subjects for specific class
      subjects = await curriculumService.getCurriculumSubjectsByClass(schoolId, classId);
    } else {
      // Get all subjects for school (we'll need to implement this method)
      subjects = await curriculumService.getCurriculumSubjectsByClass(schoolId, ''); // This needs to be updated
    }

    return NextResponse.json(subjects);

  } catch (error) {
    console.error('Curriculum Subjects API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch curriculum subjects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get session and validate authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    // Get school ID from session
    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      classId,
      subjectId,
      isCore,
      caWeight,
      examWeight,
      minPassMark,
      periodsPerWeek,
      practicalPeriods
    } = body;

    // Validate required fields
    if (!classId || !subjectId || periodsPerWeek === undefined) {
      return NextResponse.json(
        { error: 'Class ID, Subject ID, and periods per week are required' },
        { status: 400 }
      );
    }

    // Create curriculum subject
    const curriculumSubject = await curriculumService.createCurriculumSubject({
      schoolId,
      classId,
      subjectId,
      isCore: isCore || false,
      caWeight: caWeight || 20.0,
      examWeight: examWeight || 80.0,
      minPassMark: minPassMark || 50.0,
      periodsPerWeek,
      practicalPeriods: practicalPeriods || 0,
      createdBy: session.user.id
    });

    return NextResponse.json(curriculumSubject, { status: 201 });

  } catch (error) {
    console.error('Create Curriculum Subject API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create curriculum subject',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}