/**
 * Dashboard Service
 * Provides data aggregation for admin dashboards and staff-centric dashboards
 * Requirements: 1.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 7.1, 8.1, 9.1, 10.1, 33.1, 33.2, 33.3, 33.4, 33.5, 39.1, 39.2, 39.3, 39.4, 39.5
 */  
import { prisma } from '@/lib/db'
import { 
  AttendanceStatus, 
  MessageStatus, 
  MessageChannel, 
  PilotType, 
  StaffStatus, 
  StudentStatus,
  Role,
  StaffRole,
  TaskStatus,
  AlertType,
  AlertSeverity,
} from '@/types/enums'
import {
  TeacherDashboardData,
  ClassTeacherDashboardData,
  DOSDashboardData,
  BursarDashboardData,
  HostelDashboardData,
  SupportDashboardData,
  QuickAction,
  Alert,
  Task,
  TeacherClassCard,
  AttendanceAlert,
  DeadlineAlert,
  ReportAlert,
  ClassSnapshot,
  StudentAlert,
  FeeDefaulterInfo,
  ApprovalAlert,
  TeacherAlert,
  ConflictAlert,
  TermInfo,
  SubjectAllocation,
  ExamScheduleInfo,
  MarkApproval,
  ReportGeneration,
  TeacherPerformanceInfo,
  BalanceAlert,
  ReconciliationAlert,
  ReportAccess,
} from '@/types/staff-dashboard'

// ============================================
// SCHOOL ADMIN DASHBOARD TYPES
// ============================================

export interface SchoolAdminDashboardData {
  schoolId: string
  schoolName: string
  overview: SchoolOverview
  staffSummary: StaffSummary
  academicCalendar: AcademicCalendarSummary
  communicationReport: CommunicationReport
}

export interface SchoolOverview {
  totalStudents: number
  activeStudents: number
  totalStaff: number
  activeStaff: number
  totalClasses: number
  currentTerm?: string
  currentAcademicYear?: string
}

export interface StaffSummary {
  totalStaff: number
  activeStaff: number
  inactiveStaff: number
  byRole: { role: string; count: number }[]
}

export interface AcademicCalendarSummary {
  currentYear?: {
    id: string
    name: string
    startDate: Date
    endDate: Date
  }
  currentTerm?: {
    id: string
    name: string
    startDate: Date
    endDate: Date
    currentWeek: number
  }
  upcomingTerms: {
    id: string
    name: string
    startDate: Date
  }[]
}

export interface CommunicationReport {
  totalMessages: number
  sentCount: number
  deliveredCount: number
  failedCount: number
  readCount: number
  byChannel: { channel: MessageChannel; count: number }[]
  deliveryRate: number
}

// ============================================
// SUPER ADMIN DASHBOARD TYPES
// ============================================

export interface SuperAdminDashboardData {
  systemOverview: SystemOverview
  schoolMetrics: SchoolMetrics[]
  communicationMetrics: SystemCommunicationMetrics
  financialMetrics: SystemFinancialMetrics
  pilotConversionMetrics: PilotConversionMetrics
  anomalies: Anomaly[]
}

export interface SystemOverview {
  totalSchools: number
  activeSchools: number
  totalStudents: number
  totalStaff: number
  totalUsers: number
}

export interface SchoolMetrics {
  schoolId: string
  schoolName: string
  licenseType: string
  totalStudents: number
  activeUsers: number
  engagementRate: number
  isAnomaly: boolean
  anomalyReason?: string
}

export interface SystemCommunicationMetrics {
  totalMessages: number
  byStatus: { status: MessageStatus; count: number }[]
  byChannel: { channel: MessageChannel; count: number }[]
  deliveryRate: number
  readRate: number
  failureRate: number
}

export interface SystemFinancialMetrics {
  totalSmsCost: number
  totalRevenue: number
  netMargin: number
  costBySchool: { schoolId: string; schoolName: string; cost: number }[]
}

export interface PilotConversionMetrics {
  totalFreeStudents: number
  totalPaidStudents: number
  conversionRate: number
  conversionsBySchool: { schoolId: string; schoolName: string; freeCount: number; paidCount: number; rate: number }[]
}

export interface Anomaly {
  schoolId: string
  schoolName: string
  type: 'HIGH_FAILURE_RATE' | 'LOW_ENGAGEMENT' | 'HIGH_ARREARS' | 'LOW_ATTENDANCE'
  severity: ConflictSeverity.WARNING | 'CRITICAL'
  message: string
  value: number
  threshold: number
}

// ============================================
// REAL-TIME ATTENDANCE DASHBOARD TYPES
// ============================================

export interface RealTimeAttendanceDashboard {
  schoolId: string
  date: Date
  overallAttendance: number
  classAttendance: ClassAttendanceData[]
  absentStudents: AbsentStudentData[]
  trends: AttendanceTrends
}

export interface ClassAttendanceData {
  classId: string
  className: string
  totalStudents: number
  presentCount: number
  absentCount: number
  lateCount: number
  attendancePercentage: number
  isBelowThreshold: boolean
}

export interface AbsentStudentData {
  studentId: string
  studentName: string
  className: string
  periodsAbsent: number[]
  guardianContactStatus: 'VERIFIED' | 'UNVERIFIED' | 'NO_GUARDIAN'
  guardianPhone?: string
}

export interface AttendanceTrends {
  weekly: { date: string; percentage: number }[]
  monthly: { week: string; percentage: number }[]
}

// ============================================
// TODAY PANEL TYPES - TEACHER DASHBOARD
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
// ============================================

/**
 * Scheduled class entry for Today Panel
 * Requirements: 2.1, 2.2 - Display scheduled classes with time slot, subject, class, and status
 */
export interface ScheduledClassEntry {
  id: string
  period: number
  timeSlot: string
  subject: {
    id: string
    name: string
  }
  class: {
    id: string
    name: string
    streamName?: string
  }
  room?: string
  attendanceStatus: 'not_taken' | 'done'
  marksStatus: 'pending' | 'done'
}

/**
 * Today Panel data structure
 * Requirements: 2.1 - Display all classes scheduled for the current day
 */
export interface TodayPanelData {
  date: string
  dayOfWeek: number
  scheduledClasses: ScheduledClassEntry[]
}

// Threshold constants
const ATTENDANCE_THRESHOLD = 80
const FAILURE_RATE_THRESHOLD = 10
const ENGAGEMENT_RATE_THRESHOLD = 30


// ============================================
// QUICK ACTION CONSTANTS
// Requirements: 5.2, 6.2, 7.2, 8.2, 9.2, 10.2
// ============================================

/**
 * Teacher quick actions
 * Requirements: 5.2 - take attendance, enter marks, view class list, message class
 */
const TEACHER_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'take-attendance',
    label: 'Take Attendance',
    icon: 'clipboard-check',
    action: '/dashboard/attendance/mark',
    permissions: ['attendance.create'],
  },
  {
    id: 'enter-marks',
    label: 'Enter Marks',
    icon: 'edit',
    action: '/dashboard/marks/entry',
    permissions: ['marks.create'],
  },
  {
    id: 'view-class-list',
    label: 'View Class List',
    icon: 'users',
    action: '/dashboard/classes',
    permissions: ['students.view'],
  },
  {
    id: 'message-class',
    label: 'Message Class',
    icon: 'message-square',
    action: '/dashboard/communications/compose',
    permissions: ['messages.create'],
  },
]

/**
 * Class Teacher quick actions
 * Requirements: 6.2 - class attendance, class marks overview, message parents, view discipline
 */
const CLASS_TEACHER_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'class-attendance',
    label: 'Class Attendance',
    icon: 'clipboard-check',
    action: '/dashboard/attendance',
    permissions: ['attendance.view'],
  },
  {
    id: 'class-marks-overview',
    label: 'Marks Overview',
    icon: 'bar-chart',
    action: '/dashboard/marks/overview',
    permissions: ['marks.view'],
  },
  {
    id: 'message-parents',
    label: 'Message Parents',
    icon: 'mail',
    action: '/dashboard/communications/parents',
    permissions: ['messages.create'],
  },
  {
    id: 'view-discipline',
    label: 'View Discipline',
    icon: 'alert-triangle',
    action: '/dashboard/discipline',
    permissions: ['discipline.view'],
  },
]

/**
 * DOS quick actions
 * Requirements: 7.2 - term setup, subject allocations, exam schedules, approve marks
 */
const DOS_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'term-setup',
    label: 'Term Setup',
    icon: 'calendar',
    action: '/dashboard/academic/terms',
    permissions: ['terms.edit'],
  },
  {
    id: 'subject-allocations',
    label: 'Subject Allocations',
    icon: 'book',
    action: '/dashboard/academic/allocations',
    permissions: ['subjects.edit'],
  },
  {
    id: 'exam-schedules',
    label: 'Exam Schedules',
    icon: 'clock',
    action: '/dashboard/academic/exams',
    permissions: ['exams.edit'],
  },
  {
    id: 'approve-marks',
    label: 'Approve Marks',
    icon: 'check-circle',
    action: '/dashboard/marks/approve',
    permissions: ['marks.approve'],
  },
  {
    id: 'generate-reports',
    label: 'Generate Reports',
    icon: 'file-text',
    action: '/dashboard/reports/generate',
    permissions: ['reports.generate'],
  },
]

/**
 * Bursar quick actions
 * Requirements: 10.2 - record payment, issue receipt, view student balance
 */
const BURSAR_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'record-payment',
    label: 'Record Payment',
    icon: 'dollar-sign',
    action: '/dashboard/fees/payment',
    permissions: ['payments.create'],
  },
  {
    id: 'issue-receipt',
    label: 'Issue Receipt',
    icon: 'file-text',
    action: '/dashboard/fees/receipt',
    permissions: ['receipts.create'],
  },
  {
    id: 'view-student-balance',
    label: 'View Balances',
    icon: 'credit-card',
    action: '/dashboard/fees/balances',
    permissions: ['fees.view'],
  },
  {
    id: 'fee-reports',
    label: 'Fee Reports',
    icon: 'bar-chart-2',
    action: '/dashboard/reports/fees',
    permissions: ['reports.view'],
  },
]

/**
 * Hostel Staff quick actions
 * Requirements: 8.2 - track presence, log discipline, emergency alerts
 */
const HOSTEL_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'track-presence',
    label: 'Track Presence',
    icon: 'users',
    action: '/dashboard/hostel/presence',
    permissions: ['hostel.presence'],
  },
  {
    id: 'log-discipline',
    label: 'Log Incident',
    icon: 'alert-circle',
    action: '/dashboard/hostel/discipline',
    permissions: ['discipline.create'],
  },
  {
    id: 'emergency-alert',
    label: 'Emergency Alert',
    icon: 'alert-triangle',
    action: '/dashboard/hostel/emergency',
    permissions: ['emergency.send'],
  },
]

/**
 * Support Staff quick actions
 * Requirements: 9.2 - view tasks, view notices
 */
const SUPPORT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'view-tasks',
    label: 'My Tasks',
    icon: 'check-square',
    action: '/dashboard/tasks',
    permissions: ['tasks.view'],
  },
  {
    id: 'view-notices',
    label: 'Notices',
    icon: 'bell',
    action: '/dashboard/notices',
    permissions: ['notices.view'],
  },
]



export class DashboardService {
  
  /**
   * Helper method to ensure a value is converted to a safe string
   * Handles objects, null, undefined, and other edge cases
   */
  private ensureString(value: any): string {
    if (value === null || value === undefined) {
      return ''
    }
    if (typeof value === 'string') {
      return value.trim()
    }
    if (typeof value === 'object') {
      // If it's an object with a name property, use that
      if (value.name && typeof value.name === 'string') {
        return value.name.trim()
      }
      // If it's an object with a toString method, use that
      if (typeof value.toString === 'function') {
        return String(value).trim()
      }
      // Otherwise, return empty string to avoid rendering objects
      return ''
    }
    // For numbers, booleans, etc., convert to string
    return String(value).trim()
  }
  // ============================================
  // SCHOOL ADMIN DASHBOARD
  // ============================================

  /**
   * Get School Admin dashboard data
   * Requirements: 33.1, 33.2, 33.3
   */
  async getSchoolAdminDashboard(schoolId: string): Promise<SchoolAdminDashboardData> {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
    })

    if (!school) {
      throw new Error(`School with id ${schoolId} not found`)
    }

    const [overview, staffSummary, academicCalendar, communicationReport] = await Promise.all([
      this.getSchoolOverview(schoolId),
      this.getStaffSummary(schoolId),
      this.getAcademicCalendarSummary(schoolId),
      this.getCommunicationReport(schoolId),
    ])

    return {
      schoolId,
      schoolName: school.name,
      overview,
      staffSummary,
      academicCalendar,
      communicationReport,
    }
  }

  /**
   * Get school overview statistics
   */
  async getSchoolOverview(schoolId: string): Promise<SchoolOverview> {
    const [
      totalStudents,
      activeStudents,
      totalStaff,
      activeStaff,
      totalClasses,
      currentYear,
    ] = await Promise.all([
      prisma.student.count({ where: { schoolId } }),
      prisma.student.count({ where: { schoolId, status: StudentStatus.ACTIVE } }),
      prisma.staff.count({ where: { schoolId } }),
      prisma.staff.count({ where: { schoolId, status: StaffStatus.ACTIVE } }),
      prisma.class.count({ where: { schoolId } }),
      prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: {
          terms: {
            orderBy: { startDate: 'desc' },
            take: 1,
          },
        },
      }),
    ])

    return {
      totalStudents,
      activeStudents,
      totalStaff,
      activeStaff,
      totalClasses,
      currentTerm: currentYear?.terms[0]?.name,
      currentAcademicYear: currentYear?.name,
    }
  }

  /**
   * Get staff summary by role
   */
  async getStaffSummary(schoolId: string): Promise<StaffSummary> {
    const staffList = await prisma.staff.findMany({
      where: { schoolId },
      select: { role: true, status: true },
    })

    const roleCount = new Map<string, number>()
    let activeCount = 0
    let inactiveCount = 0

    for (const staff of staffList) {
      const count = roleCount.get(staff.role) || 0
      roleCount.set(staff.role, count + 1)

      if (staff.status === StaffStatus.ACTIVE) {
        activeCount++
      } else {
        inactiveCount++
      }
    }

    const byRole = Array.from(roleCount.entries()).map(([role, count]) => ({
      role,
      count,
    }))

    return {
      totalStaff: staffList.length,
      activeStaff: activeCount,
      inactiveStaff: inactiveCount,
      byRole,
    }
  }

  /**
   * Get academic calendar summary
   */
  async getAcademicCalendarSummary(schoolId: string): Promise<AcademicCalendarSummary> {
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: {
        terms: {
          orderBy: { startDate: 'asc' },
        },
      },
    })

    if (!currentYear) {
      return { upcomingTerms: [] }
    }

    const now = new Date()
    let currentTerm = currentYear.terms.find(
      (t) => t.startDate <= now && t.endDate >= now
    )

    // Calculate current week if in a term
    let currentWeek = 0
    if (currentTerm) {
      const msPerWeek = 7 * 24 * 60 * 60 * 1000
      const weeksSinceStart = Math.floor(
        (now.getTime() - currentTerm.startDate.getTime()) / msPerWeek
      )
      currentWeek = weeksSinceStart + 1
    }

    const upcomingTerms = currentYear.terms
      .filter((t) => t.startDate > now)
      .map((t) => ({
        id: t.id,
        name: t.name,
        startDate: t.startDate,
      }))

    return {
      currentYear: {
        id: currentYear.id,
        name: currentYear.name,
        startDate: currentYear.startDate,
        endDate: currentYear.endDate,
      },
      currentTerm: currentTerm
        ? {
            id: currentTerm.id,
            name: currentTerm.name,
            startDate: currentTerm.startDate,
            endDate: currentTerm.endDate,
            currentWeek,
          }
        : undefined,
      upcomingTerms,
    }
  }

  /**
   * Get communication report for a school
   */
  async getCommunicationReport(
    schoolId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CommunicationReport> {
    const dateFilter = startDate && endDate
      ? { createdAt: { gte: startDate, lte: endDate } }
      : {}

    const messages = await prisma.message.findMany({
      where: { schoolId, ...dateFilter },
      select: { status: true, channel: true },
    })

    let sentCount = 0
    let deliveredCount = 0
    let failedCount = 0
    let readCount = 0

    const channelCount = new Map<MessageChannel, number>()

    for (const msg of messages) {
      const channel = msg.channel as MessageChannel
      channelCount.set(channel, (channelCount.get(channel) || 0) + 1)

      switch (msg.status) {
        case MessageStatus.SENT:
          sentCount++
          break
        case MessageStatus.DELIVERED:
          deliveredCount++
          break
        case MessageStatus.FAILED:
          failedCount++
          break
        case MessageStatus.READ:
          readCount++
          break
      }
    }

    const totalMessages = messages.length
    const deliveryRate = totalMessages > 0
      ? ((sentCount + deliveredCount + readCount) / totalMessages) * 100
      : 0

    const byChannel = Array.from(channelCount.entries()).map(([channel, count]) => ({
      channel,
      count,
    }))

    return {
      totalMessages,
      sentCount,
      deliveredCount,
      failedCount,
      readCount,
      byChannel,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
    }
  }


  // ============================================
  // SUPER ADMIN DASHBOARD
  // ============================================

  /**
   * Get Super Admin dashboard data
   * Requirements: 1.4, 33.1, 33.2, 33.3, 33.4, 33.5
   */
  async getSuperAdminDashboard(): Promise<SuperAdminDashboardData> {
    const [
      systemOverview,
      schoolMetrics,
      communicationMetrics,
      financialMetrics,
      pilotConversionMetrics,
    ] = await Promise.all([
      this.getSystemOverview(),
      this.getAllSchoolMetrics(),
      this.getSystemCommunicationMetrics(),
      this.getSystemFinancialMetrics(),
      this.getPilotConversionMetrics(),
    ])

    // Detect anomalies
    const anomalies = this.detectAnomalies(schoolMetrics, communicationMetrics)

    // Mark schools with anomalies
    for (const school of schoolMetrics) {
      const schoolAnomalies = anomalies.filter((a) => a.schoolId === school.schoolId)
      if (schoolAnomalies.length > 0) {
        school.isAnomaly = true
        school.anomalyReason = schoolAnomalies.map((a) => a.type).join(', ')
      }
    }

    return {
      systemOverview,
      schoolMetrics,
      communicationMetrics,
      financialMetrics,
      pilotConversionMetrics,
      anomalies,
    }
  }

  /**
   * Get system-wide overview
   * Requirement 1.4: Display active users, data volume per school
   */
  async getSystemOverview(): Promise<SystemOverview> {
    const [totalSchools, activeSchools, totalStudents, totalStaff, totalUsers] =
      await Promise.all([
        prisma.school.count(),
        prisma.school.count({ where: { isActive: true } }),
        prisma.student.count(),
        prisma.staff.count(),
        prisma.user.count(),
      ])

    return {
      totalSchools,
      activeSchools,
      totalStudents,
      totalStaff,
      totalUsers,
    }
  }

  /**
   * Get metrics for all schools
   * Requirement 33.1: Display total students, active users, engagement rates per school
   */
  async getAllSchoolMetrics(): Promise<SchoolMetrics[]> {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            students: true,
            users: { where: { isActive: true } },
            messages: true,
          },
        },
      },
    })

    const metrics: SchoolMetrics[] = []

    for (const school of schools) {
      // Calculate engagement rate based on message interactions
      const totalMessages = school._count.messages
      const readMessages = await prisma.message.count({
        where: { schoolId: school.id, status: MessageStatus.READ },
      })
      const engagementRate = totalMessages > 0
        ? (readMessages / totalMessages) * 100
        : 0

      metrics.push({
        schoolId: school.id,
        schoolName: school.name,
        licenseType: school.licenseType,
        totalStudents: school._count.students,
        activeUsers: school._count.users,
        engagementRate: Math.round(engagementRate * 100) / 100,
        isAnomaly: false,
      })
    }

    return metrics
  }

  /**
   * Get system-wide communication metrics
   * Requirement 33.2: Show SMS/WhatsApp/Email sent, delivered, failed, read rates
   */
  async getSystemCommunicationMetrics(): Promise<SystemCommunicationMetrics> {
    const messages = await prisma.message.findMany({
      select: { status: true, channel: true },
    })

    const statusCount = new Map<MessageStatus, number>()
    const channelCount = new Map<MessageChannel, number>()

    for (const msg of messages) {
      const status = msg.status as MessageStatus
      const channel = msg.channel as MessageChannel
      statusCount.set(status, (statusCount.get(status) || 0) + 1)
      channelCount.set(channel, (channelCount.get(channel) || 0) + 1)
    }

    const totalMessages = messages.length
    const deliveredCount = (statusCount.get(MessageStatus.DELIVERED) || 0) +
      (statusCount.get(MessageStatus.READ) || 0)
    const readCount = statusCount.get(MessageStatus.READ) || 0
    const failedCount = statusCount.get(MessageStatus.FAILED) || 0

    return {
      totalMessages,
      byStatus: Array.from(statusCount.entries()).map(([status, count]) => ({
        status,
        count,
      })),
      byChannel: Array.from(channelCount.entries()).map(([channel, count]) => ({
        channel,
        count,
      })),
      deliveryRate: totalMessages > 0 ? (deliveredCount / totalMessages) * 100 : 0,
      readRate: totalMessages > 0 ? (readCount / totalMessages) * 100 : 0,
      failureRate: totalMessages > 0 ? (failedCount / totalMessages) * 100 : 0,
    }
  }

  /**
   * Get system-wide financial metrics
   * Requirement 33.3: Show SMS costs, revenue, net margin per school
   */
  async getSystemFinancialMetrics(): Promise<SystemFinancialMetrics> {
    // Get SMS costs from cost logs
    const smsCosts = await prisma.sMSCostLog.groupBy({
      by: ['schoolId'],
      _sum: { cost: true },
    })

    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    })

    const schoolMap = new Map(schools.map((s) => [s.id, s.name]))

    const costBySchool = smsCosts.map((c) => ({
      schoolId: c.schoolId,
      schoolName: schoolMap.get(c.schoolId) || 'Unknown',
      cost: c._sum.cost || 0,
    }))

    const totalSmsCost = costBySchool.reduce((sum, c) => sum + c.cost, 0)

    // Revenue would come from payment/subscription data
    // For now, estimate based on paid students
    const paidStudents = await prisma.student.count({
      where: { pilotType: PilotType.PAID },
    })
    const estimatedRevenue = paidStudents * 50000 // Estimated per-student revenue

    return {
      totalSmsCost,
      totalRevenue: estimatedRevenue,
      netMargin: estimatedRevenue - totalSmsCost,
      costBySchool,
    }
  }

  /**
   * Get pilot conversion metrics
   * Requirement 33.4: Show free-to-paid conversion rates and trends
   */
  async getPilotConversionMetrics(): Promise<PilotConversionMetrics> {
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      include: {
        students: {
          select: { pilotType: true },
        },
      },
    })

    let totalFree = 0
    let totalPaid = 0
    const conversionsBySchool: PilotConversionMetrics['conversionsBySchool'] = []

    for (const school of schools) {
      const freeCount = school.students.filter(
        (s) => s.pilotType === PilotType.FREE
      ).length
      const paidCount = school.students.filter(
        (s) => s.pilotType === PilotType.PAID
      ).length

      totalFree += freeCount
      totalPaid += paidCount

      const total = freeCount + paidCount
      const rate = total > 0 ? (paidCount / total) * 100 : 0

      conversionsBySchool.push({
        schoolId: school.id,
        schoolName: school.name,
        freeCount,
        paidCount,
        rate: Math.round(rate * 100) / 100,
      })
    }

    const totalStudents = totalFree + totalPaid
    const conversionRate = totalStudents > 0
      ? (totalPaid / totalStudents) * 100
      : 0

    return {
      totalFreeStudents: totalFree,
      totalPaidStudents: totalPaid,
      conversionRate: Math.round(conversionRate * 100) / 100,
      conversionsBySchool,
    }
  }

  /**
   * Detect anomalies in school metrics
   * Requirement 33.5: Highlight schools with high failure rate, low engagement
   */
  detectAnomalies(
    schoolMetrics: SchoolMetrics[],
    commMetrics: SystemCommunicationMetrics
  ): Anomaly[] {
    const anomalies: Anomaly[] = []

    // Check for low engagement
    for (const school of schoolMetrics) {
      if (school.engagementRate < ENGAGEMENT_RATE_THRESHOLD) {
        anomalies.push({
          schoolId: school.schoolId,
          schoolName: school.schoolName,
          type: 'LOW_ENGAGEMENT',
          severity: school.engagementRate < 15 ? 'CRITICAL' : 'WARNING',
          message: `Engagement rate (${school.engagementRate}%) is below threshold`,
          value: school.engagementRate,
          threshold: ENGAGEMENT_RATE_THRESHOLD,
        })
      }
    }

    // Check system-wide failure rate
    if (commMetrics.failureRate > FAILURE_RATE_THRESHOLD) {
      anomalies.push({
        schoolId: 'SYSTEM',
        schoolName: 'System-wide',
        type: 'HIGH_FAILURE_RATE',
        severity: commMetrics.failureRate > 20 ? 'CRITICAL' : 'WARNING',
        message: `Message failure rate (${commMetrics.failureRate.toFixed(1)}%) exceeds threshold`,
        value: commMetrics.failureRate,
        threshold: FAILURE_RATE_THRESHOLD,
      })
    }

    return anomalies
  }


  // ============================================
  // REAL-TIME ATTENDANCE DASHBOARD
  // ============================================

  /**
   * Get real-time attendance dashboard data
   * Requirements: 39.1, 39.2, 39.3, 39.4, 39.5
   */
  async getRealTimeAttendanceDashboard(
    schoolId: string,
    date?: Date
  ): Promise<RealTimeAttendanceDashboard> {
    const targetDate = date || new Date()
    const normalizedDate = this.normalizeDate(targetDate)

    const [classAttendance, absentStudents, trends] = await Promise.all([
      this.getClassAttendanceForDate(schoolId, normalizedDate),
      this.getAbsentStudentsWithGuardianStatus(schoolId, normalizedDate),
      this.getAttendanceTrends(schoolId, normalizedDate),
    ])

    // Calculate overall attendance
    const totalStudents = classAttendance.reduce((sum, c) => sum + c.totalStudents, 0)
    const totalPresent = classAttendance.reduce((sum, c) => sum + c.presentCount + c.lateCount, 0)
    const overallAttendance = totalStudents > 0
      ? (totalPresent / totalStudents) * 100
      : 0

    return {
      schoolId,
      date: normalizedDate,
      overallAttendance: Math.round(overallAttendance * 100) / 100,
      classAttendance,
      absentStudents,
      trends,
    }
  }

  /**
   * Get attendance data for all classes on a specific date
   * Requirement 39.1: Display current day attendance percentages per class
   */
  async getClassAttendanceForDate(
    schoolId: string,
    date: Date
  ): Promise<ClassAttendanceData[]> {
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        students: {
          where: { status: StudentStatus.ACTIVE },
          select: { id: true },
        },
      },
    })

    const classAttendanceData: ClassAttendanceData[] = []

    for (const cls of classes) {
      const studentIds = cls.students.map((s) => s.id)
      const totalStudents = studentIds.length

      if (totalStudents === 0) {
        classAttendanceData.push({
          classId: cls.id,
          className: cls.name,
          totalStudents: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          attendancePercentage: 0,
          isBelowThreshold: false,
        })
        continue
      }

      // Get attendance records for this class on this date
      const records = await prisma.attendance.findMany({
        where: {
          classId: cls.id,
          date,
          studentId: { in: studentIds },
        },
      })

      // Group by student and get their status (use first period as representative)
      const studentStatuses = new Map<string, AttendanceStatus>()
      for (const record of records) {
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

      // Students without records are considered not yet marked
      const unmarkedCount = totalStudents - studentStatuses.size

      const attendancePercentage = totalStudents > 0
        ? ((presentCount + lateCount) / totalStudents) * 100
        : 0

      classAttendanceData.push({
        classId: cls.id,
        className: cls.name,
        totalStudents,
        presentCount,
        absentCount: absentCount + unmarkedCount, // Include unmarked as absent for dashboard
        lateCount,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100,
        isBelowThreshold: attendancePercentage < ATTENDANCE_THRESHOLD,
      })
    }

    // Sort by attendance percentage (lowest first to highlight problem classes)
    return classAttendanceData.sort(
      (a, b) => a.attendancePercentage - b.attendancePercentage
    )
  }

  /**
   * Get absent students with guardian contact status
   * Requirement 39.4: Show absent students with guardian contact status
   */
  async getAbsentStudentsWithGuardianStatus(
    schoolId: string,
    date: Date
  ): Promise<AbsentStudentData[]> {
    // Get all absent records for the date
    const absentRecords = await prisma.attendance.findMany({
      where: {
        status: AttendanceStatus.ABSENT,
        date,
        student: { schoolId },
      },
      include: {
        student: {
          include: {
            class: true,
            studentGuardians: {
              where: { isPrimary: true },
              include: { guardian: true },
            },
          },
        },
      },
    })

    // Group by student
    const studentAbsences = new Map<
      string,
      {
        student: typeof absentRecords[0]['student']
        periods: number[]
      }
    >()

    for (const record of absentRecords) {
      const existing = studentAbsences.get(record.studentId)
      if (existing) {
        existing.periods.push(record.period)
      } else {
        studentAbsences.set(record.studentId, {
          student: record.student,
          periods: [record.period],
        })
      }
    }

    const absentStudents: AbsentStudentData[] = []

    for (const [studentId, data] of studentAbsences) {
      const guardian = data.student.studentGuardians[0]?.guardian

      let guardianContactStatus: AbsentStudentData['guardianContactStatus']
      let guardianPhone: string | undefined

      if (!guardian) {
        guardianContactStatus = 'NO_GUARDIAN'
      } else if (guardian.phoneVerified) {
        guardianContactStatus = 'VERIFIED'
        guardianPhone = guardian.phone
      } else {
        guardianContactStatus = 'UNVERIFIED'
        guardianPhone = guardian.phone
      }

      absentStudents.push({
        studentId,
        studentName: `${data.student.firstName} ${data.student.lastName}`,
        className: data.student.class.name,
        periodsAbsent: data.periods.sort((a, b) => a - b),
        guardianContactStatus,
        guardianPhone,
      })
    }

    return absentStudents
  }

  /**
   * Get attendance trends (weekly and monthly)
   * Requirement 39.5: Display weekly and monthly attendance patterns
   */
  async getAttendanceTrends(
    schoolId: string,
    currentDate: Date
  ): Promise<AttendanceTrends> {
    const weekly: { date: string; percentage: number }[] = []
    const monthly: { week: string; percentage: number }[] = []

    // Get last 7 days for weekly trend
    for (let i = 6; i >= 0; i--) {
      const date = new Date(currentDate)
      date.setDate(date.getDate() - i)
      const normalizedDate = this.normalizeDate(date)

      const dayAttendance = await this.calculateDayAttendance(schoolId, normalizedDate)
      weekly.push({
        date: normalizedDate.toISOString().split('T')[0],
        percentage: dayAttendance,
      })
    }

    // Get last 4 weeks for monthly trend
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(currentDate)
      weekStart.setDate(weekStart.getDate() - (i * 7 + 6))
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() - i * 7)

      const weekAttendance = await this.calculateWeekAttendance(
        schoolId,
        this.normalizeDate(weekStart),
        this.normalizeDate(weekEnd)
      )

      monthly.push({
        week: `Week ${4 - i}`,
        percentage: weekAttendance,
      })
    }

    return { weekly, monthly }
  }

  /**
   * Calculate attendance percentage for a single day
   */
  private async calculateDayAttendance(
    schoolId: string,
    date: Date
  ): Promise<number> {
    const totalStudents = await prisma.student.count({
      where: { schoolId, status: StudentStatus.ACTIVE },
    })

    if (totalStudents === 0) return 0

    const presentRecords = await prisma.attendance.findMany({
      where: {
        date,
        status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
        student: { schoolId },
      },
      distinct: ['studentId'],
    })

    const percentage = (presentRecords.length / totalStudents) * 100
    return Math.round(percentage * 100) / 100
  }

  /**
   * Calculate average attendance for a week
   */
  private async calculateWeekAttendance(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const totalStudents = await prisma.student.count({
      where: { schoolId, status: StudentStatus.ACTIVE },
    })

    if (totalStudents === 0) return 0

    // Get all attendance records for the week
    const records = await prisma.attendance.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        student: { schoolId },
      },
    })

    // Group by date and count unique present students per day
    const dailyPresent = new Map<string, Set<string>>()

    for (const record of records) {
      const dateKey = record.date.toISOString().split('T')[0]
      if (!dailyPresent.has(dateKey)) {
        dailyPresent.set(dateKey, new Set())
      }
      if (
        record.status === AttendanceStatus.PRESENT ||
        record.status === AttendanceStatus.LATE
      ) {
        dailyPresent.get(dateKey)!.add(record.studentId)
      }
    }

    // Calculate average
    const days = dailyPresent.size
    if (days === 0) return 0

    let totalPercentage = 0
    for (const presentSet of dailyPresent.values()) {
      totalPercentage += (presentSet.size / totalStudents) * 100
    }

    return Math.round((totalPercentage / days) * 100) / 100
  }

  /**
   * Normalize date to start of day (midnight UTC)
   */
  private normalizeDate(date: Date): Date {
    const normalized = new Date(date)
    normalized.setUTCHours(0, 0, 0, 0)
    return normalized
  }


  // ============================================
  // STAFF DASHBOARD METHODS
  // Requirements: 5.1, 6.1, 7.1, 8.1, 9.1, 10.1
  // ============================================

  /**
   * Get staff dashboard data based on role
   * Routes to role-specific data loaders
   * Requirements: 5.1, 6.1, 7.1, 8.1, 9.1, 10.1
   */
  async getStaffDashboardData(
    staffId: string,
    role: StaffRole | Role
  ): Promise<TeacherDashboardData | ClassTeacherDashboardData | DOSDashboardData | BursarDashboardData | HostelDashboardData | SupportDashboardData> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { schoolId: true },
    })

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`)
    }

    switch (role) {
      case Role.TEACHER:
        return this.getTeacherDashboardData(staffId, staff.schoolId)
      case StaffRole.CLASS_TEACHER:
        return this.getClassTeacherDashboardData(staffId, staff.schoolId)
      case StaffRole.DOS:
        return this.getDOSDashboardData(staffId, staff.schoolId)
      case StaffRole.BURSAR:
        return this.getBursarDashboardData(staffId, staff.schoolId)
      case StaffRole.HOSTEL_STAFF:
        return this.getHostelDashboardData(staffId, staff.schoolId)
      case StaffRole.SUPPORT_STAFF:
        return this.getSupportDashboardData(staffId, staff.schoolId)
      default:
        // Default to teacher dashboard for other roles
        return this.getTeacherDashboardData(staffId, staff.schoolId)
    }
  }

  /**
   * Get role-specific alerts for a staff member
   * Requirements: 5.1, 6.1, 7.1, 8.1, 9.1, 10.1
   */
  async getStaffAlerts(staffId: string, role: StaffRole | Role): Promise<Alert[]> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { schoolId: true },
    })

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`)
    }

    const alerts: Alert[] = []
    const today = this.normalizeDate(new Date())

    switch (role) {
      case Role.TEACHER:
      case StaffRole.CLASS_TEACHER: {
        // Get pending attendance alerts
        const pendingAttendance = await this.getPendingAttendanceAlerts(staffId, today)
        alerts.push(...pendingAttendance)

        // Get marks deadline alerts
        const marksDeadlines = await this.getMarksDeadlineAlerts(staffId, staff.schoolId)
        alerts.push(...marksDeadlines)

        // Get overdue task alerts
        const overdueTasks = await this.getOverdueTaskAlerts(staffId)
        alerts.push(...overdueTasks)
        break
      }
      case StaffRole.DOS: {
        // Get pending approval alerts
        const pendingApprovals = await this.getPendingApprovalAlerts(staff.schoolId)
        alerts.push(...pendingApprovals)
        break
      }
      case StaffRole.BURSAR: {
        // Get financial alerts
        const financialAlerts = await this.getFinancialAlerts(staff.schoolId)
        alerts.push(...financialAlerts)
        break
      }
      default: {
        // Get general task alerts
        const taskAlerts = await this.getOverdueTaskAlerts(staffId)
        alerts.push(...taskAlerts)
      }
    }

    return alerts
  }

  /**
   * Get role-specific quick actions
   * Requirements: 5.2, 6.2, 7.2, 8.2, 9.2, 10.2
   */
  getStaffQuickActions(role: StaffRole | Role): QuickAction[] {
    switch (role) {
      case Role.TEACHER:
        return TEACHER_QUICK_ACTIONS
      case StaffRole.CLASS_TEACHER:
        return CLASS_TEACHER_QUICK_ACTIONS
      case StaffRole.DOS:
        return DOS_QUICK_ACTIONS
      case StaffRole.BURSAR:
        return BURSAR_QUICK_ACTIONS
      case StaffRole.HOSTEL_STAFF:
        return HOSTEL_QUICK_ACTIONS
      case StaffRole.SUPPORT_STAFF:
        return SUPPORT_QUICK_ACTIONS
      default:
        return TEACHER_QUICK_ACTIONS
    }
  }

  /**
   * Get pending tasks for a staff member
   * Requirements: 5.4, 12.1
   */
  async getStaffTasks(staffId: string): Promise<Task[]> {
    const tasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        status: { in: [TaskStatus.PENDING, TaskStatus.OVERDUE] },
      },
      orderBy: [
        { status: 'desc' }, // OVERDUE first
        { deadline: 'asc' },
      ],
    })

    return tasks.map((task) => ({
      id: task.id,
      staffId: task.staffId,
      schoolId: task.schoolId,
      title: task.title,
      description: task.description || undefined,
      type: task.type as Task['type'],
      linkedModule: task.linkedModule as Task['linkedModule'],
      linkedResourceId: task.linkedResourceId || undefined,
      deadline: task.deadline,
      status: task.status as Task['status'],
      completedAt: task.completedAt || undefined,
      createdAt: task.createdAt,
      createdBy: task.createdBy,
    }))
  }


  // ============================================
  // TEACHER DASHBOARD
  // Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
  // ============================================

  /**
   * Get Teacher Dashboard data
   * Displays alerts, quick actions, class cards, and pending tasks
   * Excludes: fee info, mark approval, class assignment editing
   * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async getTeacherDashboardData(staffId: string, schoolId: string): Promise<TeacherDashboardData> {
    const today = this.normalizeDate(new Date())

    const [
      pendingAttendance,
      marksDeadlines,
      unsubmittedReports,
      classes,
      tasks,
    ] = await Promise.all([
      this.getTeacherPendingAttendanceAlerts(staffId, today),
      this.getTeacherMarksDeadlineAlerts(staffId, schoolId),
      this.getTeacherUnsubmittedReportAlerts(staffId, schoolId),
      this.getTeacherClassCards(staffId, schoolId),
      this.getStaffTasks(staffId),
    ])

    return {
      alerts: {
        pendingAttendance,
        marksDeadlines,
        unsubmittedReports,
      },
      quickActions: TEACHER_QUICK_ACTIONS,
      classes,
      tasks,
    }
  }

  /**
   * Get pending attendance alerts for teacher
   * Requirements: 5.1 - Display alerts for pending attendance
   */
  private async getTeacherPendingAttendanceAlerts(
    staffId: string,
    date: Date
  ): Promise<AttendanceAlert[]> {
    // Get classes assigned to this teacher via timetable
    const timetableEntries = await prisma.timetableEntry.findMany({
      where: { staffId },
      select: { classId: true },
      distinct: ['classId'],
    })

    const classIds = timetableEntries.map((e) => e.classId)

    if (classIds.length === 0) {
      return []
    }

    const alerts: AttendanceAlert[] = []

    for (const classId of classIds) {
      // Check if attendance has been recorded for today
      const attendanceCount = await prisma.attendance.count({
        where: {
          classId,
          date,
          recordedBy: staffId,
        },
      })

      if (attendanceCount === 0) {
        const classInfo = await prisma.class.findUnique({
          where: { id: classId },
          select: { name: true },
        })

        if (classInfo) {
          alerts.push({
            id: `attendance-${classId}-${date.toISOString()}`,
            classId,
            className: classInfo.name,
            date,
            message: `Attendance not recorded for ${classInfo.name}`,
          })
        }
      }
    }

    return alerts
  }

  /**
   * Get marks deadline alerts for teacher
   * Requirements: 5.1 - Display alerts for marks deadlines
   */
  private async getTeacherMarksDeadlineAlerts(
    staffId: string,
    schoolId: string
  ): Promise<DeadlineAlert[]> {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get subjects taught by this teacher
    const staffSubjects = await prisma.staffSubject.findMany({
      where: { staffId },
      select: { subjectId: true },
    })

    const subjectIds = staffSubjects.map((s) => s.subjectId)

    if (subjectIds.length === 0) {
      return []
    }

    // Get open exams with upcoming deadlines
    const exams = await prisma.exam.findMany({
      where: {
        schoolId,
        isOpen: true,
        endDate: { lte: sevenDaysFromNow },
      },
      include: {
        term: true,
      },
    })

    const alerts: DeadlineAlert[] = []

    for (const exam of exams) {
      for (const subjectId of subjectIds) {
        const subject = await prisma.subject.findUnique({
          where: { id: subjectId },
          select: { name: true },
        })

        if (subject && exam.endDate) {
          alerts.push({
            id: `marks-${exam.id}-${subjectId}`,
            examId: exam.id,
            examName: exam.name,
            subjectId,
            subjectName: subject.name,
            deadline: exam.endDate,
            message: `Marks due for ${subject.name} - ${exam.name}`,
          })
        }
      }
    }

    return alerts
  }

  /**
   * Get unsubmitted report alerts for teacher
   * Requirements: 5.1 - Display alerts for unsubmitted reports
   */
  private async getTeacherUnsubmittedReportAlerts(
    staffId: string,
    schoolId: string
  ): Promise<ReportAlert[]> {
    // Get tasks related to reports that are pending
    const reportTasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        type: 'SUBMIT_REPORT',
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    })

    const alerts: ReportAlert[] = []

    for (const task of reportTasks) {
      // Try to get class info if linked
      let className = 'Unknown Class'
      let classId = ''

      if (task.linkedResourceId) {
        const classInfo = await prisma.class.findUnique({
          where: { id: task.linkedResourceId },
          select: { id: true, name: true },
        })
        if (classInfo) {
          className = classInfo.name
          classId = classInfo.id
        }
      }

      alerts.push({
        id: `report-${task.id}`,
        reportType: 'Term Report',
        classId,
        className,
        deadline: task.deadline,
        message: task.title,
      })
    }

    return alerts
  }

  /**
   * Get class cards for teacher dashboard
   * Requirements: 5.3 - Display card for each assigned class
   */
  private async getTeacherClassCards(
    staffId: string,
    schoolId: string
  ): Promise<TeacherClassCard[]> {
    const today = this.normalizeDate(new Date())

    try {
      // Get classes and subjects taught by this teacher from multiple sources
      // 1. From StaffSubject table (preferred method)
      const staffSubjects = await prisma.staffSubject.findMany({
        where: { staffId },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              level: true,
              schoolId: true,
              createdAt: true,
              updatedAt: true
            }
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              educationLevel: true,
              isActive: true,
              schoolId: true,
              createdAt: true,
              updatedAt: true
            }
          },
        },
      })

      // 2. Fallback: From timetable entries
      const timetableEntries = await prisma.timetableEntry.findMany({
        where: { staffId },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              level: true,
              schoolId: true,
              createdAt: true,
              updatedAt: true
            }
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              educationLevel: true,
              isActive: true,
              schoolId: true,
              createdAt: true,
              updatedAt: true
            }
          },
        },
        distinct: ['classId', 'subjectId'],
      })

      // 3. Additional fallback: From Teacher model assignments
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        select: { email: true, firstName: true, lastName: true }
      })

      let teacherAssignments: any[] = []
      if (staff) {
        const teacher = await prisma.teacher.findFirst({
          where: {
            OR: [
              { email: staff.email },
              { 
                firstName: staff.firstName,
                lastName: staff.lastName,
                schoolId: schoolId
              }
            ]
          },
          select: {
            assignedClassIds: true,
            assignedSubjectIds: true
          }
        })

        if (teacher && teacher.assignedClassIds.length > 0 && teacher.assignedSubjectIds.length > 0) {
          // Get class and subject details
          const classes = await prisma.class.findMany({
            where: { id: { in: teacher.assignedClassIds } },
            select: { 
              id: true, 
              name: true,
              level: true,
              schoolId: true,
              createdAt: true,
              updatedAt: true
            }
          })

          const subjects = await prisma.subject.findMany({
            where: { id: { in: teacher.assignedSubjectIds } },
            select: { 
              id: true, 
              name: true,
              code: true,
              educationLevel: true,
              isActive: true,
              schoolId: true,
              createdAt: true,
              updatedAt: true
            }
          })

          // Create combinations of classes and subjects
          for (const cls of classes) {
            for (const subject of subjects) {
              teacherAssignments.push({
                classId: cls.id,
                subjectId: subject.id,
                class: cls,
                subject: subject
              })
            }
          }
        }
      }

      // Combine all sources and deduplicate
      const allEntries = [
        ...staffSubjects.map(ss => ({
          classId: ss.classId,
          subjectId: ss.subjectId,
          class: ss.class,
          subject: ss.subject
        })),
        ...timetableEntries.map(te => ({
          classId: te.classId,
          subjectId: te.subjectId,
          class: te.class,
          subject: te.subject
        })),
        ...teacherAssignments
      ]

      // Deduplicate by classId-subjectId combination
      const uniqueEntries = allEntries.filter((entry, index, self) => 
        index === self.findIndex(e => e.classId === entry.classId && e.subjectId === entry.subjectId)
      )

      // Get current term
      const currentYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        include: {
          terms: {
            where: {
              startDate: { lte: new Date() },
              endDate: { gte: new Date() },
            },
            take: 1,
          },
        },
      })

      const currentTerm = currentYear?.terms[0]
      const termName = currentTerm?.name || 'Current Term'

      const classCards: TeacherClassCard[] = []

      for (const entry of uniqueEntries) {
        // Check if attendance is done for today
        const attendanceCount = await prisma.attendance.count({
          where: {
            classId: entry.classId,
            date: today,
            recordedBy: staffId,
          },
        })

        // Check if marks are submitted for current term exams
        let marksDone = true
        if (currentTerm) {
          const openExams = await prisma.exam.findMany({
            where: {
              schoolId,
              termId: currentTerm.id,
              isOpen: true,
            },
          })

          for (const exam of openExams) {
            const students = await prisma.student.findMany({
              where: { classId: entry.classId, status: StudentStatus.ACTIVE },
              select: { id: true },
            })

            const marksCount = await prisma.mark.count({
              where: {
                examId: exam.id,
                subjectId: entry.subjectId,
                studentId: { in: students.map((s) => s.id) },
              },
            })

            if (marksCount < students.length) {
              marksDone = false
              break
            }
          }
        }

        // Get student count
        const studentCount = await prisma.student.count({
          where: { classId: entry.classId, status: StudentStatus.ACTIVE },
        })

        classCards.push({
          classId: entry.classId,
          className: entry.class.name,
          subject: entry.subject.name,
          term: termName,
          attendanceDone: attendanceCount > 0,
          marksDone,
          studentCount,
        })
      }

      return classCards
    } catch (error) {
      console.error('Error in getTeacherClassCards:', error)
      // Return empty array on error to prevent dashboard crash
      return []
    }
  }


  // ============================================
  // CLASS TEACHER DASHBOARD
  // Requirements: 6.1, 6.2, 6.3, 6.4
  // ============================================

  /**
   * Get Class Teacher Dashboard data
   * Displays class snapshot, quick actions, alerts
   * Fee defaulters shown as read-only (no payment recording)
   * Requirements: 6.1, 6.2, 6.3, 6.4
   */
  async getClassTeacherDashboardData(
    staffId: string,
    schoolId: string
  ): Promise<ClassTeacherDashboardData> {
    const today = this.normalizeDate(new Date())

    try {
      console.log(`🔍 [Dashboard Service] Getting class teacher data for staff: ${staffId}, school: ${schoolId}`)
      
      // Get staff information first
      const staff = await prisma.staff.findUnique({
        where: { id: staffId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          primaryRole: true,
          secondaryRoles: true,
          schoolId: true
        }
      })

      if (!staff) {
        console.log(`❌ [Dashboard Service] Staff not found: ${staffId}`)
        throw new Error(`Staff not found: ${staffId}`)
      }

      console.log(`✅ [Dashboard Service] Staff found: ${staff.firstName} ${staff.lastName} (${staff.id})`)
      console.log(`🔍 [Dashboard Service] Staff school: ${staff.schoolId}, Session school: ${schoolId}`)

      // Check for school ID mismatch and handle gracefully
      if (staff.schoolId !== schoolId) {
        console.log(`⚠️ [Dashboard Service] School ID mismatch detected - using staff's school ID`)
        schoolId = staff.schoolId // Use staff's actual school ID
      }

      // Enhanced class finding logic - check multiple sources
      let classId: string | null = null
      let classSource = 'none'

      // Step 1: Check StaffResponsibility for CLASS_TEACHER_DUTY
      console.log(`🔍 [Dashboard Service] Step 1: Checking StaffResponsibility...`)
      const classTeacherResponsibility = await prisma.staffResponsibility.findFirst({
        where: {
          staffId,
          type: 'CLASS_TEACHER_DUTY',
        },
        select: {
          id: true,
          details: true
        }
      })

      if (classTeacherResponsibility) {
        const details = classTeacherResponsibility.details as { classId?: string }
        classId = details.classId || null
        if (classId) {
          classSource = 'StaffResponsibility'
          console.log(`✅ [Dashboard Service] Found class via StaffResponsibility: ${classId}`)
        }
      }

      // Step 2: Fallback to StaffClass assignments
      if (!classId) {
        console.log(`🔍 [Dashboard Service] Step 2: Checking StaffClass...`)
        const staffClass = await prisma.staffClass.findFirst({
          where: { staffId },
          select: { classId: true },
        })
        if (staffClass) {
          classId = staffClass.classId
          classSource = 'StaffClass'
          console.log(`✅ [Dashboard Service] Found class via StaffClass: ${classId}`)
        }
      }

      // Step 3: Enhanced Teacher model fallback with better matching
      if (!classId) {
        console.log(`🔍 [Dashboard Service] Step 3: Checking Teacher model...`)
        const teacher = await prisma.teacher.findFirst({
          where: { 
            schoolId: staff.schoolId, // Use staff's school ID
            OR: [
              ...(staff.email ? [{ email: staff.email }] : []),
              { firstName: staff.firstName, lastName: staff.lastName }
            ]
          },
          select: { 
            id: true,
            classTeacherForIds: true,
            assignedClassIds: true 
          }
        })

        if (teacher) {
          console.log(`✅ [Dashboard Service] Found Teacher record: ${teacher.id}`)
          console.log(`🔍 [Dashboard Service] Class teacher for: ${teacher.classTeacherForIds.length} classes`)
          console.log(`🔍 [Dashboard Service] Assigned to: ${teacher.assignedClassIds.length} classes`)
          
          // Prefer class teacher assignment over regular assignment
          if (teacher.classTeacherForIds.length > 0) {
            classId = teacher.classTeacherForIds[0]
            classSource = 'Teacher.classTeacherForIds'
            console.log(`✅ [Dashboard Service] Found class via Teacher.classTeacherForIds: ${classId}`)
          } else if (teacher.assignedClassIds.length > 0) {
            classId = teacher.assignedClassIds[0]
            classSource = 'Teacher.assignedClassIds'
            console.log(`✅ [Dashboard Service] Found class via Teacher.assignedClassIds: ${classId}`)
          }
        } else {
          console.log(`❌ [Dashboard Service] No Teacher record found`)
        }
      }

      // Step 4: If still no class found, check if staff teaches any subjects (show those classes)
      if (!classId) {
        console.log(`🔍 [Dashboard Service] Step 4: Checking StaffSubject assignments...`)
        const staffSubject = await prisma.staffSubject.findFirst({
          where: { staffId },
          select: { classId: true },
        })
        if (staffSubject) {
          classId = staffSubject.classId
          classSource = 'StaffSubject'
          console.log(`✅ [Dashboard Service] Found class via StaffSubject: ${classId}`)
        }
      }

      if (!classId) {
        console.log(`❌ [Dashboard Service] No class assignment found for staff: ${staffId}`)
        // Return informative empty dashboard instead of generic error
        return {
          classSnapshot: {
            classId: '',
            className: `${staff.firstName} ${staff.lastName} - No Class Assignment`,
            totalStudents: 0,
            attendanceToday: { present: 0, absent: 0, late: 0 },
            feeDefaultersCount: 0,
            disciplineAlertsCount: 0,
            streams: []
          },
          quickActions: CLASS_TEACHER_QUICK_ACTIONS,
          alerts: {
            absentStudents: [],
            chronicLateness: [],
            pendingReports: [{
              id: 'no-class-assignment',
              title: 'No Class Assignment',
              description: 'You are not currently assigned to any class. Please contact your school administrator.',
              priority: 'high' as const,
              dueDate: new Date().toISOString(),
              type: 'system' as const
            }],
          },
          feeDefaulters: [],
        }
      }

      console.log(`✅ [Dashboard Service] Using class: ${classId} (source: ${classSource})`)

      // Verify class exists and belongs to correct school
      const classData = await prisma.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true, schoolId: true }
      })

      if (!classData) {
        console.log(`❌ [Dashboard Service] Class not found: ${classId}`)
        throw new Error(`Class not found: ${classId}`)
      }

      if (classData.schoolId !== staff.schoolId) {
        console.log(`⚠️ [Dashboard Service] Class school mismatch - Class: ${classData.schoolId}, Staff: ${staff.schoolId}`)
        // Continue anyway but log the issue
      }

      console.log(`✅ [Dashboard Service] Class verified: ${classData.name} (${classData.id})`)

      const [
        classSnapshot,
        absentStudents,
        chronicLateness,
        pendingReports,
        feeDefaulters,
      ] = await Promise.all([
        this.getClassSnapshot(classId, today),
        this.getAbsentStudentAlerts(classId, today),
        this.getChronicLatenessAlerts(classId),
        this.getClassPendingReportAlerts(staffId, classId),
        this.getFeeDefaulters(classId),
      ])

      console.log(`✅ [Dashboard Service] Successfully retrieved dashboard data for class: ${classData.name}`)

      return {
        classSnapshot,
        quickActions: CLASS_TEACHER_QUICK_ACTIONS,
        alerts: {
          absentStudents,
          chronicLateness,
          pendingReports,
        },
        feeDefaulters,
      }
    } catch (error) {
      console.error('❌ [Dashboard Service] Error in getClassTeacherDashboardData:', error)
      
      // Get staff info for better error message
      let staffName = 'Unknown Staff'
      try {
        const staff = await prisma.staff.findUnique({
          where: { id: staffId },
          select: { firstName: true, lastName: true }
        })
        if (staff) {
          staffName = `${staff.firstName} ${staff.lastName}`
        }
      } catch (e) {
        // Ignore error getting staff name
      }

      // Return informative error state instead of throwing
      return {
        classSnapshot: {
          classId: '',
          className: `${staffName} - Error Loading Class Data`,
          totalStudents: 0,
          attendanceToday: { present: 0, absent: 0, late: 0 },
          feeDefaultersCount: 0,
          disciplineAlertsCount: 0,
          streams: []
        },
        quickActions: CLASS_TEACHER_QUICK_ACTIONS,
        alerts: {
          absentStudents: [],
          chronicLateness: [],
          pendingReports: [{
            id: 'system-error',
            title: 'System Error',
            description: `Unable to load class data. Error: ${error.message}. Please contact technical support.`,
            priority: 'high' as const,
            dueDate: new Date().toISOString(),
            type: 'system' as const
          }],
        },
        feeDefaulters: [],
      }
    }
  }

  /**
   * Get class snapshot for class teacher dashboard
   * Requirements: 6.1 - Display total students, attendance today, fee defaulters count, discipline alerts count
   */
  private async getClassSnapshot(classId: string, date: Date): Promise<ClassSnapshot> {
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: { 
        id: true, 
        name: true, 
        level: true,
        schoolId: true,
        streams: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                students: {
                  where: {
                    status: StudentStatus.ACTIVE
                  }
                }
              }
            }
          }
        }
      },
    })

    if (!classInfo) {
      throw new Error(`Class not found: ${classId}`)
    }

    // Get total students across all streams in this class
    const totalStudents = await prisma.student.count({
      where: { classId, status: StudentStatus.ACTIVE },
    })

    // Get attendance for today
    const attendanceRecords = await prisma.attendance.findMany({
      where: { classId, date },
      select: { status: true, studentId: true },
      distinct: ['studentId'],
    })

    let present = 0
    let absent = 0
    let late = 0

    for (const record of attendanceRecords) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          present++
          break
        case AttendanceStatus.ABSENT:
          absent++
          break
        case AttendanceStatus.LATE:
          late++
          break
      }
    }

    // Get fee defaulters count (students with outstanding balance)
    const studentsWithBalance = await prisma.studentAccount.count({
      where: {
        student: { classId, status: StudentStatus.ACTIVE },
        balance: { gt: 0 },
      },
    })

    // Get discipline alerts count (recent incidents)
    const thirtyDaysAgo = new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000)
    const disciplineAlertsCount = await prisma.disciplineCase.count({
      where: {
        student: { classId },
        createdAt: { gte: thirtyDaysAgo },
      },
    })

    // Build class name with streams information - ensure all values are strings
    const safeName = this.ensureString(classInfo.name)
    let displayName = safeName
    if (classInfo.streams && classInfo.streams.length > 0) {
      const streamNames = classInfo.streams
        .map(s => this.ensureString(s.name))
        .filter(name => name.length > 0)
        .join(', ')
      displayName = streamNames ? `${safeName} (${streamNames})` : safeName
    }

    return {
      classId,
      className: displayName,
      totalStudents,
      attendanceToday: { present, absent, late },
      feeDefaultersCount: studentsWithBalance,
      disciplineAlertsCount,
      streams: classInfo.streams ? classInfo.streams.map(stream => ({
        id: stream.id,
        name: this.ensureString(stream.name),
        studentCount: stream._count.students || 0
      })) : []
    }
  }

  /**
   * Get absent student alerts for class teacher
   * Requirements: 6.3 - Display alerts for absent students
   */
  private async getAbsentStudentAlerts(classId: string, date: Date): Promise<StudentAlert[]> {
    const absentRecords = await prisma.attendance.findMany({
      where: {
        classId,
        date,
        status: AttendanceStatus.ABSENT,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      distinct: ['studentId'],
    })

    return absentRecords.map((record) => ({
      id: `absent-${record.studentId}-${date.toISOString()}`,
      studentId: record.student.id,
      studentName: `${this.ensureString(record.student.firstName)} ${this.ensureString(record.student.lastName)}`.trim(),
      admissionNumber: this.ensureString(record.student.admissionNumber),
      message: `Absent today`,
      severity: AlertSeverity.WARNING,
      createdAt: date,
    }))
  }

  /**
   * Get chronic lateness alerts for class teacher
   * Requirements: 6.3 - Display alerts for chronic lateness
   */
  private async getChronicLatenessAlerts(classId: string): Promise<StudentAlert[]> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get students with 3+ late arrivals in the last 30 days
    const lateRecords = await prisma.attendance.groupBy({
      by: ['studentId'],
      where: {
        classId,
        status: AttendanceStatus.LATE,
        date: { gte: thirtyDaysAgo },
      },
      _count: { studentId: true },
      having: {
        studentId: { _count: { gte: 3 } },
      },
    })

    const alerts: StudentAlert[] = []

    for (const record of lateRecords) {
      const student = await prisma.student.findUnique({
        where: { id: record.studentId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          admissionNumber: true,
        },
      })

      if (student) {
        const firstName = this.ensureString(student.firstName)
        const lastName = this.ensureString(student.lastName)
        const fullName = `${firstName} ${lastName}`.trim()
        
        alerts.push({
          id: `lateness-${student.id}`,
          studentId: student.id,
          studentName: fullName || 'Unknown Student',
          admissionNumber: this.ensureString(student.admissionNumber),
          message: `${record._count.studentId} late arrivals in the last 30 days`,
          severity: AlertSeverity.WARNING,
          createdAt: new Date(),
        })
      }
    }

    return alerts
  }

  /**
   * Get pending report alerts for class teacher
   * Requirements: 6.3 - Display alerts for pending reports
   */
  private async getClassPendingReportAlerts(
    staffId: string,
    classId: string
  ): Promise<ReportAlert[]> {
    const reportTasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        type: 'SUBMIT_REPORT',
        status: { in: ['PENDING', 'OVERDUE'] },
        linkedResourceId: classId,
      },
    })

    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true },
    })

    return reportTasks.map((task) => ({
      id: `report-${task.id}`,
      reportType: 'Class Report',
      classId,
      className: this.ensureString(classInfo?.name) || 'Unknown Class',
      deadline: task.deadline,
      message: this.ensureString(task.title) || 'Report pending',
    }))
  }

  /**
   * Get fee defaulters for class teacher (read-only)
   * Requirements: 6.4 - Display fee defaulter information as read-only
   */
  private async getFeeDefaulters(classId: string): Promise<FeeDefaulterInfo[]> {
    const studentsWithBalance = await prisma.studentAccount.findMany({
      where: {
        student: { classId, status: StudentStatus.ACTIVE },
        balance: { gt: 0 },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { balance: 'desc' },
    })

    const defaulters: FeeDefaulterInfo[] = []

    for (const account of studentsWithBalance) {
      // Get last payment date
      const lastPayment = await prisma.payment.findFirst({
        where: { studentId: account.studentId },
        orderBy: { receivedAt: 'desc' },
        select: { receivedAt: true },
      })

      // Ensure all fields are properly converted to strings and handle potential null/undefined values
      const firstName = this.ensureString(account.student.firstName)
      const lastName = this.ensureString(account.student.lastName)
      const admissionNumber = this.ensureString(account.student.admissionNumber)
      const fullName = `${firstName} ${lastName}`.trim()
      
      defaulters.push({
        studentId: account.student.id,
        studentName: fullName || 'Unknown Student',
        admissionNumber: admissionNumber || 'N/A',
        outstandingBalance: Number(account.balance) || 0,
        lastPaymentDate: lastPayment?.receivedAt,
      })
    }

    return defaulters
  }


  // ============================================
  // DOS DASHBOARD
  // Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
  // ============================================

  /**
   * Get DOS Dashboard data
   * Displays academic alerts, term control, approval center, academic overview
   * Allows approve/reject marks but not direct editing
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
   */
  private async getDOSDashboardData(
    staffId: string,
    schoolId: string
  ): Promise<DOSDashboardData> {
    const [
      pendingMarkApprovals,
      lateTeachers,
      examScheduleConflicts,
      termControl,
      approvalCenter,
      academicOverview,
      reportControls,
    ] = await Promise.all([
      this.getDOSPendingMarkApprovals(schoolId),
      this.getDOSLateTeacherAlerts(schoolId),
      this.getDOSExamScheduleConflicts(schoolId),
      this.getDOSTermControl(schoolId),
      this.getDOSApprovalCenter(schoolId),
      this.getDOSAcademicOverview(schoolId),
      this.getDOSReportControls(schoolId),
    ])

    return {
      alerts: {
        pendingMarkApprovals,
        lateTeachers,
        examScheduleConflicts,
      },
      termControl,
      approvalCenter,
      academicOverview,
      reportControls,
    }
  }

  /**
   * Get pending mark approvals for DOS
   * Requirements: 7.1 - Display academic alerts: pending mark approvals
   */
  private async getDOSPendingMarkApprovals(schoolId: string): Promise<ApprovalAlert[]> {
    // Get open exams with marks that need approval
    const openExams = await prisma.exam.findMany({
      where: { schoolId, isOpen: true },
      include: {
        term: true,
        marks: {
          include: {
            student: { select: { classId: true } },
            subject: { select: { id: true, name: true } },
            staff: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    const alerts: ApprovalAlert[] = []
    const processedCombinations = new Set<string>()

    for (const exam of openExams) {
      // Group marks by class and subject
      const marksByClassSubject = new Map<string, typeof exam.marks>()
      
      for (const mark of exam.marks) {
        const key = `${mark.student.classId}-${mark.subjectId}`
        if (!marksByClassSubject.has(key)) {
          marksByClassSubject.set(key, [])
        }
        marksByClassSubject.get(key)!.push(mark)
      }

      for (const [key, marks] of marksByClassSubject) {
        const [classId, subjectId] = key.split('-')
        const combinationKey = `${exam.id}-${classId}-${subjectId}`
        
        if (processedCombinations.has(combinationKey)) continue
        processedCombinations.add(combinationKey)

        const firstMark = marks[0]
        const classInfo = await prisma.class.findUnique({
          where: { id: classId },
          select: { name: true },
        })

        if (classInfo && firstMark) {
          alerts.push({
            id: `approval-${exam.id}-${classId}-${subjectId}`,
            type: 'marks',
            subjectId: firstMark.subject.id,
            subjectName: firstMark.subject.name,
            classId,
            className: classInfo.name,
            teacherId: firstMark.staff.id,
            teacherName: `${firstMark.staff.firstName} ${firstMark.staff.lastName}`,
            submittedAt: firstMark.enteredAt,
            message: `${marks.length} marks awaiting approval for ${firstMark.subject.name} - ${classInfo.name}`,
          })
        }
      }
    }

    return alerts.slice(0, 20) // Limit to 20 most recent
  }

  /**
   * Get late teacher alerts for DOS
   * Requirements: 7.1 - Display academic alerts: late teachers
   */
  private async getDOSLateTeacherAlerts(schoolId: string): Promise<TeacherAlert[]> {
    const alerts: TeacherAlert[] = []
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Get teachers with overdue tasks
    const overdueTasks = await prisma.staffTask.findMany({
      where: {
        schoolId,
        status: TaskStatus.OVERDUE,
        deadline: { gte: sevenDaysAgo },
      },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    // Group by teacher
    const teacherOverdue = new Map<string, { staff: typeof overdueTasks[0]['staff']; count: number }>()
    
    for (const task of overdueTasks) {
      const existing = teacherOverdue.get(task.staffId)
      if (existing) {
        existing.count++
      } else {
        teacherOverdue.set(task.staffId, { staff: task.staff, count: 1 })
      }
    }

    for (const [teacherId, data] of teacherOverdue) {
      alerts.push({
        id: `late-${teacherId}`,
        teacherId,
        teacherName: `${data.staff.firstName} ${data.staff.lastName}`,
        alertType: 'late_submission',
        message: `${data.count} overdue task(s)`,
        createdAt: new Date(),
      })
    }

    // Check for teachers with missing attendance
    const today = this.normalizeDate(new Date())
    const teachers = await prisma.staff.findMany({
      where: { schoolId, role: Role.TEACHER, status: StaffStatus.ACTIVE },
      select: { id: true, firstName: true, lastName: true },
    })

    for (const teacher of teachers) {
      // Check if teacher has timetable entries for today
      const dayOfWeek = today.getDay() || 7 // Convert Sunday from 0 to 7
      const timetableEntries = await prisma.timetableEntry.findMany({
        where: { staffId: teacher.id, dayOfWeek },
        select: { classId: true },
        distinct: ['classId'],
      })

      if (timetableEntries.length > 0) {
        // Check if attendance was recorded
        const attendanceCount = await prisma.attendance.count({
          where: {
            classId: { in: timetableEntries.map(e => e.classId) },
            date: today,
            recordedBy: teacher.id,
          },
        })

        if (attendanceCount === 0) {
          alerts.push({
            id: `missing-attendance-${teacher.id}`,
            teacherId: teacher.id,
            teacherName: `${teacher.firstName} ${teacher.lastName}`,
            alertType: 'missing_attendance',
            message: `No attendance recorded today`,
            createdAt: today,
          })
        }
      }
    }

    return alerts.slice(0, 15) // Limit to 15 alerts
  }

  /**
   * Get exam schedule conflicts for DOS
   * Requirements: 7.1 - Display academic alerts: exam schedule conflicts
   */
  private async getDOSExamScheduleConflicts(schoolId: string): Promise<ConflictAlert[]> {
    const alerts: ConflictAlert[] = []

    // Get upcoming exams
    const upcomingExams = await prisma.exam.findMany({
      where: {
        schoolId,
        startDate: { gte: new Date() },
      },
      orderBy: { startDate: 'asc' },
    })

    // Check for time overlaps
    for (let i = 0; i < upcomingExams.length; i++) {
      for (let j = i + 1; j < upcomingExams.length; j++) {
        const exam1 = upcomingExams[i]
        const exam2 = upcomingExams[j]

        if (exam1.startDate && exam2.startDate && exam1.endDate && exam2.endDate) {
          // Check if dates overlap
          if (exam1.startDate <= exam2.endDate && exam2.startDate <= exam1.endDate) {
            alerts.push({
              id: `conflict-${exam1.id}-${exam2.id}`,
              examId: exam1.id,
              examName: exam1.name,
              conflictType: 'time_overlap',
              details: `Overlaps with ${exam2.name}`,
              createdAt: new Date(),
            })
          }
        }
      }
    }

    return alerts
  }

  /**
   * Get term control data for DOS
   * Requirements: 7.2 - Provide term control: term setup, subject allocations, exam schedules
   */
  private async getDOSTermControl(schoolId: string): Promise<DOSDashboardData['termControl']> {
    // Get current academic year and term
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: {
        terms: {
          orderBy: { startDate: 'asc' },
        },
      },
    })

    const now = new Date()
    let currentTerm = currentYear?.terms.find(
      t => t.startDate <= now && t.endDate >= now
    )

    // If no current term, get the most recent one
    if (!currentTerm && currentYear?.terms.length) {
      currentTerm = currentYear.terms[currentYear.terms.length - 1]
    }

    const termInfo: TermInfo = currentTerm ? {
      id: currentTerm.id,
      name: currentTerm.name,
      startDate: currentTerm.startDate,
      endDate: currentTerm.endDate,
      isActive: currentTerm.startDate <= now && currentTerm.endDate >= now,
    } : {
      id: '',
      name: 'No Term Set',
      startDate: new Date(),
      endDate: new Date(),
      isActive: false,
    }

    // Get subject allocations (teachers assigned to subjects/classes)
    const timetableEntries = await prisma.timetableEntry.findMany({
      where: {
        class: { schoolId },
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
      distinct: ['classId', 'subjectId', 'staffId'],
    })

    const subjectAllocations: SubjectAllocation[] = timetableEntries.map(entry => ({
      subjectId: entry.subject.id,
      subjectName: entry.subject.name,
      classId: entry.class.id,
      className: entry.class.name,
      teacherId: entry.staff.id,
      teacherName: `${entry.staff.firstName} ${entry.staff.lastName}`,
    }))

    // Get exam schedules
    const exams = await prisma.exam.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' },
      take: 10,
    })

    const examSchedules: ExamScheduleInfo[] = exams.map(exam => {
      let status: 'scheduled' | 'in_progress' | 'completed' = 'scheduled'
      if (exam.startDate && exam.endDate) {
        if (now > exam.endDate) {
          status = 'completed'
        } else if (now >= exam.startDate) {
          status = 'in_progress'
        }
      }

      return {
        id: exam.id,
        examName: exam.name,
        startDate: exam.startDate || new Date(),
        endDate: exam.endDate || new Date(),
        status,
      }
    })

    return {
      currentTerm: termInfo,
      subjectAllocations: subjectAllocations.slice(0, 50), // Limit for performance
      examSchedules,
    }
  }

  /**
   * Get approval center data for DOS
   * Requirements: 7.3 - Include approval center for marks and reports awaiting approval
   */
  private async getDOSApprovalCenter(schoolId: string): Promise<DOSDashboardData['approvalCenter']> {
    // Get marks awaiting approval (from open exams)
    const openExams = await prisma.exam.findMany({
      where: { schoolId, isOpen: true },
      include: {
        marks: {
          include: {
            student: { include: { class: { select: { id: true, name: true } } } },
            subject: { select: { id: true, name: true } },
            staff: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    const marksAwaitingApproval: MarkApproval[] = []
    const processedCombinations = new Set<string>()

    for (const exam of openExams) {
      // Group by class and subject
      const marksByClassSubject = new Map<string, typeof exam.marks>()
      
      for (const mark of exam.marks) {
        const key = `${mark.student.classId}-${mark.subjectId}`
        if (!marksByClassSubject.has(key)) {
          marksByClassSubject.set(key, [])
        }
        marksByClassSubject.get(key)!.push(mark)
      }

      for (const [key, marks] of marksByClassSubject) {
        const [classId, subjectId] = key.split('-')
        const combinationKey = `${exam.id}-${classId}-${subjectId}`
        
        if (processedCombinations.has(combinationKey)) continue
        processedCombinations.add(combinationKey)

        const firstMark = marks[0]
        if (firstMark) {
          marksAwaitingApproval.push({
            id: `mark-approval-${exam.id}-${classId}-${subjectId}`,
            examId: exam.id,
            examName: exam.name,
            subjectId: firstMark.subject.id,
            subjectName: firstMark.subject.name,
            classId,
            className: firstMark.student.class.name,
            teacherId: firstMark.staff.id,
            teacherName: `${firstMark.staff.firstName} ${firstMark.staff.lastName}`,
            submittedAt: firstMark.enteredAt,
            studentCount: marks.length,
            status: 'pending',
          })
        }
      }
    }

    // Get reports awaiting generation
    const classes = await prisma.class.findMany({
      where: { schoolId },
      select: { id: true, name: true, _count: { select: { students: true } } },
    })

    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: { orderBy: { startDate: 'desc' }, take: 1 } },
    })

    const currentTerm = currentYear?.terms[0]
    const reportsAwaitingGeneration: ReportGeneration[] = []

    if (currentTerm) {
      for (const cls of classes) {
        // Check if reports have been generated for this class/term
        const publishedCount = await prisma.publishedReportCard.count({
          where: {
            schoolId,
            termId: currentTerm.id,
            student: { classId: cls.id },
          },
        })

        if (publishedCount < cls._count.students) {
          reportsAwaitingGeneration.push({
            id: `report-gen-${cls.id}-${currentTerm.id}`,
            termId: currentTerm.id,
            termName: currentTerm.name,
            classId: cls.id,
            className: cls.name,
            status: 'pending',
            studentCount: cls._count.students - publishedCount,
          })
        }
      }
    }

    return {
      marksAwaitingApproval: marksAwaitingApproval.slice(0, 30),
      reportsAwaitingGeneration: reportsAwaitingGeneration.slice(0, 20),
    }
  }

  /**
   * Get academic overview for DOS
   * Requirements: 7.5 - Display academic overview: completion rates, subject coverage, teacher performance
   */
  private async getDOSAcademicOverview(schoolId: string): Promise<DOSDashboardData['academicOverview']> {
    // Get subjects and calculate completion rates
    const subjects = await prisma.subject.findMany({
      where: { schoolId },
      select: { id: true, name: true },
    })

    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: { orderBy: { startDate: 'desc' }, take: 1 } },
    })

    const currentTerm = currentYear?.terms[0]
    const completionRates: { subject: string; rate: number }[] = []
    const subjectCoverage: { subject: string; coverage: number }[] = []

    if (currentTerm) {
      // Get open exams for current term
      const openExams = await prisma.exam.findMany({
        where: { schoolId, termId: currentTerm.id },
      })

      for (const subject of subjects) {
        // Calculate marks completion rate
        const totalStudents = await prisma.student.count({
          where: { schoolId, status: StudentStatus.ACTIVE },
        })

        let totalMarks = 0
        for (const exam of openExams) {
          const marksCount = await prisma.mark.count({
            where: { examId: exam.id, subjectId: subject.id },
          })
          totalMarks += marksCount
        }

        const expectedMarks = totalStudents * openExams.length
        const rate = expectedMarks > 0 ? (totalMarks / expectedMarks) * 100 : 0

        completionRates.push({
          subject: subject.name,
          rate: Math.round(rate * 100) / 100,
        })

        // Calculate subject coverage (classes with timetable entries)
        const totalClasses = await prisma.class.count({ where: { schoolId } })
        const classesWithSubject = await prisma.timetableEntry.findMany({
          where: { subjectId: subject.id, class: { schoolId } },
          distinct: ['classId'],
        })

        const coverage = totalClasses > 0 ? (classesWithSubject.length / totalClasses) * 100 : 0
        subjectCoverage.push({
          subject: subject.name,
          coverage: Math.round(coverage * 100) / 100,
        })
      }
    }

    // Get teacher performance summaries
    const teachers = await prisma.staff.findMany({
      where: { schoolId, role: Role.TEACHER, status: StaffStatus.ACTIVE },
      select: { id: true, firstName: true, lastName: true },
      take: 20,
    })

    const teacherPerformance: TeacherPerformanceInfo[] = []

    for (const teacher of teachers) {
      // Get task completion metrics
      const tasksAssigned = await prisma.staffTask.count({
        where: { staffId: teacher.id },
      })
      const tasksCompleted = await prisma.staffTask.count({
        where: { staffId: teacher.id, status: TaskStatus.COMPLETED },
      })
      const tasksOverdue = await prisma.staffTask.count({
        where: { staffId: teacher.id, status: TaskStatus.OVERDUE },
      })

      const completionRate = tasksAssigned > 0 ? (tasksCompleted / tasksAssigned) * 100 : 100

      teacherPerformance.push({
        teacherId: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        metrics: {
          staffId: teacher.id,
          period: { start: new Date(), end: new Date() },
          attendanceRate: 0, // Would need attendance tracking for staff
          lateCount: 0,
          absentCount: 0,
          tasksAssigned,
          tasksCompleted,
          tasksOverdue,
          completionRate: Math.round(completionRate * 100) / 100,
        },
      })
    }

    return {
      completionRates: completionRates.slice(0, 15),
      subjectCoverage: subjectCoverage.slice(0, 15),
      teacherPerformance,
    }
  }

  /**
   * Get report controls for DOS
   * Requirements: 7.6 - Provide report generation and locking functionality
   */
  private async getDOSReportControls(schoolId: string): Promise<DOSDashboardData['reportControls']> {
    // Get locked terms (terms where reports have been finalized)
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: { terms: true },
    })

    const lockedTerms: string[] = []

    if (currentYear) {
      for (const term of currentYear.terms) {
        // A term is considered "locked" if all exams are closed
        const openExamsCount = await prisma.exam.count({
          where: { schoolId, termId: term.id, isOpen: true },
        })

        if (openExamsCount === 0 && term.endDate < new Date()) {
          lockedTerms.push(term.id)
        }
      }
    }

    return {
      canGenerateReports: true,
      canLockReports: true,
      lockedTerms,
    }
  }


  // ============================================
  // BURSAR DASHBOARD
  // Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
  // ============================================

  /**
   * Get current term for a school
   */
  private async getCurrentTerm(schoolId: string) {
    const today = new Date()
    
    // Try to find current academic year
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true
      }
    })

    // Fallback: Find academic year that matches current year
    if (!currentAcademicYear) {
      const currentYear = new Date().getFullYear()
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Fallback: Use isActive flag
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      return null
    }

    // Get current term with intelligent fallback
    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    // Fallback: Find term that includes today's date
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    // Fallback: Most recent term that has started
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    return currentTerm
  }

  /**
   * Get Bursar Dashboard data
   * Displays financial alerts, quick actions, financial overview, reports access
   * Excludes: marks editing, class changes, attendance modification
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  private async getBursarDashboardData(
    staffId: string,
    schoolId: string
  ): Promise<BursarDashboardData> {
    // Get current term
    const currentTerm = await this.getCurrentTerm(schoolId)
    const termId = currentTerm?.id

    const [
      unpaidBalances,
      reconciliationIssues,
      pendingApprovals,
      financialOverview,
      reports,
    ] = await Promise.all([
      this.getBursarUnpaidBalanceAlerts(schoolId, termId),
      this.getBursarReconciliationIssues(schoolId),
      this.getBursarPendingApprovals(schoolId),
      this.getBursarFinancialOverview(schoolId, termId),
      this.getBursarReportAccess(schoolId),
    ])

    return {
      alerts: {
        unpaidBalances,
        reconciliationIssues,
        pendingApprovals,
      },
      quickActions: BURSAR_QUICK_ACTIONS,
      financialOverview,
      reports,
    }
  }
  /**
   * Get current term for a school
   */
  private async getCurrentTerm(schoolId: string) {
    const today = new Date()

    // Try to find current academic year
    let currentAcademicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId,
        isCurrent: true
      }
    })

    // Fallback: Find academic year that matches current year
    if (!currentAcademicYear) {
      const currentYear = new Date().getFullYear()
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          name: { contains: currentYear.toString() }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Fallback: Use isActive flag
    if (!currentAcademicYear) {
      currentAcademicYear = await prisma.academicYear.findFirst({
        where: {
          schoolId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (!currentAcademicYear) {
      return null
    }

    // Get current term with intelligent fallback
    let currentTerm = await prisma.term.findFirst({
      where: {
        academicYearId: currentAcademicYear.id,
        isCurrent: true
      }
    })

    // Fallback: Find term that includes today's date
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today },
          endDate: { gte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    // Fallback: Most recent term that has started
    if (!currentTerm) {
      currentTerm = await prisma.term.findFirst({
        where: {
          academicYearId: currentAcademicYear.id,
          startDate: { lte: today }
        },
        orderBy: { startDate: 'desc' }
      })
    }

    return currentTerm
  }

  /**
   * Get unpaid balance alerts for Bursar
   * Requirements: 10.1 - Display financial alerts: unpaid balances
   */
  private async getBursarUnpaidBalanceAlerts(schoolId: string, termId?: string): Promise<BalanceAlert[]> {
    // Get students with outstanding balances for the current term
    const whereClause: any = {
      student: { schoolId, status: StudentStatus.ACTIVE },
      balance: { gt: 0 },
    }
    
    // Filter by term if provided
    if (termId) {
      whereClause.termId = termId
    }
    
    const studentsWithBalance = await prisma.studentAccount.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            classId: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { balance: 'desc' },
      take: 50, // Limit to top 50 defaulters
    })

    const alerts: BalanceAlert[] = []

    for (const account of studentsWithBalance) {
      // Calculate days overdue based on last payment or account creation
      const referenceDate = account.lastPaymentDate || account.createdAt
      const daysOverdue = Math.floor(
        (new Date().getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
      )

      let message = `Outstanding balance: ${account.balance.toLocaleString()}`
      if (daysOverdue > 30) {
        message = `${daysOverdue} days overdue - Balance: ${account.balance.toLocaleString()}`
      }

      alerts.push({
        id: `balance-${account.studentId}`,
        studentId: account.student.id,
        studentName: `${account.student.firstName} ${account.student.lastName}`,
        admissionNumber: account.student.admissionNumber,
        classId: account.student.classId,
        className: account.student.class.name,
        outstandingBalance: account.balance,
        daysOverdue: Math.max(0, daysOverdue),
        message,
      })
    }

    return alerts
  }

  /**
   * Get reconciliation issues for Bursar
   * Requirements: 10.1 - Display financial alerts: reconciliation issues
   */
  private async getBursarReconciliationIssues(schoolId: string): Promise<ReconciliationAlert[]> {
    const alerts: ReconciliationAlert[] = []
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Check for payments without receipts
    const paymentsWithoutReceipts = await prisma.payment.findMany({
      where: {
        schoolId,
        receiptId: null,
        status: 'CONFIRMED',
        receivedAt: { gte: thirtyDaysAgo },
      },
      take: 20,
    })

    for (const payment of paymentsWithoutReceipts) {
      alerts.push({
        id: `missing-receipt-${payment.id}`,
        type: 'missing_receipt',
        details: `Payment of ${payment.amount.toLocaleString()} (Ref: ${payment.reference}) has no receipt`,
        amount: payment.amount,
        createdAt: payment.receivedAt,
      })
    }

    // Check for potential duplicate payments (same student, same amount, same day)
    const recentPayments = await prisma.payment.findMany({
      where: {
        schoolId,
        status: 'CONFIRMED',
        receivedAt: { gte: thirtyDaysAgo },
      },
      orderBy: { receivedAt: 'desc' },
    })

    const paymentsByStudentDate = new Map<string, typeof recentPayments>()
    
    for (const payment of recentPayments) {
      const dateKey = payment.receivedAt.toISOString().split('T')[0]
      const key = `${payment.studentId}-${dateKey}-${payment.amount}`
      
      if (!paymentsByStudentDate.has(key)) {
        paymentsByStudentDate.set(key, [])
      }
      paymentsByStudentDate.get(key)!.push(payment)
    }

    for (const [key, payments] of paymentsByStudentDate) {
      if (payments.length > 1) {
        alerts.push({
          id: `duplicate-${key}`,
          type: 'duplicate_payment',
          details: `${payments.length} payments of same amount on same day for same student`,
          amount: payments[0].amount,
          createdAt: payments[0].receivedAt,
        })
      }
    }

    // Check for account balance mismatches
    const accountsWithMismatch = await prisma.studentAccount.findMany({
      where: {
        student: { schoolId },
      },
      take: 100,
    })

    for (const account of accountsWithMismatch) {
      const expectedBalance = account.totalFees - account.totalPaid - account.totalDiscounts + account.totalPenalties
      const actualBalance = account.balance
      
      // Allow for small floating point differences
      if (Math.abs(expectedBalance - actualBalance) > 0.01) {
        alerts.push({
          id: `mismatch-${account.id}`,
          type: 'mismatch',
          details: `Account balance mismatch: Expected ${expectedBalance.toLocaleString()}, Actual ${actualBalance.toLocaleString()}`,
          amount: Math.abs(expectedBalance - actualBalance),
          createdAt: account.updatedAt,
        })
      }
    }

    return alerts.slice(0, 30) // Limit to 30 alerts
  }

  /**
   * Get pending approvals for Bursar
   * Requirements: 10.1 - Display financial alerts: pending approvals
   */
  private async getBursarPendingApprovals(schoolId: string): Promise<ApprovalAlert[]> {
    const alerts: ApprovalAlert[] = []

    // Get pending discount approvals
    const pendingDiscounts = await prisma.studentDiscount.findMany({
      where: {
        status: 'PENDING',
        studentAccount: {
          student: { schoolId },
        },
      },
      include: {
        studentAccount: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                classId: true,
                class: { select: { name: true } },
              },
            },
          },
        },
      },
      take: 20,
    })

    for (const discount of pendingDiscounts) {
      const student = discount.studentAccount.student
      alerts.push({
        id: `discount-approval-${discount.id}`,
        type: 'marks', // Using 'marks' type as a generic approval type
        classId: student.classId,
        className: student.class.name,
        teacherId: discount.appliedBy,
        teacherName: 'Finance Staff',
        submittedAt: discount.appliedAt,
        message: `Discount approval pending: ${discount.name} (${discount.calculatedAmount.toLocaleString()}) for ${student.firstName} ${student.lastName}`,
      })
    }

    return alerts
  }

  /**
   * Get financial overview for Bursar
   * Requirements: 10.3 - Show financial overview: collections today, outstanding fees, payment methods
   */
  private async getBursarFinancialOverview(schoolId: string, termId?: string): Promise<BursarDashboardData['financialOverview']> {
    const today = this.normalizeDate(new Date())
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get collections today (filter by term if provided)
    const todayPaymentsWhere: any = {
      schoolId,
      status: 'CONFIRMED',
      receivedAt: { gte: today, lt: tomorrow },
    }
    if (termId) {
      todayPaymentsWhere.termId = termId
    }

    const todayPayments = await prisma.payment.aggregate({
      where: todayPaymentsWhere,
      _sum: { amount: true },
    })

    const collectionsToday = todayPayments._sum.amount || 0

    // Get total outstanding fees for current term
    const outstandingWhere: any = {
      student: { schoolId, status: StudentStatus.ACTIVE },
      balance: { gt: 0 },
    }
    if (termId) {
      outstandingWhere.termId = termId
    }

    const outstandingResult = await prisma.studentAccount.aggregate({
      where: outstandingWhere,
      _sum: { balance: true },
    })

    const outstandingFees = outstandingResult._sum.balance || 0

    // Get payment methods breakdown for today (filter by term if provided)
    const paymentsByMethod = await prisma.payment.groupBy({
      by: ['method'],
      where: todayPaymentsWhere,
      _sum: { amount: true },
    })

    const paymentMethods = paymentsByMethod.map(p => ({
      method: p.method,
      amount: p._sum.amount || 0,
    }))

    return {
      collectionsToday,
      outstandingFees,
      paymentMethods,
    }
  }

  /**
   * Get report access for Bursar
   * Requirements: 10.4 - Provide access to fee reports, payment summaries, audit exports
   */
  private async getBursarReportAccess(schoolId: string): Promise<ReportAccess[]> {
    return [
      {
        id: 'fee-collection-report',
        name: 'Fee Collection Report',
        type: 'fee_report',
        url: `/dashboard/reports/fees?schoolId=${schoolId}`,
      },
      {
        id: 'payment-summary',
        name: 'Payment Summary',
        type: 'payment_summary',
        url: `/dashboard/reports/payments?schoolId=${schoolId}`,
      },
      {
        id: 'outstanding-fees-report',
        name: 'Outstanding Fees Report',
        type: 'fee_report',
        url: `/dashboard/reports/outstanding?schoolId=${schoolId}`,
      },
      {
        id: 'daily-collections',
        name: 'Daily Collections',
        type: 'payment_summary',
        url: `/dashboard/reports/daily-collections?schoolId=${schoolId}`,
      },
      {
        id: 'audit-export',
        name: 'Financial Audit Export',
        type: 'audit_export',
        url: `/dashboard/reports/audit-export?schoolId=${schoolId}`,
      },
      {
        id: 'class-fee-status',
        name: 'Class Fee Status',
        type: 'fee_report',
        url: `/dashboard/reports/class-fees?schoolId=${schoolId}`,
      },
    ]
  }


  // ============================================
  // HOSTEL DASHBOARD (Placeholder)
  // Requirements: 8.1, 8.2, 8.3, 8.4
  // ============================================

  /**
   * Get Hostel Dashboard data
   * Requirements: 8.1, 8.2, 8.3, 8.4
   * Displays live presence, discipline log, emergency alerts
   * Excludes: marks and finance information
   */
  private async getHostelDashboardData(
    staffId: string,
    schoolId: string
  ): Promise<HostelDashboardData> {
    const [
      livePresence,
      disciplineLog,
    ] = await Promise.all([
      this.getHostelLivePresence(schoolId),
      this.getHostelDisciplineLog(schoolId),
    ])

    // Emergency actions - Requirements: 8.3
    const emergencyActions = [
      {
        id: 'fire-alert',
        label: 'Fire Alert',
        icon: 'flame',
        action: 'fire_alert' as const,
        notifyRoles: ['SCHOOL_ADMIN', 'DOS'],
      },
      {
        id: 'sickness-alert',
        label: 'Sickness Alert',
        icon: 'heart',
        action: 'sickness_alert' as const,
        notifyRoles: ['SCHOOL_ADMIN'],
      },
      {
        id: 'missing-student-alert',
        label: 'Missing Student',
        icon: 'user-x',
        action: 'missing_student_alert' as const,
        notifyRoles: ['SCHOOL_ADMIN', 'DOS'],
      },
    ]

    return {
      livePresence,
      disciplineLog,
      emergencyActions,
    }
  }

  /**
   * Get live presence data for hostel dashboard
   * Requirements: 8.1 - Display live presence: students in hostel, missing students, late returns
   */
  private async getHostelLivePresence(schoolId: string): Promise<HostelDashboardData['livePresence']> {
    const today = this.normalizeDate(new Date())
    const now = new Date()

    // Get all active boarding students (students with boarding status)
    // For now, we'll use all active students as a proxy since we don't have a specific boarding flag
    const totalBoardingStudents = await prisma.student.count({
      where: { 
        schoolId, 
        status: StudentStatus.ACTIVE,
      },
    })

    // Get today's attendance to determine presence
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: today,
        student: { schoolId, status: StudentStatus.ACTIVE },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
            class: { select: { name: true } },
          },
        },
      },
      distinct: ['studentId'],
    })

    // Students marked present are considered in hostel
    const presentStudentIds = new Set<string>()
    const lateStudentIds = new Set<string>()
    
    for (const record of attendanceRecords) {
      if (record.status === AttendanceStatus.PRESENT) {
        presentStudentIds.add(record.studentId)
      } else if (record.status === AttendanceStatus.LATE) {
        lateStudentIds.add(record.studentId)
      }
    }

    const studentsInHostel = presentStudentIds.size + lateStudentIds.size

    // Get students who are absent (missing from hostel)
    const absentRecords = attendanceRecords.filter(
      (r) => r.status === AttendanceStatus.ABSENT
    )

    const missingStudents: HostelDashboardData['livePresence']['missingStudents'] = absentRecords.map((record) => ({
      studentId: record.student.id,
      studentName: `${record.student.firstName} ${record.student.lastName}`,
      admissionNumber: record.student.admissionNumber,
      dormitory: record.student.class?.name || 'Unknown', // Using class as dormitory proxy
      lastSeen: undefined,
      expectedReturn: undefined,
      status: 'absent' as const,
    }))

    // Get late returns (students marked late today)
    const lateReturns: HostelDashboardData['livePresence']['lateReturns'] = attendanceRecords
      .filter((r) => r.status === AttendanceStatus.LATE)
      .map((record) => ({
        studentId: record.student.id,
        studentName: `${record.student.firstName} ${record.student.lastName}`,
        admissionNumber: record.student.admissionNumber,
        dormitory: record.student.class?.name || 'Unknown',
        lastSeen: record.createdAt,
        expectedReturn: undefined,
        status: 'late' as const,
      }))

    return {
      studentsInHostel,
      totalCapacity: totalBoardingStudents,
      missingStudents,
      lateReturns,
    }
  }

  /**
   * Get discipline log for hostel dashboard
   * Requirements: 8.2 - Display discipline log: incidents, actions taken, escalations
   */
  private async getHostelDisciplineLog(schoolId: string): Promise<HostelDashboardData['disciplineLog']> {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get recent discipline incidents
    const recentCases = await prisma.disciplineCase.findMany({
      where: {
        student: { schoolId },
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Map discipline cases to incidents
    const recentIncidents: HostelDashboardData['disciplineLog']['recentIncidents'] = recentCases.map((c) => ({
      id: c.id,
      studentId: c.student.id,
      studentName: `${c.student.firstName} ${c.student.lastName}`,
      incidentDate: c.incidentDate,
      description: c.description,
      severity: this.mapDisciplineTypeToSeverity(c.type),
      status: c.parentAcknowledged ? 'resolved' as const : 'reported' as const,
    }))

    // Get pending actions (cases where parent hasn't acknowledged)
    const pendingCases = recentCases.filter((c) => !c.parentAcknowledged)
    const pendingActions: HostelDashboardData['disciplineLog']['pendingActions'] = pendingCases.map((c) => ({
      id: `action-${c.id}`,
      incidentId: c.id,
      studentId: c.student.id,
      studentName: `${c.student.firstName} ${c.student.lastName}`,
      actionRequired: `Follow up on ${c.action} - Parent notification pending`,
      dueDate: new Date(c.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from incident
    }))

    // Get escalations (critical cases that need admin attention)
    const criticalCases = recentCases.filter((c) => c.type === 'CRITICAL')
    const escalations: HostelDashboardData['disciplineLog']['escalations'] = criticalCases.map((c) => ({
      id: `escalation-${c.id}`,
      incidentId: c.id,
      escalatedTo: 'SCHOOL_ADMIN',
      escalatedAt: c.createdAt,
      reason: `Critical incident: ${c.description.substring(0, 50)}...`,
      status: c.parentAcknowledged ? 'resolved' as const : 'pending' as const,
    }))

    return {
      recentIncidents,
      pendingActions,
      escalations,
    }
  }

  /**
   * Map discipline type to severity
   */
  private mapDisciplineTypeToSeverity(type: string): 'minor' | 'major' | 'critical' {
    switch (type) {
      case 'MINOR':
        return 'minor'
      case 'MAJOR':
        return 'major'
      case 'CRITICAL':
        return 'critical'
      default:
        return 'minor'
    }
  }


  // ============================================
  // SUPPORT DASHBOARD (Placeholder)
  // Requirements: 9.1, 9.2, 9.3
  // ============================================

  /**
   * Get Support Dashboard data
   * Requirements: 9.1, 9.2, 9.3
   * Displays assigned tasks and notices
   * Optionally includes simple attendance tracking
   * Excludes: student records, marks, financial data
   */
  private async getSupportDashboardData(
    staffId: string,
    schoolId: string
  ): Promise<SupportDashboardData> {
    const [
      tasks,
      notices,
      attendanceTracking,
    ] = await Promise.all([
      this.getStaffTasks(staffId),
      this.getSupportNotices(schoolId),
      this.getSupportAttendanceTracking(staffId),
    ])

    return {
      tasks,
      notices,
      attendanceTracking,
    }
  }

  /**
   * Get notices for support staff dashboard
   * Requirements: 9.1 - Display assigned tasks and notices
   */
  private async getSupportNotices(schoolId: string): Promise<SupportDashboardData['notices']> {
    const now = new Date()
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get announcements targeted at support staff or school-wide
    const announcements = await prisma.announcement.findMany({
      where: {
        schoolId,
        publishedAt: { 
          not: null,
          gte: thirtyDaysAgo,
        },
        OR: [
          { isSchoolWide: true },
          { targetRoles: { has: Role.TEACHER } }, // Support staff may see general staff announcements
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    })

    return announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: this.determineNoticePriority(announcement),
      createdAt: announcement.publishedAt || announcement.createdAt,
      expiresAt: undefined, // Announcements don't have expiry in current schema
    }))
  }

  /**
   * Determine notice priority based on announcement properties
   */
  private determineNoticePriority(announcement: { isSchoolWide: boolean; createdAt: Date }): 'low' | 'normal' | 'high' {
    // School-wide announcements are high priority
    if (announcement.isSchoolWide) {
      return 'high'
    }
    
    // Recent announcements (within 3 days) are normal priority
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    if (announcement.createdAt >= threeDaysAgo) {
      return 'normal'
    }
    
    return 'low'
  }

  /**
   * Get simple attendance tracking for support staff
   * Requirements: 9.2 - Optionally include simple attendance tracking
   */
  private async getSupportAttendanceTracking(staffId: string): Promise<SupportDashboardData['attendanceTracking']> {
    const today = this.normalizeDate(new Date())

    // Check if staff has any activity logged today (using audit log as proxy)
    const todayActivity = await prisma.auditLog.findFirst({
      where: {
        userId: staffId,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'asc' },
    })

    if (!todayActivity) {
      // No activity recorded today
      return {
        date: today,
        checkInTime: undefined,
        checkOutTime: undefined,
        status: 'absent' as const,
      }
    }

    // Get first and last activity of the day
    const firstActivity = await prisma.auditLog.findFirst({
      where: {
        userId: staffId,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'asc' },
    })

    const lastActivity = await prisma.auditLog.findFirst({
      where: {
        userId: staffId,
        timestamp: { gte: today },
      },
      orderBy: { timestamp: 'desc' },
    })

    // Determine if late (after 8:30 AM)
    const checkInTime = firstActivity?.timestamp
    let status: 'present' | 'absent' | 'late' = 'present'
    
    if (checkInTime) {
      const checkInHour = checkInTime.getHours()
      const checkInMinute = checkInTime.getMinutes()
      if (checkInHour > 8 || (checkInHour === 8 && checkInMinute > 30)) {
        status = 'late'
      }
    }

    return {
      date: today,
      checkInTime: firstActivity?.timestamp,
      checkOutTime: lastActivity?.timestamp !== firstActivity?.timestamp ? lastActivity?.timestamp : undefined,
      status,
    }
  }


  // ============================================
  // ALERT HELPER METHODS
  // ============================================

  /**
   * Get pending attendance alerts
   */
  private async getPendingAttendanceAlerts(staffId: string, date: Date): Promise<Alert[]> {
    const attendanceAlerts = await this.getTeacherPendingAttendanceAlerts(staffId, date)
    return attendanceAlerts.map((alert) => ({
      id: alert.id,
      type: AlertType.PENDING_ATTENDANCE,
      severity: AlertSeverity.WARNING,
      message: alert.message,
      actionUrl: `/dashboard/attendance/mark?classId=${alert.classId}`,
      createdAt: alert.date,
    }))
  }

  /**
   * Get marks deadline alerts
   */
  private async getMarksDeadlineAlerts(staffId: string, schoolId: string): Promise<Alert[]> {
    const deadlineAlerts = await this.getTeacherMarksDeadlineAlerts(staffId, schoolId)
    return deadlineAlerts.map((alert) => ({
      id: alert.id,
      type: AlertType.MARKS_DEADLINE,
      severity: alert.deadline < new Date() ? AlertSeverity.CRITICAL : AlertSeverity.WARNING,
      message: alert.message,
      actionUrl: `/dashboard/marks?examId=${alert.examId}&subjectId=${alert.subjectId}`,
      createdAt: new Date(),
    }))
  }

  /**
   * Get overdue task alerts
   */
  private async getOverdueTaskAlerts(staffId: string): Promise<Alert[]> {
    const overdueTasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        status: TaskStatus.OVERDUE,
      },
    })

    return overdueTasks.map((task) => ({
      id: `task-${task.id}`,
      type: AlertType.TASK_OVERDUE,
      severity: AlertSeverity.CRITICAL,
      message: `Overdue: ${task.title}`,
      actionUrl: `/dashboard/tasks/${task.id}`,
      createdAt: task.deadline,
    }))
  }

  /**
   * Get pending approval alerts for DOS
   */
  private async getPendingApprovalAlerts(schoolId: string): Promise<Alert[]> {
    // This would check for marks awaiting approval
    // For now, return empty array as marks approval system may not be fully implemented
    return []
  }

  /**
   * Get financial alerts for Bursar
   */
  private async getFinancialAlerts(schoolId: string): Promise<Alert[]> {
    // Get count of students with high outstanding balances
    const highBalanceCount = await prisma.studentAccount.count({
      where: {
        student: { schoolId, status: StudentStatus.ACTIVE },
        balance: { gt: 500000 }, // High balance threshold
      },
    })

    const alerts: Alert[] = []

    if (highBalanceCount > 0) {
      alerts.push({
        id: 'high-balances',
        type: AlertType.UNPAID_BALANCE,
        severity: AlertSeverity.WARNING,
        message: `${highBalanceCount} students with high outstanding balances`,
        actionUrl: '/dashboard/fees?filter=high-balance',
        createdAt: new Date(),
      })
    }

    return alerts
  }

  // ============================================
  // TODAY PANEL - TEACHER DASHBOARD
  // Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
  // ============================================

  /**
   * Get today's schedule with attendance and marks status for a teacher
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
   * 
   * @param staffId - The teacher's staff ID
   * @param schoolId - The school ID for tenant isolation
   * @returns TodayPanelData with scheduled classes and their status
   */
  async getTodayScheduleWithStatus(
    staffId: string,
    schoolId: string
  ): Promise<TodayPanelData> {
    const today = new Date()
    const normalizedDate = this.normalizeDate(today)
    
    // Get day of week (1-7, Monday-Sunday)
    // JavaScript getDay() returns 0-6 (Sunday-Saturday), convert to 1-7 (Monday-Sunday)
    const jsDay = today.getDay()
    const dayOfWeek = jsDay === 0 ? 7 : jsDay

    // Get timetable entries for this teacher on this day
    const timetableEntries = await prisma.timetableEntry.findMany({
      where: {
        staffId,
        dayOfWeek,
      },
      include: {
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            streams: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { period: 'asc' },
    })

    // Get current term for marks status check
    const currentYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      include: {
        terms: {
          where: {
            startDate: { lte: today },
            endDate: { gte: today },
          },
          take: 1,
        },
      },
    })
    const currentTerm = currentYear?.terms[0]

    // Build scheduled classes with status
    const scheduledClasses: ScheduledClassEntry[] = []

    for (const entry of timetableEntries) {
      // Requirements: 2.3, 2.4 - Calculate attendance status
      const attendanceCount = await prisma.attendance.count({
        where: {
          classId: entry.classId,
          date: normalizedDate,
          recordedBy: staffId,
        },
      })
      const attendanceStatus: 'not_taken' | 'done' = attendanceCount > 0 ? 'done' : 'not_taken'

      // Requirements: 2.5, 2.6 - Calculate marks status
      let marksStatus: 'pending' | 'done' = 'done'
      
      if (currentTerm) {
        // Check if there are open exams for this term
        const openExams = await prisma.exam.findMany({
          where: {
            schoolId,
            termId: currentTerm.id,
            isOpen: true,
          },
        })

        if (openExams.length > 0) {
          // Get active students in this class
          const students = await prisma.student.findMany({
            where: { classId: entry.classId, status: StudentStatus.ACTIVE },
            select: { id: true },
          })

          // Check if marks are complete for all open exams
          for (const exam of openExams) {
            const marksCount = await prisma.mark.count({
              where: {
                examId: exam.id,
                subjectId: entry.subjectId,
                studentId: { in: students.map((s) => s.id) },
              },
            })

            if (marksCount < students.length) {
              marksStatus = 'pending'
              break
            }
          }
        }
      }

      // Generate time slot based on period (typical school schedule)
      const timeSlot = this.getPeriodTimeSlot(entry.period)

      scheduledClasses.push({
        id: entry.id,
        period: entry.period,
        timeSlot,
        subject: {
          id: entry.subject.id,
          name: entry.subject.name,
        },
        class: {
          id: entry.class.id,
          name: entry.class.name,
          streamName: entry.class.streams?.[0]?.name,
        },
        room: entry.room ?? undefined,
        attendanceStatus,
        marksStatus,
      })
    }

    return {
      date: normalizedDate.toISOString(),
      dayOfWeek,
      scheduledClasses,
    }
  }

  /**
   * Get time slot string for a period number
   * Standard school period times (can be customized per school in future)
   */
  private getPeriodTimeSlot(period: number): string {
    const periodTimes: Record<number, string> = {
      1: '8:00 - 8:40',
      2: '8:45 - 9:25',
      3: '9:30 - 10:10',
      4: '10:30 - 11:10',
      5: '11:15 - 11:55',
      6: '12:00 - 12:40',
      7: '14:00 - 14:40',
      8: '14:45 - 15:25',
      9: '15:30 - 16:10',
      10: '16:15 - 16:55',
    }
    return periodTimes[period] || `Period ${period}`
  }
}

// Export singleton instance
export const dashboardService = new DashboardService()
