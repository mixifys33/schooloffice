/**
 * Unit tests for date range calculation helper function
 * 
 * Tests Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calculateDateRange, type PeriodType } from '@/lib/date-range-utils';

describe('calculateDateRange', () => {
  beforeEach(() => {
    // Reset any date mocks before each test
    vi.useRealTimers();
  });

  describe('current-month period', () => {
    it('should return first and last day of current month', () => {
      // Mock current date to December 15, 2024
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15, 14, 30, 0)); // December 15, 2024, 2:30 PM

      const result = calculateDateRange('current-month');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2024, 11, 1, 0, 0, 0, 0)); // Dec 1, 2024, 00:00:00
      expect(result!.endDate).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999)); // Dec 31, 2024, 23:59:59.999
    });

    it('should handle February in a leap year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 1, 15)); // February 15, 2024 (leap year)

      const result = calculateDateRange('current-month');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2024, 1, 1, 0, 0, 0, 0)); // Feb 1, 2024
      expect(result!.endDate).toEqual(new Date(2024, 1, 29, 23, 59, 59, 999)); // Feb 29, 2024 (leap year)
    });

    it('should handle February in a non-leap year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2023, 1, 15)); // February 15, 2023 (non-leap year)

      const result = calculateDateRange('current-month');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2023, 1, 1, 0, 0, 0, 0)); // Feb 1, 2023
      expect(result!.endDate).toEqual(new Date(2023, 1, 28, 23, 59, 59, 999)); // Feb 28, 2023
    });

    it('should handle month boundaries correctly', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 31)); // January 31, 2024

      const result = calculateDateRange('current-month');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2024, 0, 1, 0, 0, 0, 0)); // Jan 1, 2024
      expect(result!.endDate).toEqual(new Date(2024, 0, 31, 23, 59, 59, 999)); // Jan 31, 2024
    });
  });

  describe('last-30-days period', () => {
    it('should return 30 days ago to today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15, 14, 30, 0)); // December 15, 2024, 2:30 PM

      const result = calculateDateRange('last-30-days');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2024, 10, 15, 0, 0, 0, 0)); // Nov 15, 2024, 00:00:00
      expect(result!.endDate).toEqual(new Date(2024, 11, 15, 23, 59, 59, 999)); // Dec 15, 2024, 23:59:59.999
    });

    it('should handle month boundaries correctly', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 15)); // January 15, 2024

      const result = calculateDateRange('last-30-days');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2023, 11, 16, 0, 0, 0, 0)); // Dec 16, 2023
      expect(result!.endDate).toEqual(new Date(2024, 0, 15, 23, 59, 59, 999)); // Jan 15, 2024
    });

    it('should handle year boundaries correctly', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 10)); // January 10, 2024

      const result = calculateDateRange('last-30-days');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2023, 11, 11, 0, 0, 0, 0)); // Dec 11, 2023
      expect(result!.endDate).toEqual(new Date(2024, 0, 10, 23, 59, 59, 999)); // Jan 10, 2024
    });
  });

  describe('current-year period', () => {
    it('should return January 1 to December 31 of current year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 6, 15)); // July 15, 2024

      const result = calculateDateRange('current-year');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2024, 0, 1, 0, 0, 0, 0)); // Jan 1, 2024, 00:00:00
      expect(result!.endDate).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999)); // Dec 31, 2024, 23:59:59.999
    });

    it('should work at the beginning of the year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 0, 1)); // January 1, 2024

      const result = calculateDateRange('current-year');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2024, 0, 1, 0, 0, 0, 0)); // Jan 1, 2024
      expect(result!.endDate).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999)); // Dec 31, 2024
    });

    it('should work at the end of the year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 31)); // December 31, 2024

      const result = calculateDateRange('current-year');

      expect(result).not.toBeNull();
      expect(result!.startDate).toEqual(new Date(2024, 0, 1, 0, 0, 0, 0)); // Jan 1, 2024
      expect(result!.endDate).toEqual(new Date(2024, 11, 31, 23, 59, 59, 999)); // Dec 31, 2024
    });
  });

  describe('current-term period', () => {
    it('should return null for current-term', () => {
      const result = calculateDateRange('current-term');

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle invalid period types gracefully', () => {
      const result = calculateDateRange('invalid-period' as PeriodType);

      expect(result).toBeNull();
    });

    it('should ensure start date is always before end date for current-month', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15));

      const result = calculateDateRange('current-month');

      expect(result).not.toBeNull();
      expect(result!.startDate.getTime()).toBeLessThan(result!.endDate.getTime());
    });

    it('should ensure start date is always before end date for last-30-days', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15));

      const result = calculateDateRange('last-30-days');

      expect(result).not.toBeNull();
      expect(result!.startDate.getTime()).toBeLessThan(result!.endDate.getTime());
    });

    it('should ensure start date is always before end date for current-year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15));

      const result = calculateDateRange('current-year');

      expect(result).not.toBeNull();
      expect(result!.startDate.getTime()).toBeLessThan(result!.endDate.getTime());
    });
  });

  describe('time precision', () => {
    it('should set start date time to 00:00:00.000 for current-month', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15, 14, 30, 45, 123));

      const result = calculateDateRange('current-month');

      expect(result).not.toBeNull();
      expect(result!.startDate.getHours()).toBe(0);
      expect(result!.startDate.getMinutes()).toBe(0);
      expect(result!.startDate.getSeconds()).toBe(0);
      expect(result!.startDate.getMilliseconds()).toBe(0);
    });

    it('should set end date time to 23:59:59.999 for current-month', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15, 14, 30, 45, 123));

      const result = calculateDateRange('current-month');

      expect(result).not.toBeNull();
      expect(result!.endDate.getHours()).toBe(23);
      expect(result!.endDate.getMinutes()).toBe(59);
      expect(result!.endDate.getSeconds()).toBe(59);
      expect(result!.endDate.getMilliseconds()).toBe(999);
    });

    it('should set start date time to 00:00:00.000 for last-30-days', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15, 14, 30, 45, 123));

      const result = calculateDateRange('last-30-days');

      expect(result).not.toBeNull();
      expect(result!.startDate.getHours()).toBe(0);
      expect(result!.startDate.getMinutes()).toBe(0);
      expect(result!.startDate.getSeconds()).toBe(0);
      expect(result!.startDate.getMilliseconds()).toBe(0);
    });

    it('should set end date time to 23:59:59.999 for last-30-days', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 15, 14, 30, 45, 123));

      const result = calculateDateRange('last-30-days');

      expect(result).not.toBeNull();
      expect(result!.endDate.getHours()).toBe(23);
      expect(result!.endDate.getMinutes()).toBe(59);
      expect(result!.endDate.getSeconds()).toBe(59);
      expect(result!.endDate.getMilliseconds()).toBe(999);
    });
  });
});
