/**
 * Timetable Conflict Detection Service
 * 
 * Provides comprehensive conflict detection for timetable entries with:
 * - Time-based slot occupancy checks
 * - Teacher double-booking detection
 * - Room double-booking detection
 * - Subject period limit enforcement
 * - Detailed conflict reporting
 * 
 * @module services/timetable-conflict-detector
 */

import { prisma } from '@/lib/db';

export interface ConflictCheckParams {
  timetableId: string;
  curriculumSubjectId: string;
  teacherId: string;
  dayOfWeek: number;
  period: number;
  startTime?: string; // "HH:MM" format
  endTime?: string; // "HH:MM" format
  room?: string | null;
  schoolId: string;
  termId: string;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: string[];
  conflictTypes: {
    slotOccupied: boolean;
    teacherDoubleBooked: boolean;
    roomDoubleBooked: boolean;
    periodLimitExceeded: boolean;
  };
}

/**
 * Check for all types of conflicts when adding a timetable entry
 */
export async function detectConflicts(
  params: ConflictCheckParams
): Promise<ConflictResult> {
  console.log('🔧 [Conflict Detector] Starting conflict detection...');
  console.log('📊 [Conflict Detector] Parameters:', {
    timetableId: params.timetableId,
    dayOfWeek: params.dayOfWeek,
    period: params.period,
    startTime: params.startTime,
    endTime: params.endTime,
    room: params.room,
  });

  const conflicts: string[] = [];
  const conflictTypes = {
    slotOccupied: false,
    teacherDoubleBooked: false,
    roomDoubleBooked: false,
    periodLimitExceeded: false,
  };

  // 1. Check slot occupancy
  console.log('🔧 [Conflict Detector] Checking slot occupancy...');
  const slotConflict = await checkSlotOccupancy(params);
  if (slotConflict) {
    conflicts.push(slotConflict);
    conflictTypes.slotOccupied = true;
    console.log('❌ [Conflict Detector] Slot occupied:', slotConflict);
  } else {
    console.log('✅ [Conflict Detector] Slot available');
  }

  // 2. Check teacher double-booking
  console.log('🔧 [Conflict Detector] Checking teacher availability...');
  const teacherConflict = await checkTeacherDoubleBooking(params);
  if (teacherConflict) {
    conflicts.push(teacherConflict);
    conflictTypes.teacherDoubleBooked = true;
    console.log('❌ [Conflict Detector] Teacher double-booked:', teacherConflict);
  } else {
    console.log('✅ [Conflict Detector] Teacher available');
  }

  // 3. Check room double-booking
  if (params.room) {
    console.log('🔧 [Conflict Detector] Checking room availability...');
    const roomConflict = await checkRoomDoubleBooking(params);
    if (roomConflict) {
      conflicts.push(roomConflict);
      conflictTypes.roomDoubleBooked = true;
      console.log('❌ [Conflict Detector] Room double-booked:', roomConflict);
    } else {
      console.log('✅ [Conflict Detector] Room available');
    }
  }

  // 4. Check subject period limit
  console.log('🔧 [Conflict Detector] Checking subject period limit...');
  const periodLimitConflict = await checkPeriodLimit(params);
  if (periodLimitConflict) {
    conflicts.push(periodLimitConflict);
    conflictTypes.periodLimitExceeded = true;
    console.log('❌ [Conflict Detector] Period limit exceeded:', periodLimitConflict);
  } else {
    console.log('✅ [Conflict Detector] Period limit OK');
  }

  const hasConflicts = conflicts.length > 0;
  
  if (hasConflicts) {
    console.log('❌ [Conflict Detector] Conflicts detected:', conflicts.length);
    console.log('📊 [Conflict Detector] Conflict types:', conflictTypes);
  } else {
    console.log('✅ [Conflict Detector] No conflicts detected');
  }

  return {
    hasConflicts,
    conflicts,
    conflictTypes,
  };
}

/**
 * Check if the slot is already occupied in this timetable
 */
async function checkSlotOccupancy(
  params: ConflictCheckParams
): Promise<string | null> {
  const { timetableId, dayOfWeek, period, startTime, endTime } = params;

  // Build where clause based on available data
  const whereClause: any = {
    timetableId,
    dayOfWeek,
  };

  // Use time-based check if times are provided, otherwise use period number
  if (startTime && endTime) {
    // Time-based conflict: check for overlapping time ranges
    whereClause.OR = [
      // Entry starts during this slot
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } },
        ],
      },
      // Entry ends during this slot
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } },
        ],
      },
      // Entry completely contains this slot
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } },
        ],
      },
      // This slot completely contains entry
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gte: endTime } },
        ],
      },
    ];
  } else {
    // Period-based conflict: exact period match
    whereClause.period = period;
  }

  const existingEntry = await prisma.doSTimetableEntry.findFirst({
    where: whereClause,
    include: {
      curriculumSubject: {
        include: { subject: { select: { name: true, code: true } } },
      },
      teacher: { select: { firstName: true, lastName: true } },
    },
  });

  if (existingEntry) {
    const subjectName = existingEntry.curriculumSubject.subject.name;
    const subjectCode = existingEntry.curriculumSubject.subject.code;
    const teacherName = `${existingEntry.teacher.firstName} ${existingEntry.teacher.lastName}`;
    
    return `Slot already occupied by ${subjectName} (${subjectCode}) taught by ${teacherName}`;
  }

  return null;
}

/**
 * Check if teacher is already teaching another class at the same time
 */
async function checkTeacherDoubleBooking(
  params: ConflictCheckParams
): Promise<string | null> {
  const { teacherId, dayOfWeek, period, startTime, endTime, schoolId, termId, timetableId } = params;

  // Build where clause
  const whereClause: any = {
    teacherId,
    dayOfWeek,
    timetable: {
      schoolId,
      termId,
      id: { not: timetableId },
    },
  };

  // Use time-based check if times are provided
  if (startTime && endTime) {
    whereClause.OR = [
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } },
        ],
      },
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } },
        ],
      },
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } },
        ],
      },
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gte: endTime } },
        ],
      },
    ];
  } else {
    whereClause.period = period;
  }

  const conflictingEntry = await prisma.doSTimetableEntry.findFirst({
    where: whereClause,
    include: {
      timetable: {
        include: { class: { select: { name: true } } },
      },
      curriculumSubject: {
        include: { subject: { select: { name: true, code: true } } },
      },
    },
  });

  if (conflictingEntry) {
    const className = conflictingEntry.timetable.class.name;
    const subjectName = conflictingEntry.curriculumSubject.subject.name;
    const subjectCode = conflictingEntry.curriculumSubject.subject.code;
    
    if (startTime && endTime) {
      return `Teacher is already teaching ${subjectName} (${subjectCode}) in ${className} at ${startTime}-${endTime}`;
    } else {
      return `Teacher is already teaching ${subjectName} (${subjectCode}) in ${className} during Period ${period}`;
    }
  }

  return null;
}

/**
 * Check if room is already occupied at the same time
 */
async function checkRoomDoubleBooking(
  params: ConflictCheckParams
): Promise<string | null> {
  const { room, dayOfWeek, period, startTime, endTime, schoolId, termId, timetableId } = params;

  if (!room) return null;

  // Build where clause
  const whereClause: any = {
    room,
    dayOfWeek,
    timetable: {
      schoolId,
      termId,
      id: { not: timetableId },
    },
  };

  // Use time-based check if times are provided
  if (startTime && endTime) {
    whereClause.OR = [
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gt: startTime } },
        ],
      },
      {
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gte: endTime } },
        ],
      },
      {
        AND: [
          { startTime: { gte: startTime } },
          { endTime: { lte: endTime } },
        ],
      },
      {
        AND: [
          { startTime: { lte: startTime } },
          { endTime: { gte: endTime } },
        ],
      },
    ];
  } else {
    whereClause.period = period;
  }

  const conflictingEntry = await prisma.doSTimetableEntry.findFirst({
    where: whereClause,
    include: {
      timetable: {
        include: { class: { select: { name: true } } },
      },
      curriculumSubject: {
        include: { subject: { select: { name: true, code: true } } },
      },
    },
  });

  if (conflictingEntry) {
    const className = conflictingEntry.timetable.class.name;
    const subjectName = conflictingEntry.curriculumSubject.subject.name;
    const subjectCode = conflictingEntry.curriculumSubject.subject.code;
    
    if (startTime && endTime) {
      return `Room ${room} is already occupied by ${subjectName} (${subjectCode}) in ${className} at ${startTime}-${endTime}`;
    } else {
      return `Room ${room} is already occupied by ${subjectName} (${subjectCode}) in ${className} during Period ${period}`;
    }
  }

  return null;
}

/**
 * Check if subject has exceeded its periodsPerWeek limit
 */
async function checkPeriodLimit(
  params: ConflictCheckParams
): Promise<string | null> {
  const { timetableId, curriculumSubjectId } = params;

  // Fetch curriculum subject configuration
  const curriculumSubject = await prisma.doSCurriculumSubject.findUnique({
    where: { id: curriculumSubjectId },
    include: { subject: { select: { name: true, code: true } } },
  });

  if (!curriculumSubject) {
    return 'Curriculum subject not found';
  }

  // Count existing periods for this subject
  const existingPeriods = await prisma.doSTimetableEntry.count({
    where: {
      timetableId,
      curriculumSubjectId,
      isSpecialPeriod: false, // Don't count special periods
    },
  });

  if (existingPeriods >= curriculumSubject.periodsPerWeek) {
    const subjectName = curriculumSubject.subject.name;
    const subjectCode = curriculumSubject.subject.code;
    
    return `${subjectName} (${subjectCode}) already has ${existingPeriods} periods (max: ${curriculumSubject.periodsPerWeek} per week)`;
  }

  return null;
}

/**
 * Check if a time slot is a special period (non-assignable)
 */
export async function isSpecialPeriodSlot(
  schoolId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string
): Promise<{ isSpecial: boolean; periodName?: string }> {
  console.log('🔧 [Conflict Detector] Checking if slot is special period...');
  
  // Fetch configuration
  const config = await prisma.timetableConfiguration.findFirst({
    where: { schoolId },
  });

  if (!config || !config.specialPeriods) {
    console.log('✅ [Conflict Detector] No special periods configured');
    return { isSpecial: false };
  }

  const specialPeriods = config.specialPeriods as any[];
  
  // Check if this time slot overlaps with any special period
  for (const sp of specialPeriods) {
    // Check if special period applies to this day
    if (!sp.daysOfWeek || !sp.daysOfWeek.includes(dayOfWeek)) {
      continue;
    }

    // Check for time overlap
    const spStart = sp.startTime;
    const spEnd = sp.endTime;

    const overlaps =
      (startTime >= spStart && startTime < spEnd) ||
      (endTime > spStart && endTime <= spEnd) ||
      (startTime <= spStart && endTime >= spEnd);

    if (overlaps) {
      console.log('❌ [Conflict Detector] Slot overlaps with special period:', sp.name);
      return { isSpecial: true, periodName: sp.name };
    }
  }

  console.log('✅ [Conflict Detector] Slot is not a special period');
  return { isSpecial: false };
}
