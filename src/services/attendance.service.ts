/**
 * Attendance Service
 * Handles attendance recording, tracking, and absence detection
 * Requirements: 3.7, 5.1, 5.2, 5.3, 5.4, 38.1, 38.2, 38.3, 38.4, 38.5
 * Teacher Dashboard Requirements: 4.3, 4.4, 4.5 - Time-based locking
 */  
import { prisma } from '@/lib/db'
import {
  Attendance,
  CreateAttendanceInput,
  AttendanceRecord,
  AbsenceStatus,
} from '@/types'
import { AttendanceStatus } from '@/types/enums'
import { teacherAssignmentService } from './teacher-assignment.service'
import { schoolSettingsService, AttendanceSettings } from './school-settings.service'

// Threshold for daily absence detection (Requirement 38.1)
const DAILY_ABSENCE_THRESHOLD = 2

// Threshold for weekly absence pattern detection (Requirement 38.5)
const WEEKLY_ABSENCE_PATTERN_THRESHOLD = 3

/**
 * Attendance lock state for teacher dashboard
 * Requirements: 4.3, 4.4, 4.5
 */
export interface AttendanceLockState {
  isLocked: boolean
  cutoffTime: string
  canEdit: boolean
  requiresAdminApproval: boolean
  message?: string
}

/**
 * Map Prisma Attendance to domain Attendance type
 */
function mapPrismaAttendanceToDomain(prismaAttendance: {
  id: string
  studentId: string
  classId: string
  date: Date
  period: number
  status: string
  recordedBy: string
  recordedAt: Date
  remarks: string | null
  createdAt: Date
  updatedAt: Date
}): Attendance {
  return {
    id: prismaAttendance.id,
    studentId: prismaAttendance.studentId,
    classId: prismaAttendance.classId,
    date: prismaAttendance.date,
    period: prismaAttendance.period,
    status: prismaAttendance.status as AttendanceStatus,
    recordedBy: prismaAttendance.recordedBy,
    recordedAt: prismaAttendance.recordedAt,
    remarks: prismaAttendance.remarks ?? undefined,
    createdAt: prismaAttendance.createdAt,
    updatedAt: prismaAttendance.updatedAt,
  }
}


/**
 * Notification queue item for absence alerts
 */
export interface AbsenceNotification {
  studentId: string
  studentName: string
  guardianId: string
  date: Date
  periodsAbsent: number[]
  responseLink: string
}

/**
 * Absence pattern detection result
 */
export interface AbsencePattern {
  studentId: string
  weekStartDate: Date
  daysAbsent: number
  dates: Date[]
  requiresEscalation: boolean
}

/**
 * Class attendance statistics
 */
export interface ClassAttendanceStats {
  classId: string
  date: Date
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
  attendancePercentage: number
}

/**
 * Student attendance history
 */
export interface AttendanceHistory {
  studentId: string
  termId: string
  records: Attendance[]
  summary: {
    totalDays: number
    presentDays: number
    absentDays: number
    lateDays: number
    attendancePercentage: number
  }
}

export class AttendanceService {
  /**
   * Record attendance for a class on a specific date and period
   * Requirement 3.7: Prevent attendance marking without class assignment
   * Requirement 5.1: Save attendance status (present, absent, late) for each student with timestamp
   */
  async recordAttendance(
    classId: string,
    date: Date,
    period: number,
    records: AttendanceRecord[],
    recordedBy: string
  ): Promise<Attendance[]> {
    // Validate class exists
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, schoolId: true },
    })

    if (!classRecord) {
      throw new Error(`Class with id ${classId} not found`)
    }
    
    const schoolId = classRecord.schoolId

    // Check if recordedBy is a teacher and validate assignment
    // Requirement 3.7: Prevent attendance marking without class assignment
    const teacher = await prisma.teacher.findFirst({
      where: { id: recordedBy },
    })

    if (teacher) {
      // This is a teacher - validate they can take attendance for this class
      const canTakeAttendance = await teacherAssignmentService.canTakeAttendance(
        recordedBy,
        classRecord.schoolId,
        classId
      )

      if (!canTakeAttendance) {
        throw new Error(
          'Teacher is not authorized to take attendance for this class. ' +
          'Teacher must be assigned to the class and have attendance permission.'
        )
      }
    } else {
      // Not a teacher - validate as staff
      const staff = await prisma.staff.findUnique({
        where: { id: recordedBy },
      })

      if (!staff) {
        throw new Error(`Staff with id ${recordedBy} not found`)
      }
    }

    // Validate all students exist and belong to the class
    const studentIds = records.map(r => r.studentId)
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        classId: classId,
      },
    })

    if (students.length !== studentIds.length) {
      const foundIds = new Set(students.map(s => s.id))
      const invalidIds = studentIds.filter(id => !foundIds.has(id))
      throw new Error(`Students not found or not in class: ${invalidIds.join(', ')}`)
    }

    const now = new Date()
    const normalizedDate = this.normalizeDate(date)

    // Upsert attendance records (update if exists, create if not)
    const attendanceRecords: Attendance[] = []

    for (const record of records) {
      const attendance = await prisma.attendance.upsert({
        where: {
          studentId_date_period: {
            studentId: record.studentId,
            date: normalizedDate,
            period: period,
          },
        },
        update: {
          status: record.status,
          recordedBy: recordedBy,
          recordedAt: now,
          remarks: record.remarks,
        },
        create: {
          studentId: record.studentId,
          classId: classId,
          schoolId: schoolId,
          date: normalizedDate,
          period: period,
          status: record.status,
          recordedBy: recordedBy,
          recordedAt: now,
          remarks: record.remarks,
        },
      })

      attendanceRecords.push(mapPrismaAttendanceToDomain(attendance))
    }

    return attendanceRecords
  }

  /**
   * Normalize date to start of day (midnight UTC)
   */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date)
    normalized.setUTCHours(0, 0, 0, 0)
    return normalized
  }

  /**
   * Get attendance records for a student on a specific date
   * Requirement 5.3: Make attendance data available for report cards and analytics
   */
  async getStudentAttendanceForDate(
    studentId: string,
    date: Date
  ): Promise<Attendance[]> {
    const normalizedDate = this.normalizeDate(date)

    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        date: normalizedDate,
      },
      orderBy: { period: 'asc' },
    })

    return records.map(mapPrismaAttendanceToDomain)
  }

  /**
   * Get attendance records for a teacher's classes
   * Requirement 5.4: Display records only for classes assigned to that teacher
   */
  async getTeacherScopedAttendance(
    teacherId: string,
    date: Date
  ): Promise<Attendance[]> {
    const normalizedDate = this.normalizeDate(date)

    // Get classes assigned to this teacher
    const staffClasses = await prisma.staffClass.findMany({
      where: { staffId: teacherId },
      select: { classId: true },
    })

    const classIds = staffClasses.map(sc => sc.classId)

    if (classIds.length === 0) {
      return []
    }

    const records = await prisma.attendance.findMany({
      where: {
        classId: { in: classIds },
        date: normalizedDate,
      },
      orderBy: [{ classId: 'asc' }, { period: 'asc' }],
    })

    return records.map(mapPrismaAttendanceToDomain)
  }

  /**
   * Check daily absence status for a student
   * Requirement 38.1: Flag students absent in 2+ periods as "absent for the day"
   */
  async checkDailyAbsence(studentId: string, date: Date): Promise<AbsenceStatus> {
    const normalizedDate = this.normalizeDate(date)

    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        date: normalizedDate,
      },
    })

    const absentPeriods = records
      .filter(r => r.status === AttendanceStatus.ABSENT)
      .map(r => r.period)

    const isAbsentForDay = absentPeriods.length >= DAILY_ABSENCE_THRESHOLD

    return {
      isAbsentForDay,
      periodsAbsent: absentPeriods,
      alertSent: false, // Will be updated by notification service
    }
  }

  /**
   * Detect absence patterns for a student within a week
   * Requirement 38.5: Detect 3+ absences in a week for escalation
   */
  async detectAbsencePattern(
    studentId: string,
    weekStartDate: Date
  ): Promise<AbsencePattern> {
    const normalizedStart = this.normalizeDate(weekStartDate)
    const weekEndDate = new Date(normalizedStart)
    weekEndDate.setDate(weekEndDate.getDate() + 7)

    // Get all attendance records for the week
    const records = await prisma.attendance.findMany({
      where: {
        studentId,
        date: {
          gte: normalizedStart,
          lt: weekEndDate,
        },
        status: AttendanceStatus.ABSENT,
      },
    })

    // Group by date to count unique days absent
    const uniqueDatesAbsent = new Set<string>()
    const absentDates: Date[] = []

    for (const record of records) {
      const dateKey = record.date.toISOString().split('T')[0]
      if (!uniqueDatesAbsent.has(dateKey)) {
        uniqueDatesAbsent.add(dateKey)
        absentDates.push(record.date)
      }
    }

    const daysAbsent = uniqueDatesAbsent.size
    const requiresEscalation = daysAbsent >= WEEKLY_ABSENCE_PATTERN_THRESHOLD

    return {
      studentId,
      weekStartDate: normalizedStart,
      daysAbsent,
      dates: absentDates,
      requiresEscalation,
    }
  }

  /**
   * Get all students who are absent for the day (2+ periods)
   * Requirement 38.1, 38.2: Identify students for notification
   */
  async getAbsentStudentsForDay(
    classId: string,
    date: Date
  ): Promise<{ studentId: string; periodsAbsent: number[] }[]> {
    const normalizedDate = this.normalizeDate(date)

    // Get all absent records for the class on this date
    const records = await prisma.attendance.findMany({
      where: {
        classId,
        date: normalizedDate,
        status: AttendanceStatus.ABSENT,
      },
    })

    // Group by student
    const studentAbsences = new Map<string, number[]>()
    for (const record of records) {
      const periods = studentAbsences.get(record.studentId) || []
      periods.push(record.period)
      studentAbsences.set(record.studentId, periods)
    }

    // Filter to students with 2+ periods absent
    const absentStudents: { studentId: string; periodsAbsent: number[] }[] = []
    for (const [studentId, periods] of studentAbsences) {
      if (periods.length >= DAILY_ABSENCE_THRESHOLD) {
        absentStudents.push({ studentId, periodsAbsent: periods.sort((a, b) => a - b) })
      }
    }

    return absentStudents
  }

  /**
   * Get class attendance statistics for a date
   * Requirement 5.3: Make attendance data available for analytics
   */
  async getClassAttendanceStats(
    classId: string,
    date: Date
  ): Promise<ClassAttendanceStats> {
    const normalizedDate = this.normalizeDate(date)

    // Get total students in class
    const totalStudents = await prisma.student.count({
      where: { classId, status: 'ACTIVE' },
    })

    // Get attendance records for the day
    const records = await prisma.attendance.findMany({
      where: {
        classId,
        date: normalizedDate,
      },
    })

    // Count unique students by their most recent status
    const studentStatuses = new Map<string, AttendanceStatus>()
    for (const record of records) {
      // Use the status from the first period as representative
      if (!studentStatuses.has(record.studentId)) {
        studentStatuses.set(record.studentId, record.status as AttendanceStatus)
      }
    }

    let presentCount = 0
    let absentCount = 0
    let lateCount = 0

    for (const status of studentStatuses.values()) {
      switch (status) {
        case AttendanceStatus.PRESENT:
          presentCount++
          break
        case AttendanceStatus.ABSENT:
          absentCount++
          break
        case AttendanceStatus.LATE:
          lateCount++
          break
      }
    }

    const attendancePercentage =
      totalStudents > 0
        ? ((presentCount + lateCount) / totalStudents) * 100
        : 0

    return {
      classId,
      date: normalizedDate,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      attendancePercentage: Math.round(attendancePercentage * 100) / 100,
    }
  }

  /**
   * Get students with absence patterns requiring escalation
   * Requirement 38.5: Escalate to class teacher and School Admin
   */
  async getStudentsRequiringEscalation(
    schoolId: string,
    weekStartDate: Date
  ): Promise<AbsencePattern[]> {
    const normalizedStart = this.normalizeDate(weekStartDate)
    const weekEndDate = new Date(normalizedStart)
    weekEndDate.setDate(weekEndDate.getDate() + 7)

    // Get all students in the school
    const students = await prisma.student.findMany({
      where: { schoolId, status: 'ACTIVE' },
      select: { id: true },
    })

    const patternsRequiringEscalation: AbsencePattern[] = []

    for (const student of students) {
      const pattern = await this.detectAbsencePattern(student.id, weekStartDate)
      if (pattern.requiresEscalation) {
        patternsRequiringEscalation.push(pattern)
      }
    }

    return patternsRequiringEscalation
  }

  /**
   * Generate a secure response link for parent to respond to absence notification
   * Requirement 38.4: Provide response link for parents
   */
  private generateResponseLink(studentId: string, date: Date): string {
    const dateStr = date.toISOString().split('T')[0]
    // In production, this would generate a secure tokenized URL
    // For now, we use a simple format that can be enhanced later
    const token = Buffer.from(`${studentId}:${dateStr}:${Date.now()}`).toString('base64url')
    return `/attendance/respond/${token}`
  }

  /**
   * Create absence notification for a student's guardian
   * Requirement 5.2: Trigger automated notification to guardian
   * Requirement 38.2: Queue parent notification on absence detection
   * Requirement 38.3: Include student name, date, periods missed
   * Requirement 38.4: Provide response link for parents
   */
  async createAbsenceNotification(
    studentId: string,
    date: Date,
    periodsAbsent: number[]
  ): Promise<AbsenceNotification | null> {
    // Get student with guardian information
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    if (!student) {
      return null
    }

    // Get primary guardian
    const primaryGuardianLink = student.studentGuardians[0]
    if (!primaryGuardianLink) {
      return null
    }

    const guardian = primaryGuardianLink.guardian
    const studentName = `${student.firstName} ${student.lastName}`
    const responseLink = this.generateResponseLink(studentId, date)

    const notification: AbsenceNotification = {
      studentId,
      studentName,
      guardianId: guardian.id,
      date,
      periodsAbsent: periodsAbsent.sort((a, b) => a - b),
      responseLink,
    }

    return notification
  }

  /**
   * Trigger absence notifications for all absent students in a class
   * Requirement 5.2: Trigger automated notification to guardian on absence
   * Requirement 38.2: Queue parent notification on absence detection
   */
  async triggerAbsenceNotifications(
    classId: string,
    date: Date
  ): Promise<AbsenceNotification[]> {
    const absentStudents = await this.getAbsentStudentsForDay(classId, date)
    const notifications: AbsenceNotification[] = []

    for (const { studentId, periodsAbsent } of absentStudents) {
      const notification = await this.createAbsenceNotification(
        studentId,
        date,
        periodsAbsent
      )
      if (notification) {
        notifications.push(notification)
      }
    }

    return notifications
  }

  /**
   * Process and queue absence notifications for a school on a given date
   * This is typically called at the end of the school day
   * Requirement 5.2, 38.2: Queue parent notifications for all absent students
   */
  async processSchoolAbsenceNotifications(
    schoolId: string,
    date: Date
  ): Promise<{ processed: number; notifications: AbsenceNotification[] }> {
    // Get all classes in the school
    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true },
    })

    const allNotifications: AbsenceNotification[] = []

    for (const cls of classes) {
      const classNotifications = await this.triggerAbsenceNotifications(cls.id, date)
      allNotifications.push(...classNotifications)
    }

    return {
      processed: allNotifications.length,
      notifications: allNotifications,
    }
  }

  /**
   * Format absence notification content for messaging
   * Requirement 38.3: Include student name, date, periods missed
   */
  formatAbsenceNotificationContent(notification: AbsenceNotification): string {
    const dateStr = notification.date.toLocaleDateString('en-UG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const periodsStr = notification.periodsAbsent.join(', ')

    return `Dear Parent/Guardian,

Your child ${notification.studentName} was absent from school on ${dateStr} during period(s): ${periodsStr}.

If you have any concerns or would like to provide a reason for the absence, please respond using this link: ${notification.responseLink}

Thank you,
School Administration`
  }

  /**
   * Check attendance lock state for a school
   * Requirements: 4.3, 4.4, 4.5 - Time-based locking
   * @param schoolId - The school ID
   * @param userRole - The user's role (to determine if they can bypass lock)
   * @returns AttendanceLockState with lock status and edit capability
   */
  async checkLockState(
    schoolId: string,
    userRole?: string
  ): Promise<AttendanceLockState> {
    const settings = await schoolSettingsService.getSettings<AttendanceSettings>(
      schoolId,
      'attendance'
    )

    const cutoffTime = settings.absentCutoffTime || '17:00'
    const isAfterCutoff = this.isAfterCutoffTime(cutoffTime)

    // Admins and deputies can always edit
    const isAdmin = userRole === 'SCHOOL_ADMIN' || userRole === 'DEPUTY'
    const canEdit = !isAfterCutoff || isAdmin

    return {
      isLocked: isAfterCutoff,
      cutoffTime,
      canEdit,
      requiresAdminApproval: isAfterCutoff && settings.requireAdminApprovalAfterLock,
      message: isAfterCutoff && !isAdmin
        ? settings.lockMessage || `Attendance cutoff time (${cutoffTime}) has passed. Contact administration for approval.`
        : undefined,
    }
  }

  /**
   * Check if current time is past the attendance cutoff time
   * Requirements: 4.3, 4.4 - Time-based locking
   */
  private isAfterCutoffTime(cutoffTime: string): boolean {
    const now = new Date()
    const [hours, minutes] = cutoffTime.split(':').map(Number)
    const cutoff = new Date()
    cutoff.setHours(hours, minutes, 0, 0)
    return now > cutoff
  }

  /**
   * Validate if a teacher can record attendance for a class
   * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7
   * @param teacherId - The teacher's staff ID
   * @param classId - The class ID
   * @param schoolId - The school ID
   * @param userRole - The user's role
   * @returns Object with allowed flag and reason if denied
   */
  async validateAttendanceEntry(
    teacherId: string,
    classId: string,
    schoolId: string,
    userRole: string
  ): Promise<{ allowed: boolean; reason?: string; lockState?: AttendanceLockState }> {
    // Check lock state first
    const lockState = await this.checkLockState(schoolId, userRole)
    
    if (lockState.isLocked && !lockState.canEdit) {
      return {
        allowed: false,
        reason: lockState.message,
        lockState,
      }
    }

    // Check teacher assignment (admins bypass this)
    if (userRole === 'TEACHER') {
      const canTakeAttendance = await teacherAssignmentService.canTakeAttendance(
        teacherId,
        schoolId,
        classId
      )

      if (!canTakeAttendance) {
        return {
          allowed: false,
          reason: 'You are not assigned to this class.',
          lockState,
        }
      }
    }

    return { allowed: true, lockState }
  }
}

// Export singleton instance
export const attendanceService = new AttendanceService()
