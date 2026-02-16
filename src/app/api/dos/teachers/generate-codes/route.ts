/**
 * Teacher Code Bulk Generation API
 * 
 * Generates unique codes for all teachers without codes
 * Requirements: 10.1-10.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Role, StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateCodesForAllTeachers } from '@/services/teacher-code-generator.service';

/**
 * POST /api/dos/teachers/generate-codes
 * Generate codes for all teachers in the school who don't have codes
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

    console.log('🔧 [Teacher Code] Starting bulk code generation...');

    const result = await generateCodesForAllTeachers(schoolId);

    console.log(`✅ [Teacher Code] Bulk generation complete: ${result.successCount} successful`);

    return NextResponse.json({
      success: true,
      successCount: result.successCount,
      failedCount: result.failedTeachers.length,
      failedTeachers: result.failedTeachers,
    });
  } catch (error) {
    console.error('❌ [Teacher Code] Error in bulk generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate teacher codes' },
      { status: 500 }
    );
  }
}
