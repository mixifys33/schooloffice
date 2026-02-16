import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

// GET /api/dos/subjects/[id]/edit - Get subject for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate DoS role
    if (session.user.role !== 'DOS' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Director of Studies access required' },
        { status: 403 }
      );
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    const subjectId = id;

    // Get subject with curriculum data
    const subject = await db.subject.findFirst({
      where: {
        id: subjectId,
        schoolId: schoolId
      },
      include: {
        dosCurriculumSubjects: {
          where: {
            isActive: true
          },
          take: 1 // Get the first active curriculum entry
        }
      }
    });

    if (!subject) {
      return NextResponse.json(
        { error: 'Subject not found' },
        { status: 404 }
      );
    }

    // Transform data for editing
    const editData = {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description || '',
      educationLevel: subject.educationLevel,
      isActive: subject.isActive,
      curriculumData: subject.dosCurriculumSubjects.length > 0 ? {
        isCore: subject.dosCurriculumSubjects[0].isCore,
        caWeight: subject.dosCurriculumSubjects[0].caWeight,
        examWeight: subject.dosCurriculumSubjects[0].examWeight,
        minPassMark: subject.dosCurriculumSubjects[0].minPassMark,
        periodsPerWeek: subject.dosCurriculumSubjects[0].periodsPerWeek,
        dosApproved: subject.dosCurriculumSubjects[0].dosApproved
      } : null
    };

    return NextResponse.json({
      subject: editData
    });

  } catch (error) {
    console.error('Error fetching subject for edit:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject' },
      { status: 500 }
    );
  }
}