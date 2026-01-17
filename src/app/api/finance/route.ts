/**
 * Finance Dashboard API
 * GET: Returns finance dashboard summary
 * 
 * Requirements: 11.1, 11.2
 * Property 20: Finance Access Control
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { 
  hasFinanceAccess,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { getFinanceDashboardSummary } from '@/services/finance.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
    // Requirement 11.1, 11.2: Verify ACCOUNTANT, SCHOOL_ADMIN, or DEPUTY role
    if (!hasFinanceAccess(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have access to the finance module',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const termId = searchParams.get('termId') || undefined

    const summary = await getFinanceDashboardSummary(schoolId, termId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error fetching finance dashboard:', error)
    return NextResponse.json({ error: 'Failed to fetch finance data' }, { status: 500 })
  }
}
