/**
 * DoS Curriculum Overview API Route
 * 
 * Provides curriculum overview statistics and metrics.
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

    // Get curriculum overview
    const overview = await curriculumService.getCurriculumOverview(schoolId);

    return NextResponse.json(overview);

  } catch (error) {
    console.error('Curriculum Overview API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch curriculum overview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}