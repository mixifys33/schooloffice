/**
 * Single Teacher Code Generation API
 * 
 * Generates a unique code for a specific teacher
 * Requirements: 10.1-10.7
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { Role, StaffRole } from '@prisma/client';
import { prisma } from '@/lib/db';
import { generateTeacherCode } from '@/services/teacher-code-generator.service';

/**
 * POST /api/dos/teachers/[id]/generate-code
 * Generate a code for a specific teacher
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // Find the teacher
    const teacher = await prisma.staff.findFirst({
      where: {
        id,
        schoolId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        teacherCode: true,
      },
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });
    }

    if (teacher.teacherCode) {
      return NextResponse.json(
        { error: 'Teacher already has a code', code: teacher.teacherCode },
        { status: 400 }
      );
    }

    console.log(`🔧 [Teacher Code] Generating code for teacher: ${teacher.firstName} ${teacher.lastName}`);

    const fullName = `${teacher.firstName} ${teacher.lastName}`;
    const code = await generateTeacherCode(fullName, schoolId);

    // Update teacher with new code
    await prisma.staff.update({
      where: { id: teacher.id },
      data: { teacherCode: code },
    });

    console.log(`✅ [Teacher Code] Code generated and assigned: ${code}`);

    return NextResponse.json({
      success: true,
      teacherId: teacher.id,
      teacherName: fullName,
      code,
    });
  } catch (error) {
    console.error('❌ [Teacher Code] Error generating code:', error);
    return NextResponse.json(
      { error: 'Failed to generate teacher code' },
      { status: 500 }
    );
  }
}
