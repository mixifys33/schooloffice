/**
 * DoS Subjects Overview API Route
 * Provides comprehensive subject data for the DoS Subject Control Center
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
    const type = searchParams.get('type'); // 'core' or 'elective'

    // Get all subjects for the school
    const subjects = await prisma.subject.findMany({
      where: {
        schoolId,
        isActive: true,
      },
      include: {
        classSubjects: {
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
        dosCurriculumSubjects: {
          include: {
            class: {
              select: {
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // If no subjects exist, return empty array with proper structure
    if (subjects.length === 0) {
      return NextResponse.json({
        subjects: [],
        total: 0,
        coreCount: 0,
        electiveCount: 0,
        message: 'No subjects found. Please add subjects to your school.'
      });
    }

    // Transform subjects to match the expected interface
    const transformedSubjects = subjects.map(subject => {
      // Determine if subject is core or elective based on DoS curriculum data
      const curriculumData = subject.dosCurriculumSubjects[0];
      const isCore = curriculumData?.isCore ?? false;
      const subjectType = isCore ? 'CORE' : 'OPTIONAL';

      // Calculate metrics
      const classesOffered = subject.classSubjects.length;
      const teachersAssigned = new Set(subject.staffSubjects.map(ss => ss.staffId)).size;
      
      // For electives, calculate enrollment and capacity
      const studentsEnrolled = subject.classSubjects.reduce((total, cs) => {
        // Estimate based on class capacity (simplified)
        return total + 30; // Default class size
      }, 0);
      
      const totalCapacity = classesOffered * 35; // Default capacity per class
      const popularity = totalCapacity > 0 ? Math.round((studentsEnrolled / totalCapacity) * 100) : 0;

      return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        type: subjectType,
        classesOffered,
        teachersAssigned,
        studentsEnrolled,
        totalCapacity,
        popularity,
        weeklyPeriodLoad: curriculumData?.periodsPerWeek || 0,
        syllabusCoverage: 75, // Default value - can be calculated from assessments
        averagePerformance: 70, // Default value - can be calculated from marks
        riskStatus: 'GREEN',
        lastUpdated: subject.updatedAt.toISOString(),
        performanceTrend: 'STABLE',
        teacherStability: 'STABLE',
        assessmentCompletion: 80,
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
    });

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