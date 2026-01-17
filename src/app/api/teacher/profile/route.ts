/**
 * Teacher Profile API Route
 * Requirements: 10.1, 10.2, 10.3 - Teacher profile self-service with limited edit capability
 * 
 * GET: Retrieve teacher profile with editable and read-only fields
 * PATCH: Update contact information only (phone, email, photo)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Role } from '@/types/enums'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'

/**
 * Editable profile fields
 * Requirement 10.1: Allow editing of phone, email, and profile photo
 */
export interface EditableProfileData {
  phone: string
  email: string
  photo: string | null
}

/**
 * Read-only profile fields
 * Requirement 10.4: Display name, role, subjects, and classes in read-only format
 */
export interface ReadOnlyProfileData {
  id: string
  firstName: string
  lastName: string
  fullName: string
  role: string
  jobTitle: string
  department: string
  employmentType: string
  assignedSubjects: Array<{ id: string; name: string }>
  assignedClasses: Array<{ id: string; name: string }>
  classTeacherFor: Array<{ id: string; name: string }>
}

/**
 * Complete teacher profile response
 */
export interface TeacherProfileResponse {
  editable: EditableProfileData
  readOnly: ReadOnlyProfileData
}

/**
 * Profile update input
 * Requirement 10.1: Only phone, email, and photo can be updated
 */
export interface ProfileUpdateInput {
  phone?: string
  email?: string
  photo?: string | null
}

/**
 * GET /api/teacher/profile
 * Retrieves the authenticated teacher's profile
 * Requirements: 10.1, 10.4 - Display editable and read-only fields
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Get teacher record with all necessary data
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        photo: true,
        jobTitle: true,
        department: true,
        employmentType: true,
        assignedSubjectIds: true,
        assignedClassIds: true,
        classTeacherForIds: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Get subject names for assigned subjects
    const subjects = teacher.assignedSubjectIds.length > 0
      ? await prisma.subject.findMany({
          where: {
            id: { in: teacher.assignedSubjectIds },
            schoolId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : []

    // Get class names for assigned classes
    const classes = teacher.assignedClassIds.length > 0
      ? await prisma.class.findMany({
          where: {
            id: { in: teacher.assignedClassIds },
            schoolId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : []

    // Get class names for class teacher assignments
    const classTeacherClasses = teacher.classTeacherForIds.length > 0
      ? await prisma.class.findMany({
          where: {
            id: { in: teacher.classTeacherForIds },
            schoolId,
          },
          select: {
            id: true,
            name: true,
          },
        })
      : []

    // Build response with editable and read-only sections
    const response: TeacherProfileResponse = {
      editable: {
        phone: teacher.phone,
        email: teacher.email,
        photo: teacher.photo,
      },
      readOnly: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        fullName: `${teacher.firstName} ${teacher.lastName}`,
        role: 'Teacher',
        jobTitle: teacher.jobTitle,
        department: teacher.department,
        employmentType: teacher.employmentType,
        assignedSubjects: subjects,
        assignedClasses: classes,
        classTeacherFor: classTeacherClasses,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching teacher profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher profile' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/teacher/profile
 * Updates the authenticated teacher's contact information
 * Requirements: 10.1, 10.2, 10.3 - Allow updates to contact info only, log to audit
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has TEACHER role
    const userRole = session.user.activeRole || session.user.role
    if (userRole !== Role.TEACHER && userRole !== Role.SCHOOL_ADMIN && userRole !== Role.DEPUTY) {
      return NextResponse.json(
        { error: 'Access denied. Teacher role required.' },
        { status: 403 }
      )
    }

    const schoolId = session.user.schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'No school context found' },
        { status: 400 }
      )
    }

    // Parse request body
    const body = await request.json() as ProfileUpdateInput

    // Requirement 10.3: Prevent modification of name, role, subjects, classes
    // Only allow phone, email, and photo updates
    const allowedFields = ['phone', 'email', 'photo']
    const providedFields = Object.keys(body)
    const disallowedFields = providedFields.filter(f => !allowedFields.includes(f))
    
    if (disallowedFields.length > 0) {
      return NextResponse.json(
        { error: `Cannot modify fields: ${disallowedFields.join(', ')}. Only phone, email, and photo can be updated.` },
        { status: 400 }
      )
    }

    // Get existing teacher record
    const teacher = await prisma.teacher.findFirst({
      where: {
        schoolId,
        userId: session.user.id,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        photo: true,
      },
    })

    if (!teacher) {
      return NextResponse.json(
        { error: 'No teacher profile linked to this account' },
        { status: 404 }
      )
    }

    // Validate email format if provided
    if (body.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        )
      }

      // Check email uniqueness within school (excluding current teacher)
      const existingByEmail = await prisma.teacher.findFirst({
        where: {
          schoolId,
          email: body.email,
          NOT: { id: teacher.id },
        },
        select: { id: true },
      })

      if (existingByEmail) {
        return NextResponse.json(
          { error: 'This email is already in use by another teacher' },
          { status: 400 }
        )
      }
    }

    // Validate phone format if provided
    if (body.phone !== undefined) {
      const phoneRegex = /^[+]?[\d\s-]{10,}$/
      if (!phoneRegex.test(body.phone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format' },
          { status: 400 }
        )
      }
    }

    // Build update data and track changes for audit
    const updateData: Record<string, unknown> = {}
    const previousValue: Record<string, unknown> = {}
    const newValue: Record<string, unknown> = {}

    if (body.phone !== undefined && body.phone !== teacher.phone) {
      previousValue.phone = teacher.phone
      newValue.phone = body.phone
      updateData.phone = body.phone
    }

    if (body.email !== undefined && body.email !== teacher.email) {
      previousValue.email = teacher.email
      newValue.email = body.email
      updateData.email = body.email
    }

    if (body.photo !== undefined && body.photo !== teacher.photo) {
      previousValue.photo = teacher.photo
      newValue.photo = body.photo
      updateData.photo = body.photo
    }

    // If no changes, return success without updating
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        message: 'No changes detected',
        updated: false 
      })
    }

    // Update teacher record
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacher.id },
      data: updateData,
      select: {
        id: true,
        phone: true,
        email: true,
        photo: true,
      },
    })

    // Requirement 10.2: Log all updates to audit service
    await auditService.log({
      schoolId,
      userId: session.user.id,
      action: AuditAction.STAFF_PROFILE_UPDATED,
      resource: AuditResource.STAFF,
      resourceId: teacher.id,
      previousValue,
      newValue,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      updated: true,
      editable: {
        phone: updatedTeacher.phone,
        email: updatedTeacher.email,
        photo: updatedTeacher.photo,
      },
    })
  } catch (error) {
    console.error('Error updating teacher profile:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher profile' },
      { status: 500 }
    )
  }
}
