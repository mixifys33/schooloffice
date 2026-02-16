/**
 * Enhanced Term Service
 * Handles term management operations with date validation, calendar integration, and holiday management
 * Requirements: 2.2  
 */   
import { prisma } from '@/lib/db'
import { calculateWeekCount as calcWeekCount, getHolidayPeriod, dateRangesOverlap } from '@/lib/academic-calendar-utils'
import {
  Term,
  CreateTermInput,
} from '@/types'

/**
 * Map Prisma Term to domain Term type
 */
function mapPrismaTermToDomain(prismaTerm: {
  id: string
  academicYearId: string
  name: string
  startDate: Date
  endDate: Date
  weekCount: number
  createdAt: Date
  updatedAt: Date
}): Term {
  return {
    id: prismaTerm.id,
    academicYearId: prismaTerm.academicYearId,
    name: prismaTerm.name,
    startDate: prismaTerm.startDate,
    endDate: prismaTerm.endDate,
    weekCount: prismaTerm.weekCount,
    createdAt: prismaTerm.createdAt,
    updatedAt: prismaTerm.updatedAt,
  }
}

/**
 * Calculate the number of weeks between two dates
 */
export function calculateWeekCount(startDate: Date, endDate: Date): number {
  return calcWeekCount(startDate, endDate);
}

/**
 * Validate term dates
 * - End date must be after start date
 * - Term dates must be within the academic year
 */
export function validateTermDates(
  startDate: Date,
  endDate: Date,
  yearStartDate?: Date,
  yearEndDate?: Date
): { valid: boolean; error?: string } {
  if (endDate <= startDate) {
    return { valid: false, error: 'End date must be after start date' }
  }

  if (yearStartDate && startDate < yearStartDate) {
    return { valid: false, error: 'Term start date cannot be before academic year start date' }
  }

  if (yearEndDate && endDate > yearEndDate) {
    return { valid: false, error: 'Term end date cannot be after academic year end date' }
  }

  return { valid: true }
}

export class TermService {
  /**
   * Create a new term with parent year association and date validation
   * Requirement 2.2: Associate each term with parent year and enforce non-overlapping date ranges
   */
  async createTerm(data: CreateTermInput): Promise<Term> {
    // Get the parent academic year
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: data.academicYearId },
    })

    if (!academicYear) {
      throw new Error(`Academic year with id ${data.academicYearId} not found`)
    }

    // Validate term dates against academic year
    const validation = validateTermDates(
      data.startDate,
      data.endDate,
      academicYear.startDate,
      academicYear.endDate
    )
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Check for overlapping terms
    const overlapping = await this.checkTermOverlap(
      data.academicYearId,
      data.startDate,
      data.endDate
    )
    if (overlapping) {
      throw new Error('Term dates overlap with existing term')
    }

    // Calculate week count
    const weekCount = calculateWeekCount(data.startDate, data.endDate)

    const term = await prisma.term.create({
      data: {
        schoolId: academicYear.schoolId,
        academicYearId: data.academicYearId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        weekCount,
      },
    })

    return mapPrismaTermToDomain(term)
  }

  /**
   * Check if a term's dates overlap with existing terms in the same academic year
   * Requirement 2.2: Enforce non-overlapping date ranges
   */
  async checkTermOverlap(
    academicYearId: string,
    startDate: Date,
    endDate: Date,
    excludeTermId?: string
  ): Promise<boolean> {
    const existingTerms = await prisma.term.findMany({
      where: {
        academicYearId,
        ...(excludeTermId ? { id: { not: excludeTermId } } : {}),
      },
    })

    return existingTerms.some((term) =>
      dateRangesOverlap(startDate, endDate, term.startDate, term.endDate)
    )
  }

  /**
   * Get term by ID
   */
  async getTermById(id: string): Promise<Term | null> {
    const term = await prisma.term.findUnique({
      where: { id },
    })

    if (!term) return null
    return mapPrismaTermToDomain(term)
  }

  /**
   * Get all terms for an academic year with holiday information
   */
  async getTermsByAcademicYearWithHolidays(academicYearId: string): Promise<(Term & { 
    holidayInfo?: { 
      startDate: Date; 
      endDate: Date; 
      weekCount: number;
      dayCount: number;
    } 
  })[]> {
    const terms = await prisma.term.findMany({
      where: { academicYearId },
      orderBy: { startDate: 'asc' },
    })

    // Map terms and calculate holiday periods between them
    const termsWithHolidays = terms.map((term, index) => {
      const termWithDomain = mapPrismaTermToDomain(term);
      
      // Calculate holiday period if there's a next term
      if (index < terms.length - 1) {
        const nextTerm = terms[index + 1];
        const holidayInfo = getHolidayPeriod(term.endDate, nextTerm.startDate);
        
        return {
          ...termWithDomain,
          holidayInfo: holidayInfo ? {
            startDate: holidayInfo.startDate,
            endDate: holidayInfo.endDate,
            weekCount: holidayInfo.weekCount,
            dayCount: holidayInfo.dayCount
          } : undefined
        };
      }
      
      return termWithDomain;
    });

    return termsWithHolidays;
  }

  /**
   * Get all terms for an academic year
   */
  async getTermsByAcademicYear(academicYearId: string): Promise<Term[]> {
    const terms = await prisma.term.findMany({
      where: { academicYearId },
      orderBy: { startDate: 'asc' },
    })

    return terms.map(mapPrismaTermToDomain)
  }

  /**
   * Get the current term based on today's date
   */
  async getCurrentTerm(schoolId: string): Promise<Term | null> {
    const today = new Date()

    const term = await prisma.term.findFirst({
      where: {
        academicYear: {
          schoolId,
          isActive: true,
        },
        startDate: { lte: today },
        endDate: { gte: today },
      },
    })

    if (!term) return null
    return mapPrismaTermToDomain(term)
  }

  /**
   * Calculate the current week number within a term
   * Returns 0 if the date is before the term starts
   * Returns weekCount + 1 if the date is after the term ends
   */
  getCurrentTermWeek(term: Term, date: Date = new Date()): number {
    if (date < term.startDate) {
      return 0
    }

    if (date > term.endDate) {
      return term.weekCount + 1
    }

    const msPerWeek = 7 * 24 * 60 * 60 * 1000
    const diffMs = date.getTime() - term.startDate.getTime()
    return Math.floor(diffMs / msPerWeek) + 1
  }

  /**
   * Update a term
   */
  async updateTerm(
    id: string,
    data: Partial<Pick<Term, 'name' | 'startDate' | 'endDate'>>
  ): Promise<Term> {
    const currentTerm = await prisma.term.findUnique({
      where: { id },
      include: { academicYear: true },
    })

    if (!currentTerm) {
      throw new Error(`Term with id ${id} not found`)
    }

    // If dates are being updated, validate them
    if (data.startDate || data.endDate) {
      const startDate = data.startDate ?? currentTerm.startDate
      const endDate = data.endDate ?? currentTerm.endDate

      const validation = validateTermDates(
        startDate,
        endDate,
        currentTerm.academicYear.startDate,
        currentTerm.academicYear.endDate
      )
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Check for overlapping terms (excluding current term)
      const overlapping = await this.checkTermOverlap(
        currentTerm.academicYearId,
        startDate,
        endDate,
        id
      )
      if (overlapping) {
        throw new Error('Term dates overlap with existing term')
      }
    }

    // Recalculate week count if dates changed
    const updateData: Record<string, unknown> = { ...data }
    if (data.startDate || data.endDate) {
      const startDate = data.startDate ?? currentTerm.startDate
      const endDate = data.endDate ?? currentTerm.endDate
      updateData.weekCount = calculateWeekCount(startDate, endDate)
    }

    const term = await prisma.term.update({
      where: { id },
      data: updateData,
    })

    return mapPrismaTermToDomain(term)
  }

  /**
   * Delete a term (only if it has no associated data)
   * Requirement 11.6: Prevent deletion of academic structures that have associated data
   */
  async deleteTerm(id: string): Promise<void> {
    // Check for associated exams
    const examCount = await prisma.exam.count({
      where: { termId: id },
    })

    if (examCount > 0) {
      throw new Error('Cannot delete term with existing exams')
    }

    // Check for associated fee structures
    const feeStructureCount = await prisma.feeStructure.count({
      where: { termId: id },
    })

    if (feeStructureCount > 0) {
      throw new Error('Cannot delete term with existing fee structures')
    }

    // Check for associated results - Requirement 11.6
    const resultCount = await prisma.result.count({
      where: { termId: id },
    })

    if (resultCount > 0) {
      throw new Error('Cannot delete term with existing student results')
    }

    // Check for associated payments - Requirement 11.6
    const paymentCount = await prisma.payment.count({
      where: { termId: id },
    })

    if (paymentCount > 0) {
      throw new Error('Cannot delete term with existing payments')
    }

    await prisma.term.delete({
      where: { id },
    })
  }

  /**
   * Check if a term has any associated data
   * Requirement 11.6: Prevent deletion of academic structures that have associated data
   */
  async hasAssociatedData(id: string): Promise<{ hasData: boolean; details: string[] }> {
    const details: string[] = []

    const examCount = await prisma.exam.count({
      where: { termId: id },
    })
    if (examCount > 0) {
      details.push(`${examCount} exam(s)`)
    }

    const feeStructureCount = await prisma.feeStructure.count({
      where: { termId: id },
    })
    if (feeStructureCount > 0) {
      details.push(`${feeStructureCount} fee structure(s)`)
    }

    const resultCount = await prisma.result.count({
      where: { termId: id },
    })
    if (resultCount > 0) {
      details.push(`${resultCount} student result(s)`)
    }

    const paymentCount = await prisma.payment.count({
      where: { termId: id },
    })
    if (paymentCount > 0) {
      details.push(`${paymentCount} payment(s)`)
    }

    return {
      hasData: details.length > 0,
      details,
    }
  }

  /**
   * Process term end operations
   * Requirement 19.5: Reset sms_sent_count to zero for all students
   * This should be called when a term ends
   */
  async processTermEnd(termId: string): Promise<{
    termId: string
    schoolId: string
    studentsReset: number
    processedAt: Date
  }> {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: {
        academicYear: {
          select: { schoolId: true },
        },
      },
    })

    if (!term) {
      throw new Error(`Term with id ${termId} not found`)
    }

    const schoolId = term.academicYear.schoolId

    // Reset SMS counters for all students in the school
    const result = await prisma.student.updateMany({
      where: { schoolId },
      data: { smsSentCount: 0 },
    })

    return {
      termId,
      schoolId,
      studentsReset: result.count,
      processedAt: new Date(),
    }
  }

  /**
   * Check if a term has ended
   */
  hasTermEnded(term: Term, date: Date = new Date()): boolean {
    return date > term.endDate
  }

  /**
   * Get terms that have ended but not been processed
   * This can be used by a scheduled job to process term ends
   */
  async getUnprocessedEndedTerms(schoolId: string): Promise<Term[]> {
    const today = new Date()

    const terms = await prisma.term.findMany({
      where: {
        academicYear: {
          schoolId,
        },
        endDate: { lt: today },
      },
      orderBy: { endDate: 'desc' },
    })

    return terms.map(mapPrismaTermToDomain)
  }
}

// Export singleton instance
export const termService = new TermService()
