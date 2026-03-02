/**
 * Teacher Delete API Route
 * DELETE: Permanently delete a teacher and all related data
 * 
 * This will cascade delete:
 * - Teacher record
 * - User account (if linked)
 * - Teacher assignments
 * - Teacher documents
 * - History entries
 * - Performance metrics
 * - Attendance records (where teacher is recorder)
 * - Any other related data
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userRole = session.user.activeRole || session.user.role
    const schoolId = session.user.schoolId

    // Only admins can delete teachers
    if (userRole !== Role.SCHOOL_ADMIN && userRole !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Only administrators can delete teachers' },
        { status: 403 }
      )
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'No school context' }, { status: 400 })
    }

    // Get teacher record with all details for audit log
    const teacher = await prisma.teacher.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        teacherAssignments: true,
        documents: true,
        historyEntries: true,
      },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    const teacherName = `${teacher.firstName} ${teacher.lastName}`
    const userId = teacher.userId

    // Delete teacher (cascade will handle related records)
    await prisma.teacher.delete({
      where: { id },
    })

    // Delete user account if exists
    if (userId) {
      try {
        await prisma.user.delete({
          where: { id: userId },
        })
      } catch (error) {
        console.error('Error deleting user account:', error)
        // Continue even if user deletion fails
      }
    }

    // Log deletion to audit
    await auditService.log({
      schoolId,
      userId: session.user.id,
      action: AuditAction.DELETE,
      resource: AuditResource.STAFF,
      resourceId: id,
      previousValue: {
        name: teacherName,
        email: teacher.email,
        phone: teacher.phone,
        department: teacher.department,
        jobTitle: teacher.jobTitle,
        employmentType: teacher.employmentType,
        assignmentsCount: teacher.teacherAssignments.length,
        documentsCount: teacher.documents.length,
      },
      newValue: null,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({
      success: true,
      message: `Teacher ${teacherName} has been permanently deleted`,
      deletedTeacher: {
        id: teacher.id,
        name: teacherName,
        email: teacher.email,
      },
    })
  } catch (error) {
    console.error('Error deleting teacher:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete teacher',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
