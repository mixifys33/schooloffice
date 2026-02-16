import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role;
    const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'DEPUTY';
    
    // Get staff record to check staff roles
    const staff = await prisma.staff.findFirst({
      where: { 
        schoolId: session.user.schoolId,
        userId: session.user.id 
      },
      select: { primaryRole: true, secondaryRoles: true }
    });

    const isDoS = staff && (
      staff.primaryRole === 'DOS' || 
      ((staff.secondaryRoles as string[]) || []).includes('DOS')
    );

    if (!isAdmin && !isDoS) {
      return NextResponse.json({
        error: 'Only Director of Studies can access reports'
      }, { status: 403 });
    }

    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({
        error: 'No school associated with user'
      }, { status: 400 });
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

    // Get all classes
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    // Get all CA entries for validation
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        schoolId,
        termId: currentTerm?.id
      },
      select: {
        student: {
          select: { classId: true }
        },
        subjectId: true,
        status: true
      }
    });

    // Get all exam entries for validation
    const examEntries = await prisma.examEntry.findMany({
      where: {
        schoolId,
        termId: currentTerm?.id
      },
      select: {
        student: {
          select: { classId: true }
        },
        subjectId: true,
        status: true
      }
    });

    // Build class report status
    const classReportStatus = classes.map(cls => {
      const studentCount = cls._count.students;
      
      // Check CA completion for this class
      const classCAEntries = caEntries.filter(ca => ca.student.classId === cls.id);
      const caComplete = classCAEntries.length > 0;
      const caApproved = classCAEntries.every(ca => ca.status === 'SUBMITTED');
      
      // Check exam completion for this class
      const classExamEntries = examEntries.filter(exam => exam.student.classId === cls.id);
      const examsComplete = classExamEntries.length > 0;
      const examsApproved = classExamEntries.every(exam => exam.status === 'SUBMITTED');
      
      const scoresApproved = caApproved && examsApproved;
      const scoresLocked = scoresApproved; // Simplified for now
      
      const blockers: string[] = [];
      if (!caComplete) blockers.push('CA entries not complete');
      if (!examsComplete) blockers.push('Exam entries not complete');
      if (!scoresApproved) blockers.push('Scores not approved');
      
      const readyForGeneration = caComplete && examsComplete && scoresApproved && scoresLocked;
      
      return {
        classId: cls.id,
        className: cls.name,
        studentCount,
        termName: currentTerm?.name || 'No Active Term',
        readyForGeneration,
        reportsGenerated: false,
        dosApproved: false,
        published: false,
        publishedAt: undefined,
        downloadCount: 0,
        linkExpiry: undefined,
        blockers,
        validationStatus: {
          curriculumApproved: true, // Simplified for now
          caComplete,
          examsComplete,
          scoresApproved,
          scoresLocked
        },
        canGenerate: readyForGeneration,
        canApprove: false,
        canPublish: false,
        canRegenerate: false
      };
    });

    // Calculate overview stats
    const totalClasses = classes.length;
    const readyClasses = classReportStatus.filter(c => c.readyForGeneration).length;
    const totalStudents = classes.reduce((sum, cls) => sum + cls._count.students, 0);

    const data = {
      overview: {
        totalClasses,
        readyClasses,
        generatedReports: 0,
        approvedReports: 0,
        publishedReports: 0,
        totalStudents,
        reportsDownloaded: 0,
        averageGenerationTime: 0
      },
      classReportStatus,
      reportTemplates: [
        {
          id: '1',
          name: 'New Curriculum Report Card',
          type: 'NEW_CURRICULUM' as const,
          isDefault: true,
          isActive: true,
          lastModified: new Date().toISOString(),
          usageCount: 0
        }
      ],
      recentActivity: [],
      criticalIssues: classReportStatus
        .filter(c => c.blockers.length > 0)
        .map(c => ({
          id: c.classId,
          type: 'VALIDATION_FAILED' as const,
          title: `${c.className} - Report Generation Blocked`,
          description: c.blockers.join(', '),
          severity: 'HIGH' as const,
          affectedClasses: 1,
          affectedStudents: c.studentCount,
          actionRequired: 'View Details',
          actionUrl: `/dos/reports/generate`
        })),
      systemStatus: {
        pdfGenerationEngine: 'ACTIVE' as const,
        templateEngine: 'ACTIVE' as const,
        reportingAllowed: true,
        bulkGenerationEnabled: true,
        lastSystemCheck: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error fetching reports:', error);

    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch reports'
    }, { status: 500 });
  }
}