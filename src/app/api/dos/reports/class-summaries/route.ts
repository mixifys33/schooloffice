/**
 * DoS Report Card Class Summaries API Route
 * 
 * Provides class-level report card generation summaries.
 */

import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Get session and validate authentication
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

    // Get school ID from session
    const schoolId = session.user.schoolId;
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School context required' },
        { status: 400 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');

    if (!termId) {
      return NextResponse.json(
        { error: 'Term ID is required' },
        { status: 400 }
      );
    }

    // Get class summaries
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          where: { status: 'ACTIVE' },
          select: { id: true }
        },
        _count: {
          select: {
            students: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    const classSummaries = await Promise.all(
      classes.map(async (cls) => {
        // Get report cards for this class
        const reportCards = await prisma.doSReportCard.findMany({
          where: {
            schoolId,
            termId,
            student: { classId: cls.id }
          }
        });

        // Calculate metrics
        const totalStudents = cls._count.students;
        const generatedReports = reportCards.length;
        const approvedReports = reportCards.filter(r => r.dosApproved).length;
        const publishedReports = reportCards.filter(r => r.status === 'PUBLISHED').length;
        
        const averageScore = reportCards.length > 0 
          ? reportCards.reduce((sum, r) => sum + (r.averageScore || 0), 0) / reportCards.length
          : 0;

        const passedReports = reportCards.filter(r => (r.averageScore || 0) >= 50).length;
        const passRate = reportCards.length > 0 ? (passedReports / reportCards.length) * 100 : 0;

        return {
          classId: cls.id,
          className: cls.name,
          totalStudents,
          generatedReports,
          approvedReports,
          publishedReports,
          averageScore: Math.round(averageScore * 100) / 100,
          passRate: Math.round(passRate * 100) / 100
        };
      })
    );

    return NextResponse.json(classSummaries);

  } catch (error) {
    console.error('Class Summaries API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch class summaries',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}