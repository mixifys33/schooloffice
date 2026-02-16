/**
 * DoS Subjects Overview API Route
 * Provides comprehensive subject data with health metrics
 * Created: 2026-02-14
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

    // Get termId from query params
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    if (!termId) {
      return NextResponse.json(
        { error: 'Term ID required' },
        { status: 400 }
      );
    }

    // Get term details
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: {
        startDate: true,
        endDate: true,
        name: true,
      }
    });

    if (!term) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      );
    }

    // Get all subjects for the school
    const subjects = await prisma.subject.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      include: {
        dosCurriculumSubjects: {
          where: {
            schoolId,
          },
          include: {
            class: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        staffSubjects: {
          include: {
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            },
            class: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        classSubjects: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    // Calculate term progress for expected coverage
    const now = new Date();
    const termStart = new Date(term.startDate);
    const termEnd = new Date(term.endDate);
    const totalDays = Math.ceil((termEnd.getTime() - termStart.getTime()) / (24 * 60 * 60 * 1000));
    const daysElapsed = Math.max(0, Math.ceil((now.getTime() - termStart.getTime()) / (24 * 60 * 60 * 1000)));
    const termProgress = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

    // Transform subjects data with real calculations
    const transformedSubjects = await Promise.all(subjects.map(async (subject) => {
      const curriculumData = subject.dosCurriculumSubjects[0];
      const subjectType = curriculumData?.isCore ? 'CORE' : 'OPTIONAL';
      
      const classesOffered = subject.classSubjects.length;
      const teachersAssigned = new Set(subject.staffSubjects.map(ss => ss.staffId)).size;
      
      // Get actual student enrollment from database
      const enrollmentData = await prisma.student.groupBy({
        by: ['classId'],
        where: {
          classId: { in: subject.classSubjects.map(cs => cs.classId) },
          isActive: true,
        },
        _count: true,
      });
      const studentsEnrolled = enrollmentData.reduce((sum, item) => sum + item._count, 0);
      
      // Calculate actual syllabus coverage from curriculum data
      const syllabusCoverage = curriculumData?.syllabusCoverage || 0;
      const expectedCoverage = Math.round(termProgress);
      
      // Get actual performance data from marks
      const marks = await prisma.mark.aggregate({
        where: {
          subjectId: subject.id,
          termId: termId,
        },
        _avg: {
          totalMark: true,
        },
        _count: true,
      });
      
      // Get previous term for comparison
      const previousTerm = await prisma.term.findFirst({
        where: {
          academicYear: { schoolId },
          endDate: { lt: term.startDate },
        },
        orderBy: { endDate: 'desc' },
      });
      
      const previousMarks = previousTerm ? await prisma.mark.aggregate({
        where: {
          subjectId: subject.id,
          termId: previousTerm.id,
        },
        _avg: {
          totalMark: true,
        },
      }) : null;
      
      const averagePerformance = marks._avg.totalMark || 0;
      const previousPerformance = previousMarks?._avg.totalMark || 0;
      const performanceChange = averagePerformance - previousPerformance;
      
      // Determine performance trend
      let performanceTrend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
      if (performanceChange > 5) performanceTrend = 'UP';
      else if (performanceChange < -5) performanceTrend = 'DOWN';
      
      // Get assessment completion
      const totalStudents = studentsEnrolled;
      const caEntries = await prisma.cAEntry.count({
        where: {
          subjectId: subject.id,
          termId: termId,
        },
      });
      const examEntries = await prisma.examEntry.count({
        where: {
          subjectId: subject.id,
          termId: termId,
        },
      });
      
      // Calculate assessment completion rate (assuming 3 CA + 1 Exam per student)
      const expectedAssessments = totalStudents * 4; // 3 CA + 1 Exam
      const actualAssessments = caEntries + examEntries;
      const assessmentCompletion = expectedAssessments > 0 
        ? Math.round((actualAssessments / expectedAssessments) * 100) 
        : 0;
      
      // Determine risk status based on multiple factors
      let riskStatus: 'GREEN' | 'AMBER' | 'RED' = 'GREEN';
      const coverageGap = expectedCoverage - syllabusCoverage;
      
      if (teachersAssigned === 0 || coverageGap > 20 || averagePerformance < 50 || assessmentCompletion < 50) {
        riskStatus = 'RED';
      } else if (coverageGap > 10 || averagePerformance < 60 || assessmentCompletion < 70) {
        riskStatus = 'AMBER';
      }
      
      // Teacher stability - count assignments created after term started (indicates changes)
      const teacherChanges = await prisma.staffSubject.count({
        where: {
          subjectId: subject.id,
          createdAt: { gte: termStart },
        },
      });
      const teacherStability: 'STABLE' | 'UNSTABLE' = teacherChanges > 2 ? 'UNSTABLE' : 'STABLE';

      // Calculate alerts
      const alerts: string[] = [];
      if (teachersAssigned === 0) {
        alerts.push('No teachers assigned');
      }
      if (classesOffered === 0) {
        alerts.push('Not offered in any class');
      }
      if (coverageGap > 15) {
        alerts.push(`Behind schedule by ${Math.round(coverageGap)}%`);
      }
      if (averagePerformance < 50 && marks._count > 0) {
        alerts.push('Low performance - below 50%');
      }
      if (assessmentCompletion < 50) {
        alerts.push('Assessment completion below 50%');
      }

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        type: subjectType,
        level: subject.educationLevel || 'PRIMARY',
        classesOffered,
        teachersAssigned,
        studentsEnrolled,
        totalCapacity: studentsEnrolled, // Actual enrollment
        popularity: 100, // All enrolled students
        weeklyPeriodLoad: curriculumData?.periodsPerWeek || 0,
        syllabusCoverage,
        expectedCoverage,
        averagePerformance: Math.round(averagePerformance),
        previousPerformance: Math.round(previousPerformance),
        riskStatus,
        lastUpdated: subject.updatedAt.toISOString(),
        performanceTrend,
        teacherStability,
        assessmentCompletion,
        teacherChanges,
        unebRelevance: true,
        alerts,
        // Additional fields for curriculum data
        curriculumData: curriculumData ? {
          isCore: curriculumData.isCore,
          caWeight: curriculumData.caWeight,
          examWeight: curriculumData.examWeight,
          minPassMark: curriculumData.minPassMark,
          periodsPerWeek: curriculumData.periodsPerWeek,
          dosApproved: curriculumData.dosApproved,
        } : null
      };
    }));

    // Get type filter from query params
    const type = searchParams.get('type');

    // Filter by type if specified
    let filteredSubjects = transformedSubjects;
    if (type === 'core') {
      filteredSubjects = transformedSubjects.filter(s => s.type === 'CORE');
    } else if (type === 'elective') {
      filteredSubjects = transformedSubjects.filter(s => s.type === 'OPTIONAL');
    }

    return NextResponse.json({
      subjects: filteredSubjects,
      total: filteredSubjects.length,
      coreCount: transformedSubjects.filter(s => s.type === 'CORE').length,
      electiveCount: transformedSubjects.filter(s => s.type === 'OPTIONAL').length,
    });

  } catch (error) {
    console.error('Error fetching subjects overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subjects overview' },
      { status: 500 }
    );
  }
}
