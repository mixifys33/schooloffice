/**
 * Teacher Management Type Definitions
 * Requirements: 1.1, 2.1-2.5, 3.1-3.5, 4.1-4.6, 5.1-5.2, 6.1-6.5, 7.1-7.5, 8.1-8.5
 * 
 * Core principle: A teacher is a role-bound institutional entity, not a user account.
 * Teachers are created as records first, then optionally granted system access.
 */

import { Gender } from './enums'

// ============================================
// TEACHER ENUMS
// Requirements: 2.1, 2.2, 2.5, 3.5, 4.2, 7.1, 8.1, 8.4
// ============================================

/**
 * Employment types for teachers
 * Requirement 2.1: Employment type (Full-time, Part-time, Contract, Volunteer)
 */
export enum EmploymentType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  VOLUNTEER = 'VOLUNTEER',
}

/**
 * Job titles for teachers
 * Requirement 2.2: Job title (Class Teacher, Subject Teacher, Head of Department, etc.)
 */
export enum TeacherJobTitle {
  CLASS_TEACHER = 'CLASS_TEACHER',
  SUBJECT_TEACHER = 'SUBJECT_TEACHER',
  HEAD_OF_DEPARTMENT = 'HEAD_OF_DEPARTMENT',
  SENIOR_TEACHER = 'SENIOR_TEACHER',
  ASSISTANT_TEACHER = 'ASSISTANT_TEACHER',
}

/**
 * Employment status for teachers
 * Requirement 2.5: Employment status (Active, On Leave, Suspended, Left)
 */
export enum TeacherEmploymentStatus {
  ACTIVE = 'ACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  LEFT = 'LEFT',
}

/**
 * Examination roles for teachers
 * Requirement 3.5: Examination roles (Setter, Marker, Moderator)
 */
export enum ExaminationRole {
  SETTER = 'SETTER',
  MARKER = 'MARKER',
  MODERATOR = 'MODERATOR',
}

/**
 * Salary types for payroll
 * Requirement 8.1: Salary type (Fixed/Hourly)
 */
export enum SalaryType {
  FIXED = 'FIXED',
  HOURLY = 'HOURLY',
}

/**
 * Payment status for payroll
 * Requirement 8.4: Payment status (Active/Hold)
 */
export enum PaymentStatus {
  ACTIVE = 'ACTIVE',
  HOLD = 'HOLD',
}

/**
 * Teacher document types
 * Requirements 7.1-7.4: Document types for teachers
 */
export enum TeacherDocumentType {
  APPOINTMENT_LETTER = 'APPOINTMENT_LETTER',
  CERTIFICATE = 'CERTIFICATE',
  NATIONAL_ID = 'NATIONAL_ID',
  CONTRACT = 'CONTRACT',
  OTHER = 'OTHER',
}

/**
 * Access level types for teachers
 * Requirements 4.1, 4.2, 4.3: System access levels
 */
export enum TeacherAccessLevel {
  NONE = 'NONE',           // Record-only mode - no system access
  TEACHER = 'TEACHER',     // Standard teacher access
  TEACHER_ADMIN = 'TEACHER_ADMIN', // Teacher + limited admin (rare cases)
}

/**
 * Teacher event types for audit trail
 */
export enum TeacherEventType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_REVOKED = 'ACCESS_REVOKED',
  PERMISSIONS_UPDATED = 'PERMISSIONS_UPDATED',
  SUBJECT_ASSIGNED = 'SUBJECT_ASSIGNED',
  SUBJECT_REMOVED = 'SUBJECT_REMOVED',
  CLASS_ASSIGNED = 'CLASS_ASSIGNED',
  CLASS_REMOVED = 'CLASS_REMOVED',
  CLASS_TEACHER_DESIGNATED = 'CLASS_TEACHER_DESIGNATED',
  EXAM_ROLE_ASSIGNED = 'EXAM_ROLE_ASSIGNED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  PAYROLL_UPDATED = 'PAYROLL_UPDATED',
}

// ============================================
// TEACHER PERMISSION INTERFACES
// Requirements: 4.6, 5.1-5.2
// ============================================

/**
 * Fine-grained permissions for teachers
 * Requirement 4.6: Fine-grained permissions (attendance, marks, reports, messages)
 * Note: No "full access" option per Requirement 4.7
 */
export interface TeacherPermissions {
  canTakeAttendance: boolean
  canEnterMarks: boolean
  canViewReports: boolean
  canSendMessages: boolean
}

/**
 * Default permissions for new teachers with system access
 */
export const DEFAULT_TEACHER_PERMISSIONS: TeacherPermissions = {
  canTakeAttendance: true,
  canEnterMarks: true,
  canViewReports: true,
  canSendMessages: false, // Disabled by default
}

/**
 * Communication channel configuration
 * Requirements 5.1, 5.2: Channel configuration with SMS/WhatsApp disabled by default
 */
export interface ChannelConfig {
  inAppMessaging: boolean
  sms: boolean
  whatsapp: boolean
  email: boolean
}

/**
 * Default channel configuration for new teachers
 * Requirement 5.2: SMS and WhatsApp disabled by default
 */
export const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  inAppMessaging: true,
  sms: false,      // Disabled by default per Requirement 5.2
  whatsapp: false, // Disabled by default per Requirement 5.2
  email: true,
}

/**
 * Input for granting system access to a teacher
 * Requirements 4.2-4.5: Access grant with email, password, and forced reset
 */
export interface GrantAccessInput {
  accessLevel: TeacherAccessLevel
  email: string                    // Used as username
  temporaryPassword: string
  forcePasswordReset: boolean      // Always true on initial grant
  permissions: TeacherPermissions
  channelConfig: ChannelConfig
}

// ============================================
// TEACHER SUPPORTING INTERFACES
// Requirements: 7.1-7.5, 8.1-8.5, 6.1-6.5
// ============================================

/**
 * Bank details for payroll
 * Requirement 8.3: Bank details capture
 */
export interface BankDetails {
  bankName: string
  accountNumber: string
  accountName: string
}

/**
 * Mobile money details for payroll
 * Requirement 8.3: Mobile money details capture
 */
export interface MobileMoneyDetails {
  provider: string
  phoneNumber: string
  accountName: string
}

/**
 * Payroll information for teachers
 * Requirements 8.1-8.5: Payroll preparation fields
 */
export interface TeacherPayrollInfo {
  teacherId: string
  salaryType: SalaryType
  payGrade: string
  paymentStatus: PaymentStatus
  bankDetails?: BankDetails
  mobileMoneyDetails?: MobileMoneyDetails
}

/**
 * Payroll input for updates
 */
export interface PayrollInput {
  salaryType: SalaryType
  payGrade: string
  paymentStatus?: PaymentStatus
  bankDetails?: BankDetails
  mobileMoneyDetails?: MobileMoneyDetails
}

/**
 * Teacher document entity
 * Requirements 7.1-7.5: Document management
 */
export interface TeacherDocument {
  id: string
  teacherId: string
  documentType: TeacherDocumentType
  fileName: string
  fileUrl: string              // ImageKit URL
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
}

/**
 * Document upload input
 */
export interface DocumentUploadInput {
  documentType: TeacherDocumentType
  file: File
  uploadedBy: string
}

/**
 * Attendance submission tracking
 * Requirement 6.1: Track attendance submission timestamps
 */
export interface AttendanceSubmissionMetrics {
  totalExpected: number
  totalSubmitted: number
  onTimeSubmissions: number
  lateSubmissions: number
  timestamps: Date[]
}

/**
 * Mark entry tracking
 * Requirement 6.2: Track mark entry timestamps
 */
export interface MarkEntryMetrics {
  totalExpected: number
  totalEntered: number
  onTimeEntries: number
  lateEntries: number
  timestamps: Date[]
}

/**
 * Missed classes tracking
 * Requirement 6.3: Track missed classes
 */
export interface MissedClassMetrics {
  count: number
  dates: Date[]
  reasons?: string[]
}

/**
 * Login activity tracking
 * Requirement 6.4: Track login activity
 */
export interface LoginActivityMetrics {
  totalLogins: number
  lastLogin?: Date
  averageSessionDuration: number
  loginTimestamps: Date[]
}

/**
 * Message logs tracking
 * Requirement 6.5: Track message logs
 */
export interface MessageLogMetrics {
  totalSent: number
  byChannel: Record<string, number>
  lastMessageAt?: Date
  messageTimestamps: Date[]
}

/**
 * Performance metrics for teachers
 * Requirements 6.1-6.5: Auto-tracked performance data
 */
export interface TeacherPerformanceMetrics {
  teacherId: string
  period: { start: Date; end: Date }
  attendanceSubmissions: AttendanceSubmissionMetrics
  markEntries: MarkEntryMetrics
  missedClasses: MissedClassMetrics
  loginActivity: LoginActivityMetrics
  messageLogs: MessageLogMetrics
}

// ============================================
// TEACHER CORE INTERFACES
// Requirements: 1.1-1.6, 2.1-2.5, 3.1-3.5
// ============================================

/**
 * Examination role assignment
 * Requirement 3.5: Examination role assignment
 */
export interface ExaminationRoleAssignment {
  examId: string
  role: ExaminationRole
  assignedAt: Date
  assignedBy: string
}

/**
 * Core Teacher entity
 * Requirements: 1.1-1.6, 2.1-2.5, 3.1-3.5, 4.1-4.6
 */
export interface Teacher {
  // Core Identity (Requirement 1.1, 1.2)
  id: string                              // Unique, immutable Teacher_ID
  schoolId: string                        // Tenant association (Requirement 1.6)

  // Personal Information (Requirement 1.1)
  firstName: string
  lastName: string
  gender: Gender
  nationalId: string                      // National ID/Passport/Staff ID
  phone: string
  email: string
  dateOfBirth: Date
  photo?: string
  address?: string

  // Employment Details (Requirements 2.1-2.5)
  employmentType: EmploymentType
  jobTitle: TeacherJobTitle
  department: string
  dateOfAppointment: Date
  employmentStatus: TeacherEmploymentStatus

  // System Access (Requirements 4.1-4.6)
  userId?: string                         // Linked user account (if access granted)
  hasSystemAccess: boolean
  accessLevel?: TeacherAccessLevel
  permissions?: TeacherPermissions
  channelConfig?: ChannelConfig
  forcePasswordReset?: boolean

  // Academic Assignments (Requirements 3.1-3.5)
  assignedSubjects: string[]              // Subject IDs
  assignedClasses: string[]               // Class IDs
  assignedStreams: string[]               // Stream IDs
  classTeacherFor?: string[]              // Class IDs where designated as class teacher
  examinationRoles: ExaminationRoleAssignment[]

  // Payroll Preparation (Requirements 8.1-8.5)
  payrollInfo?: TeacherPayrollInfo

  // Metadata
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

/**
 * Teacher list item for display
 * Requirement 9.6: Teacher list display
 */
export interface TeacherListItem {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  employmentType: EmploymentType
  jobTitle: TeacherJobTitle
  department: string
  employmentStatus: TeacherEmploymentStatus
  hasSystemAccess: boolean
  assignedClassCount: number
  assignedSubjectCount: number
  lastActivity?: Date
}

/**
 * Input for creating a new teacher
 * Requirements 1.1, 2.1-2.4: Required fields for teacher creation
 */
export interface CreateTeacherInput {
  // Identity (Required - Requirement 1.1)
  firstName: string
  lastName: string
  gender: Gender
  nationalId: string                      // National ID, Passport, or Staff ID
  phone: string
  email: string
  dateOfBirth: Date

  // Employment (Required - Requirements 2.1-2.4)
  employmentType: EmploymentType
  jobTitle: TeacherJobTitle
  department: string
  dateOfAppointment: Date

  // Optional
  photo?: string
  address?: string
}

/**
 * Input for updating a teacher
 * Requirement 1.3: Allow updates while preserving Teacher_ID
 */
export interface UpdateTeacherInput {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  employmentType?: EmploymentType
  jobTitle?: TeacherJobTitle
  department?: string
  photo?: string
  address?: string
}

/**
 * Filters for teacher list queries
 * Requirement 9.6: Filtering by status, department, employment type
 */
export interface TeacherFilters {
  status?: TeacherEmploymentStatus
  department?: string
  employmentType?: EmploymentType
  searchTerm?: string
  hasSystemAccess?: boolean
}

// ============================================
// TEACHER HISTORY & AUDIT
// ============================================

/**
 * Teacher history entry for audit trail
 * Requirement 2.9: Preserve historical data
 */
export interface TeacherHistoryEntry {
  id: string
  teacherId: string
  eventType: TeacherEventType
  previousValue?: string
  newValue?: string
  reason?: string
  performedBy: string
  performedAt: Date
}

// ============================================
// TEACHER DRAFT
// Requirement 9.2: Save draft functionality
// ============================================

/**
 * Draft teacher record for incomplete forms
 */
export interface TeacherDraft {
  id: string
  schoolId: string
  data: Partial<CreateTeacherInput>
  currentStep: number                     // 1-5 for the form steps
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// UI FORM TYPES
// Requirement 9.1: Step-based form structure
// ============================================

/**
 * Form steps for teacher creation
 */
export enum TeacherFormStep {
  IDENTITY = 1,           // Personal information
  EMPLOYMENT = 2,         // Employment details
  ACADEMIC_ROLES = 3,     // Subject/class assignments
  ACCESS_PERMISSIONS = 4, // System access & permissions
  REVIEW_CREATE = 5,      // Final review and submission
}

/**
 * Identity step data
 */
export interface TeacherIdentityData {
  firstName: string
  lastName: string
  gender: Gender
  nationalId: string
  phone: string
  email: string
  dateOfBirth: Date
  photo?: string
  address?: string
}

/**
 * Employment step data
 */
export interface TeacherEmploymentData {
  employmentType: EmploymentType
  jobTitle: TeacherJobTitle
  department: string
  dateOfAppointment: Date
}

/**
 * Academic roles step data
 */
export interface TeacherAcademicData {
  assignedSubjects: string[]
  assignedClasses: string[]
  assignedStreams: string[]
  classTeacherFor: string[]
  examinationRoles: ExaminationRoleAssignment[]
}

/**
 * Access & permissions step data
 */
export interface TeacherAccessData {
  grantSystemAccess: boolean
  accessLevel?: TeacherAccessLevel
  permissions?: TeacherPermissions
  channelConfig?: ChannelConfig
}

/**
 * Complete form state
 */
export interface TeacherFormState {
  currentStep: TeacherFormStep
  isDraft: boolean
  draftId?: string
  data: {
    identity: Partial<TeacherIdentityData>
    employment: Partial<TeacherEmploymentData>
    academicRoles: Partial<TeacherAcademicData>
    accessPermissions: Partial<TeacherAccessData>
  }
  validationErrors: Record<string, string[]>
}

// ============================================
// AUTHORIZATION CONSTANTS
// Requirements 10.1-10.7: Role-based access control
// ============================================

/**
 * Roles authorized to manage teachers
 */
export const TEACHER_MANAGEMENT_AUTHORIZED_ROLES = [
  'SCHOOL_ADMIN',
  'HEAD_TEACHER',
  'DIRECTOR_OF_STUDIES',
] as const

/**
 * Roles NOT authorized to manage teachers
 */
export const TEACHER_MANAGEMENT_UNAUTHORIZED_ROLES = [
  'TEACHER',
  'BURSAR',
  'PARENT',
  'STUDENT',
] as const

/**
 * Roles that can view performance data
 * Requirement 6.6: Performance data visibility
 */
export const PERFORMANCE_DATA_VIEWERS = [
  'SCHOOL_ADMIN',
  'HEAD_TEACHER',
  'DIRECTOR_OF_STUDIES',
] as const

/**
 * Roles that can access documents
 * Requirement 7.6: Document visibility
 */
export const DOCUMENT_ACCESS_ROLES = {
  canView: ['SCHOOL_ADMIN', 'HEAD_TEACHER', 'DIRECTOR_OF_STUDIES'],
  canUpload: ['SCHOOL_ADMIN', 'HEAD_TEACHER', 'DIRECTOR_OF_STUDIES'],
  canDelete: ['SCHOOL_ADMIN'],
} as const

// ============================================
// MESSAGE RESTRICTIONS
// Requirements 5.3-5.8: Communication restrictions
// ============================================

/**
 * Message type restrictions for teachers
 */
export const MESSAGE_TYPE_RESTRICTIONS = {
  individual: { allowed: true, requiresAssignment: true },
  bulk: { allowed: false, requiresAssignment: false },
  fee: { allowed: false, requiresAssignment: false },
  announcement: { allowed: false, requiresExplicitApproval: true },
} as const

/**
 * Recipient scope types for teacher messaging
 */
export type TeacherRecipientScope = 'assigned_students' | 'assigned_classes' | 'assigned_parents'

/**
 * Message restrictions interface
 */
export interface TeacherMessageRestrictions {
  recipientScope: TeacherRecipientScope
  canSendBulkMessages: false
  canSendFeeMessages: false
  canSendAnnouncements: false
}

// ============================================
// ACCESS LEVEL CAPABILITIES
// Requirements 4.1-4.3: Access level mapping
// ============================================

/**
 * Capabilities for each access level
 */
export const ACCESS_LEVEL_CAPABILITIES = {
  [TeacherAccessLevel.NONE]: {
    canLogin: false,
    canAccessPortal: false,
    canPerformActions: false,
  },
  [TeacherAccessLevel.TEACHER]: {
    canLogin: true,
    canAccessPortal: true,
    canPerformActions: true,
    // Actions limited by TeacherPermissions
  },
  [TeacherAccessLevel.TEACHER_ADMIN]: {
    canLogin: true,
    canAccessPortal: true,
    canPerformActions: true,
    // Additional: can view some admin reports, assist with class management
    // Still CANNOT: manage teachers, access finance, approve marks
  },
} as const

// ============================================
// INACTIVE STATUS CONSTANTS
// Requirements 2.6-2.8: Inactive status handling
// ============================================

/**
 * Statuses considered inactive
 */
export const INACTIVE_STATUSES = [
  TeacherEmploymentStatus.ON_LEAVE,
  TeacherEmploymentStatus.SUSPENDED,
  TeacherEmploymentStatus.LEFT,
] as const

/**
 * Check if a status is inactive
 */
export function isInactiveStatus(status: TeacherEmploymentStatus): boolean {
  return INACTIVE_STATUSES.includes(status as typeof INACTIVE_STATUSES[number])
}
