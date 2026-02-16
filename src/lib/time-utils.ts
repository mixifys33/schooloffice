/**
 * Time Utilities for Timetable System
 * 
 * Requirement 4: Time-Based Timetable Display
 * Requirement 2: Automatic Time Slot Generation
 */

export interface TimeSlot {
  slotNumber: number | string;
  startTime: string;
  endTime: string;
  isSpecialPeriod: boolean;
  specialPeriodName: string | null;
  isAssignable: boolean;
}

export interface SpecialPeriod {
  name: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[]; // 1-7 (Mon-Sun)
}

/**
 * Parse time string "HH:MM" to minutes since midnight
 * @param time - Time string in format "HH:MM"
 * @returns Minutes since midnight
 */
export function parseTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string "HH:MM"
 * @param minutes - Minutes since midnight
 * @returns Time string in format "HH:MM"
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format time range for display
 * @param startTime - Start time "HH:MM"
 * @param endTime - End time "HH:MM"
 * @param use12Hour - Use 12-hour format (default: false)
 * @returns Formatted time range
 */
export function formatTimeRange(startTime: string, endTime: string, use12Hour: boolean = false): string {
  if (use12Hour) {
    return `${format12Hour(startTime)}-${format12Hour(endTime)}`;
  }
  return `${startTime}-${endTime}`;
}

/**
 * Format time in 12-hour format with AM/PM
 * @param time - Time string "HH:MM"
 * @returns Time in 12-hour format
 */
export function format12Hour(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Format time range in compact format for mobile
 * @param startTime - Start time "HH:MM"
 * @param endTime - End time "HH:MM"
 * @returns Compact time range
 */
export function formatTimeRangeCompact(startTime: string, endTime: string): string {
  // Remove leading zeros for compact display
  const start = startTime.replace(/^0/, '');
  const end = endTime.replace(/^0/, '');
  return `${start}-${end}`;
}

/**
 * Calculate time slots based on configuration
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
 * 
 * @param startTime - School start time "HH:MM"
 * @param endTime - School end time "HH:MM"
 * @param periodDurationMinutes - Duration of each period
 * @param specialPeriods - Array of special periods
 * @param dayOfWeek - Day of week (1-7, optional)
 * @returns Array of time slots
 */
export function calculateTimeSlots(
  startTime: string,
  endTime: string,
  periodDurationMinutes: number,
  specialPeriods: SpecialPeriod[],
  dayOfWeek?: number
): TimeSlot[] {
  console.log('🔧 [Time Utils] Calculating time slots...');
  
  const slots: TimeSlot[] = [];
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  
  // Calculate total school time (Requirement 2.1)
  const totalSchoolTime = endMinutes - startMinutes;
  console.log(`📊 [Time Utils] School hours: ${startTime} - ${endTime} (${totalSchoolTime} minutes)`);
  
  // Filter special periods for this day (Requirement 2.7)
  const daySpecialPeriods = specialPeriods
    .filter(sp => !dayOfWeek || sp.daysOfWeek.includes(dayOfWeek))
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  
  // Calculate total special period time
  const specialPeriodTime = daySpecialPeriods.reduce((total, sp) => {
    const spStart = parseTime(sp.startTime);
    const spEnd = parseTime(sp.endTime);
    return total + (spEnd - spStart);
  }, 0);
  
  // Calculate available teaching time (Requirement 2.1)
  const availableTime = totalSchoolTime - specialPeriodTime;
  console.log(`📊 [Time Utils] Total available time: ${availableTime} minutes (after ${specialPeriodTime} minutes of special periods)`);
  
  // Calculate number of slots (Requirement 2.2, 2.3 - round up)
  const numberOfSlots = Math.ceil(availableTime / periodDurationMinutes);
  console.log(`📊 [Time Utils] Number of slots: ${numberOfSlots}`);
  
  // Generate time slots (Requirements 2.4, 2.5, 2.6)
  let currentTime = startMinutes;
  let periodNumber = 1;
  
  for (const specialPeriod of daySpecialPeriods) {
    const spStart = parseTime(specialPeriod.startTime);
    const spEnd = parseTime(specialPeriod.endTime);
    
    // Add teaching slots before special period (Requirement 2.4)
    while (currentTime + periodDurationMinutes <= spStart) {
      slots.push({
        slotNumber: periodNumber++,
        startTime: formatTime(currentTime),
        endTime: formatTime(currentTime + periodDurationMinutes),
        isSpecialPeriod: false,
        specialPeriodName: null,
        isAssignable: true,
      });
      currentTime += periodDurationMinutes;
    }
    
    // Add special period slot (Requirement 2.5, 2.8)
    slots.push({
      slotNumber: `SP${slots.filter(s => s.isSpecialPeriod).length + 1}`,
      startTime: specialPeriod.startTime,
      endTime: specialPeriod.endTime,
      isSpecialPeriod: true,
      specialPeriodName: specialPeriod.name,
      isAssignable: false, // Requirement 2.8
    });
    currentTime = spEnd;
  }
  
  // Add remaining teaching slots after last special period (Requirement 2.4)
  while (currentTime + periodDurationMinutes <= endMinutes) {
    slots.push({
      slotNumber: periodNumber++,
      startTime: formatTime(currentTime),
      endTime: formatTime(currentTime + periodDurationMinutes),
      isSpecialPeriod: false,
      specialPeriodName: null,
      isAssignable: true,
    });
    currentTime += periodDurationMinutes;
  }
  
  // Handle fractional period (Requirement 2.3 - round up)
  if (currentTime < endMinutes) {
    const remainingMinutes = endMinutes - currentTime;
    if (remainingMinutes >= 15) { // Minimum period duration
      slots.push({
        slotNumber: periodNumber++,
        startTime: formatTime(currentTime),
        endTime: formatTime(endMinutes),
        isSpecialPeriod: false,
        specialPeriodName: null,
        isAssignable: true,
      });
    }
  }
  
  console.log(`✅ [Time Utils] Generated ${slots.length} time slots`);
  
  return slots;
}

/**
 * Validate time configuration
 * Requirement 14: Validation and Error Handling
 * 
 * @param startTime - School start time
 * @param endTime - School end time
 * @param periodDurationMinutes - Period duration
 * @param specialPeriods - Special periods
 * @returns Validation result
 */
export function validateTimeConfiguration(
  startTime: string,
  endTime: string,
  periodDurationMinutes: number,
  specialPeriods: SpecialPeriod[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validation 1: Start time before end time (Requirement 1.2)
  const startMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);
  
  if (startMinutes >= endMinutes) {
    errors.push('Start time must be before end time');
  }
  
  // Validation 2: Period duration at least 15 minutes (Requirement 1.3)
  if (periodDurationMinutes < 15) {
    errors.push('Period duration must be at least 15 minutes');
  }
  
  // Validation 3: Special periods within school hours (Requirement 1.5)
  for (const sp of specialPeriods) {
    const spStart = parseTime(sp.startTime);
    const spEnd = parseTime(sp.endTime);
    
    if (spStart < startMinutes || spEnd > endMinutes) {
      errors.push(
        `Special period "${sp.name}" times must be within school hours (${startTime} to ${endTime})`
      );
    }
    
    if (spStart >= spEnd) {
      errors.push(`Special period "${sp.name}" start time must be before end time`);
    }
  }
  
  // Validation 4: Special periods don't overlap (Requirement 1.6)
  const sortedPeriods = [...specialPeriods].sort((a, b) => 
    parseTime(a.startTime) - parseTime(b.startTime)
  );
  
  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const current = sortedPeriods[i];
    const next = sortedPeriods[i + 1];
    
    // Check if they share any days
    const sharedDays = current.daysOfWeek.some(day => next.daysOfWeek.includes(day));
    if (!sharedDays) continue;
    
    if (parseTime(current.endTime) > parseTime(next.startTime)) {
      errors.push(`Special periods "${current.name}" and "${next.name}" overlap`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get day name from day number
 * @param dayOfWeek - Day number (1-7)
 * @returns Day name
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayOfWeek - 1] || 'Unknown';
}

/**
 * Get short day name from day number
 * @param dayOfWeek - Day number (1-7)
 * @returns Short day name
 */
export function getShortDayName(dayOfWeek: number): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days[dayOfWeek - 1] || '?';
}
