/**
 * Academic Year Service
 * Handles academic year management operations
 * Requirements: 2.1, 2.5
 */
import { prisma } from '@/lib/db'
import {
  AcademicYear,
  CreateAcademicYearInput,
} from '@/types'

/**
 * Map Prisma AcademicYear to domain AcademicYear type
 */
function mapPrismaAcademicYearToDomain(prismaYear: {
  id: string
  schoolId: string
  name: string
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}): AcademicYear {
  return {
    id: prismaYear.id,
    schoolId: prismaYear.schoolId,
    name: prismaYear.name,
    startDate: prismaYear.startDate,
    endDate: prismaYear.endDate,
    isActive: prismaYear.isActive,
    createdAt: prismaYear.createdAt,
    updatedAt: prismaYear.updatedAt,
  }
}

/**
 * Check if two date ranges overlap
 * Two ranges [a1, a2] and [b1, b2] overlap if a1 < b2 AND b1 < a2
 * Requirement 11.5: Validate date ranges do not overlap incorrectly
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1
}

/**
 * Validate academic year dates
 * - End date must be after start date
 * - Year should not overlap with existing active years for the same school
 * Requirement 11.5: Validate date ranges do not overlap incorrectly
 */
export function validateAcademicYearDates(startDate: Date, endDate: Date): { valid: boolean; error?: string } {
  if (endDate <= startDate) {
    return { valid: false, error: 'End date must be after start date' }
  }
  return { valid: true }
}

export class AcademicYearService {
  /**
   * Check if an academic year's dates overlap with existing years in the same school
   * Requirement 11.5: Validate date ranges do not overlap incorrectly
   */
  async checkAcademicYearOverlap(
    schoolId: string,
    startDate: Date,
    endDate: Date,
    excludeYearId?: string
  ): Promise<boolean> {
    const existingYears = await prisma.academicYear.findMany({
      where: {
        schoolId,
        ...(excludeYearId ? { id: { not: excludeYearId } } : {}),
      },
    })

    return existingYears.some(year =>
      dateRangesOverlap(startDate, endDate, year.startDate, year.endDate)
    )
  }

  /**
   * Create a new academic year with date validation
   * Requirement 2.1: Store the year with start date, end date, and active status
   * Requirement 11.5: Validate date ranges do not overlap incorrectly
   */
  async createAcademicYear(data: CreateAcademicYearInput): Promise<AcademicYear> {
    // Validate dates
    const validation = validateAcademicYearDates(data.startDate, data.endDate)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Check for overlapping academic years - Requirement 11.5
    const overlapping = await this.checkAcademicYearOverlap(
      data.schoolId,
      data.startDate,
      data.endDate
    )
    if (overlapping) {
      throw new Error('Academic year dates overlap with existing academic year')
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        schoolId: data.schoolId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        isActive: false, // New years start as inactive
      },
    })

    return mapPrismaAcademicYearToDomain(academicYear)
  }

  /**
   * Get academic year by ID
   */
  async getAcademicYearById(id: string): Promise<AcademicYear | null> {
    const academicYear = await prisma.academicYear.findUnique({
      where: { id },
    })

    if (!academicYear) return null
    return mapPrismaAcademicYearToDomain(academicYear)
  }

  /**
   * Get the active academic year for a school
   * Requirement 2.5: Any module references academic structure from single source of truth
   */
  async getActiveYear(schoolId: string): Promise<AcademicYear | null> {
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isActive: true,
      },
    })

    if (!academicYear) return null
    return mapPrismaAcademicYearToDomain(academicYear)
  }

  /**
   * Get all academic years for a school
   */
  async getAcademicYearsBySchool(schoolId: string): Promise<AcademicYear[]> {
    const academicYears = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
    })

    return academicYears.map(mapPrismaAcademicYearToDomain)
  }

  /**
   * Activate an academic year
   * Deactivates any other active year for the same school first
   */
  async activateYear(id: string): Promise<AcademicYear> {
    const yearToActivate = await prisma.academicYear.findUnique({
      where: { id },
    })

    if (!yearToActivate) {
      throw new Error(`Academic year with id ${id} not found`)
    }

    // Deactivate all other years for this school
    await prisma.academicYear.updateMany({
      where: {
        schoolId: yearToActivate.schoolId,
        isActive: true,
        id: { not: id },
      },
      data: { isActive: false },
    })

    // Activate the specified year
    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: { isActive: true },
    })

    return mapPrismaAcademicYearToDomain(academicYear)
  }

  /**
   * Deactivate an academic year
   */
  async deactivateYear(id: string): Promise<AcademicYear> {
    const academicYear = await prisma.academicYear.update({
      where: { id },
      data: { isActive: false },
    })

    return mapPrismaAcademicYearToDomain(academicYear)
  }

  /**
   * Update an academic year
   * Requirement 11.5: Validate date ranges do not overlap incorrectly
   */
  async updateAcademicYear(
    id: string,
    data: Partial<Pick<AcademicYear, 'name' | 'startDate' | 'endDate'>>
  ): Promise<AcademicYear> {
    // If dates are being updated, validate them
    if (data.startDate || data.endDate) {
      const currentYear = await prisma.academicYear.findUnique({ where: { id } })
      if (!currentYear) {
        throw new Error(`Academic year with id ${id} not found`)
      }

      const startDate = data.startDate ?? currentYear.startDate
      const endDate = data.endDate ?? currentYear.endDate

      const validation = validateAcademicYearDates(startDate, endDate)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Check for overlapping academic years (excluding current year) - Requirement 11.5
      const overlapping = await this.checkAcademicYearOverlap(
        currentYear.schoolId,
        startDate,
        endDate,
        id
      )
      if (overlapping) {
        throw new Error('Academic year dates overlap with existing academic year')
      }
    }

    const academicYear = await prisma.academicYear.update({
      where: { id },
      data,
    })

    return mapPrismaAcademicYearToDomain(academicYear)
  }

  /**
   * Delete an academic year (only if it has no terms or associated data)
   * Requirement 11.6: Prevent deletion of academic structures that have associated data
   */
  async deleteAcademicYear(id: string): Promise<void> {
    const termCount = await prisma.term.count({
      where: { academicYearId: id },
    })

    if (termCount > 0) {
      throw new Error('Cannot delete academic year with existing terms')
    }

    await prisma.academicYear.delete({
      where: { id },
    })
  }

  /**
   * Check if an academic year has any associated data
   * Requirement 11.6: Prevent deletion of academic structures that have associated data
   */
  async hasAssociatedData(id: string): Promise<{ hasData: boolean; details: string[] }> {
    const details: string[] = []

    const termCount = await prisma.term.count({
      where: { academicYearId: id },
    })
    if (termCount > 0) {
      details.push(`${termCount} term(s)`)
    }

    return {
      hasData: details.length > 0,
      details,
    }
  }
}

// Export singleton instance
export const academicYearService = new AcademicYearService()
