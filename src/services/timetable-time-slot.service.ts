/**
 * Timetable Time Slot Calculation Service
 * 
 * Handles time-based timetable slot generation with special period support.
 * Requirements: 2.1-2.8, 7.1-7.7, 12.1-12.4
 */

export interface TimeSlot {
  period: number;
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  isSpecialPeriod: boolean;
  specialPeriodName?: string;
  isAssignable: boolean;
}

export interface SpecialPeriod {
  name: string;
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  daysOfWeek: number[]; // 1-7 (Monday-Sunday)
}

export interface TimetableConfig {
  startTime: string; // "HH:MM" format
  endTime: string; // "HH:MM" format
  periodDurationMinutes: number;
  specialPeriods: SpecialPeriod[];
}

/**
 * Parse "HH:MM" time string to minutes since midnight
 */
export function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to "HH:MM" string
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format time range for display
 * @param startTime - Start time in "HH:MM" format
 * @param endTime - End time in "HH:MM" format
 * @param use12Hour - Whether to use 12-hour format (default: false)
 */
export function formatTimeRange(
  startTime: string,
  endTime: string,
  use12Hour: boolean = false
): string {
  if (use12Hour) {
    return `${format12Hour(startTime)}-${format12Hour(endTime)}`;
  }
  return `${startTime}-${endTime}`;
}

/**
 * Convert 24-hour time to 12-hour format with AM/PM
 */
export function format12Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Calculate time slots for a specific day of the week
 * 
 * Algorithm:
 * 1. Parse start and end times to minutes
 * 2. Get special periods for this day and sort by start time
 * 3. Generate teaching slots before each special period
 * 4. Insert special period slots
 * 5. Generate remaining teaching slots after last special period
 * 6. Handle fractional periods (round up if >= 15 minutes)
 * 
 * @param config - Timetable configuration
 * @param dayOfWeek - Day of week (1-7, Monday-Sunday)
 * @returns Array of time slots
 */
export function calculateTimeSlots(
  config: TimetableConfig,
  dayOfWeek: number
): TimeSlot[] {
  console.log('🔧 [Timetable Config] Calculating time slots...');
  
  const slots: TimeSlot[] = [];

  // 1. Parse start and end times
  const startMinutes = parseTime(config.startTime);
  const endMinutes = parseTime(config.endTime);
  
  console.log(`📊 [Timetable Config] School hours: ${config.startTime} - ${config.endTime}`);

  // 2. Get special periods for this day and sort by start time
  const daySpecialPeriods = config.specialPeriods
    .filter(sp => sp.daysOfWeek.includes(dayOfWeek))
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  console.log(`📊 [Timetable Config] Special periods for day ${dayOfWeek}: ${daySpecialPeriods.length}`);

  // 3. Calculate available time segments
  let currentTime = startMinutes;
  let periodNumber = 1;

  // Generate slots before and between special periods
  for (const specialPeriod of daySpecialPeriods) {
    const spStart = parseTime(specialPeriod.startTime);
    const spEnd = parseTime(specialPeriod.endTime);

    // Add teaching slots before special period
    while (currentTime + config.periodDurationMinutes <= spStart) {
      slots.push({
        period: periodNumber++,
        startTime: formatTime(currentTime),
        endTime: formatTime(currentTime + config.periodDurationMinutes),
        isSpecialPeriod: false,
        isAssignable: true,
      });
      currentTime += config.periodDurationMinutes;
    }

    // Add special period slot
    slots.push({
      period: periodNumber++,
      startTime: specialPeriod.startTime,
      endTime: specialPeriod.endTime,
      isSpecialPeriod: true,
      specialPeriodName: specialPeriod.name,
      isAssignable: false,
    });
    currentTime = spEnd;
  }

  // 4. Add remaining teaching slots after last special period
  while (currentTime + config.periodDurationMinutes <= endMinutes) {
    slots.push({
      period: periodNumber++,
      startTime: formatTime(currentTime),
      endTime: formatTime(currentTime + config.periodDurationMinutes),
      isSpecialPeriod: false,
      isAssignable: true,
    });
    currentTime += config.periodDurationMinutes;
  }

  // 5. Handle fractional period (round up if >= 15 minutes)
  if (currentTime < endMinutes) {
    const remainingMinutes = endMinutes - currentTime;
    if (remainingMinutes >= 15) { // Minimum period duration
      console.log(`📊 [Timetable Config] Adding fractional period: ${remainingMinutes} minutes`);
      slots.push({
        period: periodNumber++,
        startTime: formatTime(currentTime),
        endTime: formatTime(endMinutes),
        isSpecialPeriod: false,
        isAssignable: true,
      });
    }
  }

  // Calculate total available time
  const totalMinutes = endMinutes - startMinutes;
  const specialPeriodMinutes = daySpecialPeriods.reduce(
    (sum, sp) => sum + (parseTime(sp.endTime) - parseTime(sp.startTime)),
    0
  );
  const availableMinutes = totalMinutes - specialPeriodMinutes;

  console.log(`📊 [Timetable Config] Total available time: ${availableMinutes} minutes`);
  console.log(`📊 [Timetable Config] Number of slots: ${slots.filter(s => s.isAssignable).length}`);
  console.log(`✅ [Timetable Config] Generated ${slots.length} time slots (${slots.filter(s => s.isAssignable).length} assignable)`);

  return slots;
}

/**
 * Validate timetable configuration
 * Requirements: 14.1-14.7
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateConfiguration(config: TimetableConfig): ValidationResult {
  const errors: string[] = [];

  console.log('🔍 [Validation] Validating configuration:', {
    startTime: config.startTime,
    endTime: config.endTime,
    periodDuration: config.periodDurationMinutes,
    specialPeriodsCount: config.specialPeriods.length,
  });

  // 1. Start time before end time
  if (parseTime(config.startTime) >= parseTime(config.endTime)) {
    errors.push('Start time must be before end time');
  }

  // 2. Period duration minimum
  if (config.periodDurationMinutes < 15) {
    errors.push('Period duration must be at least 15 minutes');
  }

  // 3. Special periods within school hours
  const schoolStart = parseTime(config.startTime);
  const schoolEnd = parseTime(config.endTime);

  console.log('🔍 [Validation] School hours:', {
    startMinutes: schoolStart,
    endMinutes: schoolEnd,
    startTime: config.startTime,
    endTime: config.endTime,
  });

  for (const sp of config.specialPeriods) {
    const spStart = parseTime(sp.startTime);
    const spEnd = parseTime(sp.endTime);

    console.log('🔍 [Validation] Checking special period:', {
      name: sp.name,
      startTime: sp.startTime,
      endTime: sp.endTime,
      startMinutes: spStart,
      endMinutes: spEnd,
      isStartValid: spStart >= schoolStart,
      isEndValid: spEnd <= schoolEnd,
    });

    // Check if special period is within school hours
    if (spStart < schoolStart || spEnd > schoolEnd) {
      errors.push(
        `Special period "${sp.name}" (${sp.startTime}-${sp.endTime}) must be within school hours (${config.startTime}-${config.endTime})`
      );
    }

    // Check if start time is before end time
    if (spStart >= spEnd) {
      errors.push(
        `Special period "${sp.name}" start time (${sp.startTime}) must be before end time (${sp.endTime})`
      );
    }
  }

  // 4. Special periods don't overlap
  const sortedPeriods = [...config.specialPeriods].sort(
    (a, b) => parseTime(a.startTime) - parseTime(b.startTime)
  );

  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const current = sortedPeriods[i];
    const next = sortedPeriods[i + 1];

    if (parseTime(current.endTime) > parseTime(next.startTime)) {
      errors.push(
        `Special periods "${current.name}" and "${next.name}" overlap`
      );
    }
  }

  console.log('🔍 [Validation] Result:', {
    isValid: errors.length === 0,
    errorCount: errors.length,
    errors,
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
