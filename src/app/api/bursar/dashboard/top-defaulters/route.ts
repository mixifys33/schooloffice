import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.schoolId) {
      return NextResponse.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get('termId');
    const period = searchParams.get('period') || 'current-term';
    const limit = parseInt(searchParams.get('limit') || '5');

    // Calculate date range based on period
    let dateRange: { start: Date; end: Date } | null = null;
    if (period !== 'current-term') {
      const now = new Date();
      switch (period) {
        case 'current-month':
          dateRange = {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          };
          break;
        case 'last-30-days':
          dateRange = {
            start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            end: now
          };
          break;
        case 'current-year':
          dateRange = {
            start: new Date(now.getFullYear(), 0, 1),
            end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
          };
          break;
      }
    }

    let defaulters: any[];

    // For date-based periods, recalculate balances from payments and fee structures
    if (dateRange) {
      // Get all active students
      const students = await prisma.student.findMany({
        where: {
          schoolId: session.user.schoolId,
          status: 'ACTIVE'
        },
        include: {
          payments: {
            where: {
              receivedAt: {
                gte: dateRange.start,
                lte: dateRange.end
              },
              status: 'CONFIRMED'
            }
          }
        }
      });

      // Get all active fee structures for date-based periods
      const feeStructures = await prisma.feeStructure.findMany({
        where: {
          schoolId: session.user.schoolId,
          isActive: true
        }
      });

      // Calculate balance for each student
      const studentBalances = students.map(student => {
        // Find fee structure for this student's class
        const feeStructure = feeStructures.find(fs => 
          fs.classId === student.classId && 
          fs.studentType === 'DAY' // Default to DAY
        );

        const expectedFee = feeStructure?.totalAmount || 0;
        const paidAmount = student.payments.reduce((sum, p) => sum + p.amount, 0);
        const balance = expectedFee - paidAmount;

        return {
          student,
          balance,
          lastPaymentDate: student.payments.length > 0 
            ? student.payments.reduce((latest, p) => p.receivedAt > latest ? p.receivedAt : latest, student.payments[0].receivedAt)
            : null
        };
      });

      // Filter to students with positive balance and sort by balance descending
      defaulters = studentBalances
        .filter(sb => sb.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, limit)
        .map(sb => ({
          student: {
            id: sb.student.id,
            firstName: sb.student.firstName,
            lastName: sb.student.lastName,
            classId: sb.student.classId
          },
          balance: sb.balance,
          lastPaymentDate: sb.lastPaymentDate,
          createdAt: sb.student.createdAt
        }));
    } else {
      // Use existing term-based logic for "current-term"
      // Build the where clause for student accounts
      let whereClause: any = {
        schoolId: session.user.schoolId,
        balance: {
          gt: 0
        }
      };

      // Try with termId first if provided
      let useTermFilter = false;
      if (termId) {
        const tempWhereClause = {
          ...whereClause,
          termId: termId
        };
        
        // Check if there are any records with this termId
        const count = await prisma.studentAccount.count({
          where: tempWhereClause
        });
        
        // If records found with this termId, use the term filter
        if (count > 0) {
          whereClause = tempWhereClause;
          useTermFilter = true;
        }
      }

      // Get students with outstanding balances (defaulters)
      const studentAccounts = await prisma.studentAccount.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              classId: true
            }
          }
        },
        orderBy: {
          balance: 'desc'
        },
        take: limit
      });

      // Map to consistent format
      defaulters = studentAccounts.map(account => ({
        student: account.student,
        balance: account.balance,
        lastPaymentDate: account.lastPaymentDate,
        createdAt: account.createdAt
      }));
    }

    // Extract unique class IDs to fetch all class names in a single query
    const classIds = [...new Set(defaulters.map(d => d.student.classId).filter(Boolean))];
    const classRecords = await prisma.class.findMany({
      where: {
        id: {
          in: classIds as string[]
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    // Create a map of class IDs to class names for quick lookup
    const classMap = new Map(classRecords.map(cls => [cls.id, cls.name]));

    // Process the defaulters data - use the class map to get class names
    const defaulterData = defaulters.map((defaulter) => {
      // Calculate days past due based on the account creation date or last payment date
      // Since we don't have specific due dates, we'll estimate based on when the account was created
      const currentDate = new Date();
      const accountCreatedDate = defaulter.createdAt;
      const daysPastDue = Math.floor((currentDate.getTime() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get the class name using the class map
      const className = defaulter.student.classId ? classMap.get(defaulter.student.classId) || 'N/A' : 'N/A';

      return {
        id: defaulter.student.id,
        studentName: `${defaulter.student.firstName} ${defaulter.student.lastName}`,
        className,
        outstandingAmount: defaulter.balance,
        daysPastDue: Math.max(0, daysPastDue), // Ensure non-negative value
        lastPayment: defaulter.lastPaymentDate?.toISOString() || accountCreatedDate.toISOString()
      };
    });

    return NextResponse.json({
      success: true,
      defaulters: defaulterData
    });
  } catch (error) {
    console.error('Error fetching top defaulters:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch defaulter information', 
        success: false,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}