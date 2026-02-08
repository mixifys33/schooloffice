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
        error: 'Only Director of Studies can access report statistics'
      }, { status: 403 });
    }

    const schoolId = session.user.schoolId;

    if (!schoolId) {
      return NextResponse.json({
        error: 'No school associated with user'
      }, { status: 400 });
    }

    // Get report statistics using DoSReportCard model
    const pending = await prisma.dosReportCard.count({
      where: {
        schoolId,
        status: 'DRAFT' // Draft reports need review
      }
    });

    const approved = await prisma.dosReportCard.count({
      where: {
        schoolId,
        status: 'APPROVED'
      }
    });

    const distributed = await prisma.dosReportCard.count({
      where: {
        schoolId,
        status: 'PUBLISHED' // Published reports are distributed
      }
    });

    const downloaded = await prisma.dosReportCard.count({
      where: {
        schoolId,
        publishedAt: { not: null } // Published reports are considered downloaded/distributed
      }
    });

    return NextResponse.json({
      pending,
      approved,
      distributed,
      downloaded
    });

  } catch (error) {
    console.error('Error fetching report statistics:', error);

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to fetch report statistics'
    }, { status: 500 });
  }
}