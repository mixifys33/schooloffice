/**
 * Core Enum Types for SchoolOffice
 * These enums mirror the Prisma schema enums for type safety
 */

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  DEPUTY = 'DEPUTY',
  TEACHER = 'TEACHER',
  ACCOUNTANT = 'ACCOUNTANT',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export enum PilotType {
  FREE = 'FREE',
  PAID = 'PAID',
}

export enum LicenseType {
  BASIC = 'BASIC',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ENTERPRISE = 'ENTERPRISE',
}

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  TRANSFERRED = 'TRANSFERRED',
  GRADUATED = 'GRADUATED',
  SUSPENDED = 'SUSPENDED',
}

export enum StaffStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
}

export enum ExamType {
  BOT = 'BOT',   // Beginning of Term
  MID = 'MID',   // Mid-Term
  EOT = 'EOT',   // End of Term
  CA = 'CA',     // Continuous Assessment
  EXAM = 'EXAM', // General Exam
}

export enum AssessmentType {
  ASSIGNMENT = 'ASSIGNMENT',
  EXAM = 'EXAM',
  PROJECT = 'PROJECT',
  QUIZ = 'QUIZ',
}

export enum TeacherSubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum MarksSubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum CAType {
  ASSIGNMENT = 'ASSIGNMENT',
  TEST = 'TEST',
  PROJECT = 'PROJECT',
  PRACTICAL = 'PRACTICAL',
  OBSERVATION = 'OBSERVATION',
}

export enum PaymentMethod {
  CASH = 'CASH',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK = 'BANK',
  CHEQUE = 'CHEQUE',
}

export enum StudentType {
  DAY = 'DAY',
  BOARDING = 'BOARDING',
}

export enum FeeCategory {
  TUITION = 'TUITION',
  BOARDING = 'BOARDING',
  TRANSPORT = 'TRANSPORT',
  UNIFORM = 'UNIFORM',
  BOOKS = 'BOOKS',
  MEALS = 'MEALS',
  ACTIVITIES = 'ACTIVITIES',
  OTHER = 'OTHER',
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum DiscountStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  APPLIED = 'APPLIED',
}

export enum PaymentRecordStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REVERSED = 'REVERSED',
  FAILED = 'FAILED',
}

export enum MessageChannel {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
}

export enum MessageStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  READ = 'READ',
}

export enum RelationshipType {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GUARDIAN = 'GUARDIAN',
  UNCLE = 'UNCLE',
  AUNT = 'AUNT',
  GRANDPARENT = 'GRANDPARENT',
  SPONSOR = 'SPONSOR',
  OTHER = 'OTHER',
}

// ============================================
// GUARDIAN MANAGEMENT ENUMS
// Requirements: 6.1, 6.2
// ============================================

export enum GuardianStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  RESTRICTED = 'RESTRICTED',
}

export enum GuardianFlag {
  FEE_DEFAULTER = 'FEE_DEFAULTER',
  HIGH_CONFLICT = 'HIGH_CONFLICT',
  LEGAL_RESTRICTION = 'LEGAL_RESTRICTION',
}

export enum GuardianDocumentType {
  CONSENT_FORM = 'CONSENT_FORM',
  AGREEMENT = 'AGREEMENT',
  LEGAL_LETTER = 'LEGAL_LETTER',
  ID_COPY = 'ID_COPY',
  OTHER = 'OTHER',
}

export enum DisciplineType {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export enum DisciplineAction {
  WARNING = 'WARNING',
  DETENTION = 'DETENTION',
  SUSPENSION = 'SUSPENSION',
  EXPULSION = 'EXPULSION',
}

export enum SchoolType {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  COMBINED = 'COMBINED',
}

export enum DoSReportCardStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  LOCKED = 'LOCKED',
}

export enum HubAlertType {
  SYSTEM = 'SYSTEM',
  SCHOOL = 'SCHOOL',
  FINANCIAL = 'FINANCIAL',
  TECHNICAL = 'TECHNICAL',
}

export enum HubAlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum HubAuditActionType {
  SCHOOL_CREATED = 'SCHOOL_CREATED',
  SCHOOL_UPDATED = 'SCHOOL_UPDATED',
  SCHOOL_SUSPENDED = 'SCHOOL_SUSPENDED',
  SCHOOL_REACTIVATED = 'SCHOOL_REACTIVATED',
  BULK_MESSAGE_SENT = 'BULK_MESSAGE_SENT',
  TEMPLATE_UPDATED = 'TEMPLATE_UPDATED',
  ALERT_CREATED = 'ALERT_CREATED',
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  RESUME_SCHOOL_MESSAGING = 'RESUME_SCHOOL_MESSAGING',
}

export enum MessageTemplateType {
  TERM_START = 'TERM_START',
  ATTENDANCE_ALERT = 'ATTENDANCE_ALERT',
  FEES_REMINDER = 'FEES_REMINDER',
  MID_TERM_PROGRESS = 'MID_TERM_PROGRESS',
  REPORT_READY = 'REPORT_READY',
  TERM_SUMMARY = 'TERM_SUMMARY',
  DISCIPLINE_NOTICE = 'DISCIPLINE_NOTICE',
  GENERAL_ANNOUNCEMENT = 'GENERAL_ANNOUNCEMENT',
}

export enum BulkMessageJobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum OTPVerificationType {
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
}

export enum OTPVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

export enum SMSBudgetAlertType {
  WARNING_80 = 'WARNING_80',
  EXCEEDED_100 = 'EXCEEDED_100',
  BUDGET_RESET = 'BUDGET_RESET',
}


// ============================================
// DIRECT MESSAGING ENUMS
// ============================================

export enum DirectMessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export enum ConversationParticipantType {
  PARENT = 'PARENT',
  TEACHER = 'TEACHER',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
}

// ============================================
// STUDENT REPORT ENUMS
// Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
// ============================================

export enum StudentReportType {
  ACADEMIC = 'ACADEMIC',
  BEHAVIOR = 'BEHAVIOR',
  HEALTH = 'HEALTH',
  GENERAL = 'GENERAL',
}

export enum StudentReportStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESPONDED = 'RESPONDED',
}


// ============================================
// CONSENT MANAGEMENT ENUMS
// Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
// ============================================

export enum ConsentStatus {
  PENDING = 'PENDING',
  GIVEN = 'GIVEN',
  WITHDRAWN = 'WITHDRAWN',
}

export enum DataAccessType {
  VIEW = 'VIEW',
  EXPORT = 'EXPORT',
  MODIFY = 'MODIFY',
  DELETE = 'DELETE',
}

export enum DataExportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}


// ============================================
// SUBSCRIPTION MANAGEMENT ENUMS
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
// ============================================

export enum SubscriptionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  GRACE_PERIOD = 'GRACE_PERIOD',
  SUSPENDED = 'SUSPENDED',
}

// ============================================
// AUTHENTICATION AUDIT ENUMS
// Requirements: 7.3, 5.6
// ============================================

export enum AuthEventType {
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  ROLE_SWITCH = 'ROLE_SWITCH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  // Impersonation events - Requirement 5.6
  IMPERSONATION_START = 'IMPERSONATION_START',
  IMPERSONATION_ACTION = 'IMPERSONATION_ACTION',
  IMPERSONATION_END = 'IMPERSONATION_END',
}

// ============================================
// ACCOUNT LIFECYCLE ENUMS
// Requirements: 17.3, 17.4, 17.5
// ============================================

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

// ============================================
// PERMISSION MODEL ENUMS
// Requirements: 19.1, 19.6
// ============================================

export enum PermissionType {
  VIEW = 'VIEW',
  CREATE = 'CREATE',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  APPROVE = 'APPROVE',
  EXPORT = 'EXPORT',
}

// ============================================
// SYSTEM LOCK ENUMS
// Requirements: 20.3, 20.4, 20.5, 20.7
// ============================================

export enum LockType {
  TERM_CLOSED = 'TERM_CLOSED',
  RESULTS_PUBLISHED = 'RESULTS_PUBLISHED',
  FINANCIAL_PERIOD_LOCKED = 'FINANCIAL_PERIOD_LOCKED',
}


// ============================================
// COMMUNICATION SYSTEM ENUMS
// Requirements: 4.1, 6.1, 11.4, 12.1, 17.3
// ============================================

export enum NotificationType {
  ALERT = 'ALERT',
  REMINDER = 'REMINDER',
  TASK = 'TASK',
  MESSAGE = 'MESSAGE',
  SYSTEM = 'SYSTEM',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
}

export enum TriggerType {
  SCHEDULED = 'SCHEDULED',
  EVENT_ATTENDANCE = 'EVENT_ATTENDANCE',
  EVENT_PAYMENT = 'EVENT_PAYMENT',
  EVENT_RESULTS = 'EVENT_RESULTS',
  EVENT_FEE_DUE = 'EVENT_FEE_DUE',
  MANUAL = 'MANUAL',
}

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum RecipientType {
  STUDENT = 'STUDENT',
  GUARDIAN = 'GUARDIAN',
  STAFF = 'STAFF',
}

export enum DeliveryStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

export enum TargetType {
  ENTIRE_SCHOOL = 'ENTIRE_SCHOOL',
  CLASS = 'CLASS',
  STREAM = 'STREAM',
  FEE_DEFAULTERS = 'FEE_DEFAULTERS',
  ATTENDANCE_BELOW = 'ATTENDANCE_BELOW',
  STAFF_ROLE = 'STAFF_ROLE',
  DORMITORY = 'DORMITORY',
  BUS_ROUTE = 'BUS_ROUTE',
  SPECIFIC_STUDENTS = 'SPECIFIC_STUDENTS',
  SPECIFIC_GUARDIANS = 'SPECIFIC_GUARDIANS',
  CUSTOM_QUERY = 'CUSTOM_QUERY',
}

export enum MessageType {
  AUTOMATED = 'AUTOMATED',
  MANUAL = 'MANUAL',
  GENERAL = 'GENERAL',
  ACADEMIC = 'ACADEMIC',
  FINANCIAL = 'FINANCIAL',
  ATTENDANCE = 'ATTENDANCE',
  EMERGENCY = 'EMERGENCY',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum AutomationFrequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  TRI_WEEKLY = 'TRI_WEEKLY',
}

export enum StudentAccountStatus {
  OK = 'OK',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum TrackerStatus {
  PENDING = 'PENDING',
  CLEARED = 'CLEARED',
}

// ============================================
// STAFF DASHBOARD ENUMS
// Requirements: 1.4, 3.2
// ============================================

/**
 * StaffRole enum for dashboard-specific role types
 * Note: TEACHER and SCHOOL_ADMIN already exist in Role enum
 * These are additional staff roles for dashboard routing
 */
export enum StaffRole {
  CLASS_TEACHER = 'CLASS_TEACHER',
  DOS = 'DOS',
  HOSTEL_STAFF = 'HOSTEL_STAFF',
  SUPPORT_STAFF = 'SUPPORT_STAFF',
  BURSAR = 'BURSAR',
}

/**
 * ResponsibilityType enum for staff duty assignments
 * Defines specific operational duties separate from permissions
 */
export enum ResponsibilityType {
  CLASS_TEACHING = 'CLASS_TEACHING',
  SUBJECT_TEACHING = 'SUBJECT_TEACHING',
  CLASS_TEACHER_DUTY = 'CLASS_TEACHER_DUTY',
  DUTY_TEACHER = 'DUTY_TEACHER',
  BOARDING_MASTER = 'BOARDING_MASTER',
  DEPARTMENT_HEAD = 'DEPARTMENT_HEAD',
}

/**
 * StaffEventType enum for tracking staff history events
 * Used in StaffHistoryEntry for audit trail
 */
export enum StaffEventType {
  HIRED = 'HIRED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  PROMOTED = 'PROMOTED',
  TRANSFERRED = 'TRANSFERRED',
  RESPONSIBILITY_ASSIGNED = 'RESPONSIBILITY_ASSIGNED',
  RESPONSIBILITY_REMOVED = 'RESPONSIBILITY_REMOVED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  DEACTIVATED = 'DEACTIVATED',
}

/**
 * TaskType enum for staff task management
 * Links tasks to specific modules (academics, reports, attendance, finance)
 */
export enum TaskType {
  SUBMIT_MARKS = 'SUBMIT_MARKS',
  SUBMIT_REPORT = 'SUBMIT_REPORT',
  COMPLETE_ATTENDANCE = 'COMPLETE_ATTENDANCE',
  REVIEW_MARKS = 'REVIEW_MARKS',
  GENERATE_REPORTS = 'GENERATE_REPORTS',
}

/**
 * TaskStatus enum for task state tracking
 * Requirements: 12.1
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

/**
 * AlertType enum for dashboard alerts
 */
export enum AlertType {
  PENDING_ATTENDANCE = 'PENDING_ATTENDANCE',
  MARKS_DEADLINE = 'MARKS_DEADLINE',
  UNSUBMITTED_REPORT = 'UNSUBMITTED_REPORT',
  ABSENT_STUDENT = 'ABSENT_STUDENT',
  CHRONIC_LATENESS = 'CHRONIC_LATENESS',
  FEE_DEFAULTER = 'FEE_DEFAULTER',
  DISCIPLINE_ALERT = 'DISCIPLINE_ALERT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  LATE_TEACHER = 'LATE_TEACHER',
  EXAM_CONFLICT = 'EXAM_CONFLICT',
  UNPAID_BALANCE = 'UNPAID_BALANCE',
  RECONCILIATION_ISSUE = 'RECONCILIATION_ISSUE',
  MISSING_STUDENT = 'MISSING_STUDENT',
  LATE_RETURN = 'LATE_RETURN',
  EMERGENCY = 'EMERGENCY',
  TASK_OVERDUE = 'TASK_OVERDUE',
}

/**
 * AlertSeverity enum for alert prioritization
 */
export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/**
 * LinkedModule enum for task module linking
 * Requirements: 12.2
 */
export enum LinkedModule {
  ACADEMICS = 'ACADEMICS',
  REPORTS = 'REPORTS',
  ATTENDANCE = 'ATTENDANCE',
  FINANCE = 'FINANCE',
}

/**
 * StaffDocumentCategory enum for document categorization
 * Requirements: 14.1
 */
export enum StaffDocumentCategory {
  CONTRACT = 'CONTRACT',
  CERTIFICATION = 'CERTIFICATION',
  EVALUATION = 'EVALUATION',
  ID_DOCUMENT = 'ID_DOCUMENT',
  QUALIFICATION = 'QUALIFICATION',
  OTHER = 'OTHER',
}
