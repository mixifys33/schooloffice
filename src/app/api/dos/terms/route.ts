/**
 * DoS Terms API
 * GET - Fetch all terms for dropdown
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role, StaffRole } from '@/types/enums'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json({ error: 'No school context found' }, { status: 400 })
    }

    // Verify DoS role
    const userRole = session.user.activeRole || session.user.role
    const isDoS = userRole === Role.SCHOOL_ADMIN || userRole === StaffRole.DOS
    
    if (!isDoS) {
      return NextResponse.json({ error: 'Access denied. DoS role required.' }, { status: 403 })
    }

    // Fetch all terms from current academic year
    const terms = await prisma.term.findMany({
      where: {
        academicYear: {
          schoolId,
          isCurrent: true
        }
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true
      },
      orderBy: { startDate: 'asc' }
    })

    return NextResponse.json({ terms })

  } catch (error: any) {
    console.error('Error fetching terms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch terms', details: error.message },
      { status: 500 }
    )
  }
}
