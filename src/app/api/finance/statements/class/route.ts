/**
 * Class Summary API
 * GET: Generate class financial summary
 * 
 * Requirements: 6.4, 11.1
 * Property 20: Finance Access Control
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  hasFinanceAccess,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { generateClassSummary, StatementError } from '@/services/statement.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control - only staff with finance access
    if (!hasFinanceAccess(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const classId = searchParams.get('classId')
    const termId = searchParams.get('termId')

    if (!classId || !termId) {
      return NextResponse.json({ 
        error: 'classId and termId are required' 
      }, { status: 400 })
    }

    const summary = await generateClassSummary(classId, termId)

    return NextResponse.json(summary)
  } catch (error) {
    console.error('Error generating class summary:', error)
    if (error instanceof StatementError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate class summary' }, { status: 500 })
  }
}
