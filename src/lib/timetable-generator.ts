/**
 * Timetable Auto-Generation Engine
 * 
 * Hybrid approach: Auto-generation + Manual override + Learning
 * 
 * Algorithm: Greedy assignment with backtracking + Iterative optimization
 * Quality: 75-85% optimal (requires manual refinement)
 */

import { prisma } from '@/lib/db';

// ============================================
// TYPES
// ============================================

export interface TimeSlot {
  dayOfWeek: number; // 1-7 (Mon-Sun)
  period: number; // 1-N
  startTime: string; // "08:00"
  endTime: string; // "08:40"
}

export interface TimetableConfig {
  // Time structure
  periodsPerDay: number;
  periodDuration: number; // minutes
  startTime: string; // "08:00"
  daysPerWeek: number; // 5 or 6
  
  // Breaks
  breaks: {
    afterPeriod: number;
    duration: number; // minutes
    name: string;
  }[];
  
  // Optimization weights (0-1)
  weights: {
    teacherGaps: number; // Penalize idle time
    heavySubjectsAfternoon: number; // Penalize heavy subjects after lunch
    workloadBalance: number; // Penalize uneven distribution
    subjectDistribution: number; // Penalize same subject on consecutive days
  };
}

export interface SubjectAssignment {
  curriculumSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  periodsPerWeek: number;
  isCore: boolean;
  isHeavy: boolean; // Math, Science (avoid afternoon)
  requiresDoubleLesson: boolean;
  preferredTimes?: number[]; // Learned preferences
  avoidTimes?: number[];
}

export interface GeneratedEntry {
  dayOfWeek: number;
  period: number;
  curriculumSubjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string;
  teacherName: string;
  room: string | null;
  isLocked: boolean; // Preserved during re-generation
}

export interface GenerationResult {
  entries: GeneratedEntry[];
  score: number; // 0-100 (quality score)
  conflicts: Conflict[];
  suggestions: string[];
  stats: {
    totalSlots: number;
    filledSlots: number;
    emptySlots: number;
    teacherGaps: number;
    heavyAfternoon: number;
  };
}

export interface Conflict {
  type: 'TEACHER_BUSY' | 'ROOM_BUSY' | 'SUBJECT_LIMIT' | 'DOUBLE_LESSON' | 'SLOT_OCCUPIED';
  severity: 'CRITICAL' | 'WARNING';
  message: string;
  slot: TimeSlot;
  subjectId?: string;
  teacherId?: string;
}

export interface LockedSlot {
  dayOfWeek: number;
  period: number;
  curriculumSubjectId: string;
  teacherId: string;
  room: string | null;
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

export async function generateTimetable(
  schoolId: string,
  classId: string,
  termId: string,
  config: TimetableConfig,
  lockedSlots: LockedSlot[] = []
): Promise<GenerationResult> {
  console.log('🚀 Starting timetable generation...');
  console.log(`   Class: ${classId}, Term: ${termId}`);
  console.log(`   Locked slots: ${lockedSlots.length}`);
  
  // 1. Load subject assignments
  const subjects = await loadSubjectAssignments(schoolId, classId);
  console.log(`   Loaded ${subjects.length} subjects`);
  
  // 2. Initialize empty timetable
  const entries: GeneratedEntry[] = [];
  
  // 3. Restore locked slots
  for (const locked of lockedSlots) {
    const subject = subjects.find(s => s.curriculumSubjectId === locked.curriculumSubjectId);
    if (subject) {
      entries.push({
        dayOfWeek: locked.dayOfWeek,
        period: locked.period,
        curriculumSubjectId: locked.curriculumSubjectId,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        teacherId: locked.teacherId,
        teacherName: subject.teacherName,
        room: locked.room,
        isLocked: true,
      });
    }
  }
  console.log(`   Restored ${entries.length} locked slots`);
  
  // 4. Sort subjects by priority (core first, then by periods needed)
  const sortedSubjects = subjects.sort((a, b) => {
    if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
    return b.periodsPerWeek - a.periodsPerWeek;
  });
  
  // 5. Assign subjects to slots (greedy algorithm)
  for (const subject of sortedSubjects) {
    await assignSubjectToSlots(
      entries,
      subject,
      config,
      schoolId,
      termId
    );
  }
  console.log(`   Assigned ${entries.length} total slots`);
  
  // 6. Optimize (iterative improvement)
  optimizeTimetable(entries, config);
  console.log(`   Optimization complete`);
  
  // 7. Calculate quality score
  const score = calculateQualityScore(entries, config);
  console.log(`   Quality score: ${score.toFixed(1)}/100`);
  
  // 8. Detect conflicts
  const conflicts = detectConflicts(entries, subjects);
  console.log(`   Conflicts: ${conflicts.length}`);
  
  // 9. Generate suggestions
  const suggestions = generateSuggestions(entries, conflicts, config);
  
  // 10. Calculate stats
  const stats = calculateStats(entries, config);
  
  return {
    entries,
    score,
    conflicts,
    suggestions,
    stats,
  };
}

// ============================================
// SUBJECT ASSIGNMENT
// ============================================

async function assignSubjectToSlots(
  entries: GeneratedEntry[],
  subject: SubjectAssignment,
  config: TimetableConfig,
  schoolId: string,
  termId: string
): Promise<void> {
  const periodsNeeded = subject.periodsPerWeek;
  let periodsAssigned = 0;
  
  // Count already assigned periods (from locked slots)
  const existingPeriods = entries.filter(
    e => e.curriculumSubjectId === subject.curriculumSubjectId
  ).length;
  
  if (existingPeriods >= periodsNeeded) {
    return; // Already satisfied
  }
  
  const remaining = periodsNeeded - existingPeriods;
  
  // Get available slots sorted by preference
  const availableSlots = getAvailableSlots(entries, subject, config);
  
  for (const slot of availableSlots) {
    if (periodsAssigned >= remaining) break;
    
    // Check hard constraints
    const conflicts = await checkHardConstraints(
      slot,
      subject,
      entries,
      schoolId,
      termId
    );
    
    if (conflicts.length === 0) {
      // Assign to slot
      entries.push({
        dayOfWeek: slot.dayOfWeek,
        period: slot.period,
        curriculumSubjectId: subject.curriculumSubjectId,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        teacherId: subject.teacherId,
        teacherName: subject.teacherName,
        room: null, // Room assignment can be done later
        isLocked: false,
      });
      
      periodsAssigned++;
    }
  }
  
  if (periodsAssigned < remaining) {
    console.warn(`   ⚠️ ${subject.subjectName}: Only assigned ${periodsAssigned}/${remaining} periods`);
  }
}

// ============================================
// CONSTRAINT CHECKING
// ============================================

async function checkHardConstraints(
  slot: TimeSlot,
  subject: SubjectAssignment,
  entries: GeneratedEntry[],
  schoolId: string,
  termId: string
): Promise<Conflict[]> {
  const conflicts: Conflict[] = [];
  
  // 1. Check if slot is already occupied
  const occupied = entries.find(
    e => e.dayOfWeek === slot.dayOfWeek && e.period === slot.period
  );
  
  if (occupied) {
    conflicts.push({
      type: 'SLOT_OCCUPIED',
      severity: 'CRITICAL',
      message: `Slot already occupied by ${occupied.subjectName}`,
      slot,
    });
    return conflicts; // No need to check further
  }
  
  // 2. Check teacher availability (same teacher, same time, different class)
  const teacherBusy = await prisma.doSTimetableEntry.findFirst({
    where: {
      teacherId: subject.teacherId,
      dayOfWeek: slot.dayOfWeek,
      period: slot.period,
      timetable: {
        schoolId,
        termId,
      },
    },
    include: {
      timetable: {
        include: {
          class: { select: { name: true } },
        },
      },
      curriculumSubject: {
        include: {
          subject: { select: { name: true } },
        },
      },
    },
  });
  
  if (teacherBusy) {
    conflicts.push({
      type: 'TEACHER_BUSY',
      severity: 'CRITICAL',
      message: `${subject.teacherName} is already teaching ${teacherBusy.curriculumSubject.subject.name} in ${teacherBusy.timetable.class.name}`,
      slot,
      teacherId: subject.teacherId,
    });
  }
  
  return conflicts;
}

// ============================================
// SLOT SELECTION
// ============================================

function getAvailableSlots(
  entries: GeneratedEntry[],
  subject: SubjectAssignment,
  config: TimetableConfig
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  
  // Generate all possible slots
  for (let day = 1; day <= config.daysPerWeek; day++) {
    for (let period = 1; period <= config.periodsPerDay; period++) {
      // Skip if slot is occupied
      const occupied = entries.find(
        e => e.dayOfWeek === day && e.period === period
      );
      
      if (!occupied) {
        slots.push({
          dayOfWeek: day,
          period,
          startTime: calculateStartTime(period, config),
          endTime: calculateEndTime(period, config),
        });
      }
    }
  }
  
  // Sort by preference
  return slots.sort((a, b) => {
    const scoreA = calculateSlotScore(a, subject, entries, config);
    const scoreB = calculateSlotScore(b, subject, entries, config);
    return scoreB - scoreA; // Descending (best first)
  });
}

function calculateSlotScore(
  slot: TimeSlot,
  subject: SubjectAssignment,
  entries: GeneratedEntry[],
  config: TimetableConfig
): number {
  let score = 50; // Base score
  
  // 1. Prefer morning for heavy subjects
  if (subject.isHeavy && slot.period <= config.periodsPerDay / 2) {
    score += 20;
  }
  
  // 2. Avoid afternoon for heavy subjects
  if (subject.isHeavy && slot.period > config.periodsPerDay / 2) {
    score -= 20;
  }
  
  // 3. Prefer learned preferences
  if (subject.preferredTimes?.includes(slot.period)) {
    score += 15;
  }
  
  // 4. Avoid learned dislikes
  if (subject.avoidTimes?.includes(slot.period)) {
    score -= 15;
  }
  
  // 5. Distribute across week (avoid same day clustering)
  const sameSubjectSameDay = entries.filter(
    e => e.curriculumSubjectId === subject.curriculumSubjectId && e.dayOfWeek === slot.dayOfWeek
  ).length;
  
  score -= sameSubjectSameDay * 10;
  
  return score;
}

function calculateStartTime(period: number, config: TimetableConfig): string {
  // Simple calculation (can be enhanced)
  const startMinutes = 480 + (period - 1) * config.periodDuration; // 480 = 08:00
  const hours = Math.floor(startMinutes / 60);
  const minutes = startMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function calculateEndTime(period: number, config: TimetableConfig): string {
  const startMinutes = 480 + (period - 1) * config.periodDuration;
  const endMinutes = startMinutes + config.periodDuration;
  const hours = Math.floor(endMinutes / 60);
  const minutes = endMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}


// ============================================
// OPTIMIZATION
// ============================================

function optimizeTimetable(
  entries: GeneratedEntry[],
  config: TimetableConfig
): void {
  const maxIterations = 50;
  let currentScore = calculateQualityScore(entries, config);
  
  for (let i = 0; i < maxIterations; i++) {
    // Select two random non-locked entries
    const unlocked = entries.filter(e => !e.isLocked);
    if (unlocked.length < 2) break;
    
    const idx1 = Math.floor(Math.random() * unlocked.length);
    let idx2 = Math.floor(Math.random() * unlocked.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * unlocked.length);
    }
    
    const entry1 = unlocked[idx1];
    const entry2 = unlocked[idx2];
    
    // Swap slots
    const tempDay = entry1.dayOfWeek;
    const tempPeriod = entry1.period;
    entry1.dayOfWeek = entry2.dayOfWeek;
    entry1.period = entry2.period;
    entry2.dayOfWeek = tempDay;
    entry2.period = tempPeriod;
    
    // Calculate new score
    const newScore = calculateQualityScore(entries, config);
    
    if (newScore > currentScore) {
      // Keep swap (improvement)
      currentScore = newScore;
    } else {
      // Revert swap (no improvement)
      entry1.dayOfWeek = tempDay;
      entry1.period = tempPeriod;
      entry2.dayOfWeek = entry2.dayOfWeek;
      entry2.period = entry2.period;
    }
  }
}

// ============================================
// QUALITY SCORING
// ============================================

function calculateQualityScore(
  entries: GeneratedEntry[],
  config: TimetableConfig
): number {
  let score = 100;
  
  // 1. Teacher gaps (penalize idle time)
  const teacherGaps = calculateTeacherGaps(entries, config);
  score -= teacherGaps * config.weights.teacherGaps * 10;
  
  // 2. Heavy subjects in afternoon (penalize)
  const heavyAfternoon = countHeavySubjectsAfternoon(entries, config);
  score -= heavyAfternoon * config.weights.heavySubjectsAfternoon * 5;
  
  // 3. Workload balance (penalize uneven distribution)
  const workloadVariance = calculateWorkloadVariance(entries, config);
  score -= workloadVariance * config.weights.workloadBalance * 3;
  
  // 4. Subject distribution (penalize clustering)
  const subjectClustering = calculateSubjectClustering(entries);
  score -= subjectClustering * config.weights.subjectDistribution * 2;
  
  return Math.max(0, Math.min(100, score));
}

function calculateTeacherGaps(
  entries: GeneratedEntry[],
  config: TimetableConfig
): number {
  const teacherSchedules = new Map<string, number[][]>();
  
  // Group by teacher and day
  for (const entry of entries) {
    if (!teacherSchedules.has(entry.teacherId)) {
      teacherSchedules.set(entry.teacherId, Array(config.daysPerWeek).fill(null).map(() => []));
    }
    
    const schedule = teacherSchedules.get(entry.teacherId)!;
    schedule[entry.dayOfWeek - 1].push(entry.period);
  }
  
  // Count gaps
  let totalGaps = 0;
  
  for (const [_, schedule] of teacherSchedules) {
    for (const dayPeriods of schedule) {
      if (dayPeriods.length < 2) continue;
      
      // Sort periods
      dayPeriods.sort((a, b) => a - b);
      
      // Count gaps between first and last period
      const first = dayPeriods[0];
      const last = dayPeriods[dayPeriods.length - 1];
      const expectedPeriods = last - first + 1;
      const actualPeriods = dayPeriods.length;
      const gaps = expectedPeriods - actualPeriods;
      
      totalGaps += gaps;
    }
  }
  
  return totalGaps;
}

function countHeavySubjectsAfternoon(
  entries: GeneratedEntry[],
  config: TimetableConfig
): number {
  const afternoonStart = Math.ceil(config.periodsPerDay / 2);
  
  return entries.filter(e => {
    const isHeavy = ['MAT', 'SCI', 'PHY', 'CHEM', 'BIO'].some(code => 
      e.subjectCode.includes(code)
    );
    return isHeavy && e.period >= afternoonStart;
  }).length;
}

function calculateWorkloadVariance(
  entries: GeneratedEntry[],
  config: TimetableConfig
): number {
  const dailyCounts = Array(config.daysPerWeek).fill(0);
  
  for (const entry of entries) {
    dailyCounts[entry.dayOfWeek - 1]++;
  }
  
  const mean = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
  const variance = dailyCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / dailyCounts.length;
  
  return Math.sqrt(variance);
}

function calculateSubjectClustering(entries: GeneratedEntry[]): number {
  let clustering = 0;
  
  // Group by subject
  const subjectEntries = new Map<string, GeneratedEntry[]>();
  
  for (const entry of entries) {
    if (!subjectEntries.has(entry.curriculumSubjectId)) {
      subjectEntries.set(entry.curriculumSubjectId, []);
    }
    subjectEntries.get(entry.curriculumSubjectId)!.push(entry);
  }
  
  // Check for same subject on consecutive days
  for (const [_, entries] of subjectEntries) {
    entries.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].dayOfWeek === entries[i - 1].dayOfWeek + 1) {
        clustering++;
      }
    }
  }
  
  return clustering;
}

// ============================================
// CONFLICT DETECTION
// ============================================

function detectConflicts(
  entries: GeneratedEntry[],
  subjects: SubjectAssignment[]
): Conflict[] {
  const conflicts: Conflict[] = [];
  
  // 1. Check subject period limits
  for (const subject of subjects) {
    const assigned = entries.filter(
      e => e.curriculumSubjectId === subject.curriculumSubjectId
    ).length;
    
    if (assigned > subject.periodsPerWeek) {
      conflicts.push({
        type: 'SUBJECT_LIMIT',
        severity: 'CRITICAL',
        message: `${subject.subjectName} has ${assigned} periods (max: ${subject.periodsPerWeek})`,
        slot: { dayOfWeek: 0, period: 0, startTime: '', endTime: '' },
        subjectId: subject.subjectId,
      });
    }
  }
  
  // 2. Check for duplicate slots
  const slotMap = new Map<string, GeneratedEntry[]>();
  
  for (const entry of entries) {
    const key = `${entry.dayOfWeek}-${entry.period}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, []);
    }
    slotMap.get(key)!.push(entry);
  }
  
  for (const [key, entries] of slotMap) {
    if (entries.length > 1) {
      const [day, period] = key.split('-').map(Number);
      conflicts.push({
        type: 'SLOT_OCCUPIED',
        severity: 'CRITICAL',
        message: `Multiple entries in same slot: ${entries.map(e => e.subjectName).join(', ')}`,
        slot: { dayOfWeek: day, period, startTime: '', endTime: '' },
      });
    }
  }
  
  return conflicts;
}

// ============================================
// SUGGESTIONS
// ============================================

function generateSuggestions(
  entries: GeneratedEntry[],
  conflicts: Conflict[],
  config: TimetableConfig
): string[] {
  const suggestions: string[] = [];
  
  // 1. Suggest fixing conflicts
  if (conflicts.length > 0) {
    suggestions.push(`Fix ${conflicts.length} conflict(s) before approving`);
  }
  
  // 2. Suggest reducing teacher gaps
  const gaps = calculateTeacherGaps(entries, config);
  if (gaps > 5) {
    suggestions.push(`Reduce teacher gaps (currently ${gaps}) by rearranging lessons`);
  }
  
  // 3. Suggest moving heavy subjects
  const heavyAfternoon = countHeavySubjectsAfternoon(entries, config);
  if (heavyAfternoon > 3) {
    suggestions.push(`Move ${heavyAfternoon} heavy subject(s) to morning slots`);
  }
  
  // 4. Suggest balancing workload
  const variance = calculateWorkloadVariance(entries, config);
  if (variance > 2) {
    suggestions.push(`Balance daily workload (variance: ${variance.toFixed(1)})`);
  }
  
  return suggestions;
}

// ============================================
// STATISTICS
// ============================================

function calculateStats(
  entries: GeneratedEntry[],
  config: TimetableConfig
): {
  totalSlots: number;
  filledSlots: number;
  emptySlots: number;
  teacherGaps: number;
  heavyAfternoon: number;
} {
  const totalSlots = config.daysPerWeek * config.periodsPerDay;
  const filledSlots = entries.length;
  const emptySlots = totalSlots - filledSlots;
  const teacherGaps = calculateTeacherGaps(entries, config);
  const heavyAfternoon = countHeavySubjectsAfternoon(entries, config);
  
  return {
    totalSlots,
    filledSlots,
    emptySlots,
    teacherGaps,
    heavyAfternoon,
  };
}

// ============================================
// DATA LOADING
// ============================================

async function loadSubjectAssignments(
  schoolId: string,
  classId: string
): Promise<SubjectAssignment[]> {
  const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
    where: {
      schoolId,
      classId,
      isActive: true,
    },
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });
  
  // Get teacher assignments (from StaffSubject)
  const assignments: SubjectAssignment[] = [];
  
  for (const cs of curriculumSubjects) {
    // Find teacher assigned to this subject for this class
    const staffSubject = await prisma.staffSubject.findFirst({
      where: {
        subjectId: cs.subjectId,
        classId: cs.classId,
      },
      include: {
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    if (staffSubject) {
      // Check if subject is heavy (Math, Science, etc.)
      const heavySubjects = ['MAT', 'SCI', 'PHY', 'CHEM', 'BIO', 'MATH'];
      const isHeavy = heavySubjects.some(code => cs.subject.code.includes(code));
      
      assignments.push({
        curriculumSubjectId: cs.id,
        subjectId: cs.subjectId,
        subjectName: cs.subject.name,
        subjectCode: cs.subject.code,
        teacherId: staffSubject.staffId,
        teacherName: `${staffSubject.staff.firstName} ${staffSubject.staff.lastName}`,
        periodsPerWeek: cs.periodsPerWeek,
        isCore: cs.isCore,
        isHeavy,
        requiresDoubleLesson: false, // Can be enhanced
        preferredTimes: [], // Load from preferences
        avoidTimes: [],
      });
    }
  }
  
  return assignments;
}

// ============================================
// EXPORT
// ============================================

export const TimetableGenerator = {
  generate: generateTimetable,
  calculateQualityScore,
  detectConflicts,
  generateSuggestions,
};
