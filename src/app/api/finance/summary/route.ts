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
        unpaidStudents: [],
        currentTerm: null,
        lastReminderSent: null
      });
    }

    // Get current term if not specified
    const today = new Date()
    const currentYear = new Date().getFullYear()
    
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true
      }
    })

    // Fallback: Find academic year that matches current year
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Fallback: Use isActive flag
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Last resort: Most recent academic year
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: { schoolId },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      return NextResponse.json({
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        unpaidStudents: [],
        currentTerm: null,
        lastReminderSent: null
      })
    }

    // Get current term with intelligent fallback
    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    // Fallback: Find term that includes today's date
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    // Fallback: Most recent term that has started
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    // Last resort: Most recent term
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: { academicYearId: currentAcademicYear.id },
        orderBy: { startDate: 'desc' }
      })
    }

    if (!currentTerm) {
      return NextResponse.json({
        totalExpected: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        collectionRate: 0,
        unpaidStudents: [],
        currentTerm: null,
        lastReminderSent: null
      })
    }

    // Get student accounts for the term (this is the source of truth for financial data)
    const studentAccounts = await prisma.studentAccount.findMany({
      where: {
        schoolId,
        termId: currentTerm.id
      },
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
    })

    // Calculate totals from student accounts
    let totalExpected = 0
    let totalCollected = 0
    let totalOutstanding = 0
    const unpaidStudents = []

    for (const account of studentAccounts) {
      const expectedFee = account.totalFees
      const paidAmount = account.totalPaid
      const balance = account.balance

      totalExpected += expectedFee
      totalCollected += paidAmount

      // Only count positive balances as outstanding
      if (balance > 0) {
        totalOutstanding += balance
        
        const primaryGuardian = account.student.studentGuardians.find(g => g.isPrimary)?.guardian
        
        unpaidStudents.push({
          id: account.student.id,
          name: `${account.student.firstName} ${account.student.lastName}`,
          class: account.student.class?.name || 'No Class',
          balance: balance,
          totalDue: expectedFee,
          totalPaid: paidAmount,
          lastPaymentDate: account.lastPaymentDate?.toISOString() || null,
          phone: primaryGuardian?.phone || undefined,
          email: primaryGuardian?.email || undefined
        })
      }
    }

    // Sort unpaid students by balance (highest first)
    unpaidStudents.sort((a, b) => b.balance - a.balance)

    const collectionRate = totalExpected > 0 
      ? Math.min(100, (totalCollected / totalExpected) * 100) 
      : 0

    // Fetch school record to get lastReminderSent
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { lastReminderSent: true }
    })

    console.log('[Finance Summary API] School lastReminderSent:', school?.lastReminderSent)

    const result = {
      totalExpected,
      totalCollected,
      totalOutstanding,
      collectionRate: Math.round(collectionRate * 100) / 100,
      unpaidStudents: unpaidStudents.slice(0, 50), // Limit to top 50 for performance
      currentTerm: {
        id: currentTerm.id,
        name: currentTerm.name,
        academicYear: currentAcademicYear.name
      },
      lastReminderSent: school?.lastReminderSent?.toISOString() || null
    }

    console.log('[Finance Summary API] Returning lastReminderSent:', result.lastReminderSent)

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching financial summary:', error);
    // Return empty data instead of error for better UX
    return NextResponse.json({
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      collectionRate: 0,
      unpaidStudents: [],
      currentTerm: null,
      lastReminderSent: null
    });
  }
}