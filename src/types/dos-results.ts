/**
 * DoS Results Collection and Report Card System Types
 * Core truth: DoS acts as single academic authority
 */

// Step 1: Teacher submissions (inputs)
export enum TeacherSubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum AssessmentType {
  CA = 'CA',
  EXAM = 'EXAM',
}

export interface TeacherSubmission {
  id: string;
  teacherId: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  assessmentType: AssessmentType;
  status: TeacherSubmissionStatus;
  submittedAt?: Date;
  submittedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Step 2: DoS Results Inbox Item
export interface DosResultsInboxItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  caStatus: TeacherSubmissionStatus;
  examStatus: TeacherSubmissionStatus;
  completenessIndicator: number; // 0-100 percentage
  lastUpdated: Date;
}

// Step 3: DoS Approval & Freeze
export interface DosApproval {
  id: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  caApproved: boolean;
  examApproved: boolean;
  locked: boolean;
  lockedBy: string;
  lockedAt: Date;
  auditTrail: ApprovalAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalAuditEntry {
  action: 'APPROVE_CA' | 'APPROVE_EXAM' | 'LOCK_SUBJECT' | 'UNLOCK_SUBJECT';
  performedBy: string;
  performedAt: Date;
  reason?: string;
}

// Step 4: Report Card Compilation Engine
export interface SubjectResult {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  caScore: number | null; // Out of 20
  examScore: number | null; // Out of 80
  finalScore: number | null; // Out of 100
  grade: string | null;
  gradeDescriptor: string | null;
  teacherRemarks: string | null;
  dosRemarks: string | null;
  approved: boolean;
  locked: boolean;
}

export interface StudentReportCard {
  id: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  classId: string;
  className: string;
  termId: string;
  termName: string;
  academicYear: string;
  subjectResults: SubjectResult[];
  overallAverage: number | null;
  overallGrade: string | null;
  position: number | null;
  totalStudents: number | null;
  classTeacherRemarks: string | null;
  dosRemarks: string | null;
  state: ReportCardState;
  publishedAt?: Date;
  publishedBy?: string;
  linkToken?: string;
  linkExpiry?: Date;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ReportCardState {
  DRAFT = 'DRAFT',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
}

// Step 5: SMS Design
export enum SmsMode {
  STANDARD = 'STANDARD',
  SIMPLE = 'SIMPLE',
  MINIMAL = 'MINIMAL',
  NO_LINK = 'NO_LINK',
}

export interface SmsPreview {
  segment1: string;
  segment2?: string;
  totalCharacters: number;
  segmentCount: number;
  isValid: boolean;
  operatorWarning?: string;
}

export interface SmsSendingRequest {
  classId?: string;
  studentIds: string[];
  smsMode: SmsMode;
  customComment?: string;
  previewOnly: boolean;
}

export interface SmsSendingResult {
  success: boolean;
  messageCount: number;
  sentCount: number;
  failedCount: number;
  results: SmsSendingItemResult[];
}

export interface SmsSendingItemResult {
  studentId: string;
  phoneNumber: string;
  smsSegments: string[];
  status: 'QUEUED' | 'SENT' | 'FAILED';
  errorMessage?: string;
}

// Step 6: Secure Report Link
export interface SecureReportLink {
  id: string;
  token: string;
  studentId: string;
  termId: string;
  reportCardId: string;
  isActive: boolean;
  maxViews?: number;
  currentViews: number;
  expiryDate: Date;
  revokedAt?: Date;
  revokedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Step 7: PDF Generation
export interface PdfGenerationRequest {
  reportCardId: string;
  studentId: string;
  termId: string;
  forceRegeneration?: boolean;
}

export interface PdfGenerationResult {
  success: boolean;
  pdfUrl?: string;
  error?: string;
}

// Step 8: DoS Dashboard Stats
export interface DosDashboardStats {
  totalClasses: number;
  completedClasses: number;
  pendingApprovals: number;
  publishedReports: number;
  smsSentThisTerm: number;
  overallCompletion: number; // 0-100 percentage
}