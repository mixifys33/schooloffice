import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { StaffRole, ResponsibilityType } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    // Get staff record
    const staff = await prisma.staff.findFirst({
      where: { userId: session.user.id, schoolId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        primaryRole: true,
        secondaryRoles: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
    }

    // Verify class teacher role
    const isClassTeacher =
      staff.primaryRole === StaffRole.CLASS_TEACHER ||
      ((staff.secondaryRoles as string[]) || []).includes(StaffRole.CLASS_TEACHER);

    if (!isClassTeacher) {
      return NextResponse.json({ error: 'Class teacher access required' }, { status: 403 });
    }

    // Get current academic year and term
    const academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      include: { terms: { orderBy: { startDate: 'asc' } } },
    });

    if (!academicYear) {
      return NextResponse.json({
        context: {
          teacherId: staff.id,
          teacherName: `${staff.firstName} ${staff.lastName}`,
          roleName: staff.primaryRole,
          currentTerm: null,
          academicYear: null,
          contextError: 'No active academic year found',
        },
        class: null,
        subjects: [],
        overallPerformance: { averageScore: 0, passRate: 0, attendanceRate: 0, topPerformers: 0 },
        termComparison: [],
        recommendations: { strengths: [], improvements: [], actions: [] },
      });
    }

    const today = new Date();
    const currentTerm = academicYear.terms.find(
      (term) => term.startDate <= today && term.endDate >= today
    );

    if (!currentTerm) {
      return NextResponse.json({
        context: {
          teacherId: staff.id,
          teacherName: `${staff.firstName} ${staff.lastName}`,
          roleName: staff.primaryRole,
          currentTerm: null,
          academicYear: { id: academicYear.id, name: academicYear.name },
          contextError: 'No active term found',
        },
        class: null,
        subjects: [],
        overallPerformance: { averageScore: 0, passRate: 0, attendanceRate: 0, topPerformers: 0 },
        termComparison: [],
        recommendations: { strengths: [], improvements: [], actions: [] },
      });
    }

    // Get class assignment
    const classAssignment = await prisma.staffResponsibility.findFirst({
      where: { staffId: staff.id, type: ResponsibilityType.CLASS_TEACHING },
    });

    if (!classAssignment) {
      return NextResponse.json({
        context: {
          teacherId: staff.id,
          teacherName: `${staff.firstName} ${staff.lastName}`,
          roleName: staff.primaryRole,
          currentTerm: {
            id: currentTerm.id,
            name: currentTerm.name,
            startDate: currentTerm.startDate.toISOString(),
            endDate: currentTerm.endDate.toISOString(),
          },
          academicYear: { id: academicYear.id, name: academicYear.name },
          contextError: 'No class assigned',
        },
        class: null,
        subjects: [],
        overallPerformance: { averageScore: 0, passRate: 0, attendanceRate: 0, topPerformers: 0 },
        termComparison: [],
        recommendations: { strengths: [], improvements: [], actions: [] },
      });
    }

    const details = classAssignment.details as { classId?: string };
    const classId = details?.classId;

    if (!classId) {
      return NextResponse.json({ error: 'Class ID not found in assignment' }, { status: 404 });
    }

    // Fetch class with stream
    const assignedClass = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        streams: true,
        _count: { select: { students: true } },
      },
    });

    if (!assignedClass) {
      return NextResponse.json({ error: 'Assigned class not found' }, { status: 404 });
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: { classId: assignedClass.id },
      select: { id: true },
    });

    const studentIds = students.map((s) => s.id);

    // Get subject assignments for this class
    const subjectAssignments = await prisma.staffSubject.findMany({
      where: { staffId: staff.id, classId: assignedClass.id },
      include: { subject: true },
    });

    const subjectIds = subjectAssignments.map((s) => s.subjectId);

    // Get CA entries for current term
    const caEntries = await prisma.cAEntry.findMany({
      where: {
        termId: currentTerm.id,
        subjectId: { in: subjectIds },
        studentId: { in: studentIds },
        status: 'SUBMITTED',
      },
      select: { subjectId: true, studentId: true, rawScore: true, maxScore: true },
    });

    // Get exam entries for current term
    const examEntries = await prisma.examEntry.findMany({
      where: {
        termId: currentTerm.id,
        subjectId: { in: subjectIds },
        studentId: { in: studentIds },
        status: 'SUBMITTED',
      },
      select: { subjectId: true, studentId: true, examScore: true, maxScore: true },
    });

    // Get attendance data for current term
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        classId: assignedClass.id,
        date: { gte: currentTerm.startDate, lte: currentTerm.endDate },
        studentId: { in: studentIds },
      },
      select: { studentId: true, status: true },
    });

    // Calculate attendance rate
    const totalAttendanceRecords = attendanceRecords.length;
    const presentRecords = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const attendanceRate =
      totalAttendanceRecords > 0 ? (presentRecords / totalAttendanceRecords) * 100 : 0;

    // Get competency progress for current term
    const competencyProgress = await prisma.competencyProgress.findMany({
      where: {
        termId: currentTerm.id,
        studentId: { in: studentIds },
        competency: { subjectId: { in: subjectIds }, classId: assignedClass.id },
      },
      include: {
        competency: { select: { code: true, title: true, description: true } },
      },
    });

    // Calculate subject-wise performance
    const subjects = subjectAssignments.map((assignment) => {
      const subjectCAs = caEntries.filter((ca) => ca.subjectId === assignment.subjectId);
      const subjectExams = examEntries.filter((exam) => exam.subjectId === assignment.subjectId);

      // Calculate scores as percentages
      const caScores = subjectCAs.map((ca) => ((ca.rawScore || 0) / ca.maxScore) * 100);
      const examScores = subjectExams.map((exam) => ((exam.examScore || 0) / exam.maxScore) * 100);
      const allScores = [...caScores, ...examScores];

      const averageScore = allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : 0;

      const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
      const lowestScore = allScores.length > 0 ? Math.min(...allScores) : 0;
      const passRate = allScores.length > 0
        ? (allScores.filter((score) => score >= 50).length / allScores.length) * 100
        : 0;
      const topPerformers = allScores.filter((score) => score >= 80).length;

      // Get competency analysis for this subject
      const subjectCompetencies = competencyProgress.filter(
        (cp) => cp.competency && subjectCAs.some((ca) => ca.subjectId === assignment.subjectId)
      );

      // Group by competency and calculate average mastery
      const competencyMap = new Map<string, { title: string; description: string; masteryRates: number[] }>();
      
      subjectCompetencies.forEach((cp) => {
        const key = cp.competency.code;
        if (!competencyMap.has(key)) {
          competencyMap.set(key, {
            title: cp.competency.title,
            description: cp.competency.description,
            masteryRates: [],
          });
        }
        competencyMap.get(key)!.masteryRates.push(cp.masteryPercentage);
      });

      const competencyAnalysis = Array.from(competencyMap.entries()).map(([code, data]) => ({
        competency: code,
        description: data.title,
        masteryRate: data.masteryRates.length > 0
          ? Math.round(data.masteryRates.reduce((sum, rate) => sum + rate, 0) / data.masteryRates.length)
          : 0,
      }));

      return {
        id: assignment.subjectId,
        name: assignment.subject.name,
        averageScore: Math.round(averageScore * 10) / 10,
        highestScore: Math.round(highestScore * 10) / 10,
        lowestScore: Math.round(lowestScore * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        studentCount: studentIds.length,
        topPerformers,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        competencyAnalysis: competencyAnalysis.length > 0 ? competencyAnalysis : [],
      };
    });

    // Calculate overall performance
    // IMPORTANT: Include ALL subjects, treating 0 scores as 0 (not filtered out)
    // Formula: (sum of all subject scores) / (total number of subjects)
    const allScores = subjects.map((s) => s.averageScore)
    const overallAverage = subjects.length > 0
      ? allScores.reduce((sum, score) => sum + score, 0) / subjects.length
      : 0;

    const allPassRates = subjects.map((s) => s.passRate).filter((r) => r > 0);
    const overallPassRate = allPassRates.length > 0
      ? allPassRates.reduce((sum, rate) => sum + rate, 0) / allPassRates.length
      : 0;

    const totalTopPerformers = subjects.reduce((sum, s) => sum + s.topPerformers, 0);

    // Get term comparison data (previous terms in same academic year)
    const previousTerms = academicYear.terms.filter((t) => t.endDate < currentTerm.startDate);
    
    const termComparison = await Promise.all(
      previousTerms.map(async (term) => {
        const termCAs = await prisma.cAEntry.findMany({
          where: {
            termId: term.id,
            subjectId: { in: subjectIds },
            studentId: { in: studentIds },
            status: 'SUBMITTED',
          },
          select: { rawScore: true, maxScore: true },
        });

        const termExams = await prisma.examEntry.findMany({
          where: {
            termId: term.id,
            subjectId: { in: subjectIds },
            studentId: { in: studentIds },
            status: 'SUBMITTED',
          },
          select: { examScore: true, maxScore: true },
        });

        const termScores = [
          ...termCAs.map((ca) => ((ca.rawScore || 0) / ca.maxScore) * 100),
          ...termExams.map((exam) => ((exam.examScore || 0) / exam.maxScore) * 100),
        ];

        const termAverage = termScores.length > 0
          ? termScores.reduce((sum, score) => sum + score, 0) / termScores.length
          : 0;

        const termPassRate = termScores.length > 0
          ? (termScores.filter((score) => score >= 50).length / termScores.length) * 100
          : 0;

        return {
          termId: term.id,
          termName: term.name,
          averageScore: Math.round(termAverage * 10) / 10,
          passRate: Math.round(termPassRate * 10) / 10,
        };
      })
    );

    // Generate data-driven recommendations
    const recommendations = {
      strengths: [] as string[],
      improvements: [] as string[],
      actions: [] as string[],
    };

    // Analyze strengths
    const strongSubjects = subjects.filter((s) => s.averageScore >= 75);
    if (strongSubjects.length > 0) {
      recommendations.strengths.push(
        `Strong performance in ${strongSubjects.map((s) => s.name).join(', ')} with average scores above 75%.`
      );
    }

    if (attendanceRate >= 90) {
      recommendations.strengths.push(`Excellent class attendance rate of ${Math.round(attendanceRate)}%.`);
    }

    if (totalTopPerformers > 0) {
      recommendations.strengths.push(`${totalTopPerformers} students achieving distinction level (80%+).`);
    }

    // Analyze areas for improvement
    const weakSubjects = subjects.filter((s) => s.averageScore < 50 && s.averageScore > 0);
    if (weakSubjects.length > 0) {
      recommendations.improvements.push(
        `${weakSubjects.map((s) => s.name).join(', ')} need attention with average scores below 50%.`
      );
    }

    if (attendanceRate < 75) {
      recommendations.improvements.push(
        `Class attendance at ${Math.round(attendanceRate)}% requires improvement.`
      );
    }

    const lowPassRateSubjects = subjects.filter((s) => s.passRate < 60 && s.passRate > 0);
    if (lowPassRateSubjects.length > 0) {
      recommendations.improvements.push(
        `Pass rates below 60% in ${lowPassRateSubjects.map((s) => s.name).join(', ')}.`
      );
    }

    // Generate action items
    if (weakSubjects.length > 0) {
      recommendations.actions.push(
        `Schedule remedial sessions for ${weakSubjects.map((s) => s.name).join(', ')}.`
      );
    }

    if (attendanceRate < 85) {
      recommendations.actions.push(
        'Contact parents of students with attendance below 75% for intervention.'
      );
    }

    if (lowPassRateSubjects.length > 0) {
      recommendations.actions.push(
        'Implement peer tutoring program for struggling students.'
      );
    }

    if (recommendations.strengths.length === 0) {
      recommendations.strengths.push('Continue monitoring student progress and assessment completion.');
    }

    if (recommendations.improvements.length === 0) {
      recommendations.improvements.push('Maintain current performance standards across all subjects.');
    }

    if (recommendations.actions.length === 0) {
      recommendations.actions.push('Continue regular assessment and feedback cycles.');
    }

    return NextResponse.json({
      context: {
        teacherId: staff.id,
        teacherName: `${staff.firstName} ${staff.lastName}`,
        roleName: staff.primaryRole,
        currentTerm: {
          id: currentTerm.id,
          name: currentTerm.name,
          startDate: currentTerm.startDate.toISOString(),
          endDate: currentTerm.endDate.toISOString(),
        },
        academicYear: { id: academicYear.id, name: academicYear.name },
        contextError: null,
      },
      class: {
        id: assignedClass.id,
        name: assignedClass.name,
        streamName: assignedClass.streams[0]?.name || null,
        studentCount: assignedClass._count.students,
      },
      subjects,
      overallPerformance: {
        averageScore: Math.round(overallAverage * 10) / 10,
        passRate: Math.round(overallPassRate * 10) / 10,
        attendanceRate: Math.round(attendanceRate * 10) / 10,
        topPerformers: totalTopPerformers,
      },
      termComparison,
      recommendations,
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch performance data' }, { status: 500 });
  }
}
