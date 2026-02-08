/**
 * Academic Calendar Utilities
 * Functions for calculating weeks, holidays, and term schedules
 */

/**
 * Calculate the number of weeks between two dates
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of weeks (rounded up)
 */
export function calculateWeekCount(startDate: Date, endDate: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffMs / msPerWeek);
}

/**
 * Calculate the number of days between two dates
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of days
 */
export function calculateDayCount(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.ceil(diffMs / msPerDay);
}

/**
 * Get the week number within a term for a given date
 * @param termStart Start date of the term
 * @param date The date to check
 * @returns Week number (0 if before term starts, > total weeks if after term ends)
 */
export function getWeekNumberInTerm(termStart: Date, date: Date): number {
  if (date < termStart) {
    return 0;
  }

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const diffMs = date.getTime() - termStart.getTime();
  return Math.floor(diffMs / msPerWeek) + 1;
}

/**
 * Check if a date falls within a given date range
 * @param date The date to check
 * @param startDate Start of the range
 * @param endDate End of the range
 * @returns True if date is within range (inclusive)
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Get the holiday period between two terms
 * @param firstTermEnd End date of the first term
 * @param secondTermStart Start date of the second term
 * @returns Holiday period with start date, end date, and week count
 */
export function getHolidayPeriod(firstTermEnd: Date, secondTermStart: Date): {
  startDate: Date;
  endDate: Date;
  weekCount: number;
  dayCount: number;
} | null {
  // Calculate the day after the first term ends
  const holidayStart = new Date(firstTermEnd);
  holidayStart.setDate(holidayStart.getDate() + 1);

  // Calculate the day before the second term starts
  const holidayEnd = new Date(secondTermStart);
  holidayEnd.setDate(holidayEnd.getDate() - 1);

  // If the holiday period is valid (start <= end)
  if (holidayStart <= holidayEnd) {
    const weekCount = calculateWeekCount(holidayStart, holidayEnd);
    const dayCount = calculateDayCount(holidayStart, holidayEnd);
    return {
      startDate: holidayStart,
      endDate: holidayEnd,
      weekCount,
      dayCount
    };
  }

  // No valid holiday period
  return null;
}

/**
 * Validate that term dates are within academic year bounds
 * @param termStart Start date of the term
 * @param termEnd End date of the term
 * @param yearStart Start date of the academic year
 * @param yearEnd End date of the academic year
 * @returns Validation result with success flag and error message
 */
export function validateTermWithinYear(
  termStart: Date, 
  termEnd: Date, 
  yearStart: Date, 
  yearEnd: Date
): { success: boolean; error?: string } {
  if (termStart < yearStart) {
    return {
      success: false,
      error: `Term start date (${termStart.toISOString().split('T')[0]}) cannot be before academic year start date (${yearStart.toISOString().split('T')[0]})`
    };
  }

  if (termEnd > yearEnd) {
    return {
      success: false,
      error: `Term end date (${termEnd.toISOString().split('T')[0]}) cannot be after academic year end date (${yearEnd.toISOString().split('T')[0]})`
    };
  }

  if (termStart >= termEnd) {
    return {
      success: false,
      error: 'Term end date must be after term start date'
    };
  }

  return { success: true };
}

/**
 * Check if two date ranges overlap
 * @param start1 Start of first range
 * @param end1 End of first range
 * @param start2 Start of second range
 * @param end2 End of second range
 * @returns True if ranges overlap
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Format a date as a user-friendly string
 * @param date Date to format
 * @param options Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date, 
  options: { 
    includeTime?: boolean; 
    short?: boolean; 
  } = {}
): string {
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: options.short ? 'short' : 'long',
    day: 'numeric',
  };

  if (options.includeTime) {
    dateOptions.hour = '2-digit';
    dateOptions.minute = '2-digit';
  }

  return date.toLocaleDateString(undefined, dateOptions);
}

/**
 * Get the next available term name based on existing terms
 * @param existingTerms Existing terms in the academic year
 * @returns Suggested name for the next term
 */
export function getNextTermName(existingTerms: Array<{ name: string }>): string {
  if (existingTerms.length === 0) {
    return 'First Term';
  }
  
  // Check if we already have First, Second, Third terms
  const termNames = existingTerms.map(t => t.name.toLowerCase());
  
  if (!termNames.includes('first term')) {
    return 'First Term';
  } else if (!termNames.includes('second term')) {
    return 'Second Term';
  } else if (!termNames.includes('third term')) {
    return 'Third Term';
  } else {
    // If we already have 3 terms, suggest a custom name
    return `Term ${existingTerms.length + 1}`;
  }
}

/**
 * Calculate the suggested end date for a term based on start date and duration
 * @param startDate Start date of the term
 * @param weeks Number of weeks for the term
 * @returns Suggested end date
 */
export function getSuggestedTermEndDate(startDate: Date, weeks: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (weeks * 7) - 1); // Subtract 1 to make it inclusive
  return endDate;
}