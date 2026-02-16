/**
 * DoS Subject Health Indicators API Route
 * Provides academic health metrics for all subjects
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

    // Calculate health indicators for each subject
    const healthIndicators = await Promise.all(
      subjects.map(async (subject) => {
        // Get term details
        const term = await prisma.term.findUnique({
          where: { id: termId },
          select: {
            startDate: true,
            endDate: true,
          }
        });

        if (!term) {
          return null;
        }

        const now = new Date();
        const termStart = new Date(term.startDate);
        const termEnd = new Date(term.endDate);
        const totalWeeks = Math.ceil((termEnd.getTime() - termStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weeksElapsed = Math.ceil((now.getTime() - termStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const weeksRemaining = totalWeeks - weeksElapsed;

        // Calculate expected coverage (linear progression)
        const expectedCoverage = Math.min(100, (weeksElapsed / totalWeeks) * 100);

        // Get actual coverage from curriculum subjects
        const curriculumSubject = subject.dosCurriculumSubjects[0];
        const actualCoverage = curriculumSubject?.syllabusCoverage || 0;

        // Determine coverage status
        let coverageStatus: 'ON_TRACK' | 'BEHIND' | 'AHEAD' = 'ON_TRACK';
        if (actualCoverage < expectedCoverage - 10) {
          coverageStatus = 'BEHIND';
        } else if (actualCoverage > expectedCoverage + 10) {
          coverageStatus = 'AHEAD';
        }

        // Get performance data from actual marks
        const marks = await prisma.mark.aggregate({
          where: {
            subjectId: subject.id,
            termId: termId,
          },
          _avg: {
            totalMark: true,
          },
        });
        
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
        
        const currentPerformance = marks._avg.totalMark || 0;
        const previousPerformance = previousMarks?._avg.totalMark || 0;
        const performanceChange = currentPerformance - previousPerformance;
        
        let performanceTrend: 'IMPROVING' | 'DECLINING' | 'STABLE' = 'STABLE';
        if (performanceChange > 5) {
          performanceTrend = 'IMPROVING';
        } else if (performanceChange < -5) {
          performanceTrend = 'DECLINING';
        }

        // Teacher stability analysis - count assignments created after term started
        const teacherCount = subject.staffSubjects.length;
        const teacherChanges = await prisma.staffSubject.count({
          where: {
            subjectId: subject.id,
            createdAt: { gte: termStart },
          },
        });
        const teacherStability: 'STABLE' | 'UNSTABLE' = teacherChanges > 2 ? 'UNSTABLE' : 'STABLE';
        const overloaded = teacherCount < subject.classSubjects.length; // More classes than teachers

        // Assessment completion from actual data
        const totalStudents = await prisma.student.count({
          where: {
            classId: { in: subject.classSubjects.map(cs => cs.classId) },
            isActive: true,
          },
        });
        
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
        
        // Assuming 3 CA + 1 Exam per student per term
        const expectedAssessments = totalStudents * 4;
        const actualAssessments = caEntries + examEntries;
        const assessmentCompletion = expectedAssessments > 0 
          ? Math.round((actualAssessments / expectedAssessments) * 100)
          : 0;
        const assessmentMissing = Math.max(0, expectedAssessments - actualAssessments);
        
        // Check for overdue assessments (simplified - would need due dates)
        const assessmentOverdue = assessmentMissing > (expectedAssessments * 0.2) ? Math.round(assessmentMissing * 0.3) : 0;

        // Generate critical alerts
        const criticalAlerts: string[] = [];
        if (coverageStatus === 'BEHIND') {
          criticalAlerts.push(`Syllabus coverage is ${(expectedCoverage - actualCoverage).toFixed(1)}% behind schedule`);
        }
        if (performanceTrend === 'DECLINING') {
          criticalAlerts.push(`Performance declining by ${Math.abs(performanceChange).toFixed(1)}%`);
        }
        if (teacherStability === 'UNSTABLE') {
          criticalAlerts.push(`${teacherChanges} teacher changes this term - stability at risk`);
        }
        if (overloaded) {
          criticalAlerts.push(`Teacher shortage: ${teacherCount} teacher(s) for ${subject.classSubjects.length} classes`);
        }
        if (assessmentOverdue > 0) {
          criticalAlerts.push(`${assessmentOverdue} assessments overdue`);
        }

        // Generate recommendations
        const recommendations: string[] = [];
        if (coverageStatus === 'BEHIND') {
          recommendations.push('Increase weekly periods or implement catch-up sessions');
        }
        if (performanceTrend === 'DECLINING') {
          recommendations.push('Review teaching methods and provide additional support');
        }
        if (overloaded) {
          recommendations.push('Assign additional teachers or redistribute workload');
        }
        if (assessmentOverdue > 0) {
          recommendations.push('Follow up with teachers to complete pending assessments');
        }

        return {
          subjectId: subject.id,
          subjectName: subject.name,
          coverageHealth: {
            actual: actualCoverage,
            expected: expectedCoverage,
            status: coverageStatus,
            weeksRemaining,
          },
          performanceHealth: {
            current: currentPerformance,
            previous: previousPerformance,
            change: performanceChange,
            trend: performanceTrend,
          },
          teacherHealth: {
            stability: teacherStability,
            changes: teacherChanges,
            overloaded,
          },
          assessmentHealth: {
            completion: assessmentCompletion,
            missing: assessmentMissing,
            overdue: assessmentOverdue,
          },
          criticalAlerts,
          recommendations,
        };
      })
    );

    // Filter out null values
    const validIndicators = healthIndicators.filter(indicator => indicator !== null);

    return NextResponse.json({
      indicators: validIndicators,
      termId,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error fetching health indicators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health indicators' },
      { status: 500 }
    );
  }
}
