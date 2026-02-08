import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's school context
    const staff = await prisma.staff.findUnique({
      where: { userId: session.user.id },
      include: { school: true }
    });

    if (!staff || !staff.school) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    // Get current academic year and term
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    
    // Find active academic year
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: staff.schoolId,
        isActive: true
      },
      include: {
        terms: {
          orderBy: {
            startDate: 'asc'
          }
        }
      }
    });

    if (!academicYear) {
      // Return default context if no academic year is set up
      return NextResponse.json({
        currentTerm: 'Term 1',
        academicYear: `${currentYear}/${currentYear + 1}`,
        termProgress: 25,
        daysRemaining: 60
      });
    }

    // Find current active term
    const currentTerm = academicYear.terms.find(term => {
      const startDate = new Date(term.startDate);
      const endDate = new Date(term.endDate);
      return currentDate >= startDate && currentDate <= endDate;
    }) || academicYear.terms[0]; // Fallback to first term

    if (!currentTerm) {
      return NextResponse.json({
        currentTerm: 'Term 1',
        academicYear: academicYear.name,
        termProgress: 0,
        daysRemaining: 90
      });
    }

    // Calculate term progress
    const termStart = new Date(currentTerm.startDate);
    const termEnd = new Date(currentTerm.endDate);
    const totalDays = Math.ceil((termEnd.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((currentDate.getTime() - termStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.ceil((termEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
    const termProgress = Math.min(100, Math.max(0, Math.round((daysPassed / totalDays) * 100)));

    return NextResponse.json({
      currentTerm: currentTerm.name,
      academicYear: academicYear.name,
      termProgress,
      daysRemaining,
      termStart: currentTerm.startDate,
      termEnd: currentTerm.endDate
    });

  } catch (error) {
    console.error('Error fetching academic context:', error);
    
    // Return fallback context on error
    const currentYear = new Date().getFullYear();
    return NextResponse.json({
      currentTerm: 'Term 1',
      academicYear: `${currentYear}/${currentYear + 1}`,
      termProgress: 25,
      daysRemaining: 60
    });
  }
}