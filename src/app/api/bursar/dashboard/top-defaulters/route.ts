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
    const limit = parseInt(searchParams.get('limit') || '5');

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
    const defaulters = await prisma.studentAccount.findMany({
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
    const defaulterData = defaulters.map((account) => {
      // Calculate days past due based on the account creation date or last payment date
      // Since we don't have specific due dates, we'll estimate based on when the account was created
      const currentDate = new Date();
      const accountCreatedDate = account.createdAt;
      const daysPastDue = Math.floor((currentDate.getTime() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get the class name using the class map
      const className = account.student.classId ? classMap.get(account.student.classId) || 'N/A' : 'N/A';

      return {
        id: account.studentId,
        studentName: `${account.student.firstName} ${account.student.lastName}`,
        className,
        outstandingAmount: account.balance,
        daysPastDue: Math.max(0, daysPastDue), // Ensure non-negative value
        lastPayment: account.updatedAt.toISOString() // Using updatedAt as a proxy for last payment
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