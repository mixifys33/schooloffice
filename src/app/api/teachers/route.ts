/**
 * Teachers API Route
 * Requirements: 1.1-1.6, 9.6, 10.1-10.7
 * 
 * Implements teacher list and creation endpoints using the Teacher Management Service.
 * Core principle: Teachers are institutional entities, not user accounts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { 
  TeacherFilters, 
  TeacherEmploymentStatus,
  EmploymentType,
  TeacherAccessLevel,
  DEFAULT_TEACHER_PERMISSIONS,
  DEFAULT_CHANNEL_CONFIG,
} from '@/types/teacher'
import { 
  teacherManagementService, 
  TeacherValidationError 
} from '@/services/teacher-management.service'
import { auditService, AuditAction, AuditResource } from '@/services/audit.service'
import { 
  canManageTeachers, 
  createTeacherManagementAuditEntry 
} from '@/lib/rbac'

/**
 * Generate a secure temporary password
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const specialChars = '!@#$%&*'
  let password = ''
  
  // Generate 8 random characters
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  // Add a special character
  password += specialChars.charAt(Math.floor(Math.random() * specialChars.length))
  
  // Add a number to ensure complexity
  password += Math.floor(Math.random() * 10)
  
  return password
}

/**
 * GET: List teachers for the school with filtering support
 * Requirements: 9.6 - Teacher list with filtering by status, department, employment type
 * Requirements: 10.1-10.7 - Role-based authorization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC - Requirements 10.1-10.7
    if (!canManageTeachers(userRole)) {
      // Log unauthorized attempt using RBAC audit helper
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'list_teachers',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have access to teacher management' },
        { status: 403 }
      )
    }

    // Parse query parameters for filtering (Requirement 9.6)
    const { searchParams } = new URL(request.url)
    const filters: TeacherFilters = {}

    const status = searchParams.get('status')
    if (status && Object.values(TeacherEmploymentStatus).includes(status as TeacherEmploymentStatus)) {
      filters.status = status as TeacherEmploymentStatus
    }

    const department = searchParams.get('department')
    if (department) {
      filters.department = department
    }

    const employmentType = searchParams.get('employmentType')
    if (employmentType && Object.values(EmploymentType).includes(employmentType as EmploymentType)) {
      filters.employmentType = employmentType as EmploymentType
    }

    const searchTerm = searchParams.get('search')
    if (searchTerm) {
      filters.searchTerm = searchTerm
    }

    const hasSystemAccess = searchParams.get('hasSystemAccess')
    if (hasSystemAccess !== null) {
      filters.hasSystemAccess = hasSystemAccess === 'true'
    }

    // Get teacher list using the service
    const teachers = await teacherManagementService.getTeacherList(schoolId, filters)

    return NextResponse.json(teachers)
  } catch (error) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
      { status: 500 }
    )
  }
}

/**
 * POST: Create a new teacher record
 * Requirements: 1.1-1.6 - Teacher identity creation with validation
 * Requirements: 10.1-10.7 - Role-based authorization
 * Requirements: 9.4 - Create & send login invite option
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    const userRole = session.user.role as string
    const userId = session.user.id as string

    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 403 }
      )
    }

    // Check authorization using RBAC - Requirements 10.1-10.7
    if (!canManageTeachers(userRole)) {
      // Log unauthorized attempt using RBAC audit helper
      const auditEntry = createTeacherManagementAuditEntry({
        schoolId,
        userId,
        role: userRole,
        attemptedAction: 'create_teacher',
      })
      
      await auditService.log({
        schoolId: auditEntry.schoolId,
        userId: auditEntry.userId,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF,
        newValue: auditEntry.newValue,
      })

      return NextResponse.json(
        { error: 'Forbidden', message: 'Your role does not have permission to create teachers' },
        { status: 403 }
      )
    }

    const body = await request.json()
    
    // Extract the sendLoginInvite flag, access-related fields, and academic assignments
    const { 
      sendLoginInvite, 
      grantSystemAccess,
      accessLevel,
      permissions,
      channelConfig,
      examinationRoles,
      // Extract academic assignments
      assignedSubjects,
      assignedClasses,
      classTeacherFor,
      assignedStreams,
      ...teacherData 
    } = body

    // Default to granting system access if not explicitly specified to prevent profile linking issues
    const shouldGrantAccess = grantSystemAccess !== false // Default to true unless explicitly set to false
    const shouldSendInvite = sendLoginInvite !== false && shouldGrantAccess // Default to true if granting access

    // Create teacher using the service (Requirements 1.1-1.6)
    const teacher = await teacherManagementService.createTeacher(schoolId, teacherData, userId)

    // Handle academic assignments using the assignment service
    if ((assignedSubjects && assignedSubjects.length > 0) || 
        (assignedClasses && assignedClasses.length > 0) || 
        (assignedStreams && assignedStreams.length > 0) ||
        (classTeacherFor && classTeacherFor.length > 0)) {
      
      try {
        const { teacherAssignmentService } = await import('@/services/teacher-assignment.service')
        
        // Update all assignments at once using the assignment service
        await teacherAssignmentService.updateAllAssignments(
          teacher.id,
          schoolId,
          {
            subjectIds: assignedSubjects || [],
            classIds: assignedClasses || [],
            streamIds: assignedStreams || [],
            classTeacherForIds: classTeacherFor || [],
          },
          userId
        )
      } catch (assignmentError) {
        console.error('Failed to create teacher assignments:', assignmentError)
        // Teacher was created but assignments failed - log warning but continue
      }
    }

    // If shouldGrantAccess is true, grant system access and send invitation email
    if (shouldGrantAccess && teacher.email) {
      try {
        // Generate a temporary password
        const temporaryPassword = generateTemporaryPassword()
        
        // Determine access level - default to TEACHER if not specified
        const finalAccessLevel = accessLevel || TeacherAccessLevel.TEACHER
        
        // Use provided permissions or defaults
        const finalPermissions = permissions || { ...DEFAULT_TEACHER_PERMISSIONS }
        
        // Use provided channel config or defaults
        const finalChannelConfig = channelConfig || { ...DEFAULT_CHANNEL_CONFIG }
        
        // Grant system access (this also sends the invitation email)
        const teacherWithAccess = await teacherManagementService.grantSystemAccess(
          teacher.id,
          schoolId,
          {
            accessLevel: finalAccessLevel,
            email: teacher.email,
            temporaryPassword,
            forcePasswordReset: false,
            permissions: finalPermissions,
            channelConfig: finalChannelConfig,
          },
          userId
        )

        return NextResponse.json({
          id: teacherWithAccess.id,
          firstName: teacherWithAccess.firstName,
          lastName: teacherWithAccess.lastName,
          email: teacherWithAccess.email,
          phone: teacherWithAccess.phone,
          nationalId: teacherWithAccess.nationalId,
          employmentType: teacherWithAccess.employmentType,
          jobTitle: teacherWithAccess.jobTitle,
          department: teacherWithAccess.department,
          employmentStatus: teacherWithAccess.employmentStatus,
          hasSystemAccess: teacherWithAccess.hasSystemAccess,
          accessLevel: teacherWithAccess.accessLevel,
          inviteSent: shouldSendInvite,
          message: shouldSendInvite 
            ? 'Teacher created with user account and login invitation sent successfully'
            : 'Teacher created with user account successfully',
        }, { status: 201 })
      } catch (accessError) {
        // Teacher was created but access grant failed
        // Log the error but return success for teacher creation
        console.error('Failed to grant system access after teacher creation:', accessError)
        
        return NextResponse.json({
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email,
          phone: teacher.phone,
          nationalId: teacher.nationalId,
          employmentType: teacher.employmentType,
          jobTitle: teacher.jobTitle,
          department: teacher.department,
          employmentStatus: teacher.employmentStatus,
          hasSystemAccess: false,
          inviteSent: false,
          warning: 'Teacher created with user account but failed to send login invitation. You can grant access manually from the teacher details page.',
        }, { status: 201 })
      }
    }

    return NextResponse.json({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      phone: teacher.phone,
      nationalId: teacher.nationalId,
      employmentType: teacher.employmentType,
      jobTitle: teacher.jobTitle,
      department: teacher.department,
      employmentStatus: teacher.employmentStatus,
      hasSystemAccess: teacher.hasSystemAccess,
    }, { status: 201 })
  } catch (error) {
    // Handle validation errors
    if (error instanceof TeacherValidationError) {
      return NextResponse.json(
        { 
          error: error.message, 
          field: error.field,
          code: error.code,
        },
        { status: 400 }
      )
    }

    console.error('Error creating teacher:', error)
    return NextResponse.json(
      { error: 'Failed to create teacher' },
      { status: 500 }
    )
  }
}
