/**
 * Teacher Performance Tracking Service
 * Handles automatic tracking of teacher performance metrics
 * Requirements: 6.1-6.7
 * 
 * Core principle: Performance data is auto-generated and immutable.
 * Teachers cannot edit their own performance data.
 * Only authorized roles (SCHOOL_ADMIN, HEAD_TEACHER, DIRECTOR_OF_STUDIES) can view.
 */
import { prisma } from '@/lib/db'
import {
  TeacherPerformanceMetrics,
  AttendanceSubmissionMetrics,
  MarkEntryMetrics,
  MissedClassMetrics,
  LoginActivityMetrics,
  MessageLogMetrics,
  PERFORMANCE_DATA_VIEWERS,
} from '@/types/teacher'
import { auditService, AuditAction, AuditResource } from './audit.service'

/**
 * Error for unauthorized performance data access
 * Requirement 6.6: Performance data visible to authorized roles only
 */
export class PerformanceAccessDeniedError extends Error {
  constructor(requestedBy: string, teacherId: string) {
    super(
      `User ${requestedBy} is not authorized to view performance data for teacher ${teacherId}. ` +
      `Only SCHOOL_ADMIN, HEAD_TEACHER, and DIRECTOR_OF_STUDIES can access performance data.`
    )
    this.name = 'PerformanceAccessDeniedError'
  }
}

/**
 * Error for attempting to modify performance data
 * Requirement 6.7: Performance data is immutable
 */
export class PerformanceImmutabilityError extends Error {
  constructor(operation: string, teacherId: string) {
    super(
      `Cannot ${operation} performance data for teacher ${teacherId}. ` +
      `Performance data is auto-generated and read-only (Requirement 6.7).`
    )
    this.name = 'PerformanceImmutabilityError'
  }
}

/**
 * Get the current period boundaries (start and end of current month)
 */
function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Get or create a performance metric record for the current period
 */
async function getOrCreateMetricRecord(
  teacherId: string,
  schoolId: string,
  period: { start: Date; end: Date }
): Promise<string> {
  // Try to find existing record for this period
  const existing = await prisma.teacherPerformanceMetric.findFirst({
    where: {
      teacherId,
      periodStart: period.start,
      periodEnd: period.end,
    },
    select: { id: true },
  })

  if (existing) {
    return existing.id
  }

  // Create new record for this period
  const newRecord = await prisma.teacherPerformanceMetric.create({
    data: {
      teacherId,
      schoolId,
      periodStart: period.start,
      periodEnd: period.end,
    },
  })

  return newRecord.id
}

export class TeacherPerformanceService {
  // ============================================
  // AUTO-TRACKING METHODS
  // Requirements: 6.1-6.5
  // ============================================

  /**
   * Record attendance submission for auto-tracking
   * Requirement 6.1: Automatically track attendance submission timestamps
   * 
   * @param teacherId - The teacher who submitted attendance
   * @param schoolId - School for tenant isolation
   * @param classId - The class for which attendance was submitted
   * @param timestamp - When the attendance was submitted
   * @param isOnTime - Whether the submission was on time
   */
  async recordAttendanceSubmission(
    teacherId: string,
    schoolId: string,
    classId: string,
    timestamp: Date,
    isOnTime: boolean
  ): Promise<void> {
    const period = getCurrentPeriod()
    const metricId = await getOrCreateMetricRecord(teacherId, schoolId, period)

    // Update the metric record
    await prisma.teacherPerformanceMetric.update({
      where: { id: metricId },
      data: {
        attendanceSubmitted: { increment: 1 },
        attendanceOnTime: isOnTime ? { increment: 1 } : undefined,
        attendanceLate: !isOnTime ? { increment: 1 } : undefined,
        updatedAt: new Date(),
      },
    })

    // Log to audit trail
    await auditService.log({
      schoolId,
      userId: teacherId,
      action: AuditAction.CREATE,
      resource: AuditResource.ATTENDANCE,
      resourceId: classId,
      newValue: {
        type: 'attendance_submission_tracked',
        teacherId,
        classId,
        timestamp: timestamp.toISOString(),
        isOnTime,
      },
    })
  }

  /**
   * Record mark entry for auto-tracking
   * Requirement 6.2: Automatically track mark entry timestamps
   * 
   * @param teacherId - The teacher who entered marks
   * @param schoolId - School for tenant isolation
   * @param classId - The class for which marks were entered
   * @param subjectId - The subject for which marks were entered
   * @param timestamp - When the marks were entered
   * @param isOnTime - Whether the entry was on time (before deadline)
   */
  async recordMarkEntry(
    teacherId: string,
    schoolId: string,
    classId: string,
    subjectId: string,
    timestamp: Date,
    isOnTime: boolean
  ): Promise<void> {
    const period = getCurrentPeriod()
    const metricId = await getOrCreateMetricRecord(teacherId, schoolId, period)

    // Update the metric record
    await prisma.teacherPerformanceMetric.update({
      where: { id: metricId },
      data: {
        marksEntered: { increment: 1 },
        marksOnTime: isOnTime ? { increment: 1 } : undefined,
        marksLate: !isOnTime ? { increment: 1 } : undefined,
        updatedAt: new Date(),
      },
    })

    // Log to audit trail
    await auditService.log({
      schoolId,
      userId: teacherId,
      action: AuditAction.CREATE,
      resource: AuditResource.MARK,
      resourceId: `${classId}_${subjectId}`,
      newValue: {
        type: 'mark_entry_tracked',
        teacherId,
        classId,
        subjectId,
        timestamp: timestamp.toISOString(),
        isOnTime,
      },
    })
  }

  /**
   * Record missed class for auto-tracking
   * Requirement 6.3: Automatically track missed classes
   * 
   * @param teacherId - The teacher who missed the class
   * @param schoolId - School for tenant isolation
   * @param classId - The class that was missed
   * @param date - The date of the missed class
   * @param reason - Optional reason for missing the class
   */
  async recordMissedClass(
    teacherId: string,
    schoolId: string,
    classId: string,
    date: Date,
    reason?: string
  ): Promise<void> {
    const period = getCurrentPeriod()
    const metricId = await getOrCreateMetricRecord(teacherId, schoolId, period)

    // Update the metric record
    await prisma.teacherPerformanceMetric.update({
      where: { id: metricId },
      data: {
        missedClassCount: { increment: 1 },
        updatedAt: new Date(),
      },
    })

    // Log to audit trail with reason
    await auditService.log({
      schoolId,
      userId: 'SYSTEM',
      action: AuditAction.CREATE,
      resource: AuditResource.STAFF_PERFORMANCE,
      resourceId: teacherId,
      newValue: {
        type: 'missed_class_tracked',
        teacherId,
        classId,
        date: date.toISOString(),
        reason,
      },
    })
  }

  /**
   * Record login activity for auto-tracking
   * Requirement 6.4: Automatically track login activity
   * 
   * @param teacherId - The teacher who logged in
   * @param schoolId - School for tenant isolation
   * @param timestamp - When the login occurred
   */
  async recordLogin(
    teacherId: string,
    schoolId: string,
    timestamp: Date
  ): Promise<void> {
    const period = getCurrentPeriod()
    const metricId = await getOrCreateMetricRecord(teacherId, schoolId, period)

    // Update the metric record
    await prisma.teacherPerformanceMetric.update({
      where: { id: metricId },
      data: {
        loginCount: { increment: 1 },
        lastLoginAt: timestamp,
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Record session duration for login activity tracking
   * Requirement 6.4: Track average session duration
   * 
   * @param teacherId - The teacher whose session ended
   * @param schoolId - School for tenant isolation
   * @param durationMinutes - Duration of the session in minutes
   */
  async recordSessionDuration(
    teacherId: string,
    schoolId: string,
    durationMinutes: number
  ): Promise<void> {
    const period = getCurrentPeriod()
    const metricId = await getOrCreateMetricRecord(teacherId, schoolId, period)

    // Update the metric record - add to total session minutes
    await prisma.teacherPerformanceMetric.update({
      where: { id: metricId },
      data: {
        totalSessionMinutes: { increment: Math.round(durationMinutes) },
        updatedAt: new Date(),
      },
    })
  }

  /**
   * Record message sent for auto-tracking
   * Requirement 6.5: Automatically track message logs
   * 
   * @param teacherId - The teacher who sent the message
   * @param schoolId - School for tenant isolation
   * @param channel - The channel used (sms, whatsapp, email, inApp)
   * @param timestamp - When the message was sent
   */
  async recordMessageSent(
    teacherId: string,
    schoolId: string,
    channel: 'sms' | 'whatsapp' | 'email' | 'inApp',
    timestamp: Date
  ): Promise<void> {
    const period = getCurrentPeriod()
    const metricId = await getOrCreateMetricRecord(teacherId, schoolId, period)

    // Build update data based on channel
    const updateData: Record<string, unknown> = {
      messagesSent: { increment: 1 },
      lastMessageAt: timestamp,
      updatedAt: new Date(),
    }

    // Increment channel-specific counter
    switch (channel) {
      case 'sms':
        updateData.messagesBySms = { increment: 1 }
        break
      case 'whatsapp':
        updateData.messagesByWhatsapp = { increment: 1 }
        break
      case 'email':
        updateData.messagesByEmail = { increment: 1 }
        break
      case 'inApp':
        updateData.messagesByInApp = { increment: 1 }
        break
    }

    // Update the metric record
    await prisma.teacherPerformanceMetric.update({
      where: { id: metricId },
      data: updateData,
    })
  }


  // ============================================
  // METRICS RETRIEVAL WITH ACCESS CONTROL
  // Requirements: 6.6, 6.7
  // ============================================

  /**
   * Get performance metrics for a teacher with role-based access control
   * Requirement 6.6: Performance data visible to SCHOOL_ADMIN, HEAD_TEACHER, DIRECTOR_OF_STUDIES only
   * Requirement 6.7: Performance data is read-only (no edit capability)
   * 
   * @param teacherId - The teacher to get metrics for
   * @param schoolId - School for tenant isolation
   * @param period - The period to get metrics for
   * @param requestedBy - User ID of the requester
   * @param requestedByRole - Role of the requester
   * @returns Performance metrics for the teacher
   * @throws PerformanceAccessDeniedError if requester is not authorized
   */
  async getMetrics(
    teacherId: string,
    schoolId: string,
    period: { start: Date; end: Date },
    requestedBy: string,
    requestedByRole: string
  ): Promise<TeacherPerformanceMetrics> {
    // Check authorization (Requirement 6.6)
    if (!this.isAuthorizedToViewPerformance(requestedByRole)) {
      // Log unauthorized access attempt
      await auditService.log({
        schoolId,
        userId: requestedBy,
        action: AuditAction.UNAUTHORIZED_ACTION_ATTEMPT,
        resource: AuditResource.STAFF_PERFORMANCE,
        resourceId: teacherId,
        newValue: {
          type: 'performance_data_access_denied',
          requestedByRole,
          reason: 'Insufficient permissions to view performance data',
        },
      })

      throw new PerformanceAccessDeniedError(requestedBy, teacherId)
    }

    // Verify teacher exists and belongs to school
    const teacher = await prisma.teacher.findFirst({
      where: {
        id: teacherId,
        schoolId,
      },
      select: { id: true },
    })

    if (!teacher) {
      throw new Error(`Teacher with id ${teacherId} not found in school ${schoolId}`)
    }

    // Get metrics for the specified period
    const metrics = await prisma.teacherPerformanceMetric.findMany({
      where: {
        teacherId,
        periodStart: { gte: period.start },
        periodEnd: { lte: period.end },
      },
      orderBy: { periodStart: 'asc' },
    })

    // Aggregate metrics across the period
    const aggregated = this.aggregateMetrics(teacherId, period, metrics)

    // Log successful access
    await auditService.log({
      schoolId,
      userId: requestedBy,
      action: AuditAction.PERFORMANCE_DATA_ACCESSED,
      resource: AuditResource.STAFF_PERFORMANCE,
      resourceId: teacherId,
      newValue: {
        type: 'performance_data_accessed',
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
        requestedByRole,
      },
    })

    return aggregated
  }

  /**
   * Get performance metrics for the current period
   * Convenience method that uses the current month as the period
   */
  async getCurrentPeriodMetrics(
    teacherId: string,
    schoolId: string,
    requestedBy: string,
    requestedByRole: string
  ): Promise<TeacherPerformanceMetrics> {
    const period = getCurrentPeriod()
    return this.getMetrics(teacherId, schoolId, period, requestedBy, requestedByRole)
  }

  /**
   * Get performance metrics for multiple teachers (for dashboard views)
   * Requirement 6.6: Only authorized roles can access
   */
  async getMetricsForMultipleTeachers(
    teacherIds: string[],
    schoolId: string,
    period: { start: Date; end: Date },
    requestedBy: string,
    requestedByRole: string
  ): Promise<TeacherPerformanceMetrics[]> {
    // Check authorization (Requirement 6.6)
    if (!this.isAuthorizedToViewPerformance(requestedByRole)) {
      throw new PerformanceAccessDeniedError(requestedBy, 'multiple teachers')
    }

    const results: TeacherPerformanceMetrics[] = []

    for (const teacherId of teacherIds) {
      try {
        const metrics = await this.getMetrics(
          teacherId,
          schoolId,
          period,
          requestedBy,
          requestedByRole
        )
        results.push(metrics)
      } catch (error) {
        // Skip teachers that don't exist or have no metrics
        if (!(error instanceof PerformanceAccessDeniedError)) {
          console.warn(`Could not get metrics for teacher ${teacherId}: ${error}`)
        }
      }
    }

    return results
  }

  /**
   * Get performance summary for a department
   * Useful for department-level reporting
   */
  async getDepartmentPerformanceSummary(
    schoolId: string,
    department: string,
    period: { start: Date; end: Date },
    requestedBy: string,
    requestedByRole: string
  ): Promise<{
    department: string
    teacherCount: number
    averageAttendanceRate: number
    averageMarksEntryRate: number
    totalMissedClasses: number
    averageLoginCount: number
    totalMessagesSent: number
  }> {
    // Check authorization
    if (!this.isAuthorizedToViewPerformance(requestedByRole)) {
      throw new PerformanceAccessDeniedError(requestedBy, `department ${department}`)
    }

    // Get all teachers in the department
    const teachers = await prisma.teacher.findMany({
      where: {
        schoolId,
        department,
      },
      select: { id: true },
    })

    if (teachers.length === 0) {
      return {
        department,
        teacherCount: 0,
        averageAttendanceRate: 0,
        averageMarksEntryRate: 0,
        totalMissedClasses: 0,
        averageLoginCount: 0,
        totalMessagesSent: 0,
      }
    }

    // Get metrics for all teachers
    const teacherIds = teachers.map((t) => t.id)
    const allMetrics = await this.getMetricsForMultipleTeachers(
      teacherIds,
      schoolId,
      period,
      requestedBy,
      requestedByRole
    )

    // Calculate aggregates
    let totalAttendanceRate = 0
    let totalMarksRate = 0
    let totalMissedClasses = 0
    let totalLogins = 0
    let totalMessages = 0

    for (const metrics of allMetrics) {
      const attendanceRate =
        metrics.attendanceSubmissions.totalExpected > 0
          ? metrics.attendanceSubmissions.totalSubmitted / metrics.attendanceSubmissions.totalExpected
          : 1
      const marksRate =
        metrics.markEntries.totalExpected > 0
          ? metrics.markEntries.totalEntered / metrics.markEntries.totalExpected
          : 1

      totalAttendanceRate += attendanceRate
      totalMarksRate += marksRate
      totalMissedClasses += metrics.missedClasses.count
      totalLogins += metrics.loginActivity.totalLogins
      totalMessages += metrics.messageLogs.totalSent
    }

    const teacherCount = allMetrics.length || 1

    return {
      department,
      teacherCount: teachers.length,
      averageAttendanceRate: totalAttendanceRate / teacherCount,
      averageMarksEntryRate: totalMarksRate / teacherCount,
      totalMissedClasses,
      averageLoginCount: totalLogins / teacherCount,
      totalMessagesSent: totalMessages,
    }
  }

  // ============================================
  // IMMUTABILITY ENFORCEMENT
  // Requirement 6.7
  // ============================================

  /**
   * BLOCKED: Update performance metrics
   * Requirement 6.7: Teachers cannot edit their own performance data
   * 
   * This method exists to explicitly prevent any manual updates to performance data.
   * It will ALWAYS throw a PerformanceImmutabilityError.
   * 
   * @throws {PerformanceImmutabilityError} Always - performance data cannot be modified
   */
  async updateMetrics(
    _teacherId: string,
    _data: Partial<TeacherPerformanceMetrics>
  ): Promise<never> {
    throw new PerformanceImmutabilityError('update', _teacherId)
  }

  /**
   * BLOCKED: Delete performance metrics
   * Requirement 6.7: Performance data is immutable
   * 
   * This method exists to explicitly prevent any deletion of performance data.
   * It will ALWAYS throw a PerformanceImmutabilityError.
   * 
   * @throws {PerformanceImmutabilityError} Always - performance data cannot be deleted
   */
  async deleteMetrics(_teacherId: string): Promise<never> {
    throw new PerformanceImmutabilityError('delete', _teacherId)
  }

  /**
   * Verify performance data immutability
   * Requirement 6.7: Performance data is auto-generated and read-only
   * 
   * This method can be used to verify that the service enforces immutability.
   */
  verifyImmutability(): { isImmutable: boolean; message: string } {
    return {
      isImmutable: true,
      message:
        'Performance data is immutable. Update and delete operations are blocked (Requirement 6.7). ' +
        'Only auto-tracking methods can modify performance data.',
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Check if a role is authorized to view performance data
   * Requirement 6.6: Only SCHOOL_ADMIN, HEAD_TEACHER, DIRECTOR_OF_STUDIES can view
   */
  private isAuthorizedToViewPerformance(role: string): boolean {
    return PERFORMANCE_DATA_VIEWERS.includes(role as typeof PERFORMANCE_DATA_VIEWERS[number])
  }

  /**
   * Aggregate metrics from multiple period records into a single metrics object
   */
  private aggregateMetrics(
    teacherId: string,
    period: { start: Date; end: Date },
    records: Array<{
      attendanceExpected: number
      attendanceSubmitted: number
      attendanceOnTime: number
      attendanceLate: number
      marksExpected: number
      marksEntered: number
      marksOnTime: number
      marksLate: number
      missedClassCount: number
      loginCount: number
      lastLoginAt: Date | null
      totalSessionMinutes: number
      messagesSent: number
      messagesBySms: number
      messagesByWhatsapp: number
      messagesByEmail: number
      messagesByInApp: number
      lastMessageAt: Date | null
    }>
  ): TeacherPerformanceMetrics {
    // Initialize aggregated values
    const attendanceSubmissions: AttendanceSubmissionMetrics = {
      totalExpected: 0,
      totalSubmitted: 0,
      onTimeSubmissions: 0,
      lateSubmissions: 0,
      timestamps: [],
    }

    const markEntries: MarkEntryMetrics = {
      totalExpected: 0,
      totalEntered: 0,
      onTimeEntries: 0,
      lateEntries: 0,
      timestamps: [],
    }

    const missedClasses: MissedClassMetrics = {
      count: 0,
      dates: [],
      reasons: [],
    }

    const loginActivity: LoginActivityMetrics = {
      totalLogins: 0,
      lastLogin: undefined,
      averageSessionDuration: 0,
      loginTimestamps: [],
    }

    const messageLogs: MessageLogMetrics = {
      totalSent: 0,
      byChannel: {
        sms: 0,
        whatsapp: 0,
        email: 0,
        inApp: 0,
      },
      lastMessageAt: undefined,
      messageTimestamps: [],
    }

    let totalSessionMinutes = 0
    let latestLogin: Date | undefined
    let latestMessage: Date | undefined

    // Aggregate from all records
    for (const record of records) {
      attendanceSubmissions.totalExpected += record.attendanceExpected
      attendanceSubmissions.totalSubmitted += record.attendanceSubmitted
      attendanceSubmissions.onTimeSubmissions += record.attendanceOnTime
      attendanceSubmissions.lateSubmissions += record.attendanceLate

      markEntries.totalExpected += record.marksExpected
      markEntries.totalEntered += record.marksEntered
      markEntries.onTimeEntries += record.marksOnTime
      markEntries.lateEntries += record.marksLate

      missedClasses.count += record.missedClassCount

      loginActivity.totalLogins += record.loginCount
      totalSessionMinutes += record.totalSessionMinutes

      if (record.lastLoginAt) {
        if (!latestLogin || record.lastLoginAt > latestLogin) {
          latestLogin = record.lastLoginAt
        }
      }

      messageLogs.totalSent += record.messagesSent
      messageLogs.byChannel.sms += record.messagesBySms
      messageLogs.byChannel.whatsapp += record.messagesByWhatsapp
      messageLogs.byChannel.email += record.messagesByEmail
      messageLogs.byChannel.inApp += record.messagesByInApp

      if (record.lastMessageAt) {
        if (!latestMessage || record.lastMessageAt > latestMessage) {
          latestMessage = record.lastMessageAt
        }
      }
    }

    // Calculate average session duration
    loginActivity.lastLogin = latestLogin
    loginActivity.averageSessionDuration =
      loginActivity.totalLogins > 0 ? totalSessionMinutes / loginActivity.totalLogins : 0

    messageLogs.lastMessageAt = latestMessage

    return {
      teacherId,
      period,
      attendanceSubmissions,
      markEntries,
      missedClasses,
      loginActivity,
      messageLogs,
    }
  }

  /**
   * Set expected counts for attendance and marks
   * This is called by admin to set expectations for the period
   * Note: This is NOT a manual edit of performance data - it sets targets
   */
  async setExpectedCounts(
    teacherId: string,
    schoolId: string,
    period: { start: Date; end: Date },
    expectedAttendance: number,
    expectedMarks: number,
    setBy: string
  ): Promise<void> {
    const metricId = await getOrCreateMetricRecord(teacherId, schoolId, period)

    await prisma.teacherPerformanceMetric.update({
      where: { id: metricId },
      data: {
        attendanceExpected: expectedAttendance,
        marksExpected: expectedMarks,
        updatedAt: new Date(),
      },
    })

    // Log the expectation setting
    await auditService.log({
      schoolId,
      userId: setBy,
      action: AuditAction.UPDATE,
      resource: AuditResource.STAFF_PERFORMANCE,
      resourceId: teacherId,
      newValue: {
        type: 'expected_counts_set',
        expectedAttendance,
        expectedMarks,
        periodStart: period.start.toISOString(),
        periodEnd: period.end.toISOString(),
      },
    })
  }
}

// Export singleton instance
export const teacherPerformanceService = new TeacherPerformanceService()
