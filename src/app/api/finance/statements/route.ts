/**
 * Statements API
 * GET: Generate student or guardian statement
 * 
 * Requirements: 6.2, 6.3, 11.1, 11.3
 * Property 20: Finance Access Control
 * Property 21: Parent Data Isolation
 * Property 27: Statement Running Balance
 * Property 28: Guardian Statement Aggregation
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  canReadFinanceData,
  isParentRole,
  isStudentRole,
  validateFinanceAccessForStudent,
  getLinkedStudentIds,
  FinanceAccessError,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { 
  generateStudentStatement, 
  generateGuardianStatement,
  StatementError 
} from '@/services/statement.service'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id as string
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
    if (!canReadFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'student' // 'student' or 'guardian'
    const studentId = searchParams.get('studentId')
    const guardianId = searchParams.get('guardianId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const dateFromParsed = dateFrom ? new Date(dateFrom) : undefined
    const dateToParsed = dateTo ? new Date(dateTo) : undefined

    if (type === 'guardian') {
      if (!guardianId) {
        return NextResponse.json({ 
          error: 'guardianId is required for guardian statements' 
        }, { status: 400 })
      }

      // Property 21: Parent Data Isolation - parents can only see their own statement
      if (isParentRole(userRole)) {
        // Verify this guardian is linked to the user
        const linkedStudentIds = await getLinkedStudentIds(userId)
        if (linkedStudentIds.length === 0) {
          return NextResponse.json({ 
            error: 'Forbidden',
            code: FINANCE_ACCESS_ERRORS.PARENT_DATA_ACCESS_DENIED
          }, { status: 403 })
        }
      }

      // Property 28: Guardian Statement Aggregation
      const statement = await generateGuardianStatement(
        guardianId,
        dateFromParsed,
        dateToParsed
      )

      return NextResponse.json(statement)
    } else {
      // Student statement
      if (!studentId) {
        return NextResponse.json({ 
          error: 'studentId is required for student statements' 
        }, { status: 400 })
      }

      // Property 21: Parent Data Isolation
      if (isParentRole(userRole) || isStudentRole(userRole)) {
        try {
          await validateFinanceAccessForStudent(
            { userId, role: userRole, schoolId },
            studentId
          )
        } catch (error) {
          if (error instanceof FinanceAccessError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode })
          }
          throw error
        }
      }

      // Property 27: Statement Running Balance
      const statement = await generateStudentStatement(
        studentId,
        dateFromParsed,
        dateToParsed
      )

      return NextResponse.json(statement)
    }
  } catch (error) {
    console.error('Error generating statement:', error)
    if (error instanceof StatementError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to generate statement' }, { status: 500 })
  }
}
