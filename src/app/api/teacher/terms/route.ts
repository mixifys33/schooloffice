/**
 * Teacher Terms API Route
 * 
 * Provides access to academic terms for teachers to use in report generation
 * and marks management within their authorized scope.
 * 
 * Requirements: 10.1, 11.1, 11.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export interface TeacherTermsResponse {
  terms: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    academicYear: {
      id: string;
      name: string;
      startYear: number;
      endYear: number;
    };
  }[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's staff record
    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id },
      include: {
        school: true,
      },
    });

    if (!staff) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    // Get all terms for the teacher's school
    const terms = await prisma.term.findMany({
      where: {
        academicYear: {
          schoolId: staff.schoolId,
        },
      },
      include: {
        academicYear: {
          select: {
            id: true,
            name: true,
            startYear: true,
            endYear: true,
          },
        },
      },
      orderBy: [
        { academicYear: { startYear: 'desc' } },
        { startDate: 'desc' },
      ],
    });

    const response: TeacherTermsResponse = {
      terms: terms.map((term) => ({
        id: term.id,
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
        isActive: term.isActive,
        academicYear: term.academicYear,
      })),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching teacher terms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch terms' },
      { status: 500 }
    );
  }
}