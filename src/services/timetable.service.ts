/**
 * Timetable Service
 * Handles timetable entry creation, conflict detection, and publishing
 * Requirements: 2.7, 6.1, 6.2, 6.3, 6.4
 * 
 * Teacher Management Integration:
 * - Requirement 2.7: Exclude inactive teachers from timetable assignments
 * - Validates teacher employment status before creating/updating entries
 */
import { prisma } from '@/lib/db'
import {
  TimetableEntry,
  CreateTimetableEntryInput,
} from '@/types'
import { TimetableConflict } from '@/types/services'
import { INACTIVE_STATUSES, TeacherEmploymentStatus, isInactiveStatus } from '@/types/teacher'

/**
 * Extended timetable entry with subject and class details for teacher schedule views
 * Requirement 6.4: Display only assigned periods and rooms for teachers
 */
export interface TeacherScheduleEntry {
  id: string
  dayOfWeek: number
  period: number
  room?: string
  subject: {
    id: string
    name: string
    code: string
  }
  class: {
    id: string
    name: string
    level: number
  }
  createdAt: Date
  updatedAt: Date
}

/**
 * Weekly schedule organized by day for teacher view
 */
export interface TeacherWeeklySchedule {
  staffId: string
  staffName: string
  schedule: {
    [dayOfWeek: number]: TeacherScheduleEntry[]
  }
  totalPeriods: number
}

/**
 * Map Prisma TimetableEntry to domain TimetableEntry type
 */
function mapPrismaTimetableEntryToDomain(prismaEntry: {
  id: string
  classId: string
  subjectId: string
  staffId: string
  dayOfWeek: number
  period: number
  room: string | null
  createdAt: Date
  updatedAt: Date
}): TimetableEntry {
  return {
    id: prismaEntry.id,
    classId: prismaEntry.classId,
    subjectId: prismaEntry.subjectId,
    staffId: prismaEntry.staffId,
    dayOfWeek: prismaEntry.dayOfWeek,
    period: prismaEntry.period,
    room: prismaEntry.room ?? undefined,
    createdAt: prismaEntry.createdAt,
    updatedAt: prismaEntry.updatedAt,
  }
}

/**
 * Validate day of week (1-7, Monday-Sunday)
 */
function isValidDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 1 && day <= 7
}

/**
 * Validate period (1-10 for typical school periods)
 */
function isValidPeriod(period: number): boolean {
  return Number.isInteger(period) && period >= 1 && period <= 10
}

export class TimetableService {
  /**
   * Check if a teacher is inactive (from Teacher model)
   * Requirement 2.7: Exclude inactive teachers from timetable assignments
   * 
   * @param staffId - The staff/teacher ID to check
   * @returns Object with isInactive flag and teacher info if found
   */
  private async checkTeacherStatus(staffId: string): Promise<{
    isTeacher: boolean
    isInactive: boolean
    employmentStatus?: string
  }> {
    const teacher = await prisma.teacher.findFirst({
      where: { id: staffId },
      select: {
        id: true,
        employmentStatus: true,
      },
    })

    if (!teacher) {
      // Not a teacher from Teacher model, might be staff
      return { isTeacher: false, isInactive: false }
    }

    const inactive = isInactiveStatus(teacher.employmentStatus as TeacherEmploymentStatus)

    return {
      isTeacher: true,
      isInactive: inactive,
      employmentStatus: teacher.employmentStatus,
    }
  }

  /**
   * Check for conflicts when creating a timetable entry
   * Requirement 6.1: Validate no teacher or room is double-booked at that time
   * Requirement 6.2: Reject entry and display conflicting allocation
   */
  async checkConflicts(
    data: CreateTimetableEntryInput,
    excludeEntryId?: string
  ): Promise<TimetableConflict[]> {
    const conflicts: TimetableConflict[] = []

    // Build the where clause for finding conflicts
    const baseWhere = {
      dayOfWeek: data.dayOfWeek,
      period: data.period,
      ...(excludeEntryId ? { id: { not: excludeEntryId } } : {}),
    }

    // Check for teacher double-booking
    const teacherConflict = await prisma.timetableEntry.findFirst({
      where: {
        ...baseWhere,
        staffId: data.staffId,
      },
    })

    if (teacherConflict) {
      conflicts.push({
        type: 'teacher',
        existingEntry: mapPrismaTimetableEntryToDomain(teacherConflict),
        conflictingEntry: data,
      })
    }

    // Check for room double-booking (only if room is specified)
    if (data.room && data.room.trim() !== '') {
      const roomConflict = await prisma.timetableEntry.findFirst({
        where: {
          ...baseWhere,
          room: data.room,
        },
      })

      if (roomConflict) {
        conflicts.push({
          type: 'room',
          existingEntry: mapPrismaTimetableEntryToDomain(roomConflict),
          conflictingEntry: data,
        })
      }
    }

    // Check for class double-booking (a class can't have two subjects at the same time)
    const classConflict = await prisma.timetableEntry.findFirst({
      where: {
        ...baseWhere,
        classId: data.classId,
      },
    })

    if (classConflict) {
      conflicts.push({
        type: 'teacher',
        existingEntry: mapPrismaTimetableEntryToDomain(classConflict),
        conflictingEntry: data,
      })
    }

    return conflicts
  }

  /**
   * Create a new timetable entry
   * Requirement 2.7: Exclude inactive teachers from timetable assignments
   * Requirement 6.1: Validate no teacher or room is double-booked
   * Requirement 6.2: Reject entry and display conflicting allocation
   */
  async createEntry(data: CreateTimetableEntryInput): Promise<TimetableEntry> {
    // Validate day of week
    if (!isValidDayOfWeek(data.dayOfWeek)) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)')
    }

    // Validate period
    if (!isValidPeriod(data.period)) {
      throw new Error('Period must be between 1 and 10')
    }

    // Validate class exists
    const classRecord = await prisma.class.findUnique({
      where: { id: data.classId },
    })

    if (!classRecord) {
      throw new Error(`Class with id ${data.classId} not found`)
    }

    // Validate subject exists and belongs to the same school
    const subject = await prisma.subject.findUnique({
      where: { id: data.subjectId },
    })

    if (!subject) {
      throw new Error(`Subject with id ${data.subjectId} not found`)
    }

    if (subject.schoolId !== classRecord.schoolId) {
      throw new Error('Subject must belong to the same school as the class')
    }

    // Validate staff exists and belongs to the same school
    const staff = await prisma.staff.findUnique({
      where: { id: data.staffId },
    })

    if (!staff) {
      throw new Error(`Staff with id ${data.staffId} not found`)
    }

    if (staff.schoolId !== classRecord.schoolId) {
      throw new Error('Staff must belong to the same school as the class')
    }

    // Requirement 2.7: Check if teacher is inactive
    const teacherStatus = await this.checkTeacherStatus(data.staffId)
    if (teacherStatus.isTeacher && teacherStatus.isInactive) {
      throw new Error(
        `Cannot assign inactive teacher to timetable. ` +
        `Teacher status: ${teacherStatus.employmentStatus}. ` +
        `Inactive teachers must be reactivated before being assigned to timetable entries.`
      )
    }

    // Check for conflicts
    const conflicts = await this.checkConflicts(data)

    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(c => {
        if (c.type === 'teacher') {
          return `Teacher is already scheduled for class ${c.existingEntry.classId} at this time`
        } else {
          return `Room "${c.existingEntry.room}" is already booked at this time`
        }
      })
      throw new Error(`Scheduling conflict detected: ${conflictMessages.join('; ')}`)
    }

    // Create the timetable entry
    const entry = await prisma.timetableEntry.create({
      data: {
        classId: data.classId,
        subjectId: data.subjectId,
        staffId: data.staffId,
        dayOfWeek: data.dayOfWeek,
        period: data.period,
        room: data.room,
      },
    })

    return mapPrismaTimetableEntryToDomain(entry)
  }

  /**
   * Get timetable entry by ID
   */
  async getEntryById(id: string): Promise<TimetableEntry | null> {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id },
    })

    if (!entry) return null
    return mapPrismaTimetableEntryToDomain(entry)
  }

  /**
   * Get all timetable entries for a class
   * Requirement 6.3: Make timetable visible to affected students
   */
  async getEntriesByClass(classId: string): Promise<TimetableEntry[]> {
    const entries = await prisma.timetableEntry.findMany({
      where: { classId },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    })

    return entries.map(mapPrismaTimetableEntryToDomain)
  }

  /**
   * Get all timetable entries for a teacher
   * Requirement 6.4: Display only assigned periods and rooms for teachers
   */
  async getEntriesByTeacher(staffId: string): Promise<TimetableEntry[]> {
    const entries = await prisma.timetableEntry.findMany({
      where: { staffId },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    })

    return entries.map(mapPrismaTimetableEntryToDomain)
  }

  /**
   * Get all timetable entries for a school
   */
  async getEntriesBySchool(schoolId: string): Promise<TimetableEntry[]> {
    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true },
    })

    const classIds = classes.map(c => c.id)

    if (classIds.length === 0) {
      return []
    }

    const entries = await prisma.timetableEntry.findMany({
      where: { classId: { in: classIds } },
      orderBy: [{ classId: 'asc' }, { dayOfWeek: 'asc' }, { period: 'asc' }],
    })

    return entries.map(mapPrismaTimetableEntryToDomain)
  }


  /**
   * Update a timetable entry
   * Requirement 2.7: Exclude inactive teachers from timetable assignments
   */
  async updateEntry(
    id: string,
    data: Partial<CreateTimetableEntryInput>
  ): Promise<TimetableEntry> {
    const existingEntry = await prisma.timetableEntry.findUnique({
      where: { id },
    })

    if (!existingEntry) {
      throw new Error(`Timetable entry with id ${id} not found`)
    }

    // Build the updated entry data for conflict checking
    const updatedData: CreateTimetableEntryInput = {
      classId: data.classId ?? existingEntry.classId,
      subjectId: data.subjectId ?? existingEntry.subjectId,
      staffId: data.staffId ?? existingEntry.staffId,
      dayOfWeek: data.dayOfWeek ?? existingEntry.dayOfWeek,
      period: data.period ?? existingEntry.period,
      room: data.room ?? existingEntry.room ?? undefined,
    }

    // Validate day of week if being updated
    if (data.dayOfWeek !== undefined && !isValidDayOfWeek(data.dayOfWeek)) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)')
    }

    // Validate period if being updated
    if (data.period !== undefined && !isValidPeriod(data.period)) {
      throw new Error('Period must be between 1 and 10')
    }

    // Requirement 2.7: Check if new teacher is inactive (when changing staffId)
    if (data.staffId && data.staffId !== existingEntry.staffId) {
      const teacherStatus = await this.checkTeacherStatus(data.staffId)
      if (teacherStatus.isTeacher && teacherStatus.isInactive) {
        throw new Error(
          `Cannot assign inactive teacher to timetable. ` +
          `Teacher status: ${teacherStatus.employmentStatus}. ` +
          `Inactive teachers must be reactivated before being assigned to timetable entries.`
        )
      }
    }

    // Check for conflicts (excluding the current entry)
    const conflicts = await this.checkConflicts(updatedData, id)

    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(c => {
        if (c.type === 'teacher') {
          return `Teacher is already scheduled for class ${c.existingEntry.classId} at this time`
        } else {
          return `Room "${c.existingEntry.room}" is already booked at this time`
        }
      })
      throw new Error(`Scheduling conflict detected: ${conflictMessages.join('; ')}`)
    }

    const entry = await prisma.timetableEntry.update({
      where: { id },
      data: {
        ...(data.classId && { classId: data.classId }),
        ...(data.subjectId && { subjectId: data.subjectId }),
        ...(data.staffId && { staffId: data.staffId }),
        ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek }),
        ...(data.period !== undefined && { period: data.period }),
        ...(data.room !== undefined && { room: data.room }),
      },
    })

    return mapPrismaTimetableEntryToDomain(entry)
  }

  /**
   * Delete a timetable entry
   */
  async deleteEntry(id: string): Promise<void> {
    const entry = await prisma.timetableEntry.findUnique({
      where: { id },
    })

    if (!entry) {
      throw new Error(`Timetable entry with id ${id} not found`)
    }

    await prisma.timetableEntry.delete({
      where: { id },
    })
  }

  /**
   * Publish timetable for a class
   * Requirement 6.3: Make timetable visible to affected teachers and students
   */
  async publishTimetable(classId: string): Promise<{ published: boolean; entryCount: number }> {
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classRecord) {
      throw new Error(`Class with id ${classId} not found`)
    }

    const entries = await this.getEntriesByClass(classId)

    if (entries.length === 0) {
      throw new Error('Cannot publish empty timetable')
    }

    return {
      published: true,
      entryCount: entries.length,
    }
  }

  /**
   * Get timetable entries for a specific day
   */
  async getEntriesByDay(classId: string, dayOfWeek: number): Promise<TimetableEntry[]> {
    if (!isValidDayOfWeek(dayOfWeek)) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)')
    }

    const entries = await prisma.timetableEntry.findMany({
      where: {
        classId,
        dayOfWeek,
      },
      orderBy: { period: 'asc' },
    })

    return entries.map(mapPrismaTimetableEntryToDomain)
  }

  /**
   * Get teacher schedule for a specific day
   * Requirement 6.4: Display only assigned periods and rooms for teachers
   */
  async getTeacherScheduleByDay(staffId: string, dayOfWeek: number): Promise<TimetableEntry[]> {
    if (!isValidDayOfWeek(dayOfWeek)) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)')
    }

    const entries = await prisma.timetableEntry.findMany({
      where: {
        staffId,
        dayOfWeek,
      },
      orderBy: { period: 'asc' },
    })

    return entries.map(mapPrismaTimetableEntryToDomain)
  }

  /**
   * Get detailed teacher schedule with subject and class information
   * Requirement 6.4: Display only assigned periods and rooms for teachers
   */
  async getTeacherScheduleWithDetails(staffId: string): Promise<TeacherScheduleEntry[]> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    })

    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    const entries = await prisma.timetableEntry.findMany({
      where: { staffId },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: 'asc' }],
    })

    return entries.map(entry => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
      room: entry.room ?? undefined,
      subject: {
        id: entry.subject.id,
        name: entry.subject.name,
        code: entry.subject.code,
      },
      class: {
        id: entry.class.id,
        name: entry.class.name,
        level: entry.class.level,
      },
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }))
  }

  /**
   * Get teacher's weekly schedule organized by day
   * Requirement 6.4: Display only assigned periods and rooms for teachers
   */
  async getTeacherWeeklySchedule(staffId: string): Promise<TeacherWeeklySchedule> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    const entries = await this.getTeacherScheduleWithDetails(staffId)

    const schedule: { [dayOfWeek: number]: TeacherScheduleEntry[] } = {}
    
    for (let day = 1; day <= 7; day++) {
      schedule[day] = []
    }

    for (const entry of entries) {
      schedule[entry.dayOfWeek].push(entry)
    }

    for (const day of Object.keys(schedule)) {
      schedule[Number(day)].sort((a, b) => a.period - b.period)
    }

    return {
      staffId: staff.id,
      staffName: `${staff.firstName} ${staff.lastName}`,
      schedule,
      totalPeriods: entries.length,
    }
  }


  /**
   * Get teacher schedule for a specific day with full details
   * Requirement 6.4: Display only assigned periods and rooms for teachers
   */
  async getTeacherDailyScheduleWithDetails(
    staffId: string,
    dayOfWeek: number
  ): Promise<TeacherScheduleEntry[]> {
    if (!isValidDayOfWeek(dayOfWeek)) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)')
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    })

    if (!staff) {
      throw new Error(`Staff with id ${staffId} not found`)
    }

    const entries = await prisma.timetableEntry.findMany({
      where: {
        staffId,
        dayOfWeek,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
      orderBy: { period: 'asc' },
    })

    return entries.map(entry => ({
      id: entry.id,
      dayOfWeek: entry.dayOfWeek,
      period: entry.period,
      room: entry.room ?? undefined,
      subject: {
        id: entry.subject.id,
        name: entry.subject.name,
        code: entry.subject.code,
      },
      class: {
        id: entry.class.id,
        name: entry.class.name,
        level: entry.class.level,
      },
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }))
  }

  /**
   * Get teacher's free periods for a specific day
   * Requirement 6.4: Display only assigned periods and rooms for teachers
   */
  async getTeacherFreePeriods(staffId: string, dayOfWeek: number): Promise<number[]> {
    if (!isValidDayOfWeek(dayOfWeek)) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)')
    }

    const entries = await this.getTeacherScheduleByDay(staffId, dayOfWeek)
    const assignedPeriods = new Set(entries.map(e => e.period))
    
    const freePeriods: number[] = []
    for (let period = 1; period <= 10; period++) {
      if (!assignedPeriods.has(period)) {
        freePeriods.push(period)
      }
    }

    return freePeriods
  }

  /**
   * Check if a teacher is available at a specific time slot
   * Requirement 6.4: Display only assigned periods and rooms for teachers
   */
  async isTeacherAvailable(
    staffId: string,
    dayOfWeek: number,
    period: number
  ): Promise<boolean> {
    if (!isValidDayOfWeek(dayOfWeek)) {
      throw new Error('Day of week must be between 1 (Monday) and 7 (Sunday)')
    }

    if (!isValidPeriod(period)) {
      throw new Error('Period must be between 1 and 10')
    }

    const existingEntry = await prisma.timetableEntry.findFirst({
      where: {
        staffId,
        dayOfWeek,
        period,
      },
    })

    return existingEntry === null
  }

  /**
   * Clear all timetable entries for a class
   */
  async clearClassTimetable(classId: string): Promise<number> {
    const result = await prisma.timetableEntry.deleteMany({
      where: { classId },
    })

    return result.count
  }

  /**
   * Get all rooms used in timetables for a school
   */
  async getUsedRooms(schoolId: string): Promise<string[]> {
    const entries = await this.getEntriesBySchool(schoolId)
    const rooms = new Set<string>()

    for (const entry of entries) {
      if (entry.room) {
        rooms.add(entry.room)
      }
    }

    return Array.from(rooms).sort()
  }

  /**
   * Get available teachers for timetable assignment
   * Requirement 2.7: Filter out inactive teachers from timetable assignments
   * 
   * @param schoolId - The school ID for tenant isolation
   * @returns List of active teachers available for timetable assignment
   */
  async getAvailableTeachersForTimetable(
    schoolId: string
  ): Promise<Array<{ id: string; firstName: string; lastName: string; employmentStatus: string }>> {
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        employmentStatus: { notIn: [...INACTIVE_STATUSES] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employmentStatus: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    })

    return teachers
  }

  /**
   * Remove inactive teacher from all timetable entries
   * Requirement 2.7: Exclude inactive teachers from timetable assignments
   * 
   * This method is called when a teacher's status changes to inactive.
   * It removes all their timetable entries and returns the count of removed entries.
   * 
   * @param teacherId - The teacher ID to remove from timetable
   * @param schoolId - The school ID for tenant isolation
   * @returns Number of timetable entries removed
   */
  async removeInactiveTeacherFromTimetable(
    teacherId: string,
    schoolId: string
  ): Promise<{ removedCount: number; entries: TimetableEntry[] }> {
    // Verify teacher exists and is inactive
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: {
        id: true,
        employmentStatus: true,
      },
    })

    if (!teacher) {
      throw new Error(`Teacher with id ${teacherId} not found in school ${schoolId}`)
    }

    const inactive = isInactiveStatus(teacher.employmentStatus as TeacherEmploymentStatus)

    if (!inactive) {
      throw new Error(
        `Teacher is not inactive (status: ${teacher.employmentStatus}). ` +
        `Only inactive teachers can be removed from timetable.`
      )
    }

    // Get all timetable entries for this teacher before deletion
    const entries = await prisma.timetableEntry.findMany({
      where: { staffId: teacherId },
    })

    // Delete all timetable entries for this teacher
    const result = await prisma.timetableEntry.deleteMany({
      where: { staffId: teacherId },
    })

    return {
      removedCount: result.count,
      entries: entries.map(mapPrismaTimetableEntryToDomain),
    }
  }

  /**
   * Check if a teacher can be assigned to timetable
   * Requirement 2.7: Exclude inactive teachers from timetable assignments
   * 
   * @param teacherId - The teacher ID to check
   * @returns Object indicating if teacher can be assigned and reason if not
   */
  async canAssignTeacherToTimetable(teacherId: string): Promise<{
    canAssign: boolean
    reason?: string
    employmentStatus?: string
  }> {
    const teacherStatus = await this.checkTeacherStatus(teacherId)

    if (!teacherStatus.isTeacher) {
      // Not a teacher from Teacher model, allow assignment (might be staff)
      return { canAssign: true }
    }

    if (teacherStatus.isInactive) {
      return {
        canAssign: false,
        reason: `Teacher is inactive (status: ${teacherStatus.employmentStatus}). ` +
                `Inactive teachers cannot be assigned to timetable entries.`,
        employmentStatus: teacherStatus.employmentStatus,
      }
    }

    return {
      canAssign: true,
      employmentStatus: teacherStatus.employmentStatus,
    }
  }
}

// Export singleton instance
export const timetableService = new TimetableService()
