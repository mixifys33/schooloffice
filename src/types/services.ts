/**
 * Service Interface Definitions for SchoolOffice
 * These interfaces define the contracts for all domain services
 */

import {
  School,
  CreateSchoolInput,
  UpdateSchoolInput,
  User,
  CreateUserInput,
  UserSession,
  AcademicYear,
  CreateAcademicYearInput,
  Term,
  CreateTermInput,
  Class,
  CreateClassInput,
  Stream,
  CreateStreamInput,
  Subject,
  CreateSubjectInput,
  GradingSystem,
  CreateGradingSystemInput,
  Student,
  CreateStudentInput,
  UpdateStudentInput,
  Guardian,
  CreateGuardianInput,
  StudentGuardian,
  Staff,
  CreateStaffInput,
  Attendance,
  CreateAttendanceInput,
  AttendanceRecord,
  AbsenceStatus,
  TimetableEntry,
  CreateTimetableEntryInput,
  Exam,
  CreateExamInput,
  Mark,
  CreateMarkInput,
  MarkEntry,
  Result,
  FeeStructure,
  CreateFeeStructureInput,
  Payment,
  CreatePaymentInput,
  StudentBalance,
  Message,
  SendMessageParams,
  MessageResult,
  MessageTemplate,
  SecureLink,
  CreateSecureLinkInput,
  DisciplineCase,
  CreateDisciplineCaseInput,
  Announcement,
  CreateAnnouncementInput,
  AuditLog,
  CreateAuditLogInput,
  FeatureFlags,
} from './entities'
import { Role, MessageChannel } from './enums'

// ============================================
// SCHOOL SERVICE
// ============================================

export interface ISchoolService {
  createSchool(data: CreateSchoolInput): Promise<School>
  getSchoolById(id: string): Promise<School | null>
  getSchoolByCode(code: string): Promise<School | null>
  updateSchool(id: string, data: UpdateSchoolInput): Promise<School>
  activateSchool(id: string): Promise<School>
  deactivateSchool(id: string): Promise<School>
  assignLicense(id: string, licenseType: School['licenseType']): Promise<School>
  updateFeatureFlags(id: string, features: Partial<FeatureFlags>): Promise<School>
  getAllSchools(): Promise<School[]>
}

// ============================================
// AUTHENTICATION SERVICE
// ============================================

export interface IAuthService {
  login(email: string, password: string): Promise<UserSession | null>
  logout(userId: string): Promise<void>
  validateSession(token: string): Promise<UserSession | null>
  createUser(data: CreateUserInput): Promise<User>
  changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean>
  resetPassword(email: string): Promise<void>
}

// ============================================
// RBAC SERVICE
// ============================================

export interface Permission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete')[]
  scope: 'own' | 'class' | 'school' | 'all'
}

export interface IRBACService {
  hasPermission(userId: string, resource: string, action: string): Promise<boolean>
  getPermissionsForRole(role: Role): Permission[]
  checkDataOwnership(userId: string, resourceType: string, resourceId: string): Promise<boolean>
  filterByOwnership<T extends { schoolId?: string }>(
    userId: string,
    data: T[]
  ): Promise<T[]>
}

// ============================================
// ACADEMIC SERVICE
// ============================================

export interface IAcademicService {
  // Academic Year
  createAcademicYear(data: CreateAcademicYearInput): Promise<AcademicYear>
  getActiveYear(schoolId: string): Promise<AcademicYear | null>
  getAcademicYearById(id: string): Promise<AcademicYear | null>
  activateYear(id: string): Promise<AcademicYear>
  deactivateYear(id: string): Promise<AcademicYear>

  // Terms
  createTerm(data: CreateTermInput): Promise<Term>
  getTermById(id: string): Promise<Term | null>
  getTermsByYear(academicYearId: string): Promise<Term[]>
  validateTermDates(academicYearId: string, startDate: Date, endDate: Date, excludeTermId?: string): boolean
  getCurrentTermWeek(termId: string): Promise<number>

  // Classes & Streams
  createClass(data: CreateClassInput): Promise<Class>
  getClassById(id: string): Promise<Class | null>
  getClassesBySchool(schoolId: string): Promise<Class[]>
  createStream(data: CreateStreamInput): Promise<Stream>
  getStreamsByClass(classId: string): Promise<Stream[]>
  assignSubjectsToClass(classId: string, subjectIds: string[]): Promise<void>

  // Subjects
  createSubject(data: CreateSubjectInput): Promise<Subject>
  getSubjectById(id: string): Promise<Subject | null>
  getSubjectsBySchool(schoolId: string): Promise<Subject[]>
  assignGradingSystem(subjectId: string, gradingSystemId: string): Promise<Subject>

  // Grading Systems
  createGradingSystem(data: CreateGradingSystemInput): Promise<GradingSystem>
  getGradingSystemById(id: string): Promise<GradingSystem | null>
  getGradingSystemsBySchool(schoolId: string): Promise<GradingSystem[]>
}

// ============================================
// STUDENT SERVICE
// ============================================

export interface IStudentService {
  enrollStudent(data: CreateStudentInput): Promise<Student>
  getStudentById(id: string): Promise<Student | null>
  getStudentByAdmissionNumber(schoolId: string, admissionNumber: string): Promise<Student | null>
  getStudentsBySchool(schoolId: string): Promise<Student[]>
  getStudentsByClass(classId: string): Promise<Student[]>
  updateStudent(id: string, data: UpdateStudentInput): Promise<Student>
  transferStudent(id: string): Promise<Student>
  graduateStudent(id: string): Promise<Student>
  suspendStudent(id: string): Promise<Student>
  reactivateStudent(id: string): Promise<Student>
}

// ============================================
// GUARDIAN SERVICE
// ============================================

export interface IGuardianService {
  createGuardian(data: CreateGuardianInput): Promise<Guardian>
  getGuardianById(id: string): Promise<Guardian | null>
  linkGuardianToStudent(studentId: string, guardianId: string, isPrimary: boolean): Promise<StudentGuardian>
  getGuardiansByStudent(studentId: string): Promise<Guardian[]>
  getPrimaryGuardian(studentId: string): Promise<Guardian | null>
  updateGuardian(id: string, data: Partial<CreateGuardianInput>): Promise<Guardian>
  verifyPhone(guardianId: string, otp: string): Promise<boolean>
  verifyEmail(guardianId: string, otp: string): Promise<boolean>
}

// ============================================
// STAFF SERVICE
// ============================================

export interface IStaffService {
  createStaff(data: CreateStaffInput): Promise<Staff>
  getStaffById(id: string): Promise<Staff | null>
  getStaffBySchool(schoolId: string): Promise<Staff[]>
  assignSubjectToStaff(staffId: string, subjectId: string): Promise<void>
  assignClassToStaff(staffId: string, classId: string): Promise<void>
  getStaffSubjects(staffId: string): Promise<Subject[]>
  getStaffClasses(staffId: string): Promise<Class[]>
  deactivateStaff(id: string): Promise<Staff>
  reactivateStaff(id: string): Promise<Staff>
}

// ============================================
// ATTENDANCE SERVICE
// ============================================

export interface ClassAttendanceStats {
  classId: string
  date: Date
  totalStudents: number
  present: number
  absent: number
  late: number
  attendancePercentage: number
}

export interface AttendanceHistory {
  studentId: string
  termId: string
  records: Attendance[]
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendancePercentage: number
  }
}

export interface AbsencePattern {
  studentId: string
  pattern: string
  frequency: number
  lastOccurrence: Date
}

export interface RealTimeAttendanceData {
  schoolId: string
  date: Date
  classes: ClassAttendanceStats[]
  absentStudents: {
    studentId: string
    studentName: string
    classId: string
    guardianContactStatus: 'verified' | 'unverified' | 'none'
  }[]
}

export interface IAttendanceService {
  recordAttendance(classId: string, date: Date, records: AttendanceRecord[], recordedBy: string): Promise<void>
  getAttendanceByClass(classId: string, date: Date): Promise<Attendance[]>
  getAttendanceByStudent(studentId: string, termId: string): Promise<Attendance[]>
  checkDailyAbsence(studentId: string, date: Date): Promise<AbsenceStatus>
  triggerAbsenceAlert(studentId: string, date: Date, periodsAbsent: number[]): Promise<void>
  getClassAttendance(classId: string, date: Date): Promise<ClassAttendanceStats>
  getStudentAttendanceHistory(studentId: string, termId: string): Promise<AttendanceHistory>
  detectAbsencePatterns(studentId: string): Promise<AbsencePattern[]>
  getRealTimeAttendance(schoolId: string): Promise<RealTimeAttendanceData>
}

// ============================================
// TIMETABLE SERVICE
// ============================================

export interface TimetableConflict {
  type: 'teacher' | 'room'
  existingEntry: TimetableEntry
  conflictingEntry: CreateTimetableEntryInput
}

/**
 * Extended timetable entry with subject and class details for teacher schedule views
 * Requirement 6.4: Display only assigned periods and rooms for teachers
 */
export interface TeacherScheduleEntry {
  id: string
  dayOfWeek: number
  period: number
  room?: string
  subject: {
    id: string
    name: string
    code: string
  }
  class: {
    id: string
    name: string
    level: number
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Weekly schedule organized by day for teacher view
 */
export interface TeacherWeeklySchedule {
  staffId: string
  staffName: string
  schedule: {
    [dayOfWeek: number]: TeacherScheduleEntry[]
  }
  totalPeriods: number
}

export interface ITimetableService {
  createEntry(data: CreateTimetableEntryInput): Promise<TimetableEntry>
  getEntriesByClass(classId: string): Promise<TimetableEntry[]>
  getEntriesByTeacher(staffId: string): Promise<TimetableEntry[]>
  checkConflicts(data: CreateTimetableEntryInput): Promise<TimetableConflict[]>
  deleteEntry(id: string): Promise<void>
  publishTimetable(classId: string): Promise<void>
  // Teacher schedule view methods (Requirement 6.4)
  getTeacherScheduleWithDetails(staffId: string): Promise<TeacherScheduleEntry[]>
  getTeacherWeeklySchedule(staffId: string): Promise<TeacherWeeklySchedule>
  getTeacherDailyScheduleWithDetails(staffId: string, dayOfWeek: number): Promise<TeacherScheduleEntry[]>
  getTeacherFreePeriods(staffId: string, dayOfWeek: number): Promise<number[]>
  isTeacherAvailable(staffId: string, dayOfWeek: number, period: number): Promise<boolean>
}

// ============================================
// EXAMINATION SERVICE
// ============================================

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ProcessingResult {
  examId: string
  studentsProcessed: number
  errors: string[]
}

export interface IExaminationService {
  createExam(data: CreateExamInput): Promise<Exam>
  getExamById(id: string): Promise<Exam | null>
  getExamsByTerm(termId: string): Promise<Exam[]>
  openExam(id: string): Promise<Exam>
  closeExam(id: string): Promise<Exam>
  enterMarks(examId: string, subjectId: string, marks: MarkEntry[], enteredBy: string): Promise<void>
  validateMarksEntry(teacherId: string, examId: string, subjectId: string): Promise<ValidationResult>
  getMarksByExam(examId: string): Promise<Mark[]>
  getMarksByStudent(studentId: string, examId: string): Promise<Mark[]>
}

// ============================================
// RESULTS SERVICE
// ============================================

export interface IResultsService {
  processResults(examId: string): Promise<ProcessingResult>
  calculatePositions(classId: string, examId: string): Promise<void>
  getResultsByStudent(studentId: string, termId: string): Promise<Result | null>
  getResultsByClass(classId: string, termId: string): Promise<Result[]>
  generateReportCard(studentId: string, termId: string): Promise<Buffer>
  publishReportCards(classId: string, termId: string): Promise<void>
}

// ============================================
// FINANCE SERVICE
// ============================================

export interface DailyCollectionReport {
  date: Date
  schoolId: string
  payments: Payment[]
  totalAmount: number
  byMethod: Record<string, number>
}

export interface TermFinancialSummary {
  termId: string
  schoolId: string
  expectedFees: number
  collectedAmount: number
  outstandingBalance: number
  byClass: {
    classId: string
    className: string
    expected: number
    collected: number
    outstanding: number
  }[]
}

export interface StudentArrears {
  studentId: string
  studentName: string
  classId: string
  totalArrears: number
  lastPaymentDate?: Date
}

export interface IFinanceService {
  configureFeeStructure(data: CreateFeeStructureInput): Promise<FeeStructure>
  getFeeStructure(classId: string, termId: string): Promise<FeeStructure | null>
  applyDiscount(studentId: string, discountType: string, amount: number): Promise<void>
  recordPayment(data: CreatePaymentInput): Promise<Payment>
  getPaymentsByStudent(studentId: string, termId: string): Promise<Payment[]>
  calculateBalance(studentId: string, termId: string): Promise<StudentBalance>
  getStudentsWithArrears(schoolId: string, minAmount?: number): Promise<StudentArrears[]>
  generateReceipt(paymentId: string): Promise<Buffer>
  getDailyCollections(schoolId: string, date: Date): Promise<DailyCollectionReport>
  getTermSummary(schoolId: string, termId: string): Promise<TermFinancialSummary>
}

// ============================================
// COMMUNICATION SERVICE
// ============================================

export interface SMSResult {
  messageId: string
  status: 'sent' | 'failed'
  cost?: number
  error?: string
}

export interface WhatsAppResult {
  messageId: string
  status: 'sent' | 'failed'
  error?: string
}

export interface EmailResult {
  messageId: string
  status: 'sent' | 'failed'
  error?: string
}

export interface BulkMessageStatus {
  jobId: string
  totalMessages: number
  sent: number
  failed: number
  pending: number
  estimatedCompletion?: Date
}

export interface DeliveryReport {
  schoolId: string
  dateRange: { start: Date; end: Date }
  totalSent: number
  delivered: number
  failed: number
  read: number
  byChannel: Record<MessageChannel, { sent: number; delivered: number; failed: number }>
}

export interface ICommunicationService {
  sendMessage(params: SendMessageParams): Promise<MessageResult>
  sendSMS(recipient: string, content: string, studentId: string): Promise<SMSResult>
  sendWhatsApp(recipient: string, content: string, attachment?: Buffer): Promise<WhatsAppResult>
  sendEmail(recipient: string, subject: string, html: string, attachments?: { filename: string; content: Buffer }[]): Promise<EmailResult>
  queueBulkMessages(messages: SendMessageParams[]): Promise<string>
  getBulkMessageStatus(jobId: string): Promise<BulkMessageStatus>
  updateDeliveryStatus(messageId: string, status: Message['status']): Promise<void>
  getDeliveryReport(schoolId: string, dateRange: { start: Date; end: Date }): Promise<DeliveryReport>
  resetTermSMSCounters(schoolId: string): Promise<void>
}

// ============================================
// MESSAGE TEMPLATE SERVICE
// ============================================

export interface IMessageTemplateService {
  createTemplate(data: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<MessageTemplate>
  getTemplateById(id: string): Promise<MessageTemplate | null>
  getTemplatesBySchool(schoolId: string): Promise<MessageTemplate[]>
  getTemplateByType(schoolId: string, type: MessageTemplate['type'], channel: MessageChannel): Promise<MessageTemplate | null>
  updateTemplate(id: string, data: Partial<MessageTemplate>): Promise<MessageTemplate>
  deleteTemplate(id: string): Promise<void>
  renderTemplate(template: MessageTemplate, data: Record<string, unknown>): string
}

// ============================================
// SECURE LINK SERVICE
// ============================================

/**
 * Link access error for validation failures
 * Requirement 27.4: Display error message and prompt login
 */
export interface LinkAccessError {
  code: 'INVALID_TOKEN_FORMAT' | 'LINK_NOT_FOUND' | 'LINK_EXPIRED' | 'INVALID_RESOURCE_TYPE'
  message: string
  shouldPromptLogin: boolean
}

/**
 * Result of a link access validation attempt
 * Requirement 27.3, 27.4: Verify token validity and reject expired/invalid links
 */
export interface LinkAccessResult {
  success: boolean
  link?: SecureLink
  error?: LinkAccessError
}

export interface ISecureLinkService {
  createLink(data: CreateSecureLinkInput): Promise<SecureLink>
  validateLink(token: string): Promise<{ isValid: boolean; link?: SecureLink; error?: string }>
  recordAccess(token: string, ipAddress: string, userAgent?: string): Promise<void>
  revokeLink(id: string): Promise<void>
  getExpiredLinks(schoolId: string): Promise<SecureLink[]>
  // New methods for comprehensive link access validation (Requirements 27.3, 27.4, 27.5)
  validateAndAccessLink(token: string, ipAddress: string, userAgent?: string): Promise<LinkAccessResult>
  accessResource(token: string, expectedResourceType: string, ipAddress: string, userAgent?: string): Promise<LinkAccessResult>
  hasBeenAccessed(token: string): Promise<boolean>
}

// ============================================
// AUDIT SERVICE
// ============================================

export interface AuditLogFilter {
  schoolId?: string
  userId?: string
  resource?: string
  action?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface IAuditService {
  log(data: CreateAuditLogInput): Promise<AuditLog>
  getAuditLogs(filter: AuditLogFilter, limit?: number, offset?: number): Promise<AuditLog[]>
  getAuditLogsByResource(resource: string, resourceId: string): Promise<AuditLog[]>
}

// ============================================
// DISCIPLINE SERVICE
// ============================================

export interface IDisciplineService {
  createCase(data: CreateDisciplineCaseInput): Promise<DisciplineCase>
  getCaseById(id: string): Promise<DisciplineCase | null>
  getCasesByStudent(studentId: string): Promise<DisciplineCase[]>
  updateCase(id: string, data: Partial<CreateDisciplineCaseInput>): Promise<DisciplineCase>
  notifyGuardian(caseId: string): Promise<void>
  acknowledgeByGuardian(caseId: string): Promise<DisciplineCase>
}

// ============================================
// ANNOUNCEMENT SERVICE
// ============================================

export interface IAnnouncementService {
  createAnnouncement(data: CreateAnnouncementInput): Promise<Announcement>
  getAnnouncementById(id: string): Promise<Announcement | null>
  getAnnouncementsBySchool(schoolId: string): Promise<Announcement[]>
  getAnnouncementsForUser(userId: string, role: Role, classIds?: string[]): Promise<Announcement[]>
  publishAnnouncement(id: string): Promise<Announcement>
  deleteAnnouncement(id: string): Promise<void>
}


// ============================================
// COMMUNICATION SYSTEM SERVICE INTERFACES
// Requirements: 4.1-4.5, 5.1-5.8, 6.1-6.5, 11.1-11.5, 12.1-12.5, 14.1-14.6, 16.1-16.6, 17.1-17.5
// ============================================

import {
  InAppNotification,
  CreateNotificationParams,
  NotificationOptions,
  NotificationList,
  TargetingParams,
  TargetingValidation,
  Recipient,
  AutomationRule,
  CreateAutomationRuleInput,
  AutomationExecutionResult,
  CommunicationLog,
  MessageLogEntry,
  MessageLogQuery,
  MessageLogResult,
  DeliveryProof,
  EnhancedAnnouncement,
  CreateEnhancedAnnouncementInput,
  FallbackConfig,
  FallbackParams,
  FallbackResult,
  PermissionCheckParams,
  PermissionResult,
  StudentContacts,
  GuardianContact,
  ContactValidation,
  DuplicateReport,
  MissingContactReport,
  SendMessageRequest,
  BulkMessageRequest,
  EmergencyAlertRequest,
  MessageOrchestratorResult,
  BulkMessageResult,
  EmergencyAlertResult,
  DeliveryReportParams,
  CommunicationDeliveryReport,
} from './entities'
import { MessageChannel, DeliveryStatus } from './enums'

// ============================================
// IN-APP NOTIFICATION SERVICE - Requirements 4.1-4.5
// ============================================

export interface IInAppNotificationService {
  createNotification(params: CreateNotificationParams): Promise<InAppNotification>
  getNotifications(userId: string, options?: NotificationOptions): Promise<NotificationList>
  markAsRead(notificationId: string): Promise<void>
  markAllAsRead(userId: string): Promise<number>
  getUnreadCount(userId: string): Promise<number>
  deleteNotification(notificationId: string): Promise<void>
}

// ============================================
// TARGETING SERVICE - Requirements 5.1-5.8
// ============================================

export interface ITargetingService {
  resolveRecipients(params: TargetingParams): Promise<Recipient[]>
  validateTargeting(params: TargetingParams): Promise<TargetingValidation>
  getTargetCount(params: TargetingParams): Promise<number>
  resolveByClass(schoolId: string, classIds: string[]): Promise<Recipient[]>
  resolveByStream(schoolId: string, streamIds: string[]): Promise<Recipient[]>
  resolveFeeDefaulters(schoolId: string, threshold: number): Promise<Recipient[]>
  resolveByAttendanceThreshold(schoolId: string, threshold: number): Promise<Recipient[]>
  resolveByStaffRole(schoolId: string, roles: Role[]): Promise<Recipient[]>
  resolveEntireSchool(schoolId: string): Promise<Recipient[]>
}

// ============================================
// AUTOMATION SERVICE - Requirements 11.1-11.5
// ============================================

export interface AttendanceEvent {
  studentId: string
  classId: string
  date: Date
  status: 'ABSENT' | 'LATE' | 'EARLY_DEPARTURE'
  period?: number
}

export interface PaymentEvent {
  studentId: string
  amount: number
  paymentId: string
  termId: string
}

export interface ResultsEvent {
  classId: string
  termId: string
  examId: string
}

export interface IAutomationService {
  createAutomationRule(rule: CreateAutomationRuleInput): Promise<AutomationRule>
  updateAutomationRule(id: string, updates: Partial<CreateAutomationRuleInput>): Promise<AutomationRule>
  deleteAutomationRule(id: string): Promise<void>
  getAutomationRules(schoolId: string): Promise<AutomationRule[]>
  getAutomationRuleById(id: string): Promise<AutomationRule | null>
  executeRule(ruleId: string): Promise<AutomationExecutionResult>
  processScheduledMessages(): Promise<void>
  onAttendanceMarked(event: AttendanceEvent): Promise<void>
  onPaymentReceived(event: PaymentEvent): Promise<void>
  onResultsPublished(event: ResultsEvent): Promise<void>
}

// ============================================
// MESSAGE LOG SERVICE - Requirements 12.1-12.5
// ============================================

export interface IMessageLogService {
  logMessage(entry: MessageLogEntry): Promise<CommunicationLog>
  getMessageLog(messageId: string): Promise<CommunicationLog | null>
  queryMessageLogs(params: MessageLogQuery): Promise<MessageLogResult>
  updateMessageStatus(messageId: string, status: DeliveryStatus, reason?: string): Promise<void>
  getDeliveryProof(messageId: string): Promise<DeliveryProof>
  exportMessageLogs(params: MessageLogQuery): Promise<Buffer>
}

// ============================================
// ENHANCED ANNOUNCEMENT SERVICE - Requirements 6.1-6.5
// ============================================

export interface IEnhancedAnnouncementService {
  createAnnouncement(data: CreateEnhancedAnnouncementInput): Promise<EnhancedAnnouncement>
  getAnnouncementById(id: string): Promise<EnhancedAnnouncement | null>
  getAnnouncementsBySchool(schoolId: string): Promise<EnhancedAnnouncement[]>
  updateAnnouncement(id: string, data: Partial<CreateEnhancedAnnouncementInput>): Promise<EnhancedAnnouncement>
  publishAnnouncement(id: string): Promise<EnhancedAnnouncement>
  pinAnnouncement(id: string, pinnedUntil?: Date): Promise<EnhancedAnnouncement>
  unpinAnnouncement(id: string): Promise<EnhancedAnnouncement>
  scheduleAnnouncement(id: string, scheduledAt: Date): Promise<EnhancedAnnouncement>
  processScheduledAnnouncements(): Promise<void>
}

// ============================================
// FALLBACK SERVICE - Requirements 17.1-17.5
// ============================================

export interface IFallbackService {
  determineFallbackChain(params: FallbackParams): MessageChannel[]
  executeFallback(messageId: string, failedChannel: MessageChannel): Promise<FallbackResult>
  getFallbackConfig(schoolId: string): Promise<FallbackConfig | null>
  updateFallbackConfig(schoolId: string, config: Partial<FallbackConfig>): Promise<FallbackConfig>
  createDefaultFallbackConfig(schoolId: string): Promise<FallbackConfig>
}

// ============================================
// COMMUNICATION PERMISSION SERVICE - Requirements 14.1-14.6
// ============================================

export interface ICommunicationPermissionService {
  canSendMessage(params: PermissionCheckParams): Promise<PermissionResult>
  getAllowedRecipientTypes(userId: string, role: Role): Promise<string[]>
  getAllowedMessageTypes(userId: string, role: Role): Promise<string[]>
  getAllowedChannels(userId: string, role: Role): Promise<MessageChannel[]>
  logPermissionCheck(params: PermissionCheckParams, result: PermissionResult): Promise<void>
}

// ============================================
// CONTACT MANAGEMENT SERVICE - Requirements 16.1-16.6
// ============================================

export interface IContactManagementService {
  getStudentContacts(studentId: string): Promise<StudentContacts>
  getGuardianContacts(guardianId: string): Promise<GuardianContact>
  validateContact(contact: string, type: 'phone' | 'email' | 'whatsapp'): Promise<ContactValidation>
  resolveContactForChannel(recipientId: string, channel: MessageChannel): Promise<string | null>
  detectDuplicates(schoolId: string): Promise<DuplicateReport>
  getMissingContacts(schoolId: string): Promise<MissingContactReport>
}

// ============================================
// MESSAGE ORCHESTRATOR SERVICE - Requirements 1.1-1.6, 7.1-7.5
// ============================================

export interface IMessageOrchestratorService {
  sendMessage(params: SendMessageRequest): Promise<MessageOrchestratorResult>
  sendBulkMessage(params: BulkMessageRequest): Promise<BulkMessageResult>
  sendEmergencyAlert(params: EmergencyAlertRequest): Promise<EmergencyAlertResult>
  retryFailedMessage(messageId: string): Promise<MessageOrchestratorResult>
  getMessageStatus(messageId: string): Promise<DeliveryStatus>
  getDeliveryReport(params: DeliveryReportParams): Promise<CommunicationDeliveryReport>
}

// ============================================
// FINANCIAL MESSAGE SERVICE - Requirements 9.1-9.5
// ============================================

export interface FinancialMessageResult {
  success: boolean
  messageId?: string
  error?: string
  balanceAtSend?: number
  channel?: MessageChannel
}

export interface FeeReminderRequest {
  schoolId: string
  studentId: string
  termId: string
  senderId: string
  channel?: MessageChannel
  customMessage?: string
}

export interface BulkFeeReminderRequest {
  schoolId: string
  termId: string
  senderId: string
  minBalance?: number
  channel?: MessageChannel
}

export interface PaymentConfirmationRequest {
  schoolId: string
  studentId: string
  termId: string
  paymentId: string
  senderId: string
  channel?: MessageChannel
}

export interface PenaltyWarningRequest {
  schoolId: string
  studentId: string
  termId: string
  penaltyAmount: number
  deadline: Date
  senderId: string
  channel?: MessageChannel
  customMessage?: string
}

export interface BalanceValidationResult {
  valid: boolean
  balance?: StudentBalance
  error?: string
}

export interface BulkFeeReminderResult {
  totalStudents: number
  sent: number
  failed: number
  blocked: number
  errors: string[]
}

export interface IFinancialMessageService {
  validateBalance(studentId: string, termId: string): Promise<BalanceValidationResult>
  sendFeeReminder(request: FeeReminderRequest): Promise<FinancialMessageResult>
  sendBulkFeeReminders(request: BulkFeeReminderRequest): Promise<BulkFeeReminderResult>
  sendPaymentConfirmation(request: PaymentConfirmationRequest): Promise<FinancialMessageResult>
  sendPenaltyWarning(request: PenaltyWarningRequest): Promise<FinancialMessageResult>
  getMessageBalanceInfo(messageId: string): Promise<{ found: boolean; balanceAtSend?: number; messageType?: string; timestamp?: Date }>
}

// ============================================
// ATTENDANCE MESSAGE SERVICE - Requirements 10.1-10.5
// ============================================

export interface AttendanceMessageResult {
  success: boolean
  messageId?: string
  error?: string
  channel?: MessageChannel
  studentId: string
  guardianId?: string
}

export interface AbsenceNotificationRequest {
  schoolId: string
  studentId: string
  date: Date
  periodsAbsent: number[]
  senderId: string
  channel?: MessageChannel
}

export interface LateArrivalNotificationRequest {
  schoolId: string
  studentId: string
  date: Date
  arrivalTime: Date
  senderId: string
  channel?: MessageChannel
}

export interface EarlyDepartureNotificationRequest {
  schoolId: string
  studentId: string
  date: Date
  departureTime: Date
  reason?: string
  senderId: string
  channel?: MessageChannel
}

export interface BulkAbsenceNotificationResult {
  totalStudents: number
  sent: number
  failed: number
  skipped: number
  errors: string[]
}

export interface GuardianNotificationPreferences {
  guardianId: string
  receiveAbsenceNotifications: boolean
  receiveLateNotifications: boolean
  receiveEarlyDepartureNotifications: boolean
  preferredChannel: MessageChannel
  quietHoursStart?: string
  quietHoursEnd?: string
}

export interface IAttendanceMessageService {
  sendAbsenceNotification(request: AbsenceNotificationRequest): Promise<AttendanceMessageResult>
  sendLateArrivalNotification(request: LateArrivalNotificationRequest): Promise<AttendanceMessageResult>
  sendEarlyDepartureNotification(request: EarlyDepartureNotificationRequest): Promise<AttendanceMessageResult>
  processClassAbsenceNotifications(schoolId: string, classId: string, date: Date, senderId: string): Promise<BulkAbsenceNotificationResult>
  processSchoolAbsenceNotifications(schoolId: string, date: Date, senderId: string): Promise<BulkAbsenceNotificationResult>
  getGuardianNotificationPreferences(guardianId: string): Promise<GuardianNotificationPreferences>
}
