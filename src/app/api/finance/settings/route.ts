/**
 * Finance Settings API
 * GET: Get finance settings
 * PUT: Update finance settings
 * 
 * Requirements: 12.1-12.7, 11.1
 * Property 20: Finance Access Control
 * Property 25: Settings Change Audit
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { Role } from '@/types/enums'
import { 
  hasFinanceAccess,
  canWriteFinanceData,
  FINANCE_ACCESS_ERRORS
} from '@/lib/finance-access'
import { SchoolSettingsService } from '@/services/school-settings.service'

const settingsService = new SchoolSettingsService()

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control
    if (!hasFinanceAccess(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const settings = await settingsService.getFinanceSettings(schoolId)

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching finance settings:', error)
    return NextResponse.json({ error: 'Failed to fetch finance settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userId = session.user.id as string
    const userRole = session.user.role as Role

    // Property 20: Finance Access Control - only write roles can update settings
    if (!canWriteFinanceData(userRole)) {
      return NextResponse.json({ 
        error: 'Forbidden',
        message: 'You do not have permission to update finance settings',
        code: FINANCE_ACCESS_ERRORS.FINANCE_ACCESS_DENIED
      }, { status: 403 })
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School not found' }, { status: 403 })
    }

    const body = await request.json()
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'

    // Property 25: Settings Change Audit - all changes are logged
    const settings = await settingsService.updateFinanceSettings(
      schoolId,
      body,
      userId,
      ipAddress
    )

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating finance settings:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update finance settings' 
    }, { status: 500 })
  }
}
