/**
 * Core Entity Types for SchoolOffice
 * These types represent the domain entities used throughout the application
 */

import {
  Role,
  PilotType,
  StudentStatus,
  StaffStatus,
  Gender,
  AttendanceStatus,
  ExamType,
  PaymentMethod,
  MessageChannel,
  MessageStatus,
  RelationshipType,
  DisciplineType,
  DisciplineAction,
  LicenseType,
  MessageTemplateType,
  OTPVerificationType,
  OTPVerificationStatus,
  GuardianStatus,
  GuardianFlag,
  GuardianDocumentType,
  RecipientType,
  DeliveryStatus,
  TargetType,
  TriggerType,
  ExecutionStatus,
  NotificationType,
  NotificationPriority,
  MessageType,
} from './enums'

// ============================================
// FEATURE FLAGS - SIMPLIFIED (Binary: School has feature or doesn't use system)
// ============================================

export interface FeatureFlags {
  smsEnabled: boolean
  emailEnabled: boolean
  paymentIntegration: boolean
  // No per-class, per-role, or experimental toggles
  // Either school has it or they don't use the system
}

// ============================================
// SCHOOL & TENANT
// ============================================

export interface School {
  id: string
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  licenseType: LicenseType
  features: FeatureFlags
  smsBudgetPerTerm: number
  createdAt: Date
  updatedAt: Date
  isActive: boolean
}

export interface CreateSchoolInput {
  name: string
  code: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  licenseType?: LicenseType
  smsBudgetPerTerm?: number
}

export interface UpdateSchoolInput {
  name?: string
  address?: string
  phone?: string
  email?: string
  logo?: string
  licenseType?: LicenseType
  features?: Partial<FeatureFlags>
  smsBudgetPerTerm?: number
  isActive?: boolean
}

// ============================================
// USER & AUTHENTICATION
// ============================================

export interface User {
  id: string
  schoolId: string
  email: string
  phone?: string
  passwordHash?: string
  role: Role
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateUserInput {
  schoolId: string
  email: string
  phone?: string
  password: string
  role: Role
}

export interface UserSession {
  userId: string
  schoolId: string
  role: Role
  email: string
}

// ============================================
// ACADEMIC STRUCTURE
// ============================================

export interface AcademicYear {
  id: string
  schoolId: string
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateAcademicYearInput {
  schoolId: string
  name: string
  startDate: Date
  endDate: Date
}

export interface Term {
  id: string
  academicYearId: string
  name: string
  startDate: Date
  endDate: Date
  weekCount: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateTermInput {
  academicYearId: string
  name: string
  startDate: Date
  endDate: Date
}

export interface Class {
  id: string
  schoolId: string
  name: string
  level: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateClassInput {
  schoolId: string
  name: string
  level: number
}

export interface Stream {
  id: string
  classId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateStreamInput {
  classId: string
  name: string
}

export interface Subject {
  id: string
  schoolId: string
  name: string
  code: string
  gradingSystemId?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateSubjectInput {
  schoolId: string
  name: string
  code: string
  gradingSystemId?: string
}

export interface GradingSystem {
  id: string
  schoolId: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface GradeRange {
  id: string
  gradingSystemId: string
  grade: string
  minScore: number
  maxScore: number
  points: number
  remarks?: string
  createdAt: Date
}

export interface CreateGradingSystemInput {
  schoolId: string
  name: string
  grades: Omit<GradeRange, 'id' | 'gradingSystemId' | 'createdAt'>[]
}

// ============================================
// STUDENT & GUARDIAN
// ============================================

export interface Student {
  id: string
  schoolId: string
  admissionNumber: string
  firstName: string
  lastName: string
  dateOfBirth?: Date
  gender?: Gender
  classId: string
  streamId?: string
  pilotType: PilotType
  smsLimitPerTerm: number
  smsSentCount: number
  photo?: string
  medicalInfo?: string
  enrollmentDate: Date
  status: StudentStatus
  createdAt: Date
  updatedAt: Date
}

export interface CreateStudentInput {
  schoolId: string
  admissionNumber: string
  firstName: string
  lastName: string
  dateOfBirth?: Date
  gender?: Gender
  classId: string
  streamId?: string
  pilotType?: PilotType
  photo?: string
  medicalInfo?: string
}

export interface UpdateStudentInput {
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
  gender?: Gender
  classId?: string
  streamId?: string
  pilotType?: PilotType
  photo?: string
  medicalInfo?: string
  status?: StudentStatus
}

export interface Guardian {
  id: string
  firstName: string
  lastName: string
  phone: string
  secondaryPhone?: string
  phoneVerified: boolean
  email?: string
  emailVerified: boolean
  nationalId?: string
  address?: string
  relationship: RelationshipType
  preferredChannel: MessageChannel
  languagePreference: string
  status: GuardianStatus
  flags: GuardianFlag[]
  optOutNonCritical: boolean
  lastContactDate?: Date
  consentGiven: boolean
  consentDate?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateGuardianInput {
  firstName: string
  lastName: string
  phone: string
  secondaryPhone?: string
  email?: string
  nationalId?: string
  address?: string
  relationship?: RelationshipType
  preferredChannel?: MessageChannel
  languagePreference?: string
  status?: GuardianStatus
  flags?: GuardianFlag[]
  optOutNonCritical?: boolean
}

export interface UpdateGuardianInput {
  firstName?: string
  lastName?: string
  phone?: string
  secondaryPhone?: string
  email?: string
  nationalId?: string
  address?: string
  relationship?: RelationshipType
  preferredChannel?: MessageChannel
  languagePreference?: string
  status?: GuardianStatus
  flags?: GuardianFlag[]
  optOutNonCritical?: boolean
}

export interface StudentGuardian {
  id: string
  studentId: string
  guardianId: string
  relationshipType: RelationshipType
  isPrimary: boolean
  isFinanciallyResponsible: boolean
  receivesAcademicMessages: boolean
  receivesFinanceMessages: boolean
  createdAt: Date
}

/**
 * Extended guardian data with relationship information
 * Requirement 2.4: Display all linked guardians with relationships and primary/secondary status
 */
export interface GuardianWithRelationship extends Guardian {
  relationshipType: RelationshipType
  isPrimary: boolean
  isFinanciallyResponsible: boolean
  receivesAcademicMessages: boolean
  receivesFinanceMessages: boolean
}

/**
 * Extended student data with guardian relationship information
 * Requirement 2.5: Display all linked students with relationships
 */
export interface StudentWithRelationship {
  id: string
  admissionNumber: string
  firstName: string
  lastName: string
  classId: string
  className?: string
  streamId?: string
  streamName?: string
  relationshipType: RelationshipType
  isPrimary: boolean
  isFinanciallyResponsible: boolean
  receivesAcademicMessages: boolean
  receivesFinanceMessages: boolean
}

// ============================================
// STAFF
// ============================================

export interface Staff {
  id: string
  userId: string
  schoolId: string
  employeeNumber: string
  firstName: string
  lastName: string
  phone: string
  email: string
  role: Role
  hireDate: Date
  status: StaffStatus
  createdAt: Date
  updatedAt: Date
}

export interface CreateStaffInput {
  userId: string
  schoolId: string
  employeeNumber: string
  firstName: string
  lastName: string
  phone: string
  email: string
  role: Role
}

export interface StaffSubject {
  id: string
  staffId: string
  subjectId: string
  createdAt: Date
}

export interface StaffClass {
  id: string
  staffId: string
  classId: string
  createdAt: Date
}

// ============================================
// ATTENDANCE
// ============================================

export interface Attendance {
  id: string
  studentId: string
  classId: string
  date: Date
  period: number
  status: AttendanceStatus
  recordedBy: string
  recordedAt: Date
  remarks?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateAttendanceInput {
  studentId: string
  classId: string
  date: Date
  period: number
  status: AttendanceStatus
  recordedBy: string
  remarks?: string
}

export interface AttendanceRecord {
  studentId: string
  status: AttendanceStatus
  period: number
  remarks?: string
}

export interface AbsenceStatus {
  isAbsentForDay: boolean
  periodsAbsent: number[]
  alertSent: boolean
}

// ============================================
// TIMETABLE
// ============================================

export interface TimetableEntry {
  id: string
  classId: string
  subjectId: string
  staffId: string
  dayOfWeek: number  // 1-7 (Monday-Sunday)
  period: number
  room?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTimetableEntryInput {
  classId: string
  subjectId: string
  staffId: string
  dayOfWeek: number
  period: number
  room?: string
}

// ============================================
// EXAMINATION
// ============================================

export interface Exam {
  id: string
  schoolId: string
  termId: string
  name: string
  type: ExamType
  startDate?: Date
  endDate?: Date
  isOpen: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateExamInput {
  schoolId: string
  termId: string
  name: string
  type: ExamType
  startDate?: Date
  endDate?: Date
}

export interface Mark {
  id: string
  examId: string
  studentId: string
  subjectId: string
  score: number
  maxScore: number
  grade?: string
  enteredBy: string
  enteredAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateMarkInput {
  examId: string
  studentId: string
  subjectId: string
  score: number
  maxScore: number
  enteredBy: string
}

export interface MarkEntry {
  studentId: string
  score: number
  maxScore: number
}

export interface Result {
  id: string
  studentId: string
  termId: string
  totalMarks: number
  average: number
  position: number
  totalStudents?: number
  grade?: string
  teacherRemarks?: string
  headTeacherRemarks?: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// PUBLISHED REPORT CARDS
// ============================================

export interface PublishedReportCard {
  id: string
  resultId: string
  studentId: string
  termId: string
  schoolId: string
  publishedBy: string
  publishedAt: Date
  htmlContent?: string
  isAccessible: boolean
}

export interface PublishReportCardInput {
  studentId: string
  termId: string
  schoolId: string
  publishedBy: string
  htmlContent?: string
}

export interface ReportCardAccessResult {
  hasAccess: boolean
  reason?: string
  reportCard?: PublishedReportCard
}

// ============================================
// FINANCE
// ============================================

export interface FeeStructure {
  id: string
  schoolId: string
  classId: string
  termId: string
  totalAmount: number
  createdAt: Date
  updatedAt: Date
}

export interface FeeItem {
  id: string
  feeStructureId: string
  name: string
  amount: number
  isOptional: boolean
  createdAt: Date
}

export interface CreateFeeStructureInput {
  schoolId: string
  classId: string
  termId: string
  items: Omit<FeeItem, 'id' | 'feeStructureId' | 'createdAt'>[]
}

export interface Payment {
  id: string
  studentId: string
  termId: string
  amount: number
  method: PaymentMethod
  reference: string
  receivedBy: string
  receivedAt: Date
  receiptNumber: string
  createdAt: Date
}

export interface CreatePaymentInput {
  studentId: string
  termId: string
  amount: number
  method: PaymentMethod
  reference: string
  receivedBy: string
}

export interface StudentBalance {
  studentId: string
  termId: string
  totalFees: number
  totalPaid: number
  balance: number
  hasArrears: boolean
}

// ============================================
// COMMUNICATION
// ============================================

export interface Message {
  id: string
  schoolId: string
  studentId: string
  guardianId: string
  templateType: MessageTemplateType
  channel: MessageChannel
  content: string
  shortUrl?: string
  status: MessageStatus
  cost?: number
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  retryCount: number
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface SendMessageParams {
  studentId: string
  templateType: MessageTemplateType
  data: Record<string, unknown>
  priority: 'normal' | 'critical'
  channels?: MessageChannel[]
}

export interface MessageResult {
  messageId: string
  channel: MessageChannel
  status: MessageStatus
  error?: string
}

export interface MessageTemplate {
  id: string
  schoolId: string
  type: MessageTemplateType
  channel: MessageChannel
  content: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================
// SECURE LINKS
// ============================================

export interface SecureLink {
  id: string
  token: string
  guardianId: string
  resourceType: string
  resourceId: string
  expiresAt: Date
  accessedAt?: Date
  accessIp?: string
  createdAt: Date
}

export interface CreateSecureLinkInput {
  guardianId: string
  resourceType: string
  resourceId: string
  expiryDays?: number
}

// ============================================
// DISCIPLINE
// ============================================

export interface DisciplineCase {
  id: string
  studentId: string
  reportedBy: string
  incidentDate: Date
  description: string
  type: DisciplineType
  action: DisciplineAction
  actionDuration?: number
  parentNotified: boolean
  parentAcknowledged: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateDisciplineCaseInput {
  studentId: string
  reportedBy: string
  incidentDate: Date
  description: string
  type: DisciplineType
  action: DisciplineAction
  actionDuration?: number
}

// ============================================
// ANNOUNCEMENTS
// ============================================

export interface Announcement {
  id: string
  schoolId: string
  title: string
  content: string
  targetRoles: Role[]
  targetClasses: string[]
  isSchoolWide: boolean
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateAnnouncementInput {
  schoolId: string
  title: string
  content: string
  targetRoles?: Role[]
  targetClasses?: string[]
  isSchoolWide?: boolean
}

// ============================================
// AUDIT
// ============================================

export interface AuditLog {
  id: string
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface CreateAuditLogInput {
  schoolId: string
  userId: string
  action: string
  resource: string
  resourceId: string
  previousValue?: Record<string, unknown>
  newValue?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

// ============================================
// STUDENT DOCUMENTS
// ============================================

export interface StudentDocument {
  id: string
  studentId: string
  name: string
  type: string
  url: string
  metadata?: Record<string, unknown>
  uploadedAt: Date
}

export interface CreateStudentDocumentInput {
  studentId: string
  name: string
  type: string
  url: string
  metadata?: Record<string, unknown>
}

// ============================================
// BULK MESSAGING
// ============================================

import { BulkMessageJobStatus } from './enums'

export interface BulkMessageJob {
  id: string
  schoolId: string
  totalMessages: number
  processedCount: number
  sentCount: number
  failedCount: number
  status: BulkMessageJobStatus
  errorMessage?: string
  estimatedCompletion?: Date
  startedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface BulkMessageItem {
  id: string
  jobId: string
  studentId: string
  templateType: MessageTemplateType
  data: Record<string, unknown>
  priority: 'normal' | 'critical'
  status: MessageStatus
  messageId?: string
  errorMessage?: string
  processedAt?: Date
  createdAt: Date
}

export interface CreateBulkMessageJobInput {
  schoolId: string
  messages: SendMessageParams[]
}

export interface BulkMessageProgress {
  jobId: string
  totalMessages: number
  processedCount: number
  sentCount: number
  failedCount: number
  pendingCount: number
  status: BulkMessageJobStatus
  estimatedCompletion?: Date
  progressPercentage: number
}


// ============================================
// OTP VERIFICATION
// ============================================

export interface OTPVerification {
  id: string
  guardianId: string
  studentId?: string
  schoolId: string
  type: OTPVerificationType
  contact: string
  otpCode: string
  status: OTPVerificationStatus
  expiresAt: Date
  verifiedAt?: Date
  attempts: number
  maxAttempts: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateOTPVerificationInput {
  guardianId: string
  studentId?: string
  schoolId: string
  type: OTPVerificationType
  contact: string
}

export interface VerifyOTPInput {
  guardianId: string
  otpCode: string
  type: OTPVerificationType
}

export interface OTPVerificationResult {
  success: boolean
  verified: boolean
  error?: string
  remainingAttempts?: number
}

export interface UnverifiedContactWarning {
  guardianId: string
  guardianName: string
  contact: string
  contactType: OTPVerificationType
  studentId?: string
  studentName?: string
  timestamp: Date
}

// ============================================
// SMS BUDGET TRACKING
// ============================================

import { SMSBudgetAlertType } from './enums'

export interface SMSBudgetUsage {
  id: string
  schoolId: string
  termId: string
  totalBudget: number
  usedAmount: number
  smsCount: number
  isPaused: boolean
  lastAlertAt?: Date
  alertType?: SMSBudgetAlertType
  createdAt: Date
  updatedAt: Date
}

export interface SMSCostLog {
  id: string
  schoolId: string
  messageId: string
  studentId: string
  cost: number
  recipient: string
  segments: number
  createdAt: Date
}

export interface SMSBudgetAlert {
  id: string
  schoolId: string
  termId: string
  alertType: SMSBudgetAlertType
  usedAmount: number
  budgetLimit: number
  percentage: number
  message: string
  notifiedAt: Date
  acknowledgedAt?: Date
  acknowledgedBy?: string
}

export interface SMSBudgetStatus {
  schoolId: string
  termId: string
  totalBudget: number
  usedAmount: number
  remainingBudget: number
  smsCount: number
  usagePercentage: number
  isPaused: boolean
  projectedTermCost: number
  daysRemaining: number
  averageDailyCost: number
}

export interface CreateSMSBudgetUsageInput {
  schoolId: string
  termId: string
  totalBudget: number
}

export interface LogSMSCostInput {
  schoolId: string
  messageId: string
  studentId: string
  cost: number
  recipient: string
  segments?: number
}

export interface SMSBudgetCheckResult {
  canSend: boolean
  reason?: string
  isPaused: boolean
  usagePercentage: number
  remainingBudget: number
}


// ============================================
// DIRECT MESSAGING (Parent-School Communication)
// Requirements: 36.1, 36.2, 36.3, 36.4, 36.5
// ============================================

import { DirectMessageStatus, ConversationParticipantType } from './enums'

export interface Conversation {
  id: string
  schoolId: string
  studentId: string
  guardianId: string
  staffId?: string
  isOfficial: boolean
  subject?: string
  lastMessageAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface DirectMessage {
  id: string
  conversationId: string
  senderId: string
  senderType: ConversationParticipantType
  content: string
  isOfficial: boolean
  status: DirectMessageStatus
  readAt?: Date
  notificationSent: boolean
  notificationChannel?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateConversationInput {
  schoolId: string
  studentId: string
  guardianId: string
  staffId?: string
  isOfficial?: boolean
  subject?: string
}

export interface SendDirectMessageInput {
  conversationId: string
  senderId: string
  senderType: ConversationParticipantType
  content: string
  isOfficial?: boolean
  sendNotification?: boolean
}

export interface ConversationWithMessages extends Conversation {
  messages: DirectMessage[]
  guardian?: {
    id: string
    firstName: string
    lastName: string
  }
  staff?: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
  student?: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface ConversationSummary {
  id: string
  studentName: string
  participantName: string
  participantType: ConversationParticipantType
  lastMessage?: string
  lastMessageAt: Date
  unreadCount: number
  isOfficial: boolean
}

export interface MessageNotificationResult {
  success: boolean
  channel?: string
  error?: string
}

// ============================================
// STUDENT REPORTS (School-to-Parent Reporting)
// Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
// ============================================

import { StudentReportType, StudentReportStatus } from './enums'

export interface StudentReport {
  id: string
  schoolId: string
  studentId: string
  createdBy: string
  reportType: StudentReportType
  title: string
  content: string
  requiresAcknowledgment: boolean
  status: StudentReportStatus
  notificationChannel?: MessageChannel
  notificationSentAt?: Date
  viewedAt?: Date
  acknowledgedAt?: Date
  parentResponse?: string
  respondedAt?: Date
  meetingRequested: boolean
  meetingRequestedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface CreateStudentReportInput {
  schoolId: string
  studentId: string
  createdBy: string
  reportType: StudentReportType
  title: string
  content: string
  requiresAcknowledgment?: boolean
}

export interface UpdateStudentReportInput {
  title?: string
  content?: string
  requiresAcknowledgment?: boolean
}

export interface StudentReportWithDetails extends StudentReport {
  student: {
    id: string
    firstName: string
    lastName: string
    admissionNumber: string
    classId: string
  }
  creator: {
    id: string
    firstName: string
    lastName: string
    role: string
  }
  guardian?: {
    id: string
    firstName: string
    lastName: string
    preferredChannel: MessageChannel
  }
}

export interface StudentReportSummary {
  studentId: string
  studentName: string
  totalReports: number
  byType: Record<StudentReportType, number>
  byStatus: Record<StudentReportStatus, number>
  recentReports: StudentReport[]
  pendingAcknowledgments: number
}

export interface ParentReportResponse {
  reportId: string
  response: string
  requestMeeting: boolean
}

export interface StudentReportNotificationResult {
  success: boolean
  channel?: MessageChannel
  error?: string
}


// ============================================
// CONSENT MANAGEMENT
// Requirements: 30.1, 30.2, 30.3, 30.4, 30.5
// ============================================

import { ConsentStatus, DataAccessType, DataExportStatus } from './enums'

export interface ConsentRecord {
  id: string
  guardianId: string
  schoolId: string
  status: ConsentStatus
  policyVersion: string
  consentGivenAt?: Date
  consentWithdrawnAt?: Date
  withdrawalReason?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateConsentRecordInput {
  guardianId: string
  schoolId: string
  policyVersion: string
  ipAddress?: string
  userAgent?: string
}

export interface WithdrawConsentInput {
  guardianId: string
  schoolId: string
  reason?: string
  ipAddress?: string
  userAgent?: string
}

export interface PersonalDataAccessLog {
  id: string
  guardianId: string
  schoolId: string
  userId: string
  accessType: DataAccessType
  resourceType: string
  resourceId?: string
  description: string
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

export interface CreatePersonalDataAccessLogInput {
  guardianId: string
  schoolId: string
  userId: string
  accessType: DataAccessType
  resourceType: string
  resourceId?: string
  description: string
  ipAddress?: string
  userAgent?: string
}

export interface DataExportRequest {
  id: string
  guardianId: string
  schoolId: string
  status: DataExportStatus
  requestedAt: Date
  dueBy: Date
  completedAt?: Date
  downloadUrl?: string
  downloadExpiresAt?: Date
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateDataExportRequestInput {
  guardianId: string
  schoolId: string
}

export interface DataExportContent {
  guardian: {
    id: string
    firstName: string
    lastName: string
    phone: string
    email?: string
    relationship: string
    preferredChannel: string
    consentGiven: boolean
    consentDate?: Date
    createdAt: Date
  }
  students: Array<{
    id: string
    admissionNumber: string
    firstName: string
    lastName: string
    dateOfBirth?: Date
    gender?: string
    className: string
    streamName?: string
    enrollmentDate: Date
    status: string
  }>
  attendance: Array<{
    studentName: string
    date: Date
    period: number
    status: string
    remarks?: string
  }>
  results: Array<{
    studentName: string
    termName: string
    totalMarks: number
    average: number
    position: number
    grade?: string
  }>
  payments: Array<{
    studentName: string
    termName: string
    amount: number
    method: string
    reference: string
    receiptNumber: string
    receivedAt: Date
  }>
  messages: Array<{
    studentName: string
    channel: string
    content: string
    status: string
    sentAt?: Date
  }>
  disciplineCases: Array<{
    studentName: string
    incidentDate: Date
    description: string
    type: string
    action: string
  }>
  exportedAt: Date
  policyVersion: string
}

export interface ConsentFormData {
  policyVersion: string
  policyText: string
  dataProcessingPurposes: string[]
  communicationTypes: string[]
  dataRetentionPeriod: string
  thirdPartySharing: string[]
  guardianRights: string[]
}

export interface ConsentCheckResult {
  hasConsent: boolean
  consentRecord?: ConsentRecord
  canReceiveEssentialCommunications: boolean
  canReceiveNonEssentialCommunications: boolean
}


// ============================================
// SCHOOL SUBSCRIPTION MANAGEMENT
// Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
// ============================================

export type SubscriptionStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'GRACE_PERIOD' | 'SUSPENDED'

export interface SchoolSubscription {
  id: string
  schoolId: string
  termId: string
  amountDue: number
  amountPaid: number
  dueDate: Date
  paidDate?: Date
  status: SubscriptionStatus
  gracePeriodEnds?: Date
  createdAt: Date
  updatedAt: Date
}

export interface SubscriptionPayment {
  id: string
  subscriptionId: string
  schoolId: string
  amount: number
  method: PaymentMethod
  reference: string
  recordedBy: string
  recordedAt: Date
  createdAt: Date
}

export interface SchoolSubscriptionWithDetails {
  id: string
  schoolId: string
  schoolName: string
  schoolCode: string
  termId: string
  termName: string
  studentCount: number
  amountPerStudent: number
  totalBill: number
  amountPaid: number
  outstandingBalance: number
  status: SubscriptionStatus
  dueDate: Date
  gracePeriodEnds?: Date
  paymentHistory: SubscriptionPayment[]
}

export interface CreateSubscriptionPaymentInput {
  schoolId: string
  amount: number
  method: PaymentMethod
  reference: string
  recordedBy: string
}

export interface SystemRules {
  id: string
  gracePeriodDays: number
  featureLockOrder: string[]
  pilotStudentLimit: number
  pilotSmsLimit: number
  pilotDurationDays: number
  updatedAt: Date
  updatedBy: string
}


// ============================================
// COMMUNICATION SYSTEM TYPES
// Requirements: 4.1, 5.1-5.8, 6.1, 11.4, 12.1, 14.1-14.6, 16.1-16.6, 17.1-17.5
// ============================================

// ============================================
// IN-APP NOTIFICATIONS - Requirements 4.1-4.5
// ============================================

export interface InAppNotification {
  id: string
  userId: string
  schoolId: string
  type: NotificationType
  title: string
  content: string
  priority: NotificationPriority
  isRead: boolean
  readAt?: Date
  actionUrl?: string
  metadata?: Record<string, unknown>
  createdAt: Date
}

export interface CreateNotificationParams {
  userId: string
  schoolId: string
  type: NotificationType
  title: string
  content: string
  priority?: NotificationPriority
  actionUrl?: string
  metadata?: Record<string, unknown>
}

export interface NotificationOptions {
  limit?: number
  offset?: number
  unreadOnly?: boolean
  type?: NotificationType
}

export interface NotificationList {
  notifications: InAppNotification[]
  total: number
  unreadCount: number
}

// ============================================
// TARGETING - Requirements 5.1-5.8
// ============================================

export interface TargetCriteria {
  classIds?: string[]
  streamIds?: string[]
  feeThreshold?: number
  attendanceThreshold?: number
  staffRoles?: Role[]
  dormitoryIds?: string[]
  busRouteIds?: string[]
  studentIds?: string[]
  guardianIds?: string[]
  customFilter?: CustomFilter
  combineLogic?: 'AND' | 'OR'
}

export interface CustomFilter {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains'
  value: unknown
}

export interface Recipient {
  id: string
  type: RecipientType
  studentId?: string
  name: string
  phone?: string
  email?: string
  preferredChannel: MessageChannel
}

export interface TargetingParams {
  schoolId: string
  targetType: TargetType
  criteria: TargetCriteria
}

export interface TargetingValidation {
  isValid: boolean
  recipientCount: number
  errors?: string[]
  warnings?: string[]
}

// ============================================
// AUTOMATION - Requirements 11.1-11.5
// ============================================

export interface AutomationRule {
  id: string
  schoolId: string
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  targetType: string
  targetCriteria: TargetCriteria
  templateId?: string
  channel: MessageChannel
  isActive: boolean
  lastExecutedAt?: Date
  executionCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TriggerConfig {
  cronExpression?: string
  scheduledDates?: Date[]
  eventConditions?: EventCondition[]
  delayMinutes?: number
}

export interface EventCondition {
  field: string
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte'
  value: unknown
}

export interface AutomationExecution {
  id: string
  ruleId: string
  triggeredAt: Date
  completedAt?: Date
  status: ExecutionStatus
  recipientCount: number
  successCount: number
  failureCount: number
  errorMessage?: string
}

export interface CreateAutomationRuleInput {
  schoolId: string
  name: string
  description?: string
  triggerType: TriggerType
  triggerConfig: TriggerConfig
  targetType: string
  targetCriteria: TargetCriteria
  templateId?: string
  channel: MessageChannel
  createdBy: string
}

export interface AutomationExecutionResult {
  executionId: string
  status: ExecutionStatus
  recipientCount: number
  successCount: number
  failureCount: number
  errors?: string[]
}

// ============================================
// MESSAGE LOGGING - Requirements 12.1-12.5
// ============================================

export interface CommunicationLog {
  id: string
  schoolId: string
  messageId: string
  senderId: string
  senderRole: Role
  channel: MessageChannel
  recipientId: string
  recipientType: RecipientType
  recipientContact: string
  content: string
  templateId?: string
  status: DeliveryStatus
  statusReason?: string
  cost?: number
  externalMessageId?: string
  fallbackAttempts?: FallbackAttempt[]
  metadata?: Record<string, unknown>
  statusHistory: StatusHistoryEntry[]
  createdAt: Date
  updatedAt: Date
}

export interface MessageLogEntry {
  schoolId: string
  messageId: string
  senderId: string
  senderRole: Role
  channel: MessageChannel
  recipientId: string
  recipientType: RecipientType
  recipientContact: string
  content: string
  templateId?: string
  status: DeliveryStatus
  statusReason?: string
  cost?: number
  externalMessageId?: string
  metadata?: Record<string, unknown>
}

export interface StatusHistoryEntry {
  status: DeliveryStatus
  reason?: string
  timestamp: Date
}

export interface MessageLogQuery {
  schoolId: string
  dateFrom?: Date
  dateTo?: Date
  channel?: MessageChannel
  status?: DeliveryStatus
  senderId?: string
  recipientId?: string
  limit?: number
  offset?: number
}

export interface MessageLogResult {
  logs: CommunicationLog[]
  total: number
}

export interface DeliveryProof {
  messageId: string
  channel: MessageChannel
  recipientContact: string
  content: string
  statusHistory: StatusHistoryEntry[]
  finalStatus: DeliveryStatus
  createdAt: Date
  generatedAt: Date
}

// ============================================
// ENHANCED ANNOUNCEMENTS - Requirements 6.1-6.5
// ============================================

export interface EnhancedAnnouncement {
  id: string
  schoolId: string
  title: string
  content: string
  targetType: string
  targetCriteria: TargetCriteria
  channels: MessageChannel[]
  isPinned: boolean
  pinnedUntil?: Date
  scheduledAt?: Date
  publishedAt?: Date
  expiresAt?: Date
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface AnnouncementDelivery {
  id: string
  announcementId: string
  recipientId: string
  recipientType: RecipientType
  channel: MessageChannel
  status: DeliveryStatus
  deliveredAt?: Date
  readAt?: Date
  createdAt: Date
}

export interface CreateEnhancedAnnouncementInput {
  schoolId: string
  title: string
  content: string
  targetType: string
  targetCriteria: TargetCriteria
  channels: MessageChannel[]
  isPinned?: boolean
  pinnedUntil?: Date
  scheduledAt?: Date
  expiresAt?: Date
  createdBy: string
}

// ============================================
// FALLBACK CONFIGURATION - Requirements 17.1-17.5
// ============================================

export interface FallbackConfig {
  id: string
  schoolId: string
  enabled: boolean
  fallbackOrder: MessageChannel[]
  maxAttempts: number
  retryDelayMinutes: number
  createdAt: Date
  updatedAt: Date
}

export interface FallbackParams {
  primaryChannel: MessageChannel
  recipientHasWhatsApp: boolean
  recipientHasEmail: boolean
  recipientHasPhone: boolean
  messageType: MessageType
}

export interface FallbackAttempt {
  channel: MessageChannel
  success: boolean
  error?: string
  timestamp: Date
}

export interface FallbackResult {
  success: boolean
  finalChannel?: MessageChannel
  attempts: FallbackAttempt[]
}

// ============================================
// COMMUNICATION PERMISSIONS - Requirements 14.1-14.6
// ============================================

export interface PermissionCheckParams {
  userId: string
  userRole: Role
  schoolId: string
  action: 'SEND' | 'SEND_BULK' | 'SEND_EMERGENCY' | 'VIEW_LOGS'
  targetType?: TargetType
  messageType?: MessageType
  channel?: MessageChannel
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
  restrictions?: PermissionRestriction[]
}

export interface PermissionRestriction {
  type: 'TARGET_LIMIT' | 'CHANNEL_LIMIT' | 'MESSAGE_TYPE_LIMIT'
  allowedValues: string[]
}

export interface PermissionCheckLog {
  userId: string
  userRole: Role
  action: string
  target?: string
  result: boolean
  reason?: string
  timestamp: Date
}

// ============================================
// CONTACT MANAGEMENT - Requirements 16.1-16.6
// ============================================

export interface StudentContacts {
  studentId: string
  guardians: GuardianContact[]
  primaryGuardian?: GuardianContact
}

export interface GuardianContact {
  guardianId: string
  name: string
  phone?: string
  phoneVerified: boolean
  email?: string
  emailVerified: boolean
  preferredChannel: MessageChannel
  isPrimary: boolean
}

export interface ContactValidation {
  valid: boolean
  formatted?: string
  error?: string
  suggestions?: string[]
}

export interface DuplicateReport {
  schoolId: string
  duplicates: {
    contact: string
    type: 'phone' | 'email'
    guardianIds: string[]
  }[]
}

export interface MissingContactReport {
  schoolId: string
  studentsWithoutGuardians: string[]
  guardiansWithoutPhone: string[]
  guardiansWithoutEmail: string[]
}

// ============================================
// MESSAGE ORCHESTRATOR - Requirements 1.1-1.6, 7.1-7.5
// ============================================

export interface SendMessageRequest {
  schoolId: string
  targetType: TargetType
  targetCriteria: TargetCriteria
  templateId?: string
  customContent?: string
  channel?: MessageChannel
  priority: 'normal' | 'high' | 'critical'
  scheduledAt?: Date
  attachments?: Attachment[]
  senderId: string
}

export interface BulkMessageRequest extends SendMessageRequest {
  batchSize?: number
  rateLimit?: number
}

export interface EmergencyAlertRequest {
  schoolId: string
  content: string
  channels: MessageChannel[]
  senderId: string
}

export interface Attachment {
  filename: string
  content: Buffer
  contentType: string
}

export interface MessageOrchestratorResult {
  messageId: string
  status: DeliveryStatus
  channel: MessageChannel
  error?: string
}

export interface BulkMessageResult {
  jobId: string
  totalRecipients: number
  queued: number
  errors: string[]
}

export interface EmergencyAlertResult {
  alertId: string
  channelResults: {
    channel: MessageChannel
    sent: number
    failed: number
  }[]
}

export interface DeliveryReportParams {
  schoolId: string
  dateFrom: Date
  dateTo: Date
  channel?: MessageChannel
  status?: DeliveryStatus
}

export interface CommunicationDeliveryReport {
  schoolId: string
  dateRange: { start: Date; end: Date }
  totalSent: number
  delivered: number
  failed: number
  read: number
  byChannel: Record<string, { sent: number; delivered: number; failed: number; read: number }>
  byStatus: Record<DeliveryStatus, number>
}


// ============================================
// GUARDIAN FINANCIAL SUMMARY - Requirements 4.4, 4.5
// ============================================

/**
 * Financial summary for a guardian across all financially-linked students
 * Requirement 4.4: Display total fee balance across all linked students
 * Requirement 4.5: Display payment history for all financially-linked students
 */
export interface GuardianFinancialSummary {
  guardianId: string
  totalBalance: number
  students: GuardianStudentFinancialInfo[]
  paymentHistory: Payment[]
}

/**
 * Per-student financial information for a guardian
 */
export interface GuardianStudentFinancialInfo {
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  balance: number
  totalFees: number
  totalPaid: number
  lastPaymentDate?: Date
  lastPaymentAmount?: number
}


// ============================================
// GUARDIAN COMMUNICATION HISTORY - Requirements 3.1, 3.5
// ============================================

/**
 * Communication history entry for a guardian
 * Requirement 3.1: Display message history including channel used, delivery status, and timestamp
 */
export interface GuardianCommunicationHistoryEntry {
  id: string
  studentId: string
  studentName: string
  channel: MessageChannel
  content: string
  status: MessageStatus
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  createdAt: Date
}

/**
 * Guardian communication history result
 * Requirement 3.1, 3.5: Display message history and last contact date
 */
export interface GuardianCommunicationHistory {
  guardianId: string
  lastContactDate?: Date
  messages: GuardianCommunicationHistoryEntry[]
  totalCount: number
}

/**
 * Options for querying guardian communication history
 */
export interface GuardianCommunicationHistoryOptions {
  limit?: number
  offset?: number
  channel?: MessageChannel
  status?: MessageStatus
  startDate?: Date
  endDate?: Date
}

/**
 * Result of sending a message to a guardian
 * Requirement 3.2: Use guardian's preferred channel when sending messages
 */
export interface GuardianMessageResult {
  success: boolean
  messageId?: string
  channel: MessageChannel
  error?: string
  blockedReason?: string
}

/**
 * Message priority for guardian communication
 * Requirement 3.3: Allow critical messages to bypass opt-out
 * Requirement 6.3: Allow emergency messages to blocked guardians
 */
export type MessagePriority = 'normal' | 'critical' | 'emergency'

// ============================================
// GUARDIAN PORTAL ACCESS
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
// ============================================

/**
 * Guardian Portal Access entity
 * Requirement 5.1: Enable/disable portal access per guardian
 * Requirement 5.2: Configure visible modules
 */
export interface GuardianPortalAccess {
  id: string
  guardianId: string
  isEnabled: boolean
  canViewAttendance: boolean
  canViewResults: boolean
  canViewFees: boolean
  canDownloadReports: boolean
  passwordHash?: string
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

/**
 * Input for creating guardian portal access
 */
export interface CreateGuardianPortalAccessInput {
  guardianId: string
  isEnabled?: boolean
  canViewAttendance?: boolean
  canViewResults?: boolean
  canViewFees?: boolean
  canDownloadReports?: boolean
  password?: string
}

/**
 * Input for updating guardian portal access
 * Requirement 5.1: Enable/disable portal access
 * Requirement 5.2: Configure visible modules
 */
export interface UpdateGuardianPortalAccessInput {
  isEnabled?: boolean
  canViewAttendance?: boolean
  canViewResults?: boolean
  canViewFees?: boolean
  canDownloadReports?: boolean
  password?: string
}

/**
 * Password reset token for guardian portal
 * Requirement 5.3: Password reset functionality
 */
export interface GuardianPasswordResetToken {
  id: string
  guardianId: string
  token: string
  expiresAt: Date
  usedAt?: Date
  createdAt: Date
}

/**
 * Result of password reset request
 * Requirement 5.3: Password reset functionality
 */
export interface GuardianPasswordResetResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * Guardian portal session
 * Requirement 5.4: Session management for revocation
 */
export interface GuardianPortalSession {
  id: string
  guardianId: string
  token: string
  expiresAt: Date
  createdAt: Date
  lastActivityAt: Date
  ipAddress?: string
  userAgent?: string
}


// ============================================
// GUARDIAN DOCUMENT MANAGEMENT
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
// ============================================

/**
 * Guardian Document entity
 * Requirement 7.1: Allow uploading documents to guardian profiles
 * Requirement 7.2: Support document types: Consent Forms, Agreements, Legal Letters, ID Copies
 * Requirement 7.3: Record upload date, uploader, and document type
 */
export interface GuardianDocument {
  id: string
  guardianId: string
  documentType: GuardianDocumentType
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  uploadedAt: Date
}

/**
 * Input for uploading a guardian document
 * Requirement 7.1: Allow uploading documents to guardian profiles
 * Requirement 7.3: Record upload date, uploader, and document type
 */
export interface UploadGuardianDocumentInput {
  guardianId: string
  documentType: GuardianDocumentType
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
}

/**
 * Options for querying guardian documents
 * Requirement 7.4: Allow downloading and viewing attached documents
 */
export interface GuardianDocumentQueryOptions {
  documentType?: GuardianDocumentType
  limit?: number
  offset?: number
}

/**
 * Result of document upload operation
 */
export interface GuardianDocumentUploadResult {
  success: boolean
  document?: GuardianDocument
  error?: string
}

/**
 * File restriction configuration
 * Requirement 7.5: Enforce file type and size restrictions
 */
export interface FileRestrictionConfig {
  allowedMimeTypes: string[]
  maxFileSizeBytes: number
}

/**
 * File validation result
 * Requirement 7.5: Enforce file type and size restrictions
 */
export interface FileValidationResult {
  isValid: boolean
  errors: string[]
}


// ============================================
// GUARDIAN DATA QUALITY
// Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
// ============================================

/**
 * Data quality issue types
 * Requirement 8.1: Detect potential duplicate guardians
 * Requirement 8.3: Validate phone numbers against expected formats
 * Requirement 8.4: Flag guardian profiles with missing critical contact information
 */
export type DataQualityIssueType = 'MISSING' | 'INVALID' | 'DUPLICATE'

/**
 * Data quality issue severity
 */
export type DataQualityIssueSeverity = 'WARNING' | 'ERROR'

/**
 * Individual data quality issue
 * Requirement 8.4: Flag guardian profiles with missing critical contact information
 * Requirement 8.5: Display data quality indicators
 */
export interface DataQualityIssue {
  field: string
  issue: DataQualityIssueType
  message: string
  severity: DataQualityIssueSeverity
}

/**
 * Data quality result for a guardian
 * Requirement 8.5: Display data quality indicators
 */
export interface GuardianDataQualityResult {
  guardianId: string
  issues: DataQualityIssue[]
  score: number
}

/**
 * Potential duplicate guardian match
 * Requirement 8.1: Detect potential duplicate guardians based on phone number and name similarity
 * Requirement 8.2: Suggest merge options to administrators
 */
export interface DuplicateGuardianMatch {
  guardianId: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  matchType: 'PHONE_EXACT' | 'NAME_SIMILAR' | 'PHONE_AND_NAME'
  similarityScore: number
}

/**
 * Duplicate detection result
 * Requirement 8.1: Detect potential duplicate guardians
 * Requirement 8.2: Suggest merge options
 */
export interface DuplicateDetectionResult {
  sourceGuardianId: string
  potentialDuplicates: DuplicateGuardianMatch[]
  hasDuplicates: boolean
}

/**
 * Merge suggestion for duplicate guardians
 * Requirement 8.2: Suggest merge options to administrators
 */
export interface GuardianMergeSuggestion {
  primaryGuardianId: string
  duplicateGuardianId: string
  conflictingFields: string[]
  suggestedValues: Record<string, unknown>
  linkedStudentsMerge: {
    studentId: string
    studentName: string
    currentGuardianId: string
    action: 'KEEP' | 'TRANSFER' | 'DUPLICATE'
  }[]
}

/**
 * Options for duplicate detection
 */
export interface DuplicateDetectionOptions {
  phoneMatchOnly?: boolean
  nameMatchOnly?: boolean
  minNameSimilarity?: number
  excludeGuardianIds?: string[]
}

/**
 * Guardian data quality summary for a school
 * Requirement 8.5: Display data quality indicators
 */
export interface SchoolGuardianDataQualitySummary {
  schoolId: string
  totalGuardians: number
  guardiansWithIssues: number
  issuesByType: Record<DataQualityIssueType, number>
  issuesBySeverity: Record<DataQualityIssueSeverity, number>
  averageQualityScore: number
  potentialDuplicateCount: number
}
