/**
 * Date Range Utilities for Bursar Dashboard Filters
 * 
 * Provides helper functions to calculate date ranges based on period values
 * for filtering financial data in the bursar dashboard.
 */

export type PeriodType = 'current-term' | 'current-month' | 'last-30-days' | 'current-year';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate start and end dates based on period value
 * 
 * @param period - The period type to calculate date range for
 * @returns DateRange object with startDate and endDate, or null for 'current-term'
 * 
 * Period calculations:
 * - "current-month": Start = first day of current month, End = last day of current month
 * - "last-30-days": Start = 30 days ago from today, End = today
 * - "current-year": Start = January 1 of current year, End = December 31 of current year
 * - "current-term": Return null (no date filtering needed)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */
export function calculateDateRange(period: PeriodType): DateRange | null {
  const now = new Date();
  
  switch (period) {
    case 'current-month': {
      // First day of current month at 00:00:00
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      
      // Last day of current month at 23:59:59.999
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      
      return { startDate, endDate };
    }
    
    case 'last-30-days': {
      // 30 days ago from today at 00:00:00
      const startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      
      // Today at 23:59:59.999
      const endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      
      return { startDate, endDate };
    }
    
    case 'current-year': {
      // January 1 of current year at 00:00:00
      const startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      
      // December 31 of current year at 23:59:59.999
      const endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      
      return { startDate, endDate };
    }
    
    case 'current-term':
      // Return null for current-term (no date filtering needed)
      return null;
    
    default:
      // For any unknown period type, return null
      return null;
  }
}
