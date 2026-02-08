// ============================================
// TIMETABLE SYSTEM TYPES
// Comprehensive types for constraint-based timetable generation
// ============================================

export interface SchoolTimeStructure {
  id: string;
  schoolId: string;
  startTime: string; // "08:00"
  endTime: string; // "15:30"
  periodsPerDay: number;
  periodDuration: number; // minutes
  shortBreakStart: number; // period number
  shortBreakDuration: number; // minutes
  lunchBreakStart: number; // period number
  lunchBreakDuration: number; // minutes
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubjectPeriodRequirement {
  id: string;
  schoolId: string;
  subjectId: string;
  classId: string;
  periodsPerWeek: number;
  doublePeriodAllowed: boolean;
  practicalPeriods: number;
  theoryPeriods: number;
  isCompetencyBased: boolean;
  requiresProjectBlocks: boolean;
  cannotBeSplit: boolean;
  preferMorningSlots: boolean;
  preferAfternoonSlots: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherConstraint {
  id: string;
  schoolId: string;
  teacherId: string;
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  unavailableDays: number[]; // [1, 6] for Monday, Saturday
  unavailablePeriods: Array<{day: number; periods: number[]}>;
  preferredSubjects: string[]; // Subject IDs
  canTeachMultipleClasses: boolean;
  requiresLab: boolean;
  cannotTeachConsecutive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum RoomType {
  CLASSROOM = 'CLASSROOM',
  LABORATORY = 'LABORATORY',
  COMPUTER_LAB = 'COMPUTER_LAB',
  LIBRARY = 'LIBRARY',
  HALL = 'HALL',
  SPORTS_FACILITY = 'SPORTS_FACILITY'
}

export interface RoomConstraint {
  id: string;
  schoolId: string;
  roomId: string;
  roomName: string;
  roomType: RoomType;
  capacity: number;
  allowedSubjects: string[]; // Subject IDs
  requiredSubjects: string[]; // Subject IDs that MUST use this room
  unavailableDays: number[];
  unavailablePeriods: Array<{day: number; periods: number[]}>;
  hasProjector: boolean;
  hasLab: boolean;
  hasComputers: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum TimetableStatus {
  DRAFT = 'DRAFT',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}

export interface TimetableDraft {
  id: string;
  schoolId: string;
  termId: string;
  version: number;
  status: TimetableStatus;
  generatedBy: string; // User ID
  generatedAt: Date;
  generationAlgorithm?: string;
  generationTime?: number; // milliseconds
  qualityScore?: number; // 0-100
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  slots: TimetableSlot[];
  conflicts: TimetableConflict[];
}

export interface TimetableSlot {
  id: string;
  timetableId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number; // 1-7 (Monday-Sunday)
  period: number;
  roomId?: string;
  roomName?: string;
  duration: number; // minutes
  isDoubleSlot: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimetableConflict {
  id: string;
  timetableId: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  title: string;
  description: string;
  affectedSlots: string[]; // Slot IDs
  suggestedFix?: ConflictResolution;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  dismissedAt?: Date;
  dismissedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ConflictType {
  TEACHER_CLASH = 'TEACHER_CLASH',
  ROOM_CLASH = 'ROOM_CLASH',
  CLASS_CLASH = 'CLASS_CLASH',
  MISSING_PERIODS = 'MISSING_PERIODS',
  TEACHER_OVERLOAD = 'TEACHER_OVERLOAD',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION'
}

export enum ConflictSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export enum ConstraintType {
  HARD = 'HARD',
  SOFT = 'SOFT'
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export enum OptimizationTarget {
  TEACHER_BALANCE = 'TEACHER_BALANCE',
  SUBJECT_SPREAD = 'SUBJECT_SPREAD',
  ROOM_UTILIZATION = 'ROOM_UTILIZATION',
  STUDENT_SATISFACTION = 'STUDENT_SATISFACTION',
  MINIMIZE_CONFLICTS = 'MINIMIZE_CONFLICTS'
}

export enum WorkloadRating {
  OVERLOADED = 'OVERLOADED',
  CRITICAL = 'CRITICAL',
  NORMAL = 'NORMAL',
  UNDERLOADED = 'UNDERLOADED'
}

export interface TeacherWorkloadAnalysis {
  teacherId: string
  teacherName: string
  totalPeriods: number
  maxPeriodsPerDay: number
  averagePeriodsPerDay: number
  freePeriods: number
  overloadDays: number[]
  workloadScore: number
  workloadRating: 'OVERLOADED' | 'CRITICAL' | 'NORMAL' | 'UNDERLOADED' | string // Added workloadRating
}

export interface ConflictResolution {
  type: 'SWAP_SLOTS' | 'MOVE_SLOT' | 'CHANGE_TEACHER' | 'CHANGE_ROOM' | 'SPLIT_DOUBLE_PERIOD';
  description: string;
  actions: Array<{
    action: string;
    slotId?: string;
    newTeacherId?: string;
    newRoomId?: string;
    newDay?: number;
    newPeriod?: number;
  }>;
}

export enum FixAction {
  SWAP_SLOTS = 'SWAP_SLOTS',
  MOVE_SLOT = 'MOVE_SLOT',
  CHANGE_TEACHER = 'CHANGE_TEACHER',
  CHANGE_ROOM = 'CHANGE_ROOM',
  SPLIT_DOUBLE_PERIOD = 'SPLIT_DOUBLE_PERIOD',
  ADD_LESSON = 'ADD_LESSON',
  REMOVE_LESSON = 'REMOVE_LESSON',
  MOVE_LESSON = 'MOVE_LESSON' // Keeping this to match component usage if it differs from MOVE_SLOT
}

export interface ConflictFix {
  action: FixAction;
  description: string;
  estimatedImpact: number; // e.g., 1-10, lower is better
  resolutionDetails: ConflictResolution; // The actual changes to be applied
}

export interface TimetableVersion {
  id: string;
  schoolId: string;
  termId: string;
  version: number;
  status: TimetableStatus;
  changedBy: string;
  changeReason?: string;
  changesFrom?: string; // Previous version ID
  changesSummary?: {
    slotsAdded: number;
    slotsRemoved: number;
    slotsModified: number;
    conflictsResolved: number;
  };
  totalSlots: number;
  conflictCount: number;
  qualityScore?: number;
  createdAt: Date;
  archivedAt?: Date;
}

export interface TimetableAnalytics {
  id: string;
  schoolId: string;
  termId: string;
  timetableId: string;
  teacherWorkloadStats: Record<string, {
    periodsPerWeek: number;
    maxPeriodsPerDay: number;
    utilization: number; // percentage
  }>;
  subjectDistribution: Record<string, {
    totalPeriods: number;
    classCount: number;
    teacherCount: number;
  }>;
  roomUtilization: Record<string, {
    utilizationPercent: number;
    peakHours: number[];
  }>;
  qualityScore: number; // 0-100
  constraintViolations: number;
  softConstraintScore: number;
  teacherLoadBalance: number; // Standard deviation
  subjectSpreadScore: number;
  morningSlotUsage: number; // percentage
  afternoonSlotUsage: number; // percentage
  calculatedAt: Date;
  [key: string]: any; // Add index signature for compatibility with Prisma Json
}

// ============================================
// CONSTRAINT ENGINE TYPES
// ============================================

export interface ConstraintViolation {
  constraintId: string;
  severity: ConflictSeverity;
  description: string;
  affectedSlots: string[];
  suggestedFixes: string[];
}

export interface TimetableSolution {
  slots: TimetableSlot[];
  schoolId: string;
  termId: string;
  qualityScore?: number;
  violations: ConstraintViolation[];
}

export interface GenerationContext {
  schoolId: string;
  termId: string;
  classes: any[];
  subjects: any[];
  teachers: any[];
  rooms: any[];
  timeStructure: any;
  requirements: any[];
  teacherConstraints: any[];
  roomConstraints: any[];
}

// ============================================
// WORKFLOW TYPES
// ============================================

export interface GenerationRequest {
  schoolId: string;
  termId: string;
  dosUserId: string;
  name: string;
  regenerateFrom?: string;
  settings?: {
    populationSize?: number;
    maxGenerations?: number;
    mutationRate?: number;
    crossoverRate?: number;
  };
}

export interface ApprovalRequest {
  draftId: string;
  dosUserId: string;
  reviewNotes?: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
}

export interface PublicationRequest {
  draftId: string;
  dosUserId: string;
  notifyTeachers?: boolean;
  notifyStudents?: boolean;
}

export interface TimetableGenerationSettings {
  id: string;
  schoolId: string;
  prioritizeTeacherBalance: boolean;
  prioritizeSubjectSpread: boolean;
  prioritizeRoomOptimization: boolean;
  hardConstraintWeight: number; // 0-100
  teacherWorkloadWeight: number;
  subjectSpreadWeight: number;
  roomPreferenceWeight: number;
  timePreferenceWeight: number;
  maxGenerationAttempts: number;
  maxGenerationTimeMs: number;
  minAcceptableQuality: number;
  targetQualityScore: number;
  updatedAt: Date;
  updatedBy: string;
}

// ============================================
// CONSTRAINT ENGINE TYPES
// ============================================

export interface HardConstraint {
  id: string;
  type: 'TEACHER_CLASH' | 'ROOM_CLASH' | 'CLASS_CLASH' | 'SUBJECT_PERIODS';
  description: string;
  validate: (slot: TimetableSlot, timetable: TimetableSlot[]) => boolean;
  weight: number; // Always 100 for hard constraints
}

export interface SoftConstraint {
  id: string;
  type: 'TEACHER_BALANCE' | 'SUBJECT_SPREAD' | 'ROOM_PREFERENCE' | 'TIME_PREFERENCE';
  description: string;
  score: (slot: TimetableSlot, timetable: TimetableSlot[]) => number; // 0-100
  weight: number; // 0-100
}

export interface GenerationResult {
  success: boolean;
  timetable?: TimetableSlot[];
  qualityScore?: number;
  conflicts: TimetableConflict[];
  generationTime: number; // milliseconds
  attempts: number;
  errorMessage?: string;
}

export interface ConstraintViolation {
  constraintId: string;
  constraintType: string;
  severity: ConflictSeverity;
  description: string;
  affectedSlots: string[];
  suggestedFix?: ConflictResolution;
}

// ============================================
// UI COMPONENT TYPES
// ============================================

export interface TimetableGridProps {
  timetable: TimetableDraft;
  viewMode: 'CLASS' | 'TEACHER' | 'ROOM';
  selectedEntity?: string; // Class ID, Teacher ID, or Room ID
  editable?: boolean;
  onSlotClick?: (slot: TimetableSlot) => void;
  onSlotDrop?: (slot: TimetableSlot, newDay: number, newPeriod: number) => void;
}

export interface ConflictPanelProps {
  conflicts: TimetableConflict[];
  onResolveConflict: (conflictId: string, resolution: ConflictResolution) => void;
  onDismissConflict: (conflictId: string, reason: string) => void;
}

export interface TimetableConfigurationProps {
  schoolId: string;
  onConfigurationChange: (config: Partial<TimetableGenerationSettings>) => void;
}

export interface GenerationProgressProps {
  isGenerating: boolean;
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining?: number; // seconds
}

// ============================================
// API TYPES
// ============================================

export interface GenerateTimetableRequest {
  schoolId: string;
  termId: string;
  settings?: Partial<TimetableGenerationSettings>;
  regenerateFrom?: string; // Existing timetable ID to modify
}

export interface GenerateTimetableResponse {
  success: boolean;
  timetableId?: string;
  qualityScore?: number;
  conflicts: TimetableConflict[];
  generationTime: number;
  message: string;
}

export interface ApproveTimetableRequest {
  timetableId: string;
  approvalNotes?: string;
}

export interface PublishTimetableRequest {
  timetableId: string;
  notifyStaff?: boolean;
  notifyStudents?: boolean;
}

export interface TimetableAnalyticsRequest {
  schoolId: string;
  termId: string;
  timetableId: string;
}

export interface TimetableExportRequest {
  timetableId: string;
  format: 'PDF' | 'EXCEL' | 'CSV';
  viewType: 'MASTER' | 'CLASS' | 'TEACHER' | 'ROOM';
  entityId?: string; // For specific class/teacher/room exports
}

// ============================================
// UTILITY TYPES
// ============================================

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7; // Monday to Sunday

export interface TimeSlot {
  day: DayOfWeek;
  period: number;
  startTime: string; // "08:00"
  endTime: string; // "08:40"
}

export interface PeriodInfo {
  period: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  breakType?: 'SHORT' | 'LUNCH';
}

export interface WeeklySchedule {
  [key: number]: PeriodInfo[]; // Day of week -> periods
}

export interface TimetableStats {
  totalSlots: number;
  filledSlots: number;
  emptySlots: number;
  conflictCount: number;
  qualityScore: number;
  teacherUtilization: number; // percentage
  roomUtilization: number; // percentage
}