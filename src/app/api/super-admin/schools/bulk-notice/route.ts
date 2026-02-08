/**
 * Super Admin - Bulk Send Notice to Schools
 * POST /api/super-admin/schools/bulk-notice
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.6
 * - Send notice to multiple schools
 * - Return individual results for each school
 * - Create individual audit log entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { ActionType } from '@prisma/client'
import { emailService } from '@/services/email.service'

interface BulkNoticeRequest {
  schoolIds: string[]
  subject: string
  message: string
  reason: string
}

interface SchoolResult {
  schoolId: string
  schoolName: string
  adminEmail: string
  success: boolean
  error?: string
}

/**
 * POST /api/super-admin/schools/bulk-notice
 * Send notice to multiple schools
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate and authorize
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Super Admin access required' },
        { status: 403 }
      )
    }

    const body: BulkNoticeRequest = await request.json()
    const { schoolIds, subject, message, reason } = body

    // Validate schoolIds array
    if (!schoolIds || !Array.isArray(schoolIds) || schoolIds.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'schoolIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate subject is provided
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Subject is required' },
        { status: 400 }
      )
    }

    // Validate message is provided
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Message is required' },
        { status: 400 }
      )
    }

    // Validate reason is provided
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Reason is required for this action' },
        { status: 400 }
      )
    }

    // Get request metadata for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Process each school individually
    const results: SchoolResult[] = []

    for (const schoolId of schoolIds) {
      try {
        // Get school details with admin information
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: {
            id: true,
            name: true,
            adminEmail: true,
            isActive: true,
          },
        })

        if (!school) {
          results.push({
            schoolId,
            schoolName: 'Unknown',
            adminEmail: 'Unknown',
            success: false,
            error: 'School not found',
          })

          // Create failure audit log
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_NOTICE,
              targetSchoolId: schoolId,
              targetSchoolName: 'Unknown',
              reason: reason.trim(),
              result: 'failure',
              errorMessage: 'School not found',
              ipAddress,
              userAgent,
              metadata: {
                subject: subject.trim(),
                messagePreview: message.trim().substring(0, 100),
              },
            },
          })

          continue
        }

        // Check if school has admin email
        if (!school.adminEmail) {
          results.push({
            schoolId: school.id,
            schoolName: school.name,
            adminEmail: 'Not available',
            success: false,
            error: 'School admin email not found',
          })

          // Create failure audit log
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_NOTICE,
              targetSchoolId: school.id,
              targetSchoolName: school.name,
              reason: reason.trim(),
              result: 'failure',
              errorMessage: 'School admin email not found',
              ipAddress,
              userAgent,
              metadata: {
                subject: subject.trim(),
                messagePreview: message.trim().substring(0, 100),
              },
            },
          })

          continue
        }

        // Send email notification to school admin
        try {
          const emailContent = `
            <h2>${subject.trim()}</h2>
            <p>Dear ${school.name} Administrator,</p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-left: 4px solid #1a56db; border-radius: 4px;">
              ${message.trim().replace(/\n/g, '<br>')}
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              This is an official notice from the SchoolOffice Super Admin team.
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              If you have any questions or concerns, please contact support.
            </p>
          `

          const emailResult = await emailService.sendEmail({
            to: school.adminEmail,
            subject: `[SchoolOffice] ${subject.trim()}`,
            html: emailContent,
            text: `${subject.trim()}\n\nDear ${school.name} Administrator,\n\n${message.trim()}\n\nThis is an official notice from the SchoolOffice Super Admin team.\n\nIf you have any questions or concerns, please contact support.`,
          })

          if (!emailResult.success) {
            throw new Error(emailResult.error || 'Failed to send email')
          }

          // Create success audit log entry
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_NOTICE,
              targetSchoolId: school.id,
              targetSchoolName: school.name,
              reason: reason.trim(),
              result: 'success',
              errorMessage: null,
              ipAddress,
              userAgent,
              metadata: {
                subject: subject.trim(),
                messagePreview: message.trim().substring(0, 100),
                emailSent: true,
                emailMessageId: emailResult.messageId,
                timestamp: new Date().toISOString(),
              },
            },
          })

          results.push({
            schoolId: school.id,
            schoolName: school.name,
            adminEmail: school.adminEmail,
            success: true,
          })

        } catch (emailError) {
          const emailErrorMessage = emailError instanceof Error ? emailError.message : 'Unknown email error'
          
          results.push({
            schoolId: school.id,
            schoolName: school.name,
            adminEmail: school.adminEmail,
            success: false,
            error: `Failed to send email: ${emailErrorMessage}`,
          })

          // Create failure audit log
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_NOTICE,
              targetSchoolId: school.id,
              targetSchoolName: school.name,
              reason: reason.trim(),
              result: 'failure',
              errorMessage: `Failed to send email: ${emailErrorMessage}`,
              ipAddress,
              userAgent,
              metadata: {
                subject: subject.trim(),
                messagePreview: message.trim().substring(0, 100),
                emailSent: false,
              },
            },
          })
        }

      } catch (schoolError) {
        console.error(`Error sending notice to school ${schoolId}:`, schoolError)
        
        const errorMessage = schoolError instanceof Error ? schoolError.message : 'Unknown error'
        
        results.push({
          schoolId,
          schoolName: 'Unknown',
          adminEmail: 'Unknown',
          success: false,
          error: errorMessage,
        })

        // Create failure audit log
        try {
          await prisma.superAdminAuditLog.create({
            data: {
              timestamp: new Date(),
              adminId: session.user.id,
              adminEmail: session.user.email,
              actionType: ActionType.BULK_NOTICE,
              targetSchoolId: schoolId,
              targetSchoolName: 'Unknown',
              reason: reason.trim(),
              result: 'failure',
              errorMessage,
              ipAddress,
              userAgent,
              metadata: {
                subject: subject.trim(),
                messagePreview: message.trim().substring(0, 100),
              },
            },
          })
        } catch (auditError) {
          console.error(`Failed to create audit log for school ${schoolId}:`, auditError)
        }
      }
    }

    // Calculate summary statistics
    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Bulk notice completed: ${successCount} succeeded, ${failureCount} failed`,
      data: {
        total: results.length,
        succeeded: successCount,
        failed: failureCount,
        results,
      },
    })

  } catch (error) {
    console.error('Bulk notice error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process bulk notice',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
