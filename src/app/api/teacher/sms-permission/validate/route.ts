/**
 * Teacher API Route for Validating SMS Permission Codes
 * POST /api/teacher/sms-permission/validate
 * Requirements: Teachers validate codes before sending SMS
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { teacherSMSPermissionService } from '@/services/teacher-sms-permission.service'

interface ValidateCodeRequest {
  code: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const userId = (session.user as { id?: string }).id
    const schoolId = (session.user as { schoolId?: string }).schoolId
    
    if (!userId || !schoolId) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 400 }
      )
    }
    
    // Verify user is teacher
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    })
    
    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only teachers can validate permission codes' },
        { status: 403 }
      )
    }
    
    const body: ValidateCodeRequest = await request.json()
    const { code } = body
    
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid permission code format. Must be 6 digits.' },
        { status: 400 }
      )
    }
    
    // Validate the permission code
    const validation = await teacherSMSPermissionService.validateCode(code, schoolId, userId)
    
    if (!validation.valid) {
      return NextResponse.json(
        { 
          valid: false, 
          error: validation.error || 'Invalid permission code' 
        },
        { status: 403 }
      )
    }
    
    return NextResponse.json({
      valid: true,
      code: validation.code?.code,
      expiresAt: validation.code?.expiresAt,
      message: 'Permission code is valid'
    })
    
  } catch (error) {
    console.error('Error validating permission code:', error)
    return NextResponse.json(
      { error: 'Failed to validate permission code' },
      { status: 500 }
    )
  }
}