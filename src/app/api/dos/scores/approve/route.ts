import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { classId, termId, subjectId, userId } = body;

    if (!classId || !termId || !subjectId) {
      return NextResponse.json(
        { error: 'Class ID, Term ID, and Subject ID are required' },
        { status: 400 }
      );
    }

    // Verify class belongs to school
    const classData = await prisma.class.findFirst({
      where: {
        id: classId,
        schoolId: session.user.schoolId,
      },
    });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        schoolId: session.user.schoolId,
      },
      select: {
        id: true,
      },
    });

    const studentIds = students.map((s) => s.id);

    // Approve all CA entries for this subject
    const caUpdateResult = await prisma.cAEntry.updateMany({
      where: {
        studentId: { in: studentIds },
        subjectId,
        termId,
      },
      data: {
        dosApproved: true,
        dosApprovedAt: new Date(),
        dosApprovedBy: userId,
      },
    });

    // Approve all Exam entries for this subject
    const examUpdateResult = await prisma.examEntry.updateMany({
      where: {
        studentId: { in: studentIds },
        subjectId,
        termId,
      },
      data: {
        dosApproved: true,
        dosApprovedAt: new Date(),
        dosApprovedBy: userId,
      },
    });

    return NextResponse.json({
      success: true,
      caApproved: caUpdateResult.count,
      examApproved: examUpdateResult.count,
    });
  } catch (error) {
    console.error('Error approving scores:', error);
    return NextResponse.json(
      { error: 'Failed to approve scores' },
      { status: 500 }
    );
  }
}
