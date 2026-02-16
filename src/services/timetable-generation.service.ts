/**
 * Timetable Auto-Generation Service
 * 
 * Automatically generates timetable entries by assigning subjects to time slots
 * while respecting all configured constraint rules.
 */
 
import { prisma } from '@/lib/db';
import { calculateTimeSlots, type TimeSlot, type TimetableConfig } from './timetable-time-slot.service';

export interface GenerationConfig {
  periodsPerDay: number;
  startTime: string;
  daysPerWeek: number;
  conflictMode: {
    enabled: boolean;
    attemptRepair: boolean;
  };
  rules: {
    noTeacherDoubleBooking: boolean;
    noStreamDoubleSubject: boolean;
    weeklySubjectFrequency: boolean;
    teacherLoadLimits: boolean;
    subjectDistribution: boolean;
  };
  teacherLimits: {
    minPeriodsPerWeek: number;
    maxPeriodsPerWeek: number;
    maxPeriodsPerDay: number;
  };
  subjectLimits: {
    maxSameSubjectPerDay: number;
  };
}

export interface GenerationOptions {
  config: GenerationConfig;
  preserveExisting: boolean;
  clearExisting: boolean;
  customPeriods?: { [curriculumSubjectId: string]: number };
}

export interface GenerationResult {
  entriesGenerated: number;
  entriesSaved: number;
  score: number;
  conflicts: Array<{
    type: string;
    message: string;
    slot: { day: number; period: number };
  }>;
  suggestions: string[];
  stats: {
    totalSlots: number;
    filledSlots: number;
    emptySlots: number;
    teacherGaps: number;
    heavyAfternoon: number;
  };
}

interface SubjectAssignment {
  curriculumSubjectId: string;
  subjectName: string;
  subjectCode: string;
  periodsPerWeek: number;
  periodsAssigned: number;
  teacherId: string;
  teacherName: string;
}

interface TimetableData {
  timetableId: string;
  classId: string;
  termId: string;
  schoolId: string;
  subjects: SubjectAssignment[];
  timeSlots: TimeSlot[];
  existingEntries: Array<{
    dayOfWeek: number;
    period: number;
    curriculumSubjectId: string;
    teacherId: string;
  }>;
}

interface Assignment {
  dayOfWeek: number;
  period: number;
  curriculumSubjectId: string;
  teacherId: string;
  startTime: string;
  endTime: string;
  subjectCode: string;
}

interface TeacherWorkload {
  [teacherId: string]: {
    totalPeriods: number;
    periodsPerDay: { [day: number]: number };
  };
}

interface SubjectDistribution {
  [subjectId: string]: {
    periodsPerDay: { [day: number]: number };
  };
}

/**
 * Main generation function
 */
export async function generateTimetable(
  timetableId: string,
  schoolId: string,
  options: GenerationOptions
): Promise<GenerationResult> {
  console.log('🔧 [Timetable Generation] Starting generation with rules:', {
    noTeacherDoubleBooking: options.config.rules.noTeacherDoubleBooking,
    noStreamDoubleSubject: options.config.rules.noStreamDoubleSubject,
    weeklySubjectFrequency: options.config.rules.weeklySubjectFrequency,
    teacherLoadLimits: options.config.rules.teacherLoadLimits,
    subjectDistribution: options.config.rules.subjectDistribution,
  });

  // Check if this is a school-wide timetable
  const timetable = await prisma.doSTimetable.findUnique({
    where: { id: timetableId },
    select: { id: true, classId: true, termId: true, schoolId: true },
  });

  if (!timetable) {
    throw new Error('Timetable not found');
  }

  // Handle school-wide timetables - generate for all classes
  if (!timetable.classId) {
    return await generateSchoolWideTimetable(timetableId, schoolId, timetable.termId, options);
  }

  // Single class timetable - original logic
  // 1. Load timetable data
  const data = await loadTimetableData(timetableId, schoolId, options);

  // 2. Clear existing entries if requested
  if (options.clearExisting) {
    console.log('🔧 [Timetable Generation] Clearing existing entries...');
    const deleteResult = await prisma.doSTimetableEntry.deleteMany({
      where: { timetableId },
    });
    console.log(`✅ [Timetable Generation] Cleared ${deleteResult.count} existing entries`);
    data.existingEntries = [];
  }

  // 3. Generate assignments with constraint checking
  const { assignments, conflicts } = await assignSubjectsToSlots(data, options);

  // 4. Attempt repair if conflicts exist and repair mode is enabled
  if (conflicts.length > 0 && options.config.conflictMode.enabled && options.config.conflictMode.attemptRepair) {
    console.log(`🔧 [Timetable Generation] Attempting to repair ${conflicts.length} conflicts...`);
    // TODO: Implement swap logic for conflict repair
  }

  // 5. Calculate score and stats
  const score = calculateScore(assignments, data, options);
  const stats = calculateStats(assignments, data, options);
  const suggestions = generateSuggestions(assignments, data, options, conflicts);

  console.log('✅ [Timetable Generation] Generation complete:', {
    entriesGenerated: assignments.length,
    score: score.toFixed(1),
    conflicts: conflicts.length,
    filledSlots: stats.filledSlots,
    totalSlots: stats.totalSlots,
  });

  return {
    entriesGenerated: assignments.length,
    entriesSaved: assignments.length,
    score,
    conflicts,
    suggestions,
    stats,
  };
}

/**
 * Generate timetable for all classes (school-wide)
 */
async function generateSchoolWideTimetable(
  timetableId: string,
  schoolId: string,
  termId: string,
  options: GenerationOptions
): Promise<GenerationResult> {
  console.log('🔧 [Timetable Generation] School-wide timetable detected - generating for all classes');
  
  // Get all classes in the school
  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true },
  });

  console.log(`📊 [Timetable Generation] Found ${classes.length} classes for school-wide generation`);

  let totalAssignments = 0;
  const allConflicts: Array<{ type: string; message: string; slot: { day: number; period: number } }> = [];
  const allSuggestions: string[] = [];

  // Clear existing entries if requested
  if (options.clearExisting) {
    console.log('🔧 [Timetable Generation] Clearing existing entries...');
    const deleteResult = await prisma.doSTimetableEntry.deleteMany({
      where: { timetableId },
    });
    console.log(`✅ [Timetable Generation] Cleared ${deleteResult.count} existing entries`);
  }

  // Generate timetable for each class
  for (const classInfo of classes) {
    console.log(`🔧 [Timetable Generation] Generating for class: ${classInfo.name}`);
    
    // Fetch curriculum subjects for this class
    const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
      where: {
        classId: classInfo.id,
        schoolId,
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

    if (curriculumSubjects.length === 0) {
      console.log(`⚠️ [Timetable Generation] No subjects found for class ${classInfo.name}, skipping`);
      continue;
    }

    // Get teachers for each subject
    const subjects: SubjectAssignment[] = [];
    
    for (const cs of curriculumSubjects) {
      const staffSubject = await prisma.staffSubject.findFirst({
        where: {
          subjectId: cs.subjectId,
          staff: { schoolId },
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
        // Use custom periods if provided, otherwise use default
        const periodsPerWeek = options.customPeriods?.[cs.id] ?? cs.periodsPerWeek;
        
        subjects.push({
          curriculumSubjectId: cs.id,
          subjectName: cs.subject.name,
          subjectCode: cs.subject.code,
          periodsPerWeek,
          periodsAssigned: 0,
          teacherId: staffSubject.staff.id,
          teacherName: `${staffSubject.staff.firstName} ${staffSubject.staff.lastName}`,
        });
      }
    }

    // Generate time slots
    const periodDuration = 40;
    const timetableConfig: TimetableConfig = {
      startTime: options.config.startTime,
      endTime: calculateEndTime(options.config.startTime, options.config.periodsPerDay, periodDuration),
      periodDurationMinutes: periodDuration,
      specialPeriods: [
        {
          name: 'Break',
          startTime: calculateBreakStartTime(options.config.startTime, 3, periodDuration),
          endTime: calculateBreakEndTime(options.config.startTime, 3, periodDuration, 15),
          daysOfWeek: [1, 2, 3, 4, 5],
        },
        {
          name: 'Lunch',
          startTime: calculateBreakStartTime(options.config.startTime, 5, periodDuration),
          endTime: calculateBreakEndTime(options.config.startTime, 5, periodDuration, 60),
          daysOfWeek: [1, 2, 3, 4, 5],
        },
      ],
    };

    // Generate time slots for Monday (day 1) - all days have same structure
    const timeSlots = calculateTimeSlots(timetableConfig, 1);

    // Fetch existing entries for this class (by curriculum subject IDs)
    const curriculumSubjectIds = curriculumSubjects.map(cs => cs.id);
    const existingEntries = await prisma.doSTimetableEntry.findMany({
      where: { 
        timetableId,
        curriculumSubjectId: { in: curriculumSubjectIds },
      },
      select: {
        dayOfWeek: true,
        period: true,
        curriculumSubjectId: true,
        teacherId: true,
      },
    });

    const classData: TimetableData = {
      timetableId,
      classId: classInfo.id,
      termId,
      schoolId,
      subjects,
      timeSlots,
      existingEntries,
    };

    // Generate assignments for this class
    const { assignments, conflicts } = await assignSubjectsToSlots(classData, options);
    
    totalAssignments += assignments.length;
    allConflicts.push(...conflicts);
    
    console.log(`✅ [Timetable Generation] Generated ${assignments.length} entries for ${classInfo.name}`);
  }

  // Calculate overall stats
  const assignableSlots = 8; // Rough estimate (8 periods per day minus breaks)
  const totalSlots = classes.length * assignableSlots * options.config.daysPerWeek;
  const score = totalSlots > 0 ? (totalAssignments / totalSlots) * 100 : 0;
  
  const stats = {
    totalSlots,
    filledSlots: totalAssignments,
    emptySlots: totalSlots - totalAssignments,
    teacherGaps: 0,
    heavyAfternoon: 0,
  };

  allSuggestions.push(`Generated timetables for ${classes.length} classes with ${totalAssignments} total entries`);

  console.log('✅ [Timetable Generation] School-wide generation complete:', {
    classes: classes.length,
    totalEntries: totalAssignments,
    conflicts: allConflicts.length,
  });

  return {
    entriesGenerated: totalAssignments,
    entriesSaved: totalAssignments,
    score,
    conflicts: allConflicts,
    suggestions: allSuggestions,
    stats,
  };
}

/**
 * Load all necessary data for generation (single class)
 */
async function loadTimetableData(
  timetableId: string,
  schoolId: string,
  options: GenerationOptions
): Promise<TimetableData> {
  console.log('🔧 [Timetable Generation] Loading timetable data...');

  // Fetch timetable
  const timetable = await prisma.doSTimetable.findUnique({
    where: { id: timetableId },
    select: {
      id: true,
      classId: true,
      termId: true,
      schoolId: true,
    },
  });

  if (!timetable) {
    throw new Error('Timetable not found');
  }

  if (!timetable.classId) {
    throw new Error('This function only handles single-class timetables');
  }

  // Fetch curriculum subjects for this class
  const curriculumSubjects = await prisma.doSCurriculumSubject.findMany({
    where: {
      classId: timetable.classId,
      schoolId,
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

  console.log(`📊 [Timetable Generation] Found ${curriculumSubjects.length} subjects`);

  // Get teachers for each subject
  const subjects: SubjectAssignment[] = [];
  
  for (const cs of curriculumSubjects) {
    const staffSubject = await prisma.staffSubject.findFirst({
      where: {
        subjectId: cs.subjectId,
        staff: { schoolId },
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
      // Use custom periods if provided, otherwise use default
      const periodsPerWeek = options.customPeriods?.[cs.id] ?? cs.periodsPerWeek;
      
      subjects.push({
        curriculumSubjectId: cs.id,
        subjectName: cs.subject.name,
        subjectCode: cs.subject.code,
        periodsPerWeek,
        periodsAssigned: 0,
        teacherId: staffSubject.staff.id,
        teacherName: `${staffSubject.staff.firstName} ${staffSubject.staff.lastName}`,
      });
    }
  }

  console.log(`📊 [Timetable Generation] ${subjects.length} subjects have assigned teachers`);

  // Generate time slots (use 40 minutes as default period duration)
  const periodDuration = 40;
  const timetableConfig: TimetableConfig = {
    startTime: options.config.startTime,
    endTime: calculateEndTime(options.config.startTime, options.config.periodsPerDay, periodDuration),
    periodDurationMinutes: periodDuration,
    specialPeriods: [
      {
        name: 'Break',
        startTime: calculateBreakStartTime(options.config.startTime, 3, periodDuration),
        endTime: calculateBreakEndTime(options.config.startTime, 3, periodDuration, 15),
        daysOfWeek: [1, 2, 3, 4, 5],
      },
      {
        name: 'Lunch',
        startTime: calculateBreakStartTime(options.config.startTime, 5, periodDuration),
        endTime: calculateBreakEndTime(options.config.startTime, 5, periodDuration, 60),
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    ],
  };

  // Generate time slots for Monday (day 1) - all days have same structure
  const timeSlots = calculateTimeSlots(timetableConfig, 1);

  // Fetch existing entries
  const existingEntries = await prisma.doSTimetableEntry.findMany({
    where: { timetableId },
    select: {
      dayOfWeek: true,
      period: true,
      curriculumSubjectId: true,
      teacherId: true,
    },
  });

  console.log(`📊 [Timetable Generation] ${existingEntries.length} existing entries`);

  return {
    timetableId,
    classId: timetable.classId,
    termId: timetable.termId,
    schoolId: timetable.schoolId,
    subjects,
    timeSlots,
    existingEntries,
  };
}

/**
 * Assign subjects to time slots with full constraint checking
 */
async function assignSubjectsToSlots(
  data: TimetableData,
  options: GenerationOptions
): Promise<{ assignments: Assignment[]; conflicts: Array<{ type: string; message: string; slot: { day: number; period: number } }> }> {
  console.log('🔧 [Timetable Generation] Assigning subjects with constraint rules...');

  const assignments: Assignment[] = [];
  const conflicts: Array<{ type: string; message: string; slot: { day: number; period: number } }> = [];
  
  // Track workloads and distributions
  const teacherWorkload: TeacherWorkload = {};
  const subjectDistribution: SubjectDistribution = {};
  
  // Initialize tracking
  data.subjects.forEach(subject => {
    if (!teacherWorkload[subject.teacherId]) {
      teacherWorkload[subject.teacherId] = { totalPeriods: 0, periodsPerDay: {} };
    }
    if (!subjectDistribution[subject.curriculumSubjectId]) {
      subjectDistribution[subject.curriculumSubjectId] = { periodsPerDay: {} };
    }
  });

  // Create a map of occupied slots
  const occupiedSlots = new Set<string>();
  if (options.preserveExisting) {
    data.existingEntries.forEach(entry => {
      occupiedSlots.add(`${entry.dayOfWeek}-${entry.period}`);
    });
  }

  console.log(`📊 [Timetable Generation] Existing entries: ${data.existingEntries.length}`);
  console.log(`📊 [Timetable Generation] Occupied slots: ${occupiedSlots.size}`);
  if (occupiedSlots.size > 0 && occupiedSlots.size <= 10) {
    console.log(`📊 [Timetable Generation] Occupied slot keys:`, Array.from(occupiedSlots).join(', '));
  }

  // Get assignable slots only
  const assignableSlots = data.timeSlots.filter(slot => slot.isAssignable);
  const daysPerWeek = options.config.daysPerWeek;

  console.log(`📊 [Timetable Generation] ${assignableSlots.length} assignable slots per day`);
  console.log(`📊 [Timetable Generation] ${daysPerWeek} days per week`);
  console.log(`📊 [Timetable Generation] Assignable slot periods:`, assignableSlots.map(s => s.period).join(', '));
  console.log(`📊 [Timetable Generation] Total subjects to assign:`, data.subjects.length);

  // Smart assignment algorithm with constraint checking
  for (const subject of data.subjects) {
    let periodsAssigned = 0;
    const targetPeriods = options.config.rules.weeklySubjectFrequency 
      ? subject.periodsPerWeek 
      : Math.min(subject.periodsPerWeek, assignableSlots.length * daysPerWeek);

    // Try to assign all required periods for this subject
    console.log(`📊 [Timetable Generation] ${subject.subjectCode}: 0/${targetPeriods} periods assigned`);
    
    for (let day = 1; day <= daysPerWeek && periodsAssigned < targetPeriods; day++) {
      for (const timeSlot of assignableSlots) {
        if (periodsAssigned >= targetPeriods) break;

        const slotKey = `${day}-${timeSlot.period}`;

        // Rule 2: No Stream Double Subject - Skip if slot is occupied
        if (options.config.rules.noStreamDoubleSubject && occupiedSlots.has(slotKey)) {
          continue;
        }

        // Rule 1: No Teacher Double Booking
        if (options.config.rules.noTeacherDoubleBooking) {
          const teacherConflict = await checkTeacherDoubleBooking(
            data,
            day,
            timeSlot.period,
            subject.teacherId,
            assignments
          );
          
          if (teacherConflict) {
            if (options.config.conflictMode.enabled) {
              conflicts.push({
                type: 'TEACHER_DOUBLE_BOOKING',
                message: `Teacher ${subject.teacherName} is already teaching at Day ${day}, Period ${timeSlot.period}`,
                slot: { day, period: timeSlot.period },
              });
            }
            continue;
          }
        }

        // Rule 4: Teacher Load Limits
        if (options.config.rules.teacherLoadLimits) {
          const teacherLoad = teacherWorkload[subject.teacherId];
          
          // Check max periods per week
          if (teacherLoad.totalPeriods >= options.config.teacherLimits.maxPeriodsPerWeek) {
            if (options.config.conflictMode.enabled) {
              conflicts.push({
                type: 'TEACHER_MAX_LOAD_EXCEEDED',
                message: `Teacher ${subject.teacherName} has reached max periods per week (${options.config.teacherLimits.maxPeriodsPerWeek})`,
                slot: { day, period: timeSlot.period },
              });
            }
            continue;
          }
          
          // Check max periods per day
          const periodsToday = teacherLoad.periodsPerDay[day] || 0;
          if (periodsToday >= options.config.teacherLimits.maxPeriodsPerDay) {
            continue;
          }
        }

        // Rule 5: Subject Distribution Rule
        if (options.config.rules.subjectDistribution) {
          const subjectToday = subjectDistribution[subject.curriculumSubjectId].periodsPerDay[day] || 0;
          if (subjectToday >= options.config.subjectLimits.maxSameSubjectPerDay) {
            continue;
          }
        }

        // All checks passed - assign the slot
        const assignment: Assignment = {
          dayOfWeek: day,
          period: timeSlot.period,
          curriculumSubjectId: subject.curriculumSubjectId,
          teacherId: subject.teacherId,
          startTime: timeSlot.startTime,
          endTime: timeSlot.endTime,
          subjectCode: subject.subjectCode,
        };

        assignments.push(assignment);
        occupiedSlots.add(slotKey);
        periodsAssigned++;
        subject.periodsAssigned++;

        // Update tracking
        teacherWorkload[subject.teacherId].totalPeriods++;
        teacherWorkload[subject.teacherId].periodsPerDay[day] = 
          (teacherWorkload[subject.teacherId].periodsPerDay[day] || 0) + 1;
        
        subjectDistribution[subject.curriculumSubjectId].periodsPerDay[day] = 
          (subjectDistribution[subject.curriculumSubjectId].periodsPerDay[day] || 0) + 1;
      }
    }

    console.log(`📊 [Timetable Generation] ${subject.subjectCode}: ${periodsAssigned}/${targetPeriods} periods assigned`);
  }

  // Check Rule 4: Teacher minimum load
  if (options.config.rules.teacherLoadLimits) {
    Object.entries(teacherWorkload).forEach(([teacherId, load]) => {
      if (load.totalPeriods < options.config.teacherLimits.minPeriodsPerWeek) {
        const teacher = data.subjects.find(s => s.teacherId === teacherId);
        if (teacher && options.config.conflictMode.enabled) {
          conflicts.push({
            type: 'TEACHER_MIN_LOAD_NOT_MET',
            message: `Teacher ${teacher.teacherName} has only ${load.totalPeriods} periods (min: ${options.config.teacherLimits.minPeriodsPerWeek})`,
            slot: { day: 0, period: 0 },
          });
        }
      }
    });
  }

  // Save assignments to database
  for (const assignment of assignments) {
    await prisma.doSTimetableEntry.create({
      data: {
        timetableId: data.timetableId,
        schoolId: data.schoolId,
        curriculumSubjectId: assignment.curriculumSubjectId,
        teacherId: assignment.teacherId,
        dayOfWeek: assignment.dayOfWeek,
        period: assignment.period,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        isDoubleLesson: false,
      },
    });
  }

  console.log(`✅ [Timetable Generation] Created ${assignments.length} entries with ${conflicts.length} conflicts detected`);

  return { assignments, conflicts };
}

/**
 * Check for teacher double-booking (Rule 1)
 */
async function checkTeacherDoubleBooking(
  data: TimetableData,
  dayOfWeek: number,
  period: number,
  teacherId: string,
  currentAssignments: Assignment[]
): Promise<boolean> {
  // Check in current assignments
  const localConflict = currentAssignments.some(
    a => a.dayOfWeek === dayOfWeek && a.period === period && a.teacherId === teacherId
  );

  if (localConflict) return true;

  // Check in other timetables (same term, different class)
  const existingConflict = await prisma.doSTimetableEntry.findFirst({
    where: {
      teacherId,
      dayOfWeek,
      period,
      timetable: {
        termId: data.termId,
        id: { not: data.timetableId },
      },
    },
  });

  return !!existingConflict;
}

/**
 * Calculate quality score (0-100)
 */
function calculateScore(
  assignments: Assignment[],
  data: TimetableData,
  options: GenerationOptions
): number {
  const totalRequired = data.subjects.reduce((sum, s) => sum + s.periodsPerWeek, 0);
  const totalAssigned = assignments.length;

  if (totalRequired === 0) return 0;

  // Base score: percentage of required periods assigned
  let score = (totalAssigned / totalRequired) * 100;

  // Penalty for rule violations (if conflict detection is enabled)
  if (options.config.conflictMode.enabled) {
    // Score is already based on successful assignments
    // Conflicts reduce the number of assignments, thus reducing the score
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate statistics
 */
function calculateStats(
  assignments: Assignment[],
  data: TimetableData,
  options: GenerationOptions
): {
  totalSlots: number;
  filledSlots: number;
  emptySlots: number;
  teacherGaps: number;
  heavyAfternoon: number;
} {
  const assignableSlots = data.timeSlots.filter(s => s.isAssignable);
  const totalSlots = assignableSlots.length * options.config.daysPerWeek;
  const filledSlots = assignments.length;

  // Calculate teacher gaps (periods between first and last class with no teaching)
  let teacherGaps = 0;
  const teacherSchedules: { [teacherId: string]: { [day: number]: number[] } } = {};
  
  assignments.forEach(a => {
    if (!teacherSchedules[a.teacherId]) teacherSchedules[a.teacherId] = {};
    if (!teacherSchedules[a.teacherId][a.dayOfWeek]) teacherSchedules[a.teacherId][a.dayOfWeek] = [];
    teacherSchedules[a.teacherId][a.dayOfWeek].push(a.period);
  });

  Object.values(teacherSchedules).forEach(schedule => {
    Object.values(schedule).forEach(periods => {
      if (periods.length > 1) {
        periods.sort((a, b) => a - b);
        const gaps = periods[periods.length - 1] - periods[0] + 1 - periods.length;
        teacherGaps += gaps;
      }
    });
  });

  // Calculate heavy subjects in afternoon (periods after lunch - period 6+)
  const heavyAfternoon = assignments.filter(a => a.period >= 6).length;

  return {
    totalSlots,
    filledSlots,
    emptySlots: totalSlots - filledSlots,
    teacherGaps,
    heavyAfternoon,
  };
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(
  assignments: Assignment[],
  data: TimetableData,
  options: GenerationOptions,
  conflicts: Array<{ type: string; message: string; slot: { day: number; period: number } }>
): string[] {
  const suggestions: string[] = [];

  // Calculate capacity
  const assignableSlots = data.timeSlots.filter(s => s.isAssignable);
  const totalCapacity = assignableSlots.length * options.config.daysPerWeek;
  const totalRequired = data.subjects.reduce((sum, s) => sum + s.periodsPerWeek, 0);
  
  // Check capacity issue
  if (totalRequired > totalCapacity) {
    suggestions.push(
      `⚠️ CAPACITY ISSUE: ${data.subjects.length} subjects need ${totalRequired} periods, but only ${totalCapacity} slots available. ` +
      `Consider: (1) Increase periods per day, (2) Reduce subjects, or (3) Lower periodsPerWeek for some subjects.`
    );
  }

  // Check if all subjects were fully assigned
  const unfulfilledSubjects = data.subjects.filter(
    s => s.periodsAssigned < s.periodsPerWeek
  );

  if (unfulfilledSubjects.length > 0) {
    suggestions.push(
      `${unfulfilledSubjects.length} subject(s) did not get all required periods. Consider: increasing periods per day, reducing subject requirements, or relaxing constraint rules.`
    );
    
    unfulfilledSubjects.forEach(s => {
      suggestions.push(
        `  - ${s.subjectCode}: ${s.periodsAssigned}/${s.periodsPerWeek} periods assigned`
      );
    });
  }

  // Check for subjects without teachers
  const subjectsWithoutTeachers = data.subjects.length - data.subjects.filter(s => s.teacherId).length;
  if (subjectsWithoutTeachers > 0) {
    suggestions.push(
      `${subjectsWithoutTeachers} subject(s) have no assigned teachers. Assign teachers to improve generation.`
    );
  }

  // Conflict-specific suggestions
  if (conflicts.length > 0) {
    const conflictTypes = new Set(conflicts.map(c => c.type));
    
    if (conflictTypes.has('TEACHER_DOUBLE_BOOKING')) {
      suggestions.push('Teacher double-booking detected. Consider: assigning more teachers, or disabling Rule 1.');
    }
    
    if (conflictTypes.has('TEACHER_MAX_LOAD_EXCEEDED')) {
      suggestions.push(`Teacher max load exceeded. Consider: increasing max periods per week (current: ${options.config.teacherLimits.maxPeriodsPerWeek}), or disabling Rule 4.`);
    }
    
    if (conflictTypes.has('TEACHER_MIN_LOAD_NOT_MET')) {
      suggestions.push(`Some teachers below minimum load. Consider: decreasing min periods per week (current: ${options.config.teacherLimits.minPeriodsPerWeek}), or assigning more subjects to these teachers.`);
    }
  }

  // Rule-specific suggestions
  if (options.config.rules.subjectDistribution) {
    const utilizationRate = totalCapacity > 0 ? (assignments.length / totalCapacity) * 100 : 0;
    if (utilizationRate < 50 && unfulfilledSubjects.length > 0) {
      suggestions.push(
        `Subject distribution rule (max ${options.config.subjectLimits.maxSameSubjectPerDay} per day) may be too restrictive. ` +
        `Try increasing to 3-4 periods per day, or disable Rule 5.`
      );
    }
  }

  return suggestions;
}

/**
 * Helper: Calculate end time based on start time and periods
 */
function calculateEndTime(startTime: string, periodsPerDay: number, periodDuration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + (periodsPerDay * periodDuration);
  
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

/**
 * Helper: Calculate break start time
 */
function calculateBreakStartTime(startTime: string, afterPeriod: number, periodDuration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const breakStartMinutes = startMinutes + (afterPeriod * periodDuration);
  
  const breakHours = Math.floor(breakStartMinutes / 60);
  const breakMins = breakStartMinutes % 60;
  
  return `${breakHours.toString().padStart(2, '0')}:${breakMins.toString().padStart(2, '0')}`;
}

/**
 * Helper: Calculate break end time
 */
function calculateBreakEndTime(
  startTime: string,
  afterPeriod: number,
  periodDuration: number,
  breakDuration: number
): string {
  const breakStart = calculateBreakStartTime(startTime, afterPeriod, periodDuration);
  const [hours, minutes] = breakStart.split(':').map(Number);
  const breakStartMinutes = hours * 60 + minutes;
  const breakEndMinutes = breakStartMinutes + breakDuration;
  
  const breakEndHours = Math.floor(breakEndMinutes / 60);
  const breakEndMins = breakEndMinutes % 60;
  
  return `${breakEndHours.toString().padStart(2, '0')}:${breakEndMins.toString().padStart(2, '0')}`;
}
