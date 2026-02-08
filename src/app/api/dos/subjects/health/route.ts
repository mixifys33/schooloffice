/**
 * DoS Subjects Health API Route
 * Provides academic health indicators and alerts for subjects
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
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

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    if (!termId) {
      return NextResponse.json(
        { error: 'Term ID required' },
        { status: 400 }
      );
    }

    // Get current term details
    const currentTerm = await prisma.term.findUnique({
      where: { id: termId },
    });

    if (!currentTerm) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      );
    }

    // Get previous term for comparison
    const previousTerm = await prisma.term.findFirst({
      where: {
        schoolId,
        startDate: {
          lt: currentTerm.startDate,
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    // Get curriculum subjects with detailed data
    const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
      where: {
        schoolId,
      },
      include: {
        subject: true,
        class: true,
        finalScores: {
          where: {
            termId,
          },
        },
        assessmentPlans: {
          where: {
            termId,
          },
          include: {
            assessments: true,
          },
        },
        exams: {
          where: {
            termId,
          },
          include: {
            results: true,
          },
        },
        timetableEntries: {
          include: {
            teacher: true,
          },
        },
      },
    });

    // Get previous term performance for comparison
    const previousTermScores = previousTerm ? await prisma.doSFinalScore.findMany({
      where: {
        termId: previousTerm.id,
        curriculumSubject: {
          schoolId,
        },
      },
      include: {
        curriculumSubject: {
          include: {
            subject: true,
          },
        },
      },
    }) : [];

    // Group previous scores by subject
    const previousScoresBySubject = new Map();
    previousTermScores.forEach((score) => {
      const subjectId = score.curriculumSubject.subjectId;
      if (!previousScoresBySubject.has(subjectId)) {
        previousScoresBySubject.set(subjectId, []);
      }
      previousScoresBySubject.get(subjectId).push(score);
    });

    // Calculate expected coverage based on term progress
    const termStart = new Date(currentTerm.startDate);
    const termEnd = new Date(currentTerm.endDate);
    const now = new Date();
    const termDuration = termEnd.getTime() - termStart.getTime();
    const elapsed = Math.max(0, now.getTime() - termStart.getTime());
    const expectedCoveragePercent = Math.min(100, Math.round((elapsed / termDuration) * 100));

    // Group by subject and calculate health indicators
    const subjectMap = new Map();

    curriculumSubjects.forEach((curriculumSubject) => {
      const subjectId = curriculumSubject.subjectId;
      const subject = curriculumSubject.subject;

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subjectId,
          subjectName: subject.name,
          finalScores: [],
          assessmentPlans: [],
          exams: [],
          timetableEntries: [],
          teacherChanges: new Set(),
        });
      }

      const subjectData = subjectMap.get(subjectId);
      subjectData.finalScores.push(...curriculumSubject.finalScores);
      subjectData.assessmentPlans.push(...curriculumSubject.assessmentPlans);
      subjectData.exams.push(...curriculumSubject.exams);
      subjectData.timetableEntries.push(...curriculumSubject.timetableEntries);

      // Track teacher changes
      curriculumSubject.timetableEntries.forEach((entry) => {
        subjectData.teacherChanges.add(entry.teacherId);
      });
    });

    // Generate health indicators
    const healthIndicators = Array.from(subjectMap.values()).map((subjectData) => {
      const alerts = [];

      // Calculate current performance
      const validScores = subjectData.finalScores.filter(score => score.finalScore !== null);
      const currentAverage = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + (score.finalScore || 0), 0) / validScores.length
        : 0;

      // Calculate previous performance
      const previousScores = previousScoresBySubject.get(subjectData.subjectId) || [];
      const previousAverage = previousScores.length > 0
        ? previousScores.reduce((sum, score) => sum + (score.finalScore || 0), 0) / previousScores.length
        : 0;

      const performanceChange = currentAverage - previousAverage;

      // Calculate syllabus coverage
      const totalAssessments = subjectData.assessmentPlans.length;
      const completedAssessments = subjectData.assessmentPlans.filter(plan => 
        plan.assessments.length > 0
      ).length;
      const actualCoverage = totalAssessments > 0 
        ? Math.round((completedAssessments / totalAssessments) * 100)
        : 0;

      // Calculate assessment completion rate
      const totalExpectedAssessments = subjectData.assessmentPlans.reduce((sum, plan) => 
        sum + plan.assessments.length, 0
      );
      const completedAssessmentCount = subjectData.assessmentPlans.reduce((sum, plan) => 
        sum + plan.assessments.filter(a => a.score !== null).length, 0
      );
      const assessmentCompletion = totalExpectedAssessments > 0 
        ? Math.round((completedAssessmentCount / totalExpectedAssessments) * 100)
        : 0;

      // Generate alerts based on conditions
      if (actualCoverage < expectedCoveragePercent - 10) {
        alerts.push(`Coverage behind schedule: ${actualCoverage}% (Expected: ${expectedCoveragePercent}%)`);
      }

      if (performanceChange < -5 && previousAverage > 0) {
        alerts.push(`Performance dropped by ${Math.abs(performanceChange).toFixed(1)}% from previous term`);
      }

      if (subjectData.teacherChanges.size > 3) {
        alerts.push(`High teacher turnover: ${subjectData.teacherChanges.size} different teachers assigned`);
      }

      if (assessmentCompletion < 60) {
        alerts.push(`Low assessment completion: ${assessmentCompletion}% of assessments completed`);
      }

      // Check for subjects with no progress for 2+ weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const recentAssessments = subjectData.assessmentPlans.filter(plan => 
        plan.assessments.some(a => new Date(a.createdAt) > twoWeeksAgo)
      );

      if (recentAssessments.length === 0 && subjectData.assessmentPlans.length > 0) {
        alerts.push('No syllabus progress recorded for 2+ weeks');
      }

      // Check for missing assessments
      const overdueAssessments = subjectData.assessmentPlans.filter(plan => 
        new Date(plan.dueDate) < now && plan.assessments.length === 0
      );

      if (overdueAssessments.length > 0) {
        alerts.push(`${overdueAssessments.length} overdue assessment(s) not completed`);
      }

      // Check for performance below threshold
      if (currentAverage > 0 && currentAverage < 50) {
        alerts.push(`Subject performance below threshold: ${currentAverage.toFixed(1)}%`);
      }

      return {
        subjectId: subjectData.subjectId,
        subjectName: subjectData.subjectName,
        coverageVsExpected: {
          actual: actualCoverage,
          expected: expectedCoveragePercent,
          status: actualCoverage >= expectedCoveragePercent - 5 ? 'ON_TRACK' : 
                  actualCoverage >= expectedCoveragePercent - 15 ? 'BEHIND' : 'AHEAD',
        },
        performanceTrend: {
          current: Math.round(currentAverage),
          previous: Math.round(previousAverage),
          change: Math.round(performanceChange * 10) / 10,
        },
        teacherChanges: subjectData.teacherChanges.size,
        assessmentCompletion,
        alerts,
      };
    });

    // Filter to only return subjects with alerts or significant issues
    const filteredIndicators = healthIndicators.filter(indicator => 
      indicator.alerts.length > 0 || 
      indicator.coverageVsExpected.status === 'BEHIND' ||
      indicator.performanceTrend.change < -5 ||
      indicator.teacherChanges > 2
    );

    return NextResponse.json(filteredIndicators);

  } catch (error) {
    console.error('Error fetching subjects health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects health data' },
      { status: 500 }
    );
  }
}