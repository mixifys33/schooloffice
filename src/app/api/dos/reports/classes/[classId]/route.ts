import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role, StaffRole } from '@prisma/client';

/**
 * GET /api/dos/reports/classes/[classId]
 * Get detailed report status for a specific class
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === Role.SCHOOL_ADMIN || userRole === Role.DEPUTY;
    
    const staff = await prisma.staff.findFirst({
      where: { 
        schoolId: session.user.schoolId,
        userId: session.user.id 
      },
      select: { primaryRole: true, secondaryRoles: true }
    });

    const isDoS = staff && (
      staff.primaryRole === StaffRole.DOS || 
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.DOS)
    );

    if (!isAdmin && !isDoS) {
      return NextResponse.json({
        error: 'Only Director of Studies can access reports'
      }, { status: 403 });
    }

    const schoolId = session.user.schoolId;
    const { classId } = await params;

    if (!schoolId) {
      return NextResponse.json({
        error: 'No school associated with user'
      }, { status: 400 });
    }

    // Get class details
    const classData = await prisma.class.findUnique({
      where: { id: classId, schoolId },
      include: {
        _count: {
          select: { students: true }
        },
        students: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true
          },
          orderBy: { lastName: 'asc' }
        }
      }
    });

    if (!classData) {
      return NextResponse.json({
        error: 'Class not found'
      }, { status: 404 });
    }

    // Get current term
    const currentTerm = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true
        }
      },
      orderBy: { startDate: 'desc' }
    });

    if (!currentTerm) {
      return NextResponse.json({
        error: 'No active term found'
      }, { status: 400 });
    }

    // Get CA entries for this class
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
        student: { classId }
      },
      select: {
        studentId: true,
        subjectId: true,
        status: true,
        rawScore: true
      }
    });

    // Get exam entries for this class
    const examEntries = await prisma.examEntry.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
        student: { classId }
      },
      select: {
        studentId: true,
        subjectId: true,
        status: true,
        examScore: true
      }
    });

    // Get report cards for this class
    const reportCards = await prisma.reportCard.findMany({
      where: {
        schoolId,
        termId: currentTerm.id,
        student: { classId }
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate validation status
    const studentCount = classData._count.students;
    const caComplete = caEntries.length > 0;
    const examsComplete = examEntries.length > 0;
    const caApproved = caEntries.every(ca => ca.status === 'SUBMITTED');
    const examsApproved = examEntries.every(exam => exam.status === 'SUBMITTED');
    const scoresApproved = caApproved && examsApproved;
    const scoresLocked = scoresApproved;

    const blockers: string[] = [];
    if (!caComplete) blockers.push('CA entries not complete');
    if (!examsComplete) blockers.push('Exam entries not complete');
    if (!scoresApproved) blockers.push('Scores not approved');

    const readyForGeneration = caComplete && examsComplete && scoresApproved && scoresLocked;

    // Calculate report statistics
    const reportStats = {
      total: studentCount,
      generated: reportCards.filter(r => r.status === 'GENERATED').length,
      approved: reportCards.filter(r => r.status === 'APPROVED').length,
      published: reportCards.filter(r => r.status === 'PUBLISHED').length,
      draft: reportCards.filter(r => r.status === 'DRAFT').length
    };

    // Build student report status
    const studentReports = classData.students.map(student => {
      const studentCA = caEntries.filter(ca => ca.studentId === student.id);
      const studentExams = examEntries.filter(exam => exam.studentId === student.id);
      const studentReport = reportCards.find(r => r.studentId === student.id);

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        caCount: studentCA.length,
        examCount: studentExams.length,
        caApproved: studentCA.every(ca => ca.status === 'SUBMITTED'),
        examApproved: studentExams.every(exam => exam.status === 'SUBMITTED'),
        reportStatus: studentReport?.status || null,
        reportId: studentReport?.id || null,
        reportGeneratedAt: studentReport?.createdAt || null,
        reportPublishedAt: studentReport?.publishedAt || null,
        shareableLink: studentReport?.secureToken || null,
        linkExpiry: studentReport?.linkExpiresAt || null
      };
    });

    const data = {
      class: {
        id: classData.id,
        name: classData.name,
        studentCount
      },
      term: {
        id: currentTerm.id,
        name: currentTerm.name,
        startDate: currentTerm.startDate,
        endDate: currentTerm.endDate
      },
      validation: {
        readyForGeneration,
        caComplete,
        examsComplete,
        scoresApproved,
        scoresLocked,
        blockers
      },
      reportStats,
      studentReports,
      canGenerate: readyForGeneration,
      canApprove: reportStats.generated > 0,
      canPublish: reportStats.approved > 0
    };

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching class report details:', error);

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch class report details'
    }, { status: 500 });
  }
}