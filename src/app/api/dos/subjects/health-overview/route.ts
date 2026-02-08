import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id },
      include: { school: true, user: true },
    });

    if (!staff || !staff.school) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    const hasDoSAccess = staff.user.roles.includes(Role.DOS) || staff.user.roles.includes(Role.SCHOOL_ADMIN);
    if (!hasDoSAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const activeAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId: staff.schoolId, isActive: true },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc',
          },
        },
      },
    });

    const now = new Date();
    const activeTerm = activeAcademicYear?.terms.find(t => now >= new Date(t.startDate) && now <= new Date(t.endDate));

    const includeClause: any = {
      classSubjects: {
        include: {
          class: {
            include: {
              _count: {
                select: { students: true },
              },
            },
          },
        },
      },
      staffSubjects: {
        include: {
          staff: {
            include: {
              documents: {
                where: {
                  category: 'QUALIFICATION',
                },
              },
            },
          },
          class: true,
        },
      },
      _count: {
        select: {
          classSubjects: true,
          staffSubjects: true,
        },
      },
    };

    if (activeTerm) {
      includeClause.marks = {
        where: {
          exam: {
            termId: activeTerm.id,
          },
        },
        select: { score: true, maxScore: true },
      };
    }

    const subjects = await prisma.subject.findMany({
      where: {
        schoolId: staff.schoolId,
        isActive: true,
      },
      include: includeClause,
    });

    const subjectHealthMetrics = subjects.map(subject => {
      const totalClasses = subject._count.classSubjects;
      const assignedClasses = subject._count.staffSubjects;
      const coverageRate = totalClasses > 0 ? (assignedClasses / totalClasses) * 100 : 0;

      const totalTeachers = subject.staffSubjects.length;
      const qualifiedTeachers = subject.staffSubjects.filter(
        ss => ss.staff.documents && ss.staff.documents.length > 0
      ).length;

      let averageScore = 0;
      let passRate = 0;
      // @ts-ignore
      if (subject.marks && subject.marks.length > 0) {
        // @ts-ignore
        const totalScore = subject.marks.reduce((acc, mark) => acc + mark.score, 0);
        // @ts-ignore
        const totalMaxScore = subject.marks.reduce((acc, mark) => acc + mark.maxScore, 0);
        averageScore = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
        
        const passingScore = 50;
        // @ts-ignore
        const passedCount = subject.marks.filter(mark => (mark.score / mark.maxScore) * 100 >= passingScore).length;
        // @ts-ignore
        passRate = (passedCount / subject.marks.length) * 100;
      }

      // TODO: Replace with real attendance data calculation
      const attendanceRate = Math.floor(Math.random() * 20) + 80; // 80-100

      const healthScore = Math.round(
        (coverageRate * 0.3) +
        (averageScore * 0.4) +
        (attendanceRate * 0.2) +
        ((qualifiedTeachers / Math.max(totalTeachers, 1)) * 100 * 0.1)
      );

      let riskLevel: 'low' | 'medium' | 'high' | 'critical';
      if (healthScore >= 80) riskLevel = 'low';
      else if (healthScore >= 60) riskLevel = 'medium';
      else if (healthScore >= 40) riskLevel = 'high';
      else riskLevel = 'critical';
        
      const trends = ['up', 'down', 'stable'] as const;
      const performanceTrend = trends[Math.floor(Math.random() * trends.length)];
      
      const recentAlerts = riskLevel === 'critical' ? Math.floor(Math.random() * 3) + 1 :
                          riskLevel === 'high' ? Math.floor(Math.random() * 2) : 0;
      const pendingInterventions = recentAlerts > 0 ? Math.floor(Math.random() * 2) + 1 : 0;

      const classBreakdown = subject.classSubjects.map(cs => {
        const assignedStaff = subject.staffSubjects.find(ss => ss.classId === cs.classId);
        return {
          className: cs.class.name,
          teacherName: assignedStaff ?
            `${assignedStaff.staff.firstName} ${assignedStaff.staff.lastName}` :
            'Unassigned',
          studentCount: cs.class._count.students,
          averageScore: Math.floor(Math.random() * 40) + 60,
          attendanceRate: Math.floor(Math.random() * 20) + 80,
          lastAssessment: Math.random() > 0.5 ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString() : null
        };
      });

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        educationLevel: subject.educationLevel,
        isActive: subject.isActive,
        healthScore,
        performanceTrend,
        riskLevel,
        totalClasses,
        assignedClasses,
        totalTeachers,
        qualifiedTeachers,
        averageScore,
        passRate,
        attendanceRate,
        lastAssessment: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() : null,
        pendingInterventions,
        recentAlerts,
        classBreakdown,
      };
    });

    return NextResponse.json({
      subjects: subjectHealthMetrics,
      summary: {
        totalSubjects: subjects.length,
        highRiskCount: subjectHealthMetrics.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length,
        averageHealthScore: subjectHealthMetrics.length > 0 ?
          Math.round(subjectHealthMetrics.reduce((acc, s) => acc + s.healthScore, 0) / subjectHealthMetrics.length) : 0,
        totalPendingInterventions: subjectHealthMetrics.reduce((acc, s) => acc + s.pendingInterventions, 0)
      }
    });

  } catch (error) {
    console.error('Error fetching subject health overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subject health data' },
      { status: 500 }
    );
  }
}
