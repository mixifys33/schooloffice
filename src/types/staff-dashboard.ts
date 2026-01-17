/**
 * Staff Dashboard Types for SchoolOffice
 * Requirements: 2.1, 2.3, 11.1, 12.1
 * 
 * These types support the staff-centric dashboard system where staff is the spine
 * of the system. All academic, financial, and operational functions flow from staff actions.
 */

import {
  Role,
  StaffStatus,
  StaffRole,
  ResponsibilityType,
  StaffEventType,
  TaskType,
  TaskStatus,
  AlertType,
  AlertSeverity,
  LinkedModule,
  StaffDocumentCategory,
} from './enums';

// ============================================
// STAFF EXTENDED MODEL
// Requirements: 2.1, 2.3, 3.2
// ============================================

/**
 * Extended Staff interface with dashboard-specific fields
 * Extends existing Staff model with primaryRole, secondaryRoles, department, lastActivityAt
 */
export interface StaffExtended {
  // Existing fields from Staff model
  id: string;
  userId: string;
  schoolId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  role: Role;
  hireDate: Date;
  status: StaffStatus;
  createdAt: Date;
  updatedAt: Date;

  // New fields for dashboard system
  primaryRole: StaffRole | Role;
  secondaryRoles: (StaffRole | Role)[];
  department?: string;
  lastActivityAt?: Date;

  // Relations
  responsibilities?: StaffResponsibility[];
  performanceRecords?: PerformanceRecord[];
  taskAssignments?: Task[];
  documents?: StaffDocument[];
  historyEntries?: StaffHistoryEntry[];
}

// ============================================
// STAFF RESPONSIBILITY
// Requirements: 3.4
// ============================================

/**
 * Staff responsibility assignment - defines specific duties separate from permissions
 */
export interface StaffResponsibility {
  id: string;
  staffId: string;
  type: ResponsibilityType;
  details: ResponsibilityDetails;
  assignedAt: Date;
  assignedBy: string;
}

/**
 * Details for different responsibility types
 */
export interface ResponsibilityDetails {
  // For CLASS_TEACHING / SUBJECT_TEACHING
  classId?: string;
  className?: string;
  subjectId?: string;
  subjectName?: string;
  streamId?: string;
  streamName?: string;

  // For CLASS_TEACHER_DUTY
  isClassTeacher?: boolean;

  // For DUTY_TEACHER
  dutyDays?: number[]; // 1-7 (Monday-Sunday)
  dutyPeriod?: string;

  // For BOARDING_MASTER
  dormitoryId?: string;
  dormitoryName?: string;

  // For DEPARTMENT_HEAD
  departmentName?: string;
}

export interface ResponsibilityInput {
  type: ResponsibilityType;
  details: ResponsibilityDetails;
  assignedBy: string;
}


// ============================================
// STAFF PROFILE
// Requirements: 2.1, 2.3
// ============================================

/**
 * Complete staff profile with all sections
 * Contains: identity, employment, responsibilities, permissions summary, 
 * performance, history, documents, and audit trail
 */
export interface StaffProfile {
  id: string;
  userId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  primaryRole: StaffRole | Role;
  secondaryRoles: (StaffRole | Role)[];
  department?: string;
  status: StaffStatus;
  hireDate: Date;
  responsibilities: StaffResponsibility[];
  permissionsSummary: PermissionSummary;
  performanceSummary: PerformanceSummary;
  lastActivity?: Date;
  alerts: StaffAlert[];
}

/**
 * Staff list item for admin view
 * Requirements: 2.1 - display name, roles, department, status, phone, last activity, alerts
 */
export interface StaffListItem {
  id: string;
  name: string;
  employeeNumber: string;
  primaryRole: StaffRole | Role;
  secondaryRoles: (StaffRole | Role)[];
  department?: string;
  status: StaffStatus;
  phone?: string;
  lastActivity?: Date;
  alerts: StaffAlert[];
}

/**
 * Staff alert for dashboard notifications
 */
export interface StaffAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  actionUrl?: string;
  createdAt: Date;
}

/**
 * Permission summary for staff profile
 */
export interface PermissionSummary {
  canEnterMarks: boolean;
  canApproveMarks: boolean;
  canViewFees: boolean;
  canRecordPayments: boolean;
  canEditClassAssignments: boolean;
  canTrackPresence: boolean;
  canLogDiscipline: boolean;
  canSendEmergencyAlerts: boolean;
  canViewStudents: boolean;
  canGenerateReports: boolean;
  canLockReports: boolean;
  dataScope: DataScope;
}

export type DataScope = 
  | 'assigned_classes'
  | 'school_academics'
  | 'school_finance'
  | 'hostel_students'
  | 'own_tasks'
  | 'full_school';

/**
 * Performance summary for staff profile
 */
export interface PerformanceSummary {
  attendanceRate?: number; // Optional - staff attendance tracking not yet implemented
  taskCompletionRate: number;
  marksSubmissionTimeliness?: number;
  reportCompletionRate?: number;
}

// ============================================
// STAFF FILTERS
// ============================================

export interface StaffFilters {
  role?: StaffRole | Role;
  department?: string;
  status?: StaffStatus;
  searchTerm?: string;
}

export interface StaffUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  department?: string;
  primaryRole?: StaffRole | Role;
  secondaryRoles?: (StaffRole | Role)[];
}


// ============================================
// TASK MODEL
// Requirements: 12.1, 12.2
// ============================================

/**
 * Task for staff task management
 * Links tasks to modules (academics, reports, attendance, finance)
 */
export interface Task {
  id: string;
  staffId: string;
  schoolId: string;
  title: string;
  description?: string;
  type: TaskType;
  linkedModule: LinkedModule;
  linkedResourceId?: string;
  deadline: Date;
  status: TaskStatus;
  completedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export interface CreateTaskInput {
  staffId: string;
  schoolId: string;
  title: string;
  description?: string;
  type: TaskType;
  linkedModule: LinkedModule;
  linkedResourceId?: string;
  deadline: Date;
  createdBy: string;
}

export interface TaskAssignment {
  id: string;
  taskId: string;
  staffId: string;
  assignedAt: Date;
  assignedBy: string;
}

// ============================================
// PERFORMANCE METRICS
// Requirements: 11.1
// ============================================

/**
 * Performance metrics for staff monitoring
 * Tracks attendance consistency, marks submission timeliness, report completion, task completion
 */
export interface PerformanceMetrics {
  staffId: string;
  period: { start: Date; end: Date };

  // Attendance consistency (undefined if not tracked)
  attendanceRate?: number;
  lateCount?: number;
  absentCount?: number;

  // Task completion
  tasksAssigned: number;
  tasksCompleted: number;
  tasksOverdue: number;
  completionRate: number;

  // Marks submission (for teachers)
  marksSubmissionTimeliness?: number;
  averageSubmissionDelay?: number;

  // Report completion
  reportsAssigned?: number;
  reportsCompleted?: number;

  // Communication response (optional)
  messagesReceived?: number;
  messagesResponded?: number;
  averageResponseTime?: number;
}

export interface PerformanceRecord {
  id: string;
  staffId: string;
  periodStart: Date;
  periodEnd: Date;
  metrics: PerformanceMetrics;
  createdAt: Date;
}

// ============================================
// STAFF HISTORY
// Requirements: 13.1
// ============================================

/**
 * Staff history entry for tracking promotions, role changes, transfers, exits
 */
export interface StaffHistoryEntry {
  id: string;
  staffId: string;
  eventType: StaffEventType;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  performedBy: string;
  performedAt: Date;
}

export interface CreateStaffHistoryEntryInput {
  staffId: string;
  eventType: StaffEventType;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  performedBy: string;
}

// ============================================
// STAFF DOCUMENTS
// Requirements: 14.1
// ============================================

/**
 * Staff document for document management
 */
export interface StaffDocument {
  id: string;
  staffId: string;
  category: StaffDocumentCategory;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface CreateStaffDocumentInput {
  staffId: string;
  category: StaffDocumentCategory;
  fileName: string;
  fileUrl: string;
  uploadedBy: string;
}


// ============================================
// DASHBOARD DATA INTERFACES
// Requirements: 5.1-5.5, 6.1-6.4, 7.1-7.6, 8.1-8.4, 9.1-9.3, 10.1-10.5
// ============================================

/**
 * Base dashboard data interface
 */
export interface DashboardData {
  alerts: Alert[];
  quickActions: QuickAction[];
  widgets: Widget[];
  tasks: Task[];
}

/**
 * Alert interface for dashboard notifications
 */
export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  actionUrl?: string;
  createdAt: Date;
}

/**
 * Quick action button for dashboards
 */
export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  permissions: string[];
}

/**
 * Widget for dashboard display
 */
export interface Widget {
  id: string;
  type: string;
  title: string;
  data: unknown;
  position: number;
}

// ============================================
// TEACHER DASHBOARD
// Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
// ============================================

/**
 * Teacher dashboard data
 * Displays alerts, quick actions, class cards, and pending tasks
 * Excludes: fee info, mark approval, class assignment editing
 */
export interface TeacherDashboardData {
  // Top alerts - problems only, no charts
  alerts: {
    pendingAttendance: AttendanceAlert[];
    marksDeadlines: DeadlineAlert[];
    unsubmittedReports: ReportAlert[];
  };

  // Quick actions - one click always
  quickActions: QuickAction[];

  // My classes - card per class
  classes: TeacherClassCard[];

  // My tasks
  tasks: Task[];
}

export interface TeacherClassCard {
  classId: string;
  className: string;
  subject: string;
  term: string;
  attendanceDone: boolean;
  marksDone: boolean;
  studentCount: number;
}

export interface AttendanceAlert {
  id: string;
  classId: string;
  className: string;
  date: Date;
  message: string;
}

export interface DeadlineAlert {
  id: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  deadline: Date;
  message: string;
}

export interface ReportAlert {
  id: string;
  reportType: string;
  classId: string;
  className: string;
  deadline: Date;
  message: string;
}

// ============================================
// CLASS TEACHER DASHBOARD
// Requirements: 6.1, 6.2, 6.3, 6.4
// ============================================

/**
 * Class teacher dashboard data
 * Displays class snapshot, quick actions, alerts
 * Fee defaulters shown as read-only (no payment recording)
 */
export interface ClassTeacherDashboardData {
  // Class snapshot
  classSnapshot: ClassSnapshot;

  // Quick actions
  quickActions: QuickAction[];

  // Alerts
  alerts: {
    absentStudents: StudentAlert[];
    chronicLateness: StudentAlert[];
    pendingReports: ReportAlert[];
  };

  // Fee defaulters (read-only)
  feeDefaulters: FeeDefaulterInfo[];
}

export interface ClassSnapshot {
  classId: string;
  className: string;
  totalStudents: number;
  attendanceToday: {
    present: number;
    absent: number;
    late: number;
  };
  feeDefaultersCount: number;
  disciplineAlertsCount: number;
}

export interface StudentAlert {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  message: string;
  severity: AlertSeverity;
  createdAt: Date;
}

export interface FeeDefaulterInfo {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  outstandingBalance: number;
  lastPaymentDate?: Date;
}


// ============================================
// DOS DASHBOARD
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
// ============================================

/**
 * Director of Studies dashboard data
 * Displays academic alerts, term control, approval center, academic overview
 * Allows approve/reject marks but not direct editing
 */
export interface DOSDashboardData {
  // Academic alerts
  alerts: {
    pendingMarkApprovals: ApprovalAlert[];
    lateTeachers: TeacherAlert[];
    examScheduleConflicts: ConflictAlert[];
  };

  // Term control
  termControl: {
    currentTerm: TermInfo;
    subjectAllocations: SubjectAllocation[];
    examSchedules: ExamScheduleInfo[];
  };

  // Approval center
  approvalCenter: {
    marksAwaitingApproval: MarkApproval[];
    reportsAwaitingGeneration: ReportGeneration[];
  };

  // Academic overview
  academicOverview: {
    completionRates: { subject: string; rate: number }[];
    subjectCoverage: { subject: string; coverage: number }[];
    teacherPerformance: TeacherPerformanceInfo[];
  };

  // Report controls
  reportControls: {
    canGenerateReports: boolean;
    canLockReports: boolean;
    lockedTerms: string[];
  };
}

export interface ApprovalAlert {
  id: string;
  type: 'marks' | 'report';
  subjectId?: string;
  subjectName?: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  submittedAt: Date;
  message: string;
}

export interface TeacherAlert {
  id: string;
  teacherId: string;
  teacherName: string;
  alertType: 'late_submission' | 'missing_attendance' | 'incomplete_marks';
  message: string;
  createdAt: Date;
}

export interface ConflictAlert {
  id: string;
  examId: string;
  examName: string;
  conflictType: 'time_overlap' | 'room_conflict' | 'teacher_conflict';
  details: string;
  createdAt: Date;
}

export interface TermInfo {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
}

export interface SubjectAllocation {
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
}

export interface ExamScheduleInfo {
  id: string;
  examName: string;
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'in_progress' | 'completed';
}

export interface MarkApproval {
  id: string;
  examId: string;
  examName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  submittedAt: Date;
  studentCount: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ReportGeneration {
  id: string;
  termId: string;
  termName: string;
  classId: string;
  className: string;
  status: 'pending' | 'generating' | 'completed';
  studentCount: number;
}

export interface TeacherPerformanceInfo {
  teacherId: string;
  name: string;
  metrics: PerformanceMetrics;
}


// ============================================
// BURSAR DASHBOARD
// Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
// ============================================

/**
 * Bursar dashboard data
 * Displays financial alerts, quick actions, financial overview, reports access
 * Excludes: marks editing, class changes, attendance modification
 */
export interface BursarDashboardData {
  // Financial alerts
  alerts: {
    unpaidBalances: BalanceAlert[];
    reconciliationIssues: ReconciliationAlert[];
    pendingApprovals: ApprovalAlert[];
  };

  // Quick actions
  quickActions: QuickAction[];

  // Financial overview
  financialOverview: {
    collectionsToday: number;
    outstandingFees: number;
    paymentMethods: { method: string; amount: number }[];
  };

  // Reports access
  reports: ReportAccess[];
}

export interface BalanceAlert {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  outstandingBalance: number;
  daysOverdue: number;
  message: string;
}

export interface ReconciliationAlert {
  id: string;
  type: 'mismatch' | 'missing_receipt' | 'duplicate_payment';
  details: string;
  amount: number;
  createdAt: Date;
}

export interface ReportAccess {
  id: string;
  name: string;
  type: 'fee_report' | 'payment_summary' | 'audit_export';
  url: string;
}

// ============================================
// HOSTEL DASHBOARD
// Requirements: 8.1, 8.2, 8.3, 8.4
// ============================================

/**
 * Hostel staff dashboard data
 * Displays live presence, discipline log, emergency alerts
 * Excludes: marks and finance information
 */
export interface HostelDashboardData {
  // Live presence
  livePresence: {
    studentsInHostel: number;
    totalCapacity: number;
    missingStudents: StudentPresence[];
    lateReturns: StudentPresence[];
  };

  // Discipline log
  disciplineLog: {
    recentIncidents: DisciplineIncident[];
    pendingActions: DisciplineActionItem[];
    escalations: Escalation[];
  };

  // Emergency actions
  emergencyActions: EmergencyAction[];
}

export interface StudentPresence {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  dormitory: string;
  lastSeen?: Date;
  expectedReturn?: Date;
  status: 'present' | 'absent' | 'late';
}

export interface DisciplineIncident {
  id: string;
  studentId: string;
  studentName: string;
  incidentDate: Date;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'reported' | 'investigating' | 'resolved';
}

export interface DisciplineActionItem {
  id: string;
  incidentId: string;
  studentId: string;
  studentName: string;
  actionRequired: string;
  dueDate: Date;
}

export interface Escalation {
  id: string;
  incidentId: string;
  escalatedTo: string;
  escalatedAt: Date;
  reason: string;
  status: 'pending' | 'acknowledged' | 'resolved';
}

export interface EmergencyAction {
  id: string;
  label: string;
  icon: string;
  action: 'fire_alert' | 'sickness_alert' | 'missing_student_alert';
  notifyRoles: string[];
}

// ============================================
// SUPPORT DASHBOARD
// Requirements: 9.1, 9.2, 9.3
// ============================================

/**
 * Support staff dashboard data
 * Displays assigned tasks and notices
 * Optionally includes simple attendance tracking
 * Excludes: student records, marks, financial data
 */
export interface SupportDashboardData {
  // Assigned tasks
  tasks: Task[];

  // Notices
  notices: Notice[];

  // Optional attendance tracking
  attendanceTracking?: SimpleAttendance;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high';
  createdAt: Date;
  expiresAt?: Date;
}

export interface SimpleAttendance {
  date: Date;
  checkInTime?: Date;
  checkOutTime?: Date;
  status: 'present' | 'absent' | 'late';
}

// ============================================
// DASHBOARD SERVICE INTERFACES
// ============================================

/**
 * Dashboard service interface for fetching role-specific dashboard data
 */
export interface DashboardService {
  getDashboardData(staffId: string, role: StaffRole | Role): Promise<DashboardData>;
  getAlerts(staffId: string, role: StaffRole | Role): Promise<Alert[]>;
  getQuickActions(role: StaffRole | Role): QuickAction[];
  getTasks(staffId: string): Promise<Task[]>;
}

/**
 * Staff management service interface
 */
export interface StaffManagementService {
  // Staff CRUD (no delete, only deactivate)
  getStaffList(schoolId: string, filters?: StaffFilters): Promise<StaffListItem[]>;
  getStaffProfile(staffId: string): Promise<StaffProfile>;
  updateStaffProfile(staffId: string, data: StaffUpdateData): Promise<StaffProfile>;
  deactivateStaff(staffId: string, reason: string): Promise<void>;

  // Role management (admin only)
  assignRole(staffId: string, role: StaffRole | Role, assignedBy: string): Promise<void>;
  removeRole(staffId: string, role: StaffRole | Role, removedBy: string): Promise<void>;

  // Responsibility management
  assignResponsibility(staffId: string, responsibility: ResponsibilityInput): Promise<void>;
  removeResponsibility(staffId: string, responsibilityId: string): Promise<void>;

  // Performance tracking
  getPerformanceMetrics(staffId: string): Promise<PerformanceMetrics>;
  getStaffHistory(staffId: string): Promise<StaffHistoryEntry[]>;
}
