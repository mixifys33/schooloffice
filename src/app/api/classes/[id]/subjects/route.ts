import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST: Assign subjects to a class
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: classId } = await params;
    const { subjectIds } = await request.json();

    if (!Array.isArray(subjectIds)) {
      return NextResponse.json(
        { error: 'subjectIds must be an array' },
        { status: 400 }
      );
    }

    // Verify class belongs to school and is O-Level
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: session.user.schoolId,
      },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    if (classData.levelType !== 'O_LEVEL') {
      return NextResponse.json(
        { error: 'Subject assignment is only available for O-Level classes' },
        { status: 400 }
      );
    }

    // Delete existing assignments
    await prisma.classSubject.deleteMany({
      where: { classId },
    });

    // Create new assignments
    if (subjectIds.length > 0) {
      // Verify all subjects exist and belong to school
      const subjects = await prisma.subject.findMany({
        where: {
          id: { in: subjectIds },
          schoolId: session.user.schoolId,
          levelType: 'O_LEVEL',
        },
      });

      if (subjects.length !== subjectIds.length) {
        return NextResponse.json(
          { error: 'Some subjects not found or not O-Level' },
          { status: 400 }
        );
      }

      await prisma.classSubject.createMany({
        data: subjectIds.map((subjectId) => ({
          schoolId: session.user.schoolId!,
          classId,
          subjectId,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning subjects to class:', error);
    return NextResponse.json(
      { error: 'Failed to assign subjects' },
      { status: 500 }
    );
  }
}
