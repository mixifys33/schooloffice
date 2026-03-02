/**
 * Teacher Management Service
 * Handles teacher CRUD operations with validation and tenant isolation
 * Requirements: 1.1-1.6, 9.6
 * 
 * Core principle: A teacher is a role-bound institutional entity, not a user account.
 * Teachers are created as records first, then optionally granted system access.
 */   
import { prisma } from '@/lib/db'
import {
  Teacher,
  TeacherListItem,
  CreateTeacherInput,
  UpdateTeacherInput,
  TeacherFilters,
  TeacherPermissions,
  ChannelConfig,
  TeacherPayrollInfo,
  ExaminationRoleAssignment,
  DEFAULT_TEACHER_PERMISSIONS,
  DEFAULT_CHANNEL_CONFIG,
} from '@/types/teacher'
import {
  EmploymentType,
  TeacherJobTitle,
  TeacherEmploymentStatus,
  TeacherAccessLevel,
  SalaryType,
  PaymentStatus,
  TeacherEventType,
} from '@/types/teacher'
import { Gender } from '@/types/enums'
import { auditService, AuditAction, AuditResource } from './audit.service'
// import { timetableService } from './timetable.service' // Unused import - commented out

/**
 * Validation error for teacher operations
 */
export class TeacherValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message)
    this.name = 'TeacherValidationError'
  }
}

/**
 * Map Prisma Teacher to domain Teacher type
 */
function mapPrismaTeacherToDomain(prismaTeacher: {
  id: string
  schoolId: string
  firstName: string
  lastName: string
  gender: string
  nationalId: string
  phone: string
  email: string
  dateOfBirth: Date
  photo: string | null
  address: string | null
  employmentType: string
  jobTitle: string
  department: string
  dateOfAppointment: Date
  employmentStatus: string
  userId: string | null
  hasSystemAccess: boolean
  accessLevel: string
  canTakeAttendance: boolean
  canEnterMarks: boolean
  canViewReports: boolean
  canSendMessages: boolean
  forcePasswordReset: boolean
  inAppMessagingEnabled: boolean
  smsEnabled: boolean
  emailEnabled: boolean
  assignedSubjectIds: string[]
  assignedClassIds: string[]
  assignedStreamIds: string[]
  classTeacherForIds: string[]
  salaryType: string | null
  payGrade: string | null
  paymentStatus: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankAccountName: string | null
  mobileMoneyProvider: string | null
  mobileMoneyPhone: string | null
  mobileMoneyName: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  examinationRoles?: Array<{
    id: string
    examId: string
    role: string
    assignedAt: Date
    assignedBy: string
  }>
}): Teacher {
  const permissions: TeacherPermissions = {
    canTakeAttendance: prismaTeacher.canTakeAttendance,
    canEnterMarks: prismaTeacher.canEnterMarks,
    canViewReports: prismaTeacher.canViewReports,
    canSendMessages: prismaTeacher.canSendMessages,
  }

  const channelConfig: ChannelConfig = {
    inAppMessaging: prismaTeacher.inAppMessagingEnabled,
    sms: prismaTeacher.smsEnabled,
    email: prismaTeacher.emailEnabled,
  }

  let payrollInfo: TeacherPayrollInfo | undefined
  if (prismaTeacher.salaryType) {
    payrollInfo = {
      teacherId: prismaTeacher.id,
      salaryType: prismaTeacher.salaryType as SalaryType,
      payGrade: prismaTeacher.payGrade || '',
      paymentStatus: (prismaTeacher.paymentStatus as PaymentStatus) || PaymentStatus.ACTIVE,
      bankDetails: prismaTeacher.bankName
        ? {
            bankName: prismaTeacher.bankName,
            accountNumber: prismaTeacher.bankAccountNumber || '',
            accountName: prismaTeacher.bankAccountName || '',
          }
        : undefined,
      mobileMoneyDetails: prismaTeacher.mobileMoneyProvider
        ? {
            provider: prismaTeacher.mobileMoneyProvider,
            phoneNumber: prismaTeacher.mobileMoneyPhone || '',
            accountName: prismaTeacher.mobileMoneyName || '',
          }
        : undefined,
    }
  }

  const examinationRoles: ExaminationRoleAssignment[] = (prismaTeacher.examinationRoles || []).map(
    (role) => ({
      examId: role.examId,
      role: role.role as import('@/types/teacher').ExaminationRole,
      assignedAt: role.assignedAt,
      assignedBy: role.assignedBy,
    })
  )

  return {
    id: prismaTeacher.id,
    schoolId: prismaTeacher.schoolId,
    firstName: prismaTeacher.firstName,
    lastName: prismaTeacher.lastName,
    gender: prismaTeacher.gender as Gender,
    nationalId: prismaTeacher.nationalId,
    phone: prismaTeacher.phone,
    email: prismaTeacher.email,
    dateOfBirth: prismaTeacher.dateOfBirth,
    photo: prismaTeacher.photo ?? undefined,
    address: prismaTeacher.address ?? undefined,
    employmentType: prismaTeacher.employmentType as EmploymentType,
    jobTitle: prismaTeacher.jobTitle as TeacherJobTitle,
    department: prismaTeacher.department,
    dateOfAppointment: prismaTeacher.dateOfAppointment,
    employmentStatus: prismaTeacher.employmentStatus as TeacherEmploymentStatus,
    userId: prismaTeacher.userId ?? undefined,
    hasSystemAccess: prismaTeacher.hasSystemAccess,
    accessLevel: prismaTeacher.accessLevel as TeacherAccessLevel,
    permissions,
    channelConfig,
    forcePasswordReset: prismaTeacher.forcePasswordReset,
    assignedSubjects: prismaTeacher.assignedSubjectIds,
    assignedClasses: prismaTeacher.assignedClassIds,
    assignedStreams: prismaTeacher.assignedStreamIds,
    classTeacherFor: prismaTeacher.classTeacherForIds,
    examinationRoles,
    payrollInfo,
    createdAt: prismaTeacher.createdAt,
    updatedAt: prismaTeacher.updatedAt,
    createdBy: prismaTeacher.createdBy,
  }
}

/**
 * Map Prisma Teacher to TeacherListItem for list display
 */
function mapPrismaTeacherToListItem(prismaTeacher: {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  employmentType: string
  jobTitle: string
  department: string
  employmentStatus: string
  hasSystemAccess: boolean
  assignedClassIds: string[]
  assignedSubjectIds: string[]
  updatedAt: Date
}): TeacherListItem {
  return {
    id: prismaTeacher.id,
    firstName: prismaTeacher.firstName,
    lastName: prismaTeacher.lastName,
    email: prismaTeacher.email,
    phone: prismaTeacher.phone,
    employmentType: prismaTeacher.employmentType as EmploymentType,
    jobTitle: prismaTeacher.jobTitle as TeacherJobTitle,
    department: prismaTeacher.department,
    employmentStatus: prismaTeacher.employmentStatus as TeacherEmploymentStatus,
    hasSystemAccess: prismaTeacher.hasSystemAccess,
    assignedClassCount: prismaTeacher.assignedClassIds.length,
    assignedSubjectCount: prismaTeacher.assignedSubjectIds.length,
    lastActivity: prismaTeacher.updatedAt,
  }
}

/**
 * Validate required fields for teacher creation
 * Requirement 1.1: Required fields validation
 */
function validateCreateTeacherInput(data: CreateTeacherInput): void {
  const requiredFields: Array<{ field: keyof CreateTeacherInput; name: string }> = [
    { field: 'firstName', name: 'First name' },
    { field: 'lastName', name: 'Last name' },
    { field: 'gender', name: 'Gender' },
    { field: 'nationalId', name: 'National ID/Passport/Staff ID' },
    { field: 'phone', name: 'Phone number' },
    { field: 'email', name: 'Email address' },
    { field: 'dateOfBirth', name: 'Date of birth' },
    { field: 'employmentType', name: 'Employment type' },
    { field: 'jobTitle', name: 'Job title' },
    { field: 'department', name: 'Department' },
    { field: 'dateOfAppointment', name: 'Date of appointment' },
  ]

  for (const { field, name } of requiredFields) {
    const value = data[field]
    if (value === undefined || value === null || value === '') {
      throw new TeacherValidationError(`${name} is required`, field, 'REQUIRED_FIELD')
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(data.email)) {
    throw new TeacherValidationError('Invalid email format', 'email', 'INVALID_EMAIL')
  }

  // Validate phone format (basic validation)
  const phoneRegex = /^[+]?[\d\s-]{10,}$/
  if (!phoneRegex.test(data.phone)) {
    throw new TeacherValidationError('Invalid phone number format', 'phone', 'INVALID_PHONE')
  }

  // Validate employment type
  if (!Object.values(EmploymentType).includes(data.employmentType as EmploymentType)) {
    throw new TeacherValidationError('Invalid employment type', 'employmentType', 'INVALID_ENUM')
  }

  // Validate job title
  if (!Object.values(TeacherJobTitle).includes(data.jobTitle as TeacherJobTitle)) {
    throw new TeacherValidationError('Invalid job title', 'jobTitle', 'INVALID_ENUM')
  }

  // Validate gender
  if (!Object.values(Gender).includes(data.gender as Gender)) {
    throw new TeacherValidationError('Invalid gender', 'gender', 'INVALID_ENUM')
  }

  // Validate date of birth format
  const dateOfBirth = data.dateOfBirth instanceof Date 
    ? data.dateOfBirth 
    : new Date(data.dateOfBirth)
  if (isNaN(dateOfBirth.getTime())) {
    throw new TeacherValidationError(
      'Invalid date of birth format. Use YYYY-MM-DD format.',
      'dateOfBirth',
      'INVALID_DATE'
    )
  }

  // Validate date of appointment format
  const dateOfAppointment = data.dateOfAppointment instanceof Date 
    ? data.dateOfAppointment 
    : new Date(data.dateOfAppointment)
  if (isNaN(dateOfAppointment.getTime())) {
    throw new TeacherValidationError(
      'Invalid date of appointment format. Use YYYY-MM-DD format.',
      'dateOfAppointment',
      'INVALID_DATE'
    )
  }
}

export class TeacherManagementService {
  /**
   * Create a new teacher record
   * Requirements: 1.1-1.6 - Teacher identity creation with validation and unique ID generation
   */
  async createTeacher(
    schoolId: string,
    data: CreateTeacherInput,
    createdBy: string
  ): Promise<Teacher> {
    // Validate required fields (Requirement 1.1)
    validateCreateTeacherInput(data)

    // Verify school exists (Requirement 1.6)
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    if (!school) {
      throw new TeacherValidationError(`School with id ${schoolId} not found`, 'schoolId', 'SCHOOL_NOT_FOUND')
    }

    // Check email uniqueness within school (Requirement 1.4)
    const existingByEmail = await prisma.teacher.findUnique({
      where: {
        schoolId_email: {
          schoolId,
          email: data.email,
        },
      },
    })

    if (existingByEmail) {
      throw new TeacherValidationError(
        `A teacher with email "${data.email}" already exists in this school`,
        'email',
        'DUPLICATE_EMAIL'
      )
    }

    // Check nationalId uniqueness within school (Requirement 1.5)
    const existingByNationalId = await prisma.teacher.findUnique({
      where: {
        schoolId_nationalId: {
          schoolId,
          nationalId: data.nationalId,
        },
      },
    })

    if (existingByNationalId) {
      throw new TeacherValidationError(
        `A teacher with national ID "${data.nationalId}" already exists in this school`,
        'nationalId',
        'DUPLICATE_NATIONAL_ID'
      )
    }

    // Create teacher with auto-generated unique ID (Requirement 1.2)
    // Convert date strings to Date objects for Prisma (handles both Date objects and ISO strings)
    const dateOfBirth = data.dateOfBirth instanceof Date 
      ? data.dateOfBirth 
      : new Date(data.dateOfBirth)
    const dateOfAppointment = data.dateOfAppointment instanceof Date 
      ? data.dateOfAppointment 
      : new Date(data.dateOfAppointment)

    const teacher = await prisma.teacher.create({
      data: {
        schoolId,
        firstName: data.firstName,
        lastName: data.lastName,
        gender: data.gender,
        nationalId: data.nationalId,
        phone: data.phone,
        email: data.email,
        dateOfBirth,
        photo: data.photo,
        address: data.address,
        employmentType: data.employmentType,
        jobTitle: data.jobTitle,
        department: data.department,
        dateOfAppointment,
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
        hasSystemAccess: false,
        accessLevel: TeacherAccessLevel.NONE,
        canTakeAttendance: DEFAULT_TEACHER_PERMISSIONS.canTakeAttendance,
        canEnterMarks: DEFAULT_TEACHER_PERMISSIONS.canEnterMarks,
        canViewReports: DEFAULT_TEACHER_PERMISSIONS.canViewReports,
        canSendMessages: DEFAULT_TEACHER_PERMISSIONS.canSendMessages,
        forcePasswordReset: false,
        inAppMessagingEnabled: DEFAULT_CHANNEL_CONFIG.inAppMessaging,
        smsEnabled: DEFAULT_CHANNEL_CONFIG.sms,
        emailEnabled: DEFAULT_CHANNEL_CONFIG.email,
        assignedSubjectIds: data.assignedSubjects || [],
        assignedClassIds: data.assignedClasses || [],
        assignedStreamIds: data.assignedStreams || [],
        classTeacherForIds: data.classTeacherFor || [],
        createdBy,
      },
      include: {
        examinationRoles: true,
      },
    })

    // Log audit trail
    await this.logTeacherHistory(teacher.id, schoolId, TeacherEventType.CREATED, createdBy, undefined, {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      department: data.department,
    })

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: createdBy,
      action: AuditAction.CREATE,
      resource: AuditResource.STAFF,
      resourceId: teacher.id,
      newValue: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        employmentType: data.employmentType,
        jobTitle: data.jobTitle,
        department: data.department,
      },
    })

    return mapPrismaTeacherToDomain(teacher)
  }

  /**
   * Get a single teacher by ID with tenant isolation
   * Requirement 1.6: Tenant association
   */
  async getTeacher(teacherId: string, schoolId: string): Promise<Teacher | null> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId, // Tenant isolation
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!teacher) {
      return null
    }

    return mapPrismaTeacherToDomain(teacher)
  }

  /**
   * Get teacher by ID without school context (internal use only)
   */
  async getTeacherById(teacherId: string): Promise<Teacher | null> {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: {
        examinationRoles: true,
      },
    })

    if (!teacher) {
      return null
    }

    return mapPrismaTeacherToDomain(teacher)
  }

  /**
   * Update a teacher record
   * Requirement 1.3: Allow updates while preserving Teacher_ID
   */
  async updateTeacher(
    teacherId: string,
    schoolId: string,
    data: UpdateTeacherInput,
    updatedBy: string
  ): Promise<Teacher> {
    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId, // Tenant isolation
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Check email uniqueness if email is being updated (Requirement 1.4)
    if (data.email && data.email !== existingTeacher.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(data.email)) {
        throw new TeacherValidationError('Invalid email format', 'email', 'INVALID_EMAIL')
      }

      const existingByEmail = await prisma.teacher.findFirst({
        where: {
          schoolId,
          email: data.email,
          NOT: { id: teacherId },
        },
      })

      if (existingByEmail) {
        throw new TeacherValidationError(
          `A teacher with email "${data.email}" already exists in this school`,
          'email',
          'DUPLICATE_EMAIL'
        )
      }
    }

    // Validate phone if being updated
    if (data.phone) {
      const phoneRegex = /^[+]?[\d\s-]{10,}$/
      if (!phoneRegex.test(data.phone)) {
        throw new TeacherValidationError('Invalid phone number format', 'phone', 'INVALID_PHONE')
      }
    }

    // Validate employment type if being updated
    if (data.employmentType && !Object.values(EmploymentType).includes(data.employmentType)) {
      throw new TeacherValidationError('Invalid employment type', 'employmentType', 'INVALID_ENUM')
    }

    // Validate job title if being updated
    if (data.jobTitle && !Object.values(TeacherJobTitle).includes(data.jobTitle)) {
      throw new TeacherValidationError('Invalid job title', 'jobTitle', 'INVALID_ENUM')
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    const previousValue: Record<string, unknown> = {}
    const newValue: Record<string, unknown> = {}

    const fieldsToUpdate: Array<keyof UpdateTeacherInput> = [
      'firstName',
      'lastName',
      'phone',
      'email',
      'employmentType',
      'jobTitle',
      'department',
      'photo',
      'address',
      'assignedSubjects',
      'assignedClasses',
      'assignedStreams',
      'classTeacherFor',
    ]

    for (const field of fieldsToUpdate) {
      if (data[field] !== undefined) {
        // Handle assignment arrays specially
        if (['assignedSubjects', 'assignedClasses', 'assignedStreams', 'classTeacherFor'].includes(field)) {
          const dbField = field === 'assignedSubjects' ? 'assignedSubjectIds' :
                         field === 'assignedClasses' ? 'assignedClassIds' :
                         field === 'assignedStreams' ? 'assignedStreamIds' :
                         'classTeacherForIds';
          
          if (JSON.stringify(data[field]) !== JSON.stringify(existingTeacher[dbField])) {
            previousValue[field] = existingTeacher[dbField]
            newValue[field] = data[field]
            updateData[dbField] = data[field]
          }
        } else if (data[field] !== (existingTeacher as Record<string, unknown>)[field]) {
          previousValue[field] = (existingTeacher as Record<string, unknown>)[field]
          newValue[field] = data[field]
          updateData[field] = data[field]
        }
      }
    }

    // If no changes, return existing teacher
    if (Object.keys(updateData).length === 0) {
      const teacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        include: { examinationRoles: true },
      })
      return mapPrismaTeacherToDomain(teacher!)
    }

    // Update teacher (Teacher_ID is preserved - Requirement 1.3)
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: updateData,
      include: {
        examinationRoles: true,
      },
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.UPDATED,
      updatedBy,
      JSON.stringify(previousValue),
      JSON.stringify(newValue)
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue,
      newValue,
    })

    return mapPrismaTeacherToDomain(updatedTeacher)
  }

  /**
   * Get list of teachers with filtering support
   * Requirement 9.6: Teacher list with filtering by status, department, employment type
   */
  async getTeacherList(schoolId: string, filters?: TeacherFilters): Promise<TeacherListItem[]> {
    const where: Record<string, unknown> = {
      schoolId, // Tenant isolation
    }

    // Apply filters (Requirement 9.6)
    if (filters?.status) {
      where.employmentStatus = filters.status
    }

    if (filters?.department) {
      where.department = filters.department
    }

    if (filters?.employmentType) {
      where.employmentType = filters.employmentType
    }

    if (filters?.hasSystemAccess !== undefined) {
      where.hasSystemAccess = filters.hasSystemAccess
    }

    // Search term filter
    if (filters?.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase()
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } }, // Phone search without case-insensitive mode
        { nationalId: { contains: searchTerm, mode: 'insensitive' } },
      ]
    }

    const teachers = await prisma.teacher.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        employmentType: true,
        jobTitle: true,
        department: true,
        employmentStatus: true,
        hasSystemAccess: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
        updatedAt: true,
      },
    })

    return teachers.map(mapPrismaTeacherToListItem)
  }

  /**
   * Get teachers by department
   */
  async getTeachersByDepartment(schoolId: string, department: string): Promise<TeacherListItem[]> {
    return this.getTeacherList(schoolId, { department })
  }

  /**
   * Get active teachers only
   */
  async getActiveTeachers(schoolId: string): Promise<TeacherListItem[]> {
    return this.getTeacherList(schoolId, { status: TeacherEmploymentStatus.ACTIVE })
  }

  /**
   * Get teachers with system access
   */
  async getTeachersWithAccess(schoolId: string): Promise<TeacherListItem[]> {
    return this.getTeacherList(schoolId, { hasSystemAccess: true })
  }

  /**
   * Check if email is available in a school
   * Requirement 1.4: Email uniqueness validation
   */
  async isEmailAvailable(
    schoolId: string,
    email: string,
    excludeTeacherId?: string
  ): Promise<boolean> {
    const existing = await prisma.teacher.findFirst({
      where: {
        schoolId,
        email,
        ...(excludeTeacherId ? { NOT: { id: excludeTeacherId } } : {}),
      },
      select: { id: true },
    })
    return !existing
  }

  /**
   * Check if national ID is available in a school
   * Requirement 1.5: National ID uniqueness validation
   */
  async isNationalIdAvailable(
    schoolId: string,
    nationalId: string,
    excludeTeacherId?: string
  ): Promise<boolean> {
    const existing = await prisma.teacher.findFirst({
      where: {
        schoolId,
        nationalId,
        ...(excludeTeacherId ? { NOT: { id: excludeTeacherId } } : {}),
      },
      select: { id: true },
    })
    return !existing
  }

  /**
   * Count teachers by school
   */
  async countTeachersBySchool(schoolId: string): Promise<number> {
    return prisma.teacher.count({ where: { schoolId } })
  }

  /**
   * Count active teachers by school
   */
  async countActiveTeachersBySchool(schoolId: string): Promise<number> {
    return prisma.teacher.count({
      where: {
        schoolId,
        employmentStatus: TeacherEmploymentStatus.ACTIVE,
      },
    })
  }

  /**
   * Get unique departments in a school
   */
  async getDepartments(schoolId: string): Promise<string[]> {
    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: { department: true },
      distinct: ['department'],
    })
    return teachers.map((t) => t.department).sort()
  }

  /**
   * Log teacher history entry for audit trail
   * Requirement 2.9: Preserve historical data
   */
  private async logTeacherHistory(
    teacherId: string,
    schoolId: string,
    eventType: TeacherEventType,
    performedBy: string,
    previousValue?: string,
    newValue?: string | Record<string, unknown>,
    reason?: string
  ): Promise<void> {
    await prisma.teacherHistoryEntry.create({
      data: {
        schoolId,
        teacherId,
        eventType,
        previousValue,
        newValue: typeof newValue === 'string' ? newValue : JSON.stringify(newValue),
        reason,
        performedBy,
        performedAt: new Date(),
      },
    })
  }

  // ============================================
  // EMPLOYMENT STATUS MANAGEMENT
  // Requirements: 2.5-2.9
  // ============================================

  /**
   * Update teacher employment status with side effects
   * Requirements 2.5-2.9: Status management with automatic access revocation
   * 
   * Side effects for inactive statuses (On Leave, Suspended, Left):
   * - Revoke login capability (Requirement 2.6)
   * - Exclude from timetable assignments (Requirement 2.7)
   * - Prevent attendance marking (Requirement 2.8) - handled by permission checks
   * - Preserve historical data (Requirement 2.9)
   */
  async updateEmploymentStatus(
    teacherId: string,
    schoolId: string,
    newStatus: TeacherEmploymentStatus,
    updatedBy: string,
    reason?: string
  ): Promise<Teacher> {
    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId, // Tenant isolation
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Validate status value
    if (!Object.values(TeacherEmploymentStatus).includes(newStatus)) {
      throw new TeacherValidationError(
        'Invalid employment status',
        'employmentStatus',
        'INVALID_ENUM'
      )
    }

    const previousStatus = existingTeacher.employmentStatus as TeacherEmploymentStatus

    // If status hasn't changed, return existing teacher
    if (previousStatus === newStatus) {
      return mapPrismaTeacherToDomain(existingTeacher)
    }

    // Check if transitioning to inactive status
    const isBecomingInactive = this.isInactiveStatus(newStatus) && !this.isInactiveStatus(previousStatus)
    const isBecomingActive = !this.isInactiveStatus(newStatus) && this.isInactiveStatus(previousStatus)

    // Build update data
    const updateData: Record<string, unknown> = {
      employmentStatus: newStatus,
    }

    // Handle side effects for inactive status (Requirements 2.6-2.8)
    if (isBecomingInactive) {
      // Revoke login capability (Requirement 2.6)
      updateData.hasSystemAccess = false
      updateData.accessLevel = TeacherAccessLevel.NONE
      // Note: We preserve userId to maintain the link for historical purposes
      // but disable access
    }

    // Update teacher
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: updateData,
      include: {
        examinationRoles: true,
      },
    })

    // Handle timetable exclusion for inactive teachers (Requirement 2.7)
    if (isBecomingInactive) {
      await this.excludeFromTimetable(teacherId, schoolId)
    }

    // Log history entry (Requirement 2.9 - preserve historical data)
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.STATUS_CHANGED,
      updatedBy,
      previousStatus,
      newStatus,
      reason
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: {
        employmentStatus: previousStatus,
        hasSystemAccess: existingTeacher.hasSystemAccess,
      },
      newValue: {
        employmentStatus: newStatus,
        hasSystemAccess: updateData.hasSystemAccess ?? existingTeacher.hasSystemAccess,
        sideEffects: isBecomingInactive
          ? ['login_revoked', 'timetable_excluded']
          : isBecomingActive
          ? ['status_restored']
          : [],
      },
    })

    // If access was revoked, log that separately
    if (isBecomingInactive && existingTeacher.hasSystemAccess) {
      await this.logTeacherHistory(
        teacherId,
        schoolId,
        TeacherEventType.ACCESS_REVOKED,
        updatedBy,
        JSON.stringify({ hasSystemAccess: true, accessLevel: existingTeacher.accessLevel }),
        JSON.stringify({ hasSystemAccess: false, accessLevel: TeacherAccessLevel.NONE }),
        `Automatic revocation due to status change to ${newStatus}`
      )
    }

    return mapPrismaTeacherToDomain(updatedTeacher)
  }

  /**
   * Handle status change to inactive - revoke access and apply restrictions
   * Requirements 2.6, 4.8: Automatic access revocation for inactive teachers
   * 
   * This is called internally by updateEmploymentStatus but can also be
   * called directly for batch operations or system maintenance.
   */
  async handleStatusChangeToInactive(
    teacherId: string,
    schoolId: string,
    newStatus: TeacherEmploymentStatus,
    changedBy: string
  ): Promise<void> {
    if (!this.isInactiveStatus(newStatus)) {
      return // Not an inactive status, nothing to do
    }

    // Get teacher to check current state
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
    })

    if (!teacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Only revoke if teacher currently has access
    if (teacher.hasSystemAccess) {
      await prisma.teacher.update({
        where: { id: teacherId },
        data: {
          hasSystemAccess: false,
          accessLevel: TeacherAccessLevel.NONE,
        },
      })

      // Log the access revocation
      await this.logTeacherHistory(
        teacherId,
        schoolId,
        TeacherEventType.ACCESS_REVOKED,
        changedBy,
        JSON.stringify({ hasSystemAccess: true, accessLevel: teacher.accessLevel }),
        JSON.stringify({ hasSystemAccess: false, accessLevel: TeacherAccessLevel.NONE }),
        `Automatic revocation due to status change to ${newStatus}`
      )

      await auditService.log({
        schoolId,
        userId: changedBy,
        action: AuditAction.UPDATE,
        resource: AuditResource.STAFF,
        resourceId: teacherId,
        previousValue: { hasSystemAccess: true },
        newValue: { hasSystemAccess: false, reason: 'inactive_status' },
      })
    }

    // Exclude from timetable
    await this.excludeFromTimetable(teacherId, schoolId)
  }

  /**
   * Exclude inactive teacher from timetable assignments
   * Requirement 2.7: Exclude inactive teachers from timetable
   * 
   * This removes the teacher from any future timetable slots while
   * preserving historical timetable data.
   */
  async excludeFromTimetable(teacherId: string, schoolId: string): Promise<void> {
    try {
      // Get the teacher to check if they have a linked user/staff record
      const teacher = await prisma.teacher.findFirst({
        where: {
          id: teacherId,
          schoolId,
        },
        select: {
          id: true,
          userId: true,
          firstName: true,
          lastName: true,
        },
      })

      if (!teacher) {
        return
      }

      // Remove teacher from all timetable entries using the timetable service
      // Requirement 2.7: Exclude inactive teachers from timetable assignments
      let removedCount = 0
      try {
        const { TimetableService } = await import('./timetable.service')
        // Check if the method exists before calling it
        if (typeof TimetableService.removeInactiveTeacherFromTimetable === 'function') {
          const result = await TimetableService.removeInactiveTeacherFromTimetable(
            teacherId,
            schoolId
          )
          removedCount = result ? 1 : 0
        } else {
          console.warn('removeInactiveTeacherFromTimetable method not available on TimetableService')
        }
      } catch (timetableError) {
        // If the timetable service throws (e.g., teacher not found in timetable),
        // we continue with the audit logging
        console.warn(
          `Timetable removal for teacher ${teacherId}: ${timetableError instanceof Error ? timetableError.message : 'Unknown error'}`
        )
      }

      // Log the timetable exclusion
      await auditService.log({
        schoolId,
        userId: 'SYSTEM',
        action: AuditAction.UPDATE,
        resource: AuditResource.STAFF,
        resourceId: teacherId,
        newValue: {
          action: 'teacher_excluded_from_timetable',
          reason: 'inactive_status',
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          removedTimetableEntries: removedCount,
        },
      })

      // Create a history entry for the exclusion
      await this.logTeacherHistory(
        teacherId,
        schoolId,
        TeacherEventType.UPDATED,
        'SYSTEM',
        undefined,
        JSON.stringify({ timetableExcluded: true, removedEntries: removedCount }),
        `Excluded from timetable due to inactive status. ${removedCount} entries removed.`
      )
    } catch (error) {
      // Log warning but don't fail the status change
      console.warn(
        `Could not process timetable exclusion for teacher ${teacherId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Check if a teacher can mark attendance
   * Requirement 2.8: Prevent inactive teachers from marking attendance
   */
  async canMarkAttendance(teacherId: string, schoolId: string, classId: string): Promise<boolean> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        employmentStatus: true,
        hasSystemAccess: true,
        canTakeAttendance: true,
        assignedClassIds: true,
      },
    })

    if (!teacher) {
      return false
    }

    // Check if teacher is active (Requirement 2.8)
    if (this.isInactiveStatus(teacher.employmentStatus as TeacherEmploymentStatus)) {
      return false
    }

    // Check if teacher has system access
    if (!teacher.hasSystemAccess) {
      return false
    }

    // Check if teacher has attendance permission
    if (!teacher.canTakeAttendance) {
      return false
    }

    // Check if teacher is assigned to this class (Requirement 3.7)
    if (!teacher.assignedClassIds.includes(classId)) {
      return false
    }

    return true
  }

  /**
   * Check if a teacher can enter marks
   * Requirements 2.8, 3.6: Prevent inactive teachers and enforce assignment-based permissions
   */
  async canEnterMarks(
    teacherId: string,
    schoolId: string,
    classId: string,
    subjectId: string
  ): Promise<boolean> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        employmentStatus: true,
        hasSystemAccess: true,
        canEnterMarks: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
      },
    })

    if (!teacher) {
      return false
    }

    // Check if teacher is active
    if (this.isInactiveStatus(teacher.employmentStatus as TeacherEmploymentStatus)) {
      return false
    }

    // Check if teacher has system access
    if (!teacher.hasSystemAccess) {
      return false
    }

    // Check if teacher has marks entry permission
    if (!teacher.canEnterMarks) {
      return false
    }

    // Check if teacher is assigned to this class AND subject (Requirement 3.6)
    if (!teacher.assignedClassIds.includes(classId)) {
      return false
    }

    if (!teacher.assignedSubjectIds.includes(subjectId)) {
      return false
    }

    return true
  }

  /**
   * Get teachers eligible for timetable assignment
   * Requirement 2.7: Only active teachers can be assigned to timetable
   */
  async getTeachersForTimetable(schoolId: string): Promise<TeacherListItem[]> {
    return this.getTeacherList(schoolId, { status: TeacherEmploymentStatus.ACTIVE })
  }

  /**
   * Restore teacher capabilities when status changes back to active
   * Note: This does NOT automatically restore system access - that must be
   * explicitly granted again by an admin.
   */
  async restoreTeacherCapabilities(
    teacherId: string,
    schoolId: string,
    restoredBy: string
  ): Promise<void> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
    })

    if (!teacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Only restore if teacher is now active
    if (this.isInactiveStatus(teacher.employmentStatus as TeacherEmploymentStatus)) {
      throw new TeacherValidationError(
        'Cannot restore capabilities for inactive teacher',
        'employmentStatus',
        'TEACHER_INACTIVE'
      )
    }

    // Log the restoration
    await auditService.log({
      schoolId,
      userId: restoredBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      newValue: {
        action: 'capabilities_restored',
        note: 'System access must be explicitly re-granted if needed',
      },
    })
  }

  /**
   * Check if a status is considered inactive
   * Requirements 2.6-2.8: Inactive statuses trigger side effects
   */
  private isInactiveStatus(status: TeacherEmploymentStatus): boolean {
    const inactiveStatuses = [
      TeacherEmploymentStatus.ON_LEAVE,
      TeacherEmploymentStatus.SUSPENDED,
      TeacherEmploymentStatus.LEFT,
    ]
    return inactiveStatuses.includes(status)
  }

  /**
   * Get teacher history entries for audit purposes
   * Requirement 2.9: Historical data preservation
   */
  async getTeacherHistory(
    teacherId: string,
    schoolId: string
  ): Promise<Array<{
    id: string
    eventType: TeacherEventType
    previousValue?: string
    newValue?: string
    reason?: string
    performedBy: string
    performedAt: Date
  }>> {
    // Verify teacher belongs to school (tenant isolation)
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: { id: true },
    })

    if (!teacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    const history = await prisma.teacherHistoryEntry.findMany({
      where: { teacherId },
      orderBy: { performedAt: 'desc' },
    })

    return history.map((entry) => ({
      id: entry.id,
      eventType: entry.eventType as TeacherEventType,
      previousValue: entry.previousValue ?? undefined,
      newValue: entry.newValue ?? undefined,
      reason: entry.reason ?? undefined,
      performedBy: entry.performedBy,
      performedAt: entry.performedAt,
    }))
  }

  /**
   * Get status change history for a teacher
   * Requirement 2.9: Track status changes
   */
  async getStatusHistory(
    teacherId: string,
    schoolId: string
  ): Promise<Array<{
    previousStatus: TeacherEmploymentStatus
    newStatus: TeacherEmploymentStatus
    reason?: string
    changedBy: string
    changedAt: Date
  }>> {
    // Verify teacher belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: { id: true },
    })

    if (!teacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    const statusHistory = await prisma.teacherHistoryEntry.findMany({
      where: {
        teacherId,
        eventType: TeacherEventType.STATUS_CHANGED,
      },
      orderBy: { performedAt: 'desc' },
    })

    return statusHistory.map((entry) => ({
      previousStatus: entry.previousValue as TeacherEmploymentStatus,
      newStatus: entry.newValue as TeacherEmploymentStatus,
      reason: entry.reason ?? undefined,
      changedBy: entry.performedBy,
      changedAt: entry.performedAt,
    }))
  }

  // ============================================
  // SYSTEM ACCESS MANAGEMENT
  // Requirements: 4.1-4.8
  // ============================================

  /**
   * Grant system access to a teacher
   * Requirements 4.1-4.5: Create user account with access level, permissions, and forced password reset
   * 
   * This method:
   * 1. Creates a user account linked to the teacher record
   * 2. Sets the access level (TEACHER or TEACHER_ADMIN)
   * 3. Configures fine-grained permissions
   * 4. Sets up communication channels
   * 5. Forces password reset on first login
   * 
   * @param teacherId - The teacher to grant access to
   * @param schoolId - School for tenant isolation
   * @param accessData - Access configuration including email, password, permissions
   * @param grantedBy - User ID of the admin granting access
   */
  async grantSystemAccess(
    teacherId: string,
    schoolId: string,
    accessData: import('@/types/teacher').GrantAccessInput,
    grantedBy: string
  ): Promise<Teacher> {
    // Validate access data (Requirement 4.4)
    if (!accessData.email || !accessData.email.trim()) {
      throw new TeacherValidationError('Email is required for system access', 'email', 'REQUIRED_FIELD')
    }

    if (!accessData.temporaryPassword || !accessData.temporaryPassword.trim()) {
      throw new TeacherValidationError('Temporary password is required for system access', 'temporaryPassword', 'REQUIRED_FIELD')
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(accessData.email)) {
      throw new TeacherValidationError('Invalid email format', 'email', 'INVALID_EMAIL')
    }

    // Validate access level (Requirement 4.2, 4.3)
    if (!accessData.accessLevel || accessData.accessLevel === TeacherAccessLevel.NONE) {
      throw new TeacherValidationError(
        'Access level must be TEACHER or TEACHER_ADMIN',
        'accessLevel',
        'INVALID_ACCESS_LEVEL'
      )
    }

    // Enforce no "full access" option (Requirement 4.7)
    this.validateNoFullAccess(accessData.permissions)

    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Check if teacher already has system access
    if (existingTeacher.hasSystemAccess && existingTeacher.userId) {
      throw new TeacherValidationError(
        'Teacher already has system access. Use updatePermissions to modify.',
        'hasSystemAccess',
        'ALREADY_HAS_ACCESS'
      )
    }

    // Check if teacher is active (Requirement 4.8 - cannot grant access to inactive teachers)
    if (this.isInactiveStatus(existingTeacher.employmentStatus as TeacherEmploymentStatus)) {
      throw new TeacherValidationError(
        'Cannot grant system access to inactive teacher',
        'employmentStatus',
        'TEACHER_INACTIVE'
      )
    }

    // Check if email is already in use by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email: accessData.email,
        schoolId,
      },
    })

    if (existingUser) {
      throw new TeacherValidationError(
        `Email "${accessData.email}" is already in use by another user`,
        'email',
        'EMAIL_IN_USE'
      )
    }

    // Check if phone is already in use by another user
    let phoneForUser: string | null = null
    if (existingTeacher.phone) {
      const existingUserWithPhone = await prisma.user.findFirst({
        where: {
          schoolId,
          phone: existingTeacher.phone,
        },
      })
      // Only set phone if it's not already in use
      if (!existingUserWithPhone) {
        phoneForUser = existingTeacher.phone
      }
    }

    // Import auth utilities
    const { hashPassword } = await import('@/lib/auth')
    const { Role } = await import('@/types/enums')

    // Determine the role based on access level and class teacher status
    // If teacher is assigned as class teacher for any classes, set activeRole to CLASS_TEACHER
    const isClassTeacher = existingTeacher.classTeacherForIds && existingTeacher.classTeacherForIds.length > 0
    
    // User role is always TEACHER (from Role enum)
    const userRole = accessData.accessLevel === TeacherAccessLevel.TEACHER_ADMIN
      ? Role.TEACHER // Still TEACHER role, but with admin flag in teacher record
      : Role.TEACHER
    
    // ActiveRole can be CLASS_TEACHER (from StaffRole enum) if they're a class teacher
    const activeRole = isClassTeacher ? 'CLASS_TEACHER' : null

    // Create user account and update teacher in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Hash the temporary password
      const passwordHash = await hashPassword(accessData.temporaryPassword)

      // Generate a unique username based on teacher name and ID to avoid constraint issues
      const baseUsername = `${existingTeacher.firstName.toLowerCase()}.${existingTeacher.lastName.toLowerCase()}`.replace(/[^a-z.]/g, '')
      const uniqueUsername = `${baseUsername}.${teacherId.slice(-6)}`

      // Create user account (phone is optional - email is the primary login)
      const user = await tx.user.create({
        data: {
          schoolId,
          email: accessData.email,
          phone: phoneForUser, // Only set if not already in use
          username: uniqueUsername, // Unique username to avoid constraint issues
          passwordHash,
          role: userRole,
          roles: [userRole],
          activeRole: activeRole, // Set to CLASS_TEACHER if they're a class teacher
          isActive: true,
          forcePasswordReset: false, // No forced password reset on initial grant
        },
      })

      // Update teacher with system access
      const updatedTeacher = await tx.teacher.update({
        where: { id: teacherId },
        data: {
          userId: user.id,
          hasSystemAccess: true,
          accessLevel: accessData.accessLevel,
          canTakeAttendance: accessData.permissions.canTakeAttendance,
          canEnterMarks: accessData.permissions.canEnterMarks,
          canViewReports: accessData.permissions.canViewReports,
          canSendMessages: accessData.permissions.canSendMessages,
          forcePasswordReset: false,
          inAppMessagingEnabled: accessData.channelConfig.inAppMessaging,
          smsEnabled: accessData.channelConfig.sms,
          // whatsappEnabled removed from schema
          emailEnabled: accessData.channelConfig.email,
        },
        include: {
          examinationRoles: true,
        },
      })

      return { user, teacher: updatedTeacher }
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.ACCESS_GRANTED,
      grantedBy,
      JSON.stringify({ hasSystemAccess: false, accessLevel: TeacherAccessLevel.NONE }),
      JSON.stringify({
        hasSystemAccess: true,
        accessLevel: accessData.accessLevel,
        userId: result.user.id,
        permissions: accessData.permissions,
        channelConfig: accessData.channelConfig,
      })
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: grantedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { hasSystemAccess: false },
      newValue: {
        hasSystemAccess: true,
        accessLevel: accessData.accessLevel,
        userId: result.user.id,
        forcePasswordReset: false,
      },
    })

    // Send teacher invitation email with login credentials
    try {
      const { emailService } = await import('./email.service')
      
      console.log('Attempting to send teacher invitation email...')
      console.log('Email recipient:', accessData.email)
      console.log('Teacher name:', `${existingTeacher.firstName} ${existingTeacher.lastName}`)
      
      const school = await prisma.school.findUnique({
        where: { id: schoolId },
        select: { name: true, logo: true, email: true, phone: true, address: true },
      })

      console.log('School found:', school?.name || 'Not found')

      const teacherName = `${existingTeacher.firstName} ${existingTeacher.lastName}`
      const schoolBranding = school ? {
        schoolName: school.name,
        schoolLogo: school.logo ?? undefined,
        email: school.email ?? undefined,
        phone: school.phone ?? undefined,
        address: school.address ?? undefined,
      } : undefined

      const emailResult = await emailService.sendTeacherInvitation(
        accessData.email,
        teacherName,
        accessData.temporaryPassword,
        school?.name || 'SchoolOffice',
        schoolBranding
      )

      console.log('Email send result:', JSON.stringify(emailResult, null, 2))
      
      if (emailResult.success) {
        console.log(`Teacher invitation email sent successfully to ${accessData.email}`)
      } else {
        console.error(`Failed to send teacher invitation email: ${emailResult.error}`)
      }
    } catch (emailError) {
      // Log error but don't fail the operation - access was granted successfully
      console.error('Failed to send teacher invitation email:', emailError)
      if (emailError instanceof Error) {
        console.error('Error stack:', emailError.stack)
      }
    }

    return mapPrismaTeacherToDomain(result.teacher)
  }

  /**
   * Revoke system access from a teacher
   * Requirements 4.8, 2.6: Revoke access with audit logging
   * 
   * This method:
   * 1. Disables the linked user account
   * 2. Updates teacher record to remove access
   * 3. Logs the revocation for audit purposes
   * 
   * Note: The user account is disabled, not deleted, to preserve audit trail
   * 
   * @param teacherId - The teacher to revoke access from
   * @param schoolId - School for tenant isolation
   * @param revokedBy - User ID of the admin revoking access
   * @param reason - Optional reason for revocation
   */
  async revokeSystemAccess(
    teacherId: string,
    schoolId: string,
    revokedBy: string,
    reason?: string
  ): Promise<Teacher> {
    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Check if teacher has system access to revoke
    if (!existingTeacher.hasSystemAccess) {
      throw new TeacherValidationError(
        'Teacher does not have system access to revoke',
        'hasSystemAccess',
        'NO_ACCESS_TO_REVOKE'
      )
    }

    const previousAccessLevel = existingTeacher.accessLevel
    const previousUserId = existingTeacher.userId

    // Revoke access in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Disable the user account if it exists
      if (existingTeacher.userId) {
        await tx.user.update({
          where: { id: existingTeacher.userId },
          data: {
            isActive: false,
          },
        })
      }

      // Update teacher to remove access
      const updatedTeacher = await tx.teacher.update({
        where: { id: teacherId },
        data: {
          hasSystemAccess: false,
          accessLevel: TeacherAccessLevel.NONE,
          // Note: We keep userId to maintain the link for historical purposes
        },
        include: {
          examinationRoles: true,
        },
      })

      return updatedTeacher
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.ACCESS_REVOKED,
      revokedBy,
      JSON.stringify({
        hasSystemAccess: true,
        accessLevel: previousAccessLevel,
        userId: previousUserId,
      }),
      JSON.stringify({
        hasSystemAccess: false,
        accessLevel: TeacherAccessLevel.NONE,
      }),
      reason
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: revokedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: {
        hasSystemAccess: true,
        accessLevel: previousAccessLevel,
      },
      newValue: {
        hasSystemAccess: false,
        accessLevel: TeacherAccessLevel.NONE,
        reason: reason || 'Manual revocation',
      },
    })

    return mapPrismaTeacherToDomain(result)
  }

  /**
   * Update teacher permissions
   * Requirement 4.6: Fine-grained permission control
   * 
   * This method updates the fine-grained permissions for a teacher:
   * - canTakeAttendance
   * - canEnterMarks
   * - canViewReports
   * - canSendMessages
   * 
   * @param teacherId - The teacher to update permissions for
   * @param schoolId - School for tenant isolation
   * @param permissions - New permission configuration
   * @param updatedBy - User ID of the admin updating permissions
   */
  async updatePermissions(
    teacherId: string,
    schoolId: string,
    permissions: import('@/types/teacher').TeacherPermissions,
    updatedBy: string
  ): Promise<Teacher> {
    // Enforce no "full access" option (Requirement 4.7)
    this.validateNoFullAccess(permissions)

    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Check if teacher has system access
    if (!existingTeacher.hasSystemAccess) {
      throw new TeacherValidationError(
        'Cannot update permissions for teacher without system access',
        'hasSystemAccess',
        'NO_SYSTEM_ACCESS'
      )
    }

    const previousPermissions: import('@/types/teacher').TeacherPermissions = {
      canTakeAttendance: existingTeacher.canTakeAttendance,
      canEnterMarks: existingTeacher.canEnterMarks,
      canViewReports: existingTeacher.canViewReports,
      canSendMessages: existingTeacher.canSendMessages,
    }

    // Update permissions
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        canTakeAttendance: permissions.canTakeAttendance,
        canEnterMarks: permissions.canEnterMarks,
        canViewReports: permissions.canViewReports,
        canSendMessages: permissions.canSendMessages,
      },
      include: {
        examinationRoles: true,
      },
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.PERMISSIONS_UPDATED,
      updatedBy,
      JSON.stringify(previousPermissions),
      JSON.stringify(permissions)
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { permissions: previousPermissions },
      newValue: { permissions },
    })

    return mapPrismaTeacherToDomain(updatedTeacher)
  }

  /**
   * Update teacher access level
   * Requirements 4.2, 4.3: Change between TEACHER and TEACHER_ADMIN levels
   * 
   * @param teacherId - The teacher to update
   * @param schoolId - School for tenant isolation
   * @param accessLevel - New access level
   * @param updatedBy - User ID of the admin updating
   */
  async updateAccessLevel(
    teacherId: string,
    schoolId: string,
    accessLevel: TeacherAccessLevel,
    updatedBy: string
  ): Promise<Teacher> {
    // Validate access level
    if (accessLevel === TeacherAccessLevel.NONE) {
      throw new TeacherValidationError(
        'Use revokeSystemAccess to remove access',
        'accessLevel',
        'INVALID_ACCESS_LEVEL'
      )
    }

    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Check if teacher has system access
    if (!existingTeacher.hasSystemAccess) {
      throw new TeacherValidationError(
        'Cannot update access level for teacher without system access',
        'hasSystemAccess',
        'NO_SYSTEM_ACCESS'
      )
    }

    const previousAccessLevel = existingTeacher.accessLevel

    // Update access level
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        accessLevel,
      },
      include: {
        examinationRoles: true,
      },
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.PERMISSIONS_UPDATED,
      updatedBy,
      JSON.stringify({ accessLevel: previousAccessLevel }),
      JSON.stringify({ accessLevel })
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { accessLevel: previousAccessLevel },
      newValue: { accessLevel },
    })

    return mapPrismaTeacherToDomain(updatedTeacher)
  }

  /**
   * Configure communication channels for a teacher
   * Requirements 5.1, 5.2: Channel configuration with defaults
   * 
   * @param teacherId - The teacher to configure
   * @param schoolId - School for tenant isolation
   * @param channelConfig - New channel configuration
   * @param updatedBy - User ID of the admin updating
   */
  async configureChannels(
    teacherId: string,
    schoolId: string,
    channelConfig: import('@/types/teacher').ChannelConfig,
    updatedBy: string
  ): Promise<Teacher> {
    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    const previousChannelConfig: import('@/types/teacher').ChannelConfig = {
      inAppMessaging: existingTeacher.inAppMessagingEnabled,
      sms: existingTeacher.smsEnabled,
      email: existingTeacher.emailEnabled,
    }

    // Update channel configuration
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        inAppMessagingEnabled: channelConfig.inAppMessaging,
        smsEnabled: channelConfig.sms,
        // whatsappEnabled removed from schema
        emailEnabled: channelConfig.email,
      },
      include: {
        examinationRoles: true,
      },
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.PERMISSIONS_UPDATED,
      updatedBy,
      JSON.stringify({ channelConfig: previousChannelConfig }),
      JSON.stringify({ channelConfig })
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { channelConfig: previousChannelConfig },
      newValue: { channelConfig },
    })

    return mapPrismaTeacherToDomain(updatedTeacher)
  }

  /**
   * Check if a teacher has system access
   * Requirement 4.1: Support record-only mode
   */
  async hasSystemAccess(teacherId: string, schoolId: string): Promise<boolean> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        hasSystemAccess: true,
        employmentStatus: true,
      },
    })

    if (!teacher) {
      return false
    }

    // Inactive teachers don't have access even if flag is set
    if (this.isInactiveStatus(teacher.employmentStatus as TeacherEmploymentStatus)) {
      return false
    }

    return teacher.hasSystemAccess
  }

  /**
   * Get teacher's current permissions
   * Requirement 4.6: Fine-grained permissions
   */
  async getPermissions(
    teacherId: string,
    schoolId: string
  ): Promise<import('@/types/teacher').TeacherPermissions | null> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        hasSystemAccess: true,
        canTakeAttendance: true,
        canEnterMarks: true,
        canViewReports: true,
        canSendMessages: true,
      },
    })

    if (!teacher || !teacher.hasSystemAccess) {
      return null
    }

    return {
      canTakeAttendance: teacher.canTakeAttendance,
      canEnterMarks: teacher.canEnterMarks,
      canViewReports: teacher.canViewReports,
      canSendMessages: teacher.canSendMessages,
    }
  }

  /**
   * Get teacher's current channel configuration
   * Requirements 5.1, 5.2: Channel configuration
   */
  async getChannelConfig(
    teacherId: string,
    schoolId: string
  ): Promise<import('@/types/teacher').ChannelConfig | null> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        inAppMessagingEnabled: true,
        smsEnabled: true,
        // whatsappEnabled removed from schema
        emailEnabled: true,
      },
    })

    if (!teacher) {
      return null
    }

    return {
      inAppMessaging: teacher.inAppMessagingEnabled,
      sms: teacher.smsEnabled,
      email: teacher.emailEnabled,
    }
  }

  /**
   * Validate that permissions don't grant "full access"
   * Requirement 4.7: No "full access" option for teachers
   * 
   * Teachers NEVER get:
   * - canApproveMarks
   * - canViewFees
   * - canRecordPayments
   * - canEditClassAssignments
   * - canManageTeachers
   * 
   * This method ensures the permissions object only contains allowed fields
   */
  private validateNoFullAccess(permissions: import('@/types/teacher').TeacherPermissions): void {
    // Check that permissions object only has the allowed fields
    const allowedFields = ['canTakeAttendance', 'canEnterMarks', 'canViewReports', 'canSendMessages']
    const permissionKeys = Object.keys(permissions)

    for (const key of permissionKeys) {
      if (!allowedFields.includes(key)) {
        throw new TeacherValidationError(
          `Invalid permission field: ${key}. Teachers cannot have admin-level permissions.`,
          key,
          'INVALID_PERMISSION'
        )
      }
    }

    // Ensure all values are booleans
    for (const field of allowedFields) {
      const value = permissions[field as keyof import('@/types/teacher').TeacherPermissions]
      if (typeof value !== 'boolean') {
        throw new TeacherValidationError(
          `Permission ${field} must be a boolean`,
          field,
          'INVALID_PERMISSION_VALUE'
        )
      }
    }
  }

  /**
   * Force password reset for a teacher
   * Requirement 4.5: Force password reset on first login
   */
  async forcePasswordReset(
    teacherId: string,
    schoolId: string,
    forcedBy: string
  ): Promise<void> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        userId: true,
        hasSystemAccess: true,
      },
    })

    if (!teacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    if (!teacher.hasSystemAccess || !teacher.userId) {
      throw new TeacherValidationError(
        'Teacher does not have system access',
        'hasSystemAccess',
        'NO_SYSTEM_ACCESS'
      )
    }

    // Update both teacher and user records
    await prisma.$transaction([
      prisma.teacher.update({
        where: { id: teacherId },
        data: { forcePasswordReset: true },
      }),
      prisma.user.update({
        where: { id: teacher.userId },
        data: { forcePasswordReset: true },
      }),
    ])

    // Log to audit service
    await auditService.log({
      schoolId,
      userId: forcedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      newValue: { forcePasswordReset: true, reason: 'Manual password reset forced' },
    })
  }

  /**
   * Get teachers without system access (record-only)
   * Requirement 4.1: Support record-only mode
   */
  async getTeachersWithoutAccess(schoolId: string): Promise<TeacherListItem[]> {
    return this.getTeacherList(schoolId, { hasSystemAccess: false })
  }

  // ============================================
  // PAYROLL PREPARATION
  // Requirements: 8.1-8.5
  // ============================================

  /**
   * Update teacher payroll information
   * Requirements 8.1-8.5: Payroll preparation fields
   * 
   * This method captures payroll-related information for teachers:
   * - Salary type (Fixed/Hourly) - Requirement 8.1
   * - Pay grade - Requirement 8.2
   * - Bank or mobile money details - Requirement 8.3
   * - Payment status (Active/Hold) - Requirement 8.4
   * 
   * The structure is designed to be compatible with future finance module integration
   * as per Requirement 8.5.
   * 
   * @param teacherId - The teacher to update payroll info for
   * @param schoolId - School for tenant isolation
   * @param payrollData - Payroll information to update
   * @param updatedBy - User ID of the admin updating
   */
  async updatePayrollInfo(
    teacherId: string,
    schoolId: string,
    payrollData: import('@/types/teacher').PayrollInput,
    updatedBy: string
  ): Promise<Teacher> {
    // Validate salary type (Requirement 8.1)
    if (!payrollData.salaryType || !Object.values(SalaryType).includes(payrollData.salaryType)) {
      throw new TeacherValidationError(
        'Invalid salary type. Must be FIXED or HOURLY.',
        'salaryType',
        'INVALID_SALARY_TYPE'
      )
    }

    // Validate pay grade (Requirement 8.2)
    if (!payrollData.payGrade || !payrollData.payGrade.trim()) {
      throw new TeacherValidationError(
        'Pay grade is required',
        'payGrade',
        'REQUIRED_FIELD'
      )
    }

    // Validate payment status if provided (Requirement 8.4)
    if (payrollData.paymentStatus && !Object.values(PaymentStatus).includes(payrollData.paymentStatus)) {
      throw new TeacherValidationError(
        'Invalid payment status. Must be ACTIVE or HOLD.',
        'paymentStatus',
        'INVALID_PAYMENT_STATUS'
      )
    }

    // Validate bank details if provided (Requirement 8.3)
    if (payrollData.bankDetails) {
      if (!payrollData.bankDetails.bankName || !payrollData.bankDetails.bankName.trim()) {
        throw new TeacherValidationError(
          'Bank name is required when providing bank details',
          'bankDetails.bankName',
          'REQUIRED_FIELD'
        )
      }
      if (!payrollData.bankDetails.accountNumber || !payrollData.bankDetails.accountNumber.trim()) {
        throw new TeacherValidationError(
          'Account number is required when providing bank details',
          'bankDetails.accountNumber',
          'REQUIRED_FIELD'
        )
      }
      if (!payrollData.bankDetails.accountName || !payrollData.bankDetails.accountName.trim()) {
        throw new TeacherValidationError(
          'Account name is required when providing bank details',
          'bankDetails.accountName',
          'REQUIRED_FIELD'
        )
      }
    }

    // Validate mobile money details if provided (Requirement 8.3)
    if (payrollData.mobileMoneyDetails) {
      if (!payrollData.mobileMoneyDetails.provider || !payrollData.mobileMoneyDetails.provider.trim()) {
        throw new TeacherValidationError(
          'Provider is required when providing mobile money details',
          'mobileMoneyDetails.provider',
          'REQUIRED_FIELD'
        )
      }
      if (!payrollData.mobileMoneyDetails.phoneNumber || !payrollData.mobileMoneyDetails.phoneNumber.trim()) {
        throw new TeacherValidationError(
          'Phone number is required when providing mobile money details',
          'mobileMoneyDetails.phoneNumber',
          'REQUIRED_FIELD'
        )
      }
      if (!payrollData.mobileMoneyDetails.accountName || !payrollData.mobileMoneyDetails.accountName.trim()) {
        throw new TeacherValidationError(
          'Account name is required when providing mobile money details',
          'mobileMoneyDetails.accountName',
          'REQUIRED_FIELD'
        )
      }
    }

    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Build previous payroll info for audit
    const previousPayrollInfo: Record<string, unknown> = {
      salaryType: existingTeacher.salaryType,
      payGrade: existingTeacher.payGrade,
      paymentStatus: existingTeacher.paymentStatus,
      bankDetails: existingTeacher.bankName
        ? {
            bankName: existingTeacher.bankName,
            accountNumber: existingTeacher.bankAccountNumber,
            accountName: existingTeacher.bankAccountName,
          }
        : undefined,
      mobileMoneyDetails: existingTeacher.mobileMoneyProvider
        ? {
            provider: existingTeacher.mobileMoneyProvider,
            phoneNumber: existingTeacher.mobileMoneyPhone,
            accountName: existingTeacher.mobileMoneyName,
          }
        : undefined,
    }

    // Build update data - structure compatible with future finance module (Requirement 8.5)
    const updateData: Record<string, unknown> = {
      salaryType: payrollData.salaryType,
      payGrade: payrollData.payGrade.trim(),
      paymentStatus: payrollData.paymentStatus || PaymentStatus.ACTIVE,
    }

    // Handle bank details (Requirement 8.3)
    if (payrollData.bankDetails) {
      updateData.bankName = payrollData.bankDetails.bankName.trim()
      updateData.bankAccountNumber = payrollData.bankDetails.accountNumber.trim()
      updateData.bankAccountName = payrollData.bankDetails.accountName.trim()
    } else {
      // Clear bank details if not provided
      updateData.bankName = null
      updateData.bankAccountNumber = null
      updateData.bankAccountName = null
    }

    // Handle mobile money details (Requirement 8.3)
    if (payrollData.mobileMoneyDetails) {
      updateData.mobileMoneyProvider = payrollData.mobileMoneyDetails.provider.trim()
      updateData.mobileMoneyPhone = payrollData.mobileMoneyDetails.phoneNumber.trim()
      updateData.mobileMoneyName = payrollData.mobileMoneyDetails.accountName.trim()
    } else {
      // Clear mobile money details if not provided
      updateData.mobileMoneyProvider = null
      updateData.mobileMoneyPhone = null
      updateData.mobileMoneyName = null
    }

    // Update teacher payroll info
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: updateData,
      include: {
        examinationRoles: true,
      },
    })

    // Build new payroll info for audit
    const newPayrollInfo: Record<string, unknown> = {
      salaryType: payrollData.salaryType,
      payGrade: payrollData.payGrade,
      paymentStatus: payrollData.paymentStatus || PaymentStatus.ACTIVE,
      bankDetails: payrollData.bankDetails,
      mobileMoneyDetails: payrollData.mobileMoneyDetails,
    }

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.PAYROLL_UPDATED,
      updatedBy,
      JSON.stringify(previousPayrollInfo),
      JSON.stringify(newPayrollInfo)
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { payrollInfo: previousPayrollInfo },
      newValue: { payrollInfo: newPayrollInfo },
    })

    return mapPrismaTeacherToDomain(updatedTeacher)
  }

  /**
   * Get teacher payroll information
   * Requirements 8.1-8.5: Retrieve payroll preparation fields
   * 
   * @param teacherId - The teacher to get payroll info for
   * @param schoolId - School for tenant isolation
   */
  async getPayrollInfo(
    teacherId: string,
    schoolId: string
  ): Promise<TeacherPayrollInfo | null> {
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        id: true,
        salaryType: true,
        payGrade: true,
        paymentStatus: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountName: true,
        mobileMoneyProvider: true,
        mobileMoneyPhone: true,
        mobileMoneyName: true,
      },
    })

    if (!teacher) {
      return null
    }

    // Return null if no payroll info has been set
    if (!teacher.salaryType) {
      return null
    }

    return {
      teacherId: teacher.id,
      salaryType: teacher.salaryType as SalaryType,
      payGrade: teacher.payGrade || '',
      paymentStatus: (teacher.paymentStatus as PaymentStatus) || PaymentStatus.ACTIVE,
      bankDetails: teacher.bankName
        ? {
            bankName: teacher.bankName,
            accountNumber: teacher.bankAccountNumber || '',
            accountName: teacher.bankAccountName || '',
          }
        : undefined,
      mobileMoneyDetails: teacher.mobileMoneyProvider
        ? {
            provider: teacher.mobileMoneyProvider,
            phoneNumber: teacher.mobileMoneyPhone || '',
            accountName: teacher.mobileMoneyName || '',
          }
        : undefined,
    }
  }

  /**
   * Update teacher payment status
   * Requirement 8.4: Payment status (Active/Hold)
   * 
   * This is a convenience method for quickly updating just the payment status
   * without modifying other payroll fields.
   * 
   * @param teacherId - The teacher to update
   * @param schoolId - School for tenant isolation
   * @param paymentStatus - New payment status
   * @param updatedBy - User ID of the admin updating
   */
  async updatePaymentStatus(
    teacherId: string,
    schoolId: string,
    paymentStatus: PaymentStatus,
    updatedBy: string
  ): Promise<Teacher> {
    // Validate payment status
    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      throw new TeacherValidationError(
        'Invalid payment status. Must be ACTIVE or HOLD.',
        'paymentStatus',
        'INVALID_PAYMENT_STATUS'
      )
    }

    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    const previousStatus = existingTeacher.paymentStatus

    // Update payment status
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: { paymentStatus },
      include: {
        examinationRoles: true,
      },
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.PAYROLL_UPDATED,
      updatedBy,
      JSON.stringify({ paymentStatus: previousStatus }),
      JSON.stringify({ paymentStatus })
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: updatedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { paymentStatus: previousStatus },
      newValue: { paymentStatus },
    })

    return mapPrismaTeacherToDomain(updatedTeacher)
  }

  /**
   * Get teachers by payment status
   * Requirement 8.4: Filter teachers by payment status
   * 
   * @param schoolId - School for tenant isolation
   * @param paymentStatus - Payment status to filter by
   */
  async getTeachersByPaymentStatus(
    schoolId: string,
    paymentStatus: PaymentStatus
  ): Promise<TeacherListItem[]> {
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        paymentStatus,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        employmentType: true,
        jobTitle: true,
        department: true,
        employmentStatus: true,
        hasSystemAccess: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
        updatedAt: true,
      },
    })

    return teachers.map(mapPrismaTeacherToListItem)
  }

  /**
   * Get teachers with payroll info configured
   * Requirement 8.5: Support future finance module integration
   * 
   * @param schoolId - School for tenant isolation
   */
  async getTeachersWithPayrollInfo(schoolId: string): Promise<TeacherListItem[]> {
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        salaryType: { not: null },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        employmentType: true,
        jobTitle: true,
        department: true,
        employmentStatus: true,
        hasSystemAccess: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
        updatedAt: true,
      },
    })

    return teachers.map(mapPrismaTeacherToListItem)
  }

  /**
   * Get teachers without payroll info configured
   * Requirement 8.5: Identify teachers needing payroll setup
   * 
   * @param schoolId - School for tenant isolation
   */
  async getTeachersWithoutPayrollInfo(schoolId: string): Promise<TeacherListItem[]> {
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        salaryType: null,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        employmentType: true,
        jobTitle: true,
        department: true,
        employmentStatus: true,
        hasSystemAccess: true,
        assignedClassIds: true,
        assignedSubjectIds: true,
        updatedAt: true,
      },
    })

    return teachers.map(mapPrismaTeacherToListItem)
  }

  /**
   * Clear teacher payroll information
   * Requirement 8.5: Support payroll data management
   * 
   * @param teacherId - The teacher to clear payroll info for
   * @param schoolId - School for tenant isolation
   * @param clearedBy - User ID of the admin clearing
   */
  async clearPayrollInfo(
    teacherId: string,
    schoolId: string,
    clearedBy: string
  ): Promise<Teacher> {
    // Get existing teacher with tenant isolation
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      include: {
        examinationRoles: true,
      },
    })

    if (!existingTeacher) {
      throw new TeacherValidationError(
        `Teacher with id ${teacherId} not found in this school`,
        'teacherId',
        'TEACHER_NOT_FOUND'
      )
    }

    // Build previous payroll info for audit
    const previousPayrollInfo: Record<string, unknown> = {
      salaryType: existingTeacher.salaryType,
      payGrade: existingTeacher.payGrade,
      paymentStatus: existingTeacher.paymentStatus,
      bankDetails: existingTeacher.bankName
        ? {
            bankName: existingTeacher.bankName,
            accountNumber: existingTeacher.bankAccountNumber,
            accountName: existingTeacher.bankAccountName,
          }
        : undefined,
      mobileMoneyDetails: existingTeacher.mobileMoneyProvider
        ? {
            provider: existingTeacher.mobileMoneyProvider,
            phoneNumber: existingTeacher.mobileMoneyPhone,
            accountName: existingTeacher.mobileMoneyName,
          }
        : undefined,
    }

    // Clear all payroll fields
    const updatedTeacher = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        salaryType: null,
        payGrade: null,
        paymentStatus: null,
        bankName: null,
        bankAccountNumber: null,
        bankAccountName: null,
        mobileMoneyProvider: null,
        mobileMoneyPhone: null,
        mobileMoneyName: null,
      },
      include: {
        examinationRoles: true,
      },
    })

    // Log history entry
    await this.logTeacherHistory(
      teacherId,
      schoolId,
      TeacherEventType.PAYROLL_UPDATED,
      clearedBy,
      JSON.stringify(previousPayrollInfo),
      JSON.stringify({ cleared: true })
    )

    // Log to main audit service
    await auditService.log({
      schoolId,
      userId: clearedBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF,
      resourceId: teacherId,
      previousValue: { payrollInfo: previousPayrollInfo },
      newValue: { payrollInfo: null, reason: 'Payroll info cleared' },
    })

    return mapPrismaTeacherToDomain(updatedTeacher)
  }
}

// Export singleton instance
export const teacherManagementService = new TeacherManagementService()
