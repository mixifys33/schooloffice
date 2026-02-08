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
    if (!session.user.roles?.includes('DOS') && session.user.role !== 'DOS') {
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

    // Get recent DoS report cards
    const reports = await prisma.dosReportCard.findMany({
      where: {
        schoolId,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20, // Limit to 20 most recent reports
      select: {
        id: true,
        studentName: true,
        className: true,
        termName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        averageScore: true,
        overallGrade: true
      }
    });

    // Transform the data to match the expected format
    const transformedReports = reports.map(report => ({
      id: report.id,
      title: `${report.studentName} - ${report.className} ${report.termName} Report`,
      type: 'Academic',
      status: report.status.toLowerCase(),
      generatedAt: report.createdAt,
      size: 'N/A' // Size not stored in this model
    }));

    return NextResponse.json({
      reports: transformedReports
    });

  } catch (error) {
    console.error('Error fetching reports:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch reports'
    }, { status: 500 });
  }
}

// Helper function to format file sizes
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}