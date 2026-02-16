import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST /api/dos/subjects/[id]/approve - Approve a subject
export async function POST(
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

    // Update the curriculum subject approval status
    const updatedSubject = await prisma.doSCurriculumSubject.update({
      where: {
        id: id,
        schoolId: schoolId
      },
      data: {
        dosApproved: true,
        dosApprovedBy: session.user.id,
        dosApprovedAt: new Date()
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        class: {
          select: {
            id: true,
            name: true
          }
        },
        staffSubjects: {
          select: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    // Count students enrolled in this class
    const studentsCount = await prisma.student.count({
      where: {
        classId: updatedSubject.classId,
        status: 'ACTIVE'
      }
    });

    // Format response data
    const responseData = {
      id: updatedSubject.id,
      subjectName: updatedSubject.subject.name,
      subjectCode: updatedSubject.subject.code,
      className: updatedSubject.class.name,
      isCore: updatedSubject.isCore,
      caWeight: updatedSubject.caWeight,
      examWeight: updatedSubject.examWeight,
      minPassMark: updatedSubject.minPassMark,
      periodsPerWeek: updatedSubject.periodsPerWeek,
      dosApproved: updatedSubject.dosApproved,
      dosApprovedBy: updatedSubject.dosApprovedBy,
      dosApprovedAt: updatedSubject.dosApprovedAt,
      isActive: updatedSubject.isActive,
      teachersAssigned: updatedSubject.staffSubjects.length,
      studentsEnrolled: studentsCount
    };

    return NextResponse.json({ 
      subject: responseData,
      message: 'Subject approved successfully'
    });

  } catch (error) {
    console.error('Error approving subject:', error);
    return NextResponse.json(
      { error: 'Failed to approve subject' },
      { status: 500 }
    );
  }
}