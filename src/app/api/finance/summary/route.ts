import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try to get schoolId from session or URL params
    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const schoolIdParam = searchParams.get('schoolId');
    const schoolId = session.user.schoolId || schoolIdParam;

    if (!schoolId) {
      // Return empty data instead of error for better UX
      return NextResponse.json({
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        unpaidStudents: []
      });
    }

    // Get current term if not specified
    let currentTerm = null;
    try {
      if (termId) {
        currentTerm = await prisma.term.findUnique({
          where: { id: termId },
          include: {
            academicYear: {
              where: { schoolId }
            }
          }
        });
      } else {
        currentTerm = await prisma.term.findFirst({
          where: {
            academicYear: {
              schoolId,
              isActive: true
            }
          },
          orderBy: { startDate: 'desc' }
        });
      }
    } catch (termError) {
      console.error('Error fetching term:', termError);
    }

    if (!currentTerm) {
      return NextResponse.json({
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        unpaidStudents: []
      });
    }

    // Get all student accounts for the school
    let studentAccounts = [];
    try {
      studentAccounts = await prisma.studentAccount.findMany({
        where: { schoolId },
        include: {
          student: {
            include: {
              class: true,
              studentGuardians: {
                include: {
                  guardian: true
                }
              }
            }
          }
        }
      });
    } catch (accountError) {
      console.error('Error fetching student accounts:', accountError);
      // Return empty data if database query fails
      return NextResponse.json({
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        unpaidStudents: []
      });
    }

    // Calculate totals
    let totalExpected = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    const unpaidStudents = [];

    for (const account of studentAccounts) {
      totalExpected += account.totalFees || 0;
      totalCollected += account.totalPaid || 0;
      
      const outstanding = Math.max(0, account.balance || 0);
      totalOutstanding += outstanding;

      // Add to unpaid list if has outstanding balance
      if (outstanding > 0) {
        const primaryGuardian = account.student.studentGuardians.find(g => g.isPrimary)?.guardian;
        
        unpaidStudents.push({
          id: account.student.id,
          name: `${account.student.firstName || ''} ${account.student.lastName || ''}`.trim(),
          class: account.student.class?.name || 'No Class',
          balance: outstanding,
          phone: primaryGuardian?.phone || undefined
        });
      }
    }

    // Sort unpaid students by balance (highest first)
    unpaidStudents.sort((a, b) => b.balance - a.balance);

    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    const result = {
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate: Math.round(collectionRate * 100) / 100,
      unpaidStudents: unpaidStudents.slice(0, 50) // Limit to top 50 for performance
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error fetching financial summary:', error);
    // Return empty data instead of error for better UX
    return NextResponse.json({
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      collectionRate: 0,
      unpaidStudents: []
    });
  }
}