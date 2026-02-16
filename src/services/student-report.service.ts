/**
 * Student Report Service
 * Handles school-to-parent reporting for any student matter
 * Requirements: 37.1, 37.2, 37.3, 37.4, 37.5
 */   
import { prisma } from '@/lib/db'
import {
  StudentReport,
  CreateStudentReportInput,
  UpdateStudentReportInput,
  StudentReportWithDetails,
  StudentReportSummary,
  ParentReportResponse,
  StudentReportNotificationResult,
} from '@/types'
import {
  StudentReportType,
  StudentReportStatus,
  MessageChannel,
  MessageTemplateType,
} from '@/types/enums'

/**
 * Map Prisma StudentReport to domain type
 */
function mapPrismaStudentReportToDomain(prismaReport: {
  id: string
  schoolId: string
  studentId: string
  createdBy: string
  reportType: string
  title: string
  content: string
  requiresAcknowledgment: boolean
  status: string
  notificationChannel: string | null
  notificationSentAt: Date | null
  viewedAt: Date | null
  acknowledgedAt: Date | null
  parentResponse: string | null
  respondedAt: Date | null
  meetingRequested: boolean
  meetingRequestedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): StudentReport {
  return {
    id: prismaReport.id,
    schoolId: prismaReport.schoolId,
    studentId: prismaReport.studentId,
    createdBy: prismaReport.createdBy,
    reportType: prismaReport.reportType as StudentReportType,
    title: prismaReport.title,
    content: prismaReport.content,
    requiresAcknowledgment: prismaReport.requiresAcknowledgment,
    status: prismaReport.status as StudentReportStatus,
    notificationChannel: prismaReport.notificationChannel as MessageChannel | undefined,
    notificationSentAt: prismaReport.notificationSentAt ?? undefined,
    viewedAt: prismaReport.viewedAt ?? undefined,
    acknowledgedAt: prismaReport.acknowledgedAt ?? undefined,
    parentResponse: prismaReport.parentResponse ?? undefined,
    respondedAt: prismaReport.respondedAt ?? undefined,
    meetingRequested: prismaReport.meetingRequested,
    meetingRequestedAt: prismaReport.meetingRequestedAt ?? undefined,
    createdAt: prismaReport.createdAt,
    updatedAt: prismaReport.updatedAt,
  }
}

export class StudentReportService {
  // ============================================
  // REPORT CREATION
  // ============================================

  /**
   * Create a new student report
   * Requirement 37.1: Allow selection of report type (academic, behavior, health, general)
   */
  async createReport(data: CreateStudentReportInput): Promise<StudentReport> {
    // Validate student exists
    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { id: true, schoolId: true },
    })

    if (!student) {
      throw new Error(`Student with id ${data.studentId} not found`)
    }

    // Validate school matches
    if (student.schoolId !== data.schoolId) {
      throw new Error('Student does not belong to this school')
    }

    // Validate creator (staff) exists
    const staff = await prisma.staff.findUnique({
      where: { id: data.createdBy },
      select: { id: true, schoolId: true },
    })

    if (!staff) {
      throw new Error(`Staff with id ${data.createdBy} not found`)
    }

    if (staff.schoolId !== data.schoolId) {
      throw new Error('Staff does not belong to this school')
    }

    // Create the report
    const report = await prisma.studentReport.create({
      data: {
        schoolId: data.schoolId,
        studentId: data.studentId,
        createdBy: data.createdBy,
        reportType: data.reportType,
        title: data.title,
        content: data.content,
        requiresAcknowledgment: data.requiresAcknowledgment ?? false,
        status: StudentReportStatus.PENDING,
      },
    })

    const mappedReport = mapPrismaStudentReportToDomain(report)

    // Automatically notify parent after creation
    // Requirement 37.2: Notify parent via preferred channel
    await this.notifyParent(mappedReport.id)

    return mappedReport
  }

  /**
   * Get a report by ID
   */
  async getReportById(id: string): Promise<StudentReport | null> {
    const report = await prisma.studentReport.findUnique({
      where: { id },
    })

    if (!report) {
      return null
    }

    return mapPrismaStudentReportToDomain(report)
  }

  /**
   * Get report with full details (student, creator, guardian info)
   */
  async getReportWithDetails(id: string): Promise<StudentReportWithDetails | null> {
    const report = await prisma.studentReport.findUnique({
      where: { id },
    })

    if (!report) {
      return null
    }

    const student = await prisma.student.findUnique({
      where: { id: report.studentId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
        classId: true,
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    const creator = await prisma.staff.findUnique({
      where: { id: report.createdBy },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    })

    const mappedReport = mapPrismaStudentReportToDomain(report)
    const guardian = student?.studentGuardians[0]?.guardian

    return {
      ...mappedReport,
      student: student ? {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        classId: student.classId,
      } : {
        id: '',
        firstName: 'Unknown',
        lastName: 'Student',
        admissionNumber: '',
        classId: '',
      },
      creator: creator ? {
        id: creator.id,
        firstName: creator.firstName,
        lastName: creator.lastName,
        role: creator.role,
      } : {
        id: '',
        firstName: 'Unknown',
        lastName: 'Staff',
        role: 'TEACHER',
      },
      guardian: guardian ? {
        id: guardian.id,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        preferredChannel: guardian.preferredChannel as MessageChannel,
      } : undefined,
    }
  }

  /**
   * Update a report
   */
  async updateReport(id: string, data: UpdateStudentReportInput): Promise<StudentReport> {
    const existingReport = await prisma.studentReport.findUnique({
      where: { id },
    })

    if (!existingReport) {
      throw new Error(`Report with id ${id} not found`)
    }

    const updatedReport = await prisma.studentReport.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { content: data.content }),
        ...(data.requiresAcknowledgment !== undefined && { 
          requiresAcknowledgment: data.requiresAcknowledgment 
        }),
      },
    })

    return mapPrismaStudentReportToDomain(updatedReport)
  }

  // ============================================
  // PARENT NOTIFICATION
  // ============================================

  /**
   * Notify parent about a report via their preferred channel
   * Requirement 37.2: Notify parent via preferred channel (SMS, Email, in-app)
   */
  async notifyParent(reportId: string): Promise<StudentReportNotificationResult> {
    const report = await prisma.studentReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      return { success: false, error: 'Report not found' }
    }

    const student = await prisma.student.findUnique({
      where: { id: report.studentId },
      include: {
        studentGuardians: {
          where: { isPrimary: true },
          include: { guardian: true },
        },
      },
    })

    if (!student) {
      return { success: false, error: 'Student not found' }
    }

    const guardian = student.studentGuardians[0]?.guardian
    if (!guardian) {
      // No guardian to notify, mark as sent anyway
      await prisma.studentReport.update({
        where: { id: reportId },
        data: {
          status: StudentReportStatus.SENT,
          notificationSentAt: new Date(),
        },
      })
      return { success: true, channel: undefined }
    }

    const studentName = `${student.firstName} ${student.lastName}`
    const preferredChannel = guardian.preferredChannel as MessageChannel

    try {
      const { communicationService } = await import('./communication.service')

      await communicationService.sendMessage({
        studentId: student.id,
        templateType: MessageTemplateType.GENERAL_ANNOUNCEMENT,
        data: {
          content: this.formatReportNotificationContent(
            studentName,
            report.reportType as StudentReportType,
            report.title
          ),
          studentName,
          reportType: report.reportType,
          reportTitle: report.title,
        },
        priority: 'normal',
      })

      // Update report status
      await prisma.studentReport.update({
        where: { id: reportId },
        data: {
          status: StudentReportStatus.SENT,
          notificationChannel: preferredChannel,
          notificationSentAt: new Date(),
        },
      })

      return { success: true, channel: preferredChannel }
    } catch (error) {
      console.error(`Failed to send report notification for report ${reportId}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Format notification content for a report
   */
  formatReportNotificationContent(
    studentName: string,
    reportType: StudentReportType,
    title: string
  ): string {
    const typeLabel = this.getReportTypeLabel(reportType)
    return `Dear Parent, a new ${typeLabel} report has been created for ${studentName}: "${title}". Please check your portal for details.`
  }

  /**
   * Get human-readable label for report type
   */
  getReportTypeLabel(reportType: StudentReportType): string {
    const labels: Record<StudentReportType, string> = {
      [StudentReportType.ACADEMIC]: 'academic',
      [StudentReportType.BEHAVIOR]: 'behavior',
      [StudentReportType.HEALTH]: 'health',
      [StudentReportType.GENERAL]: 'general',
    }
    return labels[reportType] || 'general'
  }

  // ============================================
  // ACKNOWLEDGMENT TRACKING
  // ============================================

  /**
   * Mark report as viewed by parent
   * Requirement 37.3: Track whether parent has viewed the report
   */
  async markAsViewed(reportId: string): Promise<StudentReport> {
    const report = await prisma.studentReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      throw new Error(`Report with id ${reportId} not found`)
    }

    // Only update if not already viewed
    if (!report.viewedAt) {
      const updatedReport = await prisma.studentReport.update({
        where: { id: reportId },
        data: {
          status: StudentReportStatus.VIEWED,
          viewedAt: new Date(),
        },
      })
      return mapPrismaStudentReportToDomain(updatedReport)
    }

    return mapPrismaStudentReportToDomain(report)
  }

  /**
   * Acknowledge a report (parent confirms they've read it)
   * Requirement 37.3: Track whether parent has acknowledged the report
   */
  async acknowledgeReport(reportId: string): Promise<StudentReport> {
    const report = await prisma.studentReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      throw new Error(`Report with id ${reportId} not found`)
    }

    const updatedReport = await prisma.studentReport.update({
      where: { id: reportId },
      data: {
        status: StudentReportStatus.ACKNOWLEDGED,
        viewedAt: report.viewedAt ?? new Date(),
        acknowledgedAt: new Date(),
      },
    })

    return mapPrismaStudentReportToDomain(updatedReport)
  }

  // ============================================
  // PARENT RESPONSE
  // ============================================

  /**
   * Allow parent to respond to a report or request a meeting
   * Requirement 37.4: Allow parent to respond or request a meeting
   */
  async respondToReport(data: ParentReportResponse): Promise<StudentReport> {
    const report = await prisma.studentReport.findUnique({
      where: { id: data.reportId },
    })

    if (!report) {
      throw new Error(`Report with id ${data.reportId} not found`)
    }

    const updatedReport = await prisma.studentReport.update({
      where: { id: data.reportId },
      data: {
        status: StudentReportStatus.RESPONDED,
        viewedAt: report.viewedAt ?? new Date(),
        acknowledgedAt: report.acknowledgedAt ?? new Date(),
        parentResponse: data.response,
        respondedAt: new Date(),
        meetingRequested: data.requestMeeting,
        meetingRequestedAt: data.requestMeeting ? new Date() : undefined,
      },
    })

    return mapPrismaStudentReportToDomain(updatedReport)
  }

  /**
   * Request a meeting for a report
   * Requirement 37.4: Allow parent to request a meeting
   */
  async requestMeeting(reportId: string): Promise<StudentReport> {
    const report = await prisma.studentReport.findUnique({
      where: { id: reportId },
    })

    if (!report) {
      throw new Error(`Report with id ${reportId} not found`)
    }

    const updatedReport = await prisma.studentReport.update({
      where: { id: reportId },
      data: {
        meetingRequested: true,
        meetingRequestedAt: new Date(),
      },
    })

    return mapPrismaStudentReportToDomain(updatedReport)
  }

  // ============================================
  // REPORT QUERIES
  // ============================================

  /**
   * Get all reports for a student (stored in student profile)
   * Requirement 37.5: Store reports in student's profile for historical reference
   */
  async getReportsByStudent(studentId: string): Promise<StudentReport[]> {
    const reports = await prisma.studentReport.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    })

    return reports.map(mapPrismaStudentReportToDomain)
  }

  /**
   * Get reports by student and type
   * Requirement 37.1: Filter by report type
   */
  async getReportsByStudentAndType(
    studentId: string,
    reportType: StudentReportType
  ): Promise<StudentReport[]> {
    const reports = await prisma.studentReport.findMany({
      where: { studentId, reportType },
      orderBy: { createdAt: 'desc' },
    })

    return reports.map(mapPrismaStudentReportToDomain)
  }

  /**
   * Get reports created by a staff member
   */
  async getReportsByCreator(createdBy: string): Promise<StudentReport[]> {
    const reports = await prisma.studentReport.findMany({
      where: { createdBy },
      orderBy: { createdAt: 'desc' },
    })

    return reports.map(mapPrismaStudentReportToDomain)
  }

  /**
   * Get reports by school
   */
  async getReportsBySchool(
    schoolId: string,
    options?: {
      reportType?: StudentReportType
      status?: StudentReportStatus
      startDate?: Date
      endDate?: Date
    }
  ): Promise<StudentReport[]> {
    const whereClause: Record<string, unknown> = { schoolId }

    if (options?.reportType) {
      whereClause.reportType = options.reportType
    }

    if (options?.status) {
      whereClause.status = options.status
    }

    if (options?.startDate || options?.endDate) {
      whereClause.createdAt = {}
      if (options.startDate) {
        (whereClause.createdAt as Record<string, Date>).gte = options.startDate
      }
      if (options.endDate) {
        (whereClause.createdAt as Record<string, Date>).lte = options.endDate
      }
    }

    const reports = await prisma.studentReport.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    })

    return reports.map(mapPrismaStudentReportToDomain)
  }

  /**
   * Get pending acknowledgments for a school
   */
  async getPendingAcknowledgments(schoolId: string): Promise<StudentReport[]> {
    const reports = await prisma.studentReport.findMany({
      where: {
        schoolId,
        requiresAcknowledgment: true,
        acknowledgedAt: null,
        status: { in: [StudentReportStatus.SENT, StudentReportStatus.VIEWED] },
      },
      orderBy: { createdAt: 'asc' },
    })

    return reports.map(mapPrismaStudentReportToDomain)
  }

  /**
   * Get reports with meeting requests
   */
  async getReportsWithMeetingRequests(schoolId: string): Promise<StudentReport[]> {
    const reports = await prisma.studentReport.findMany({
      where: {
        schoolId,
        meetingRequested: true,
      },
      orderBy: { meetingRequestedAt: 'desc' },
    })

    return reports.map(mapPrismaStudentReportToDomain)
  }

  /**
   * Get report summary for a student
   * Requirement 37.5: Historical reference
   */
  async getStudentReportSummary(studentId: string): Promise<StudentReportSummary> {
    const reports = await this.getReportsByStudent(studentId)

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true },
    })

    const studentName = student 
      ? `${student.firstName} ${student.lastName}` 
      : 'Unknown Student'

    // Initialize counters
    const byType: Record<StudentReportType, number> = {
      [StudentReportType.ACADEMIC]: 0,
      [StudentReportType.BEHAVIOR]: 0,
      [StudentReportType.HEALTH]: 0,
      [StudentReportType.GENERAL]: 0,
    }

    const byStatus: Record<StudentReportStatus, number> = {
      [StudentReportStatus.PENDING]: 0,
      [StudentReportStatus.SENT]: 0,
      [StudentReportStatus.VIEWED]: 0,
      [StudentReportStatus.ACKNOWLEDGED]: 0,
      [StudentReportStatus.RESPONDED]: 0,
    }

    let pendingAcknowledgments = 0

    for (const report of reports) {
      byType[report.reportType]++
      byStatus[report.status]++

      if (
        report.requiresAcknowledgment &&
        !report.acknowledgedAt &&
        report.status !== StudentReportStatus.PENDING
      ) {
        pendingAcknowledgments++
      }
    }

    return {
      studentId,
      studentName,
      totalReports: reports.length,
      byType,
      byStatus,
      recentReports: reports.slice(0, 5),
      pendingAcknowledgments,
    }
  }

  // ============================================
  // PURE FUNCTIONS FOR TESTING
  // ============================================

  /**
   * Validate report type
   */
  isValidReportType(reportType: string): reportType is StudentReportType {
    return Object.values(StudentReportType).includes(reportType as StudentReportType)
  }

  /**
   * Determine if a report requires acknowledgment based on type
   */
  shouldRequireAcknowledgment(reportType: StudentReportType): boolean {
    // Behavior and health reports typically require acknowledgment
    return reportType === StudentReportType.BEHAVIOR || 
           reportType === StudentReportType.HEALTH
  }

  /**
   * Check if parent can respond to a report
   */
  canParentRespond(status: StudentReportStatus): boolean {
    // Parent can respond if report has been sent and viewed
    return status === StudentReportStatus.SENT ||
           status === StudentReportStatus.VIEWED ||
           status === StudentReportStatus.ACKNOWLEDGED
  }

  /**
   * Check if report is pending acknowledgment
   */
  isPendingAcknowledgment(report: StudentReport): boolean {
    return report.requiresAcknowledgment &&
           !report.acknowledgedAt &&
           report.status !== StudentReportStatus.PENDING
  }

  /**
   * Calculate report statistics for a set of reports
   */
  calculateReportStatistics(reports: StudentReport[]): {
    total: number
    byType: Record<StudentReportType, number>
    byStatus: Record<StudentReportStatus, number>
    acknowledgedRate: number
    responseRate: number
    meetingRequestRate: number
  } {
    const byType: Record<StudentReportType, number> = {
      [StudentReportType.ACADEMIC]: 0,
      [StudentReportType.BEHAVIOR]: 0,
      [StudentReportType.HEALTH]: 0,
      [StudentReportType.GENERAL]: 0,
    }

    const byStatus: Record<StudentReportStatus, number> = {
      [StudentReportStatus.PENDING]: 0,
      [StudentReportStatus.SENT]: 0,
      [StudentReportStatus.VIEWED]: 0,
      [StudentReportStatus.ACKNOWLEDGED]: 0,
      [StudentReportStatus.RESPONDED]: 0,
    }

    let acknowledged = 0
    let responded = 0
    let meetingRequested = 0
    let requiresAck = 0

    for (const report of reports) {
      byType[report.reportType]++
      byStatus[report.status]++

      if (report.requiresAcknowledgment) {
        requiresAck++
        if (report.acknowledgedAt) {
          acknowledged++
        }
      }

      if (report.respondedAt) {
        responded++
      }

      if (report.meetingRequested) {
        meetingRequested++
      }
    }

    const total = reports.length
    const sentOrLater = total - byStatus[StudentReportStatus.PENDING]

    return {
      total,
      byType,
      byStatus,
      acknowledgedRate: requiresAck > 0 ? (acknowledged / requiresAck) * 100 : 0,
      responseRate: sentOrLater > 0 ? (responded / sentOrLater) * 100 : 0,
      meetingRequestRate: sentOrLater > 0 ? (meetingRequested / sentOrLater) * 100 : 0,
    }
  }
}

// Export singleton instance
export const studentReportService = new StudentReportService()
