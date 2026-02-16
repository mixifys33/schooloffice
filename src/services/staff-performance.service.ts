/**
 * Staff Performance Monitoring Service
 * Tracks and monitors staff performance metrics including attendance consistency,
 * marks submission timeliness, report completion, and task completion.
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 * - 11.1: Automatically track attendance consistency, marks submission timeliness,
 *         report completion, and task completion
 * - 11.2: Display trends without subjective opinions
 * - 11.3: Visible to leadership roles only (SCHOOL_ADMIN, DOS)
 * - 11.4: Log access to audit trail when performance data is accessed
 */    

import { prisma } from '@/lib/db';
import { AuditService, AuditAction, AuditResource } from './audit.service';
import {
  Role,
  StaffRole,
  TaskStatus,
} from '@/types/enums';
import { PerformanceMetrics } from '@/types/staff-dashboard';

/**
 * Leadership roles that can access performance data
 * Requirements: 11.3 - Restrict to leadership roles only
 */
const LEADERSHIP_ROLES: (Role | StaffRole)[] = [
  Role.SCHOOL_ADMIN,
  StaffRole.DOS,
  Role.SUPER_ADMIN,
];

/**
 * Performance period options
 */
export type PerformancePeriod = 'week' | 'month' | 'term' | 'year' | 'custom';

/**
 * Performance trend data point
 * Requirements: 11.2 - Display trends without subjective opinions
 */
export interface PerformanceTrendPoint {
  date: Date;
  value: number;
  label: string;
}

/**
 * Performance trend data
 * Requirements: 11.2 - Display trends without subjective opinions
 */
export interface PerformanceTrend {
  metricName: string;
  dataPoints: PerformanceTrendPoint[];
  periodStart: Date;
  periodEnd: Date;
  average: number;
  min: number;
  max: number;
}

/**
 * Comprehensive performance report
 */
export interface PerformanceReport {
  staffId: string;
  staffName: string;
  employeeNumber: string;
  department?: string;
  role: string;
  period: { start: Date; end: Date };
  metrics: PerformanceMetrics;
  trends: {
    attendance: PerformanceTrend;
    taskCompletion: PerformanceTrend;
    marksSubmission?: PerformanceTrend;
    reportCompletion?: PerformanceTrend;
  };
  generatedAt: Date;
  generatedBy: string;
}

/**
 * School-wide performance summary
 */
export interface SchoolPerformanceSummary {
  schoolId: string;
  period: { start: Date; end: Date };
  totalStaff: number;
  averageAttendanceRate: number;
  averageTaskCompletionRate: number;
  averageMarksSubmissionTimeliness: number;
  staffByPerformanceLevel: {
    excellent: number; // >= 90%
    good: number;      // >= 75%
    needsImprovement: number; // >= 50%
    poor: number;      // < 50%
  };
  topPerformers: Array<{
    staffId: string;
    name: string;
    completionRate: number;
  }>;
  generatedAt: Date;
}

/**
 * Access check result
 */
export interface AccessCheckResult {
  hasAccess: boolean;
  reason?: string;
  userRole?: Role | StaffRole;
}


/**
 * Staff Performance Monitoring Service
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */
export class StaffPerformanceService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  // ============================================
  // ACCESS CONTROL
  // Requirements: 11.3, 11.4
  // ============================================

  /**
   * Check if user has access to performance data
   * Requirements: 11.3 - Restrict to leadership roles only
   */
  async checkPerformanceDataAccess(
    userId: string,
    schoolId: string
  ): Promise<AccessCheckResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        staff: true,
      },
    });

    if (!user) {
      return { hasAccess: false, reason: 'User not found' };
    }

    // Check if user's school matches
    if (user.schoolId !== schoolId && user.role !== Role.SUPER_ADMIN) {
      return { hasAccess: false, reason: 'User does not belong to this school' };
    }

    // Check if user has leadership role
    const userRole = user.role as Role;
    const staffRole = user.staff?.primaryRole as StaffRole | null;

    if (LEADERSHIP_ROLES.includes(userRole)) {
      return { hasAccess: true, userRole };
    }

    if (staffRole && LEADERSHIP_ROLES.includes(staffRole)) {
      return { hasAccess: true, userRole: staffRole };
    }

    return {
      hasAccess: false,
      reason: 'Performance data is restricted to leadership roles only',
      userRole,
    };
  }

  /**
   * Log performance data access to audit trail
   * Requirements: 11.4 - Log access to audit trail
   */
  async logPerformanceDataAccess(
    schoolId: string,
    accessedBy: string,
    targetStaffId: string,
    accessType: 'view_metrics' | 'view_trends' | 'view_report' | 'view_summary'
  ): Promise<void> {
    await this.auditService.log({
      schoolId,
      userId: accessedBy,
      action: `performance_data_${accessType}`,
      resource: AuditResource.STAFF,
      resourceId: targetStaffId,
      newValue: {
        accessType,
        accessedAt: new Date().toISOString(),
        targetStaffId,
      },
    });
  }

  // ============================================
  // PERFORMANCE METRICS TRACKING
  // Requirements: 11.1
  // ============================================

  /**
   * Get performance metrics for a staff member
   * Requirements: 11.1 - Track attendance consistency, marks submission timeliness,
   *               report completion, and task completion
   * Requirements: 11.3 - Restrict to leadership roles only
   * Requirements: 11.4 - Log access to audit trail
   */
  async getPerformanceMetrics(
    staffId: string,
    accessedBy: string,
    period?: { start: Date; end: Date }
  ): Promise<PerformanceMetrics> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    // Check access permissions
    const accessCheck = await this.checkPerformanceDataAccess(accessedBy, staff.schoolId);
    if (!accessCheck.hasAccess) {
      throw new PerformanceAccessDeniedError(
        accessCheck.reason || 'Access denied',
        accessedBy,
        staffId
      );
    }

    // Log the access
    await this.logPerformanceDataAccess(
      staff.schoolId,
      accessedBy,
      staffId,
      'view_metrics'
    );

    // Calculate period
    const now = new Date();
    const periodStart = period?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = period?.end || now;

    // Calculate metrics
    const attendanceMetrics = await this.calculateAttendanceMetrics(staffId, periodStart, periodEnd);
    const taskMetrics = await this.calculateTaskMetrics(staffId, periodStart, periodEnd);
    const marksMetrics = await this.calculateMarksSubmissionMetrics(staffId, periodStart, periodEnd);
    const reportMetrics = await this.calculateReportCompletionMetrics(staffId, periodStart, periodEnd);

    return {
      staffId,
      period: { start: periodStart, end: periodEnd },
      ...attendanceMetrics,
      ...taskMetrics,
      ...marksMetrics,
      ...reportMetrics,
    };
  }

  /**
   * Calculate attendance consistency metrics
   * Requirements: 11.1 - Track attendance consistency
   */
  private async calculateAttendanceMetrics(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    attendanceRate: number;
    lateCount: number;
    absentCount: number;
  }> {
    // Get staff's recorded attendance (as recorder)
    // This tracks how consistently the staff member records attendance
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        recordedBy: staffId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        date: true,
        recordedAt: true,
      },
    });

    // Calculate working days in period
    const workingDays = this.calculateWorkingDays(periodStart, periodEnd);
    
    // Get unique dates where attendance was recorded
    const uniqueDates = new Set(
      attendanceRecords.map((r) => r.date.toISOString().split('T')[0])
    );

    // Calculate late recordings (recorded after 10 AM)
    const lateRecordings = attendanceRecords.filter((r) => {
      const recordedHour = r.recordedAt.getHours();
      return recordedHour >= 10;
    });

    const attendanceRate = workingDays > 0 
      ? Math.min(100, (uniqueDates.size / workingDays) * 100)
      : 100;

    return {
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      lateCount: lateRecordings.length,
      absentCount: Math.max(0, workingDays - uniqueDates.size),
    };
  }

  /**
   * Calculate task completion metrics
   * Requirements: 11.1 - Track task completion
   */
  private async calculateTaskMetrics(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    tasksAssigned: number;
    tasksCompleted: number;
    tasksOverdue: number;
    completionRate: number;
  }> {
    const tasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        status: true,
        deadline: true,
        completedAt: true,
      },
    });

    const tasksAssigned = tasks.length;
    const tasksCompleted = tasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const tasksOverdue = tasks.filter((t) => t.status === TaskStatus.OVERDUE).length;
    const completionRate = tasksAssigned > 0 
      ? (tasksCompleted / tasksAssigned) * 100 
      : 100;

    return {
      tasksAssigned,
      tasksCompleted,
      tasksOverdue,
      completionRate: Math.round(completionRate * 100) / 100,
    };
  }

  /**
   * Calculate marks submission timeliness metrics
   * Requirements: 11.1 - Track marks submission timeliness
   */
  private async calculateMarksSubmissionMetrics(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    marksSubmissionTimeliness?: number;
    averageSubmissionDelay?: number;
  }> {
    // Get marks entered by this staff member
    const marks = await prisma.mark.findMany({
      where: {
        enteredBy: staffId,
        enteredAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      include: {
        exam: {
          select: {
            endDate: true,
          },
        },
      },
    });

    if (marks.length === 0) {
      return {
        marksSubmissionTimeliness: undefined,
        averageSubmissionDelay: undefined,
      };
    }

    // Calculate timeliness based on exam end date
    let onTimeCount = 0;
    let totalDelayDays = 0;
    let marksWithDeadline = 0;

    for (const mark of marks) {
      if (mark.exam.endDate) {
        marksWithDeadline++;
        const deadline = new Date(mark.exam.endDate);
        deadline.setDate(deadline.getDate() + 3); // 3 days grace period

        if (mark.enteredAt <= deadline) {
          onTimeCount++;
        } else {
          const delayMs = mark.enteredAt.getTime() - deadline.getTime();
          totalDelayDays += delayMs / (24 * 60 * 60 * 1000);
        }
      }
    }

    const timeliness = marksWithDeadline > 0 
      ? (onTimeCount / marksWithDeadline) * 100 
      : 100;
    const avgDelay = marksWithDeadline > 0 
      ? totalDelayDays / marksWithDeadline 
      : 0;

    return {
      marksSubmissionTimeliness: Math.round(timeliness * 100) / 100,
      averageSubmissionDelay: Math.round(avgDelay * 100) / 100,
    };
  }

  /**
   * Calculate report completion metrics
   * Requirements: 11.1 - Track report completion
   */
  private async calculateReportCompletionMetrics(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    reportsAssigned?: number;
    reportsCompleted?: number;
  }> {
    // Get report-related tasks for this staff member
    const reportTasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        linkedModule: 'REPORTS',
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        status: true,
      },
    });

    if (reportTasks.length === 0) {
      return {
        reportsAssigned: undefined,
        reportsCompleted: undefined,
      };
    }

    return {
      reportsAssigned: reportTasks.length,
      reportsCompleted: reportTasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
    };
  }


  // ============================================
  // PERFORMANCE TRENDS
  // Requirements: 11.2
  // ============================================

  /**
   * Get performance trends for a staff member
   * Requirements: 11.2 - Display trends without subjective opinions
   * Requirements: 11.3 - Restrict to leadership roles only
   * Requirements: 11.4 - Log access to audit trail
   */
  async getPerformanceTrends(
    staffId: string,
    accessedBy: string,
    metricType: 'attendance' | 'taskCompletion' | 'marksSubmission' | 'reportCompletion',
    period: PerformancePeriod = 'month',
    customPeriod?: { start: Date; end: Date }
  ): Promise<PerformanceTrend> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    // Check access permissions
    const accessCheck = await this.checkPerformanceDataAccess(accessedBy, staff.schoolId);
    if (!accessCheck.hasAccess) {
      throw new PerformanceAccessDeniedError(
        accessCheck.reason || 'Access denied',
        accessedBy,
        staffId
      );
    }

    // Log the access
    await this.logPerformanceDataAccess(
      staff.schoolId,
      accessedBy,
      staffId,
      'view_trends'
    );

    // Calculate period bounds
    const { start, end } = this.calculatePeriodBounds(period, customPeriod);

    // Generate trend data based on metric type
    switch (metricType) {
      case 'attendance':
        return this.generateAttendanceTrend(staffId, start, end);
      case 'taskCompletion':
        return this.generateTaskCompletionTrend(staffId, start, end);
      case 'marksSubmission':
        return this.generateMarksSubmissionTrend(staffId, start, end);
      case 'reportCompletion':
        return this.generateReportCompletionTrend(staffId, start, end);
      default:
        throw new Error(`Unknown metric type: ${metricType}`);
    }
  }

  /**
   * Generate attendance trend data
   * Requirements: 11.2 - Display trends without subjective opinions
   */
  private async generateAttendanceTrend(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PerformanceTrend> {
    const dataPoints: PerformanceTrendPoint[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    
    let currentStart = new Date(periodStart);
    while (currentStart < periodEnd) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + weekMs, periodEnd.getTime()));
      
      const metrics = await this.calculateAttendanceMetrics(staffId, currentStart, currentEnd);
      
      dataPoints.push({
        date: currentStart,
        value: metrics.attendanceRate,
        label: `Week of ${currentStart.toLocaleDateString()}`,
      });
      
      currentStart = currentEnd;
    }

    const values = dataPoints.map((p) => p.value);
    
    return {
      metricName: 'Attendance Rate',
      dataPoints,
      periodStart,
      periodEnd,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  /**
   * Generate task completion trend data
   * Requirements: 11.2 - Display trends without subjective opinions
   */
  private async generateTaskCompletionTrend(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PerformanceTrend> {
    const dataPoints: PerformanceTrendPoint[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    
    let currentStart = new Date(periodStart);
    while (currentStart < periodEnd) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + weekMs, periodEnd.getTime()));
      
      const metrics = await this.calculateTaskMetrics(staffId, currentStart, currentEnd);
      
      dataPoints.push({
        date: currentStart,
        value: metrics.completionRate,
        label: `Week of ${currentStart.toLocaleDateString()}`,
      });
      
      currentStart = currentEnd;
    }

    const values = dataPoints.map((p) => p.value);
    
    return {
      metricName: 'Task Completion Rate',
      dataPoints,
      periodStart,
      periodEnd,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  /**
   * Generate marks submission trend data
   * Requirements: 11.2 - Display trends without subjective opinions
   */
  private async generateMarksSubmissionTrend(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PerformanceTrend> {
    const dataPoints: PerformanceTrendPoint[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    
    let currentStart = new Date(periodStart);
    while (currentStart < periodEnd) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + weekMs, periodEnd.getTime()));
      
      const metrics = await this.calculateMarksSubmissionMetrics(staffId, currentStart, currentEnd);
      
      dataPoints.push({
        date: currentStart,
        value: metrics.marksSubmissionTimeliness ?? 100,
        label: `Week of ${currentStart.toLocaleDateString()}`,
      });
      
      currentStart = currentEnd;
    }

    const values = dataPoints.map((p) => p.value);
    
    return {
      metricName: 'Marks Submission Timeliness',
      dataPoints,
      periodStart,
      periodEnd,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  /**
   * Generate report completion trend data
   * Requirements: 11.2 - Display trends without subjective opinions
   */
  private async generateReportCompletionTrend(
    staffId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PerformanceTrend> {
    const dataPoints: PerformanceTrendPoint[] = [];
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    
    let currentStart = new Date(periodStart);
    while (currentStart < periodEnd) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + weekMs, periodEnd.getTime()));
      
      const metrics = await this.calculateReportCompletionMetrics(staffId, currentStart, currentEnd);
      const completionRate = metrics.reportsAssigned && metrics.reportsAssigned > 0
        ? ((metrics.reportsCompleted || 0) / metrics.reportsAssigned) * 100
        : 100;
      
      dataPoints.push({
        date: currentStart,
        value: completionRate,
        label: `Week of ${currentStart.toLocaleDateString()}`,
      });
      
      currentStart = currentEnd;
    }

    const values = dataPoints.map((p) => p.value);
    
    return {
      metricName: 'Report Completion Rate',
      dataPoints,
      periodStart,
      periodEnd,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }

  // ============================================
  // COMPREHENSIVE REPORTS
  // Requirements: 11.1, 11.2, 11.3, 11.4
  // ============================================

  /**
   * Generate comprehensive performance report for a staff member
   * Requirements: 11.1, 11.2, 11.3, 11.4
   */
  async generatePerformanceReport(
    staffId: string,
    accessedBy: string,
    period?: { start: Date; end: Date }
  ): Promise<PerformanceReport> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    // Check access permissions
    const accessCheck = await this.checkPerformanceDataAccess(accessedBy, staff.schoolId);
    if (!accessCheck.hasAccess) {
      throw new PerformanceAccessDeniedError(
        accessCheck.reason || 'Access denied',
        accessedBy,
        staffId
      );
    }

    // Log the access
    await this.logPerformanceDataAccess(
      staff.schoolId,
      accessedBy,
      staffId,
      'view_report'
    );

    // Calculate period
    const now = new Date();
    const periodStart = period?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = period?.end || now;

    // Get metrics and trends
    const metrics = await this.getPerformanceMetrics(staffId, accessedBy, { start: periodStart, end: periodEnd });
    
    const [attendanceTrend, taskCompletionTrend, marksSubmissionTrend, reportCompletionTrend] = await Promise.all([
      this.generateAttendanceTrend(staffId, periodStart, periodEnd),
      this.generateTaskCompletionTrend(staffId, periodStart, periodEnd),
      this.generateMarksSubmissionTrend(staffId, periodStart, periodEnd),
      this.generateReportCompletionTrend(staffId, periodStart, periodEnd),
    ]);

    return {
      staffId,
      staffName: `${staff.firstName} ${staff.lastName}`,
      employeeNumber: staff.employeeNumber,
      department: staff.department || undefined,
      role: staff.primaryRole || staff.role,
      period: { start: periodStart, end: periodEnd },
      metrics,
      trends: {
        attendance: attendanceTrend,
        taskCompletion: taskCompletionTrend,
        marksSubmission: marksSubmissionTrend,
        reportCompletion: reportCompletionTrend,
      },
      generatedAt: new Date(),
      generatedBy: accessedBy,
    };
  }

  /**
   * Get school-wide performance summary
   * Requirements: 11.1, 11.3, 11.4
   */
  async getSchoolPerformanceSummary(
    schoolId: string,
    accessedBy: string,
    period?: { start: Date; end: Date }
  ): Promise<SchoolPerformanceSummary> {
    // Check access permissions
    const accessCheck = await this.checkPerformanceDataAccess(accessedBy, schoolId);
    if (!accessCheck.hasAccess) {
      throw new PerformanceAccessDeniedError(
        accessCheck.reason || 'Access denied',
        accessedBy,
        'school_summary'
      );
    }

    // Log the access
    await this.logPerformanceDataAccess(
      schoolId,
      accessedBy,
      'school_summary',
      'view_summary'
    );

    // Calculate period
    const now = new Date();
    const periodStart = period?.start || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = period?.end || now;

    // Get all active staff
    const staffMembers = await prisma.staff.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Calculate metrics for each staff member
    const staffMetrics: Array<{
      staffId: string;
      name: string;
      attendanceRate: number;
      taskCompletionRate: number;
      marksSubmissionTimeliness: number;
    }> = [];

    for (const staff of staffMembers) {
      const attendanceMetrics = await this.calculateAttendanceMetrics(staff.id, periodStart, periodEnd);
      const taskMetrics = await this.calculateTaskMetrics(staff.id, periodStart, periodEnd);
      const marksMetrics = await this.calculateMarksSubmissionMetrics(staff.id, periodStart, periodEnd);

      staffMetrics.push({
        staffId: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        attendanceRate: attendanceMetrics.attendanceRate,
        taskCompletionRate: taskMetrics.completionRate,
        marksSubmissionTimeliness: marksMetrics.marksSubmissionTimeliness ?? 100,
      });
    }

    // Calculate averages
    const totalStaff = staffMetrics.length;
    const avgAttendance = totalStaff > 0
      ? staffMetrics.reduce((sum, s) => sum + s.attendanceRate, 0) / totalStaff
      : 0;
    const avgTaskCompletion = totalStaff > 0
      ? staffMetrics.reduce((sum, s) => sum + s.taskCompletionRate, 0) / totalStaff
      : 0;
    const avgMarksTimeliness = totalStaff > 0
      ? staffMetrics.reduce((sum, s) => sum + s.marksSubmissionTimeliness, 0) / totalStaff
      : 0;

    // Categorize by performance level (based on task completion rate)
    const staffByPerformanceLevel = {
      excellent: staffMetrics.filter((s) => s.taskCompletionRate >= 90).length,
      good: staffMetrics.filter((s) => s.taskCompletionRate >= 75 && s.taskCompletionRate < 90).length,
      needsImprovement: staffMetrics.filter((s) => s.taskCompletionRate >= 50 && s.taskCompletionRate < 75).length,
      poor: staffMetrics.filter((s) => s.taskCompletionRate < 50).length,
    };

    // Get top performers
    const topPerformers = staffMetrics
      .sort((a, b) => b.taskCompletionRate - a.taskCompletionRate)
      .slice(0, 5)
      .map((s) => ({
        staffId: s.staffId,
        name: s.name,
        completionRate: s.taskCompletionRate,
      }));

    return {
      schoolId,
      period: { start: periodStart, end: periodEnd },
      totalStaff,
      averageAttendanceRate: Math.round(avgAttendance * 100) / 100,
      averageTaskCompletionRate: Math.round(avgTaskCompletion * 100) / 100,
      averageMarksSubmissionTimeliness: Math.round(avgMarksTimeliness * 100) / 100,
      staffByPerformanceLevel,
      topPerformers,
      generatedAt: new Date(),
    };
  }


  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Calculate working days in a period (excluding weekends)
   */
  private calculateWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }

  /**
   * Calculate period bounds based on period type
   */
  private calculatePeriodBounds(
    period: PerformancePeriod,
    customPeriod?: { start: Date; end: Date }
  ): { start: Date; end: Date } {
    const now = new Date();
    
    switch (period) {
      case 'week':
        return {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now,
        };
      case 'month':
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now,
        };
      case 'term':
        return {
          start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          end: now,
        };
      case 'year':
        return {
          start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          end: now,
        };
      case 'custom':
        if (!customPeriod) {
          throw new Error('Custom period requires start and end dates');
        }
        return customPeriod;
      default:
        return {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          end: now,
        };
    }
  }

  /**
   * Compare performance between two periods
   * Requirements: 11.2 - Display trends without subjective opinions
   */
  async comparePerformancePeriods(
    staffId: string,
    accessedBy: string,
    period1: { start: Date; end: Date },
    period2: { start: Date; end: Date }
  ): Promise<{
    period1Metrics: PerformanceMetrics;
    period2Metrics: PerformanceMetrics;
    changes: {
      attendanceRate: number;
      taskCompletionRate: number;
      marksSubmissionTimeliness?: number;
    };
  }> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    // Check access permissions
    const accessCheck = await this.checkPerformanceDataAccess(accessedBy, staff.schoolId);
    if (!accessCheck.hasAccess) {
      throw new PerformanceAccessDeniedError(
        accessCheck.reason || 'Access denied',
        accessedBy,
        staffId
      );
    }

    // Log the access
    await this.logPerformanceDataAccess(
      staff.schoolId,
      accessedBy,
      staffId,
      'view_metrics'
    );

    const period1Metrics = await this.getPerformanceMetrics(staffId, accessedBy, period1);
    const period2Metrics = await this.getPerformanceMetrics(staffId, accessedBy, period2);

    return {
      period1Metrics,
      period2Metrics,
      changes: {
        attendanceRate: period2Metrics.attendanceRate - period1Metrics.attendanceRate,
        taskCompletionRate: period2Metrics.completionRate - period1Metrics.completionRate,
        marksSubmissionTimeliness: 
          period1Metrics.marksSubmissionTimeliness !== undefined && 
          period2Metrics.marksSubmissionTimeliness !== undefined
            ? period2Metrics.marksSubmissionTimeliness - period1Metrics.marksSubmissionTimeliness
            : undefined,
      },
    };
  }

  /**
   * Get staff members with performance below threshold
   * Requirements: 11.1, 11.3
   */
  async getStaffBelowThreshold(
    schoolId: string,
    accessedBy: string,
    threshold: number = 75,
    metricType: 'attendance' | 'taskCompletion' | 'marksSubmission' = 'taskCompletion'
  ): Promise<Array<{
    staffId: string;
    name: string;
    value: number;
    threshold: number;
  }>> {
    // Check access permissions
    const accessCheck = await this.checkPerformanceDataAccess(accessedBy, schoolId);
    if (!accessCheck.hasAccess) {
      throw new PerformanceAccessDeniedError(
        accessCheck.reason || 'Access denied',
        accessedBy,
        'school_threshold_check'
      );
    }

    // Log the access
    await this.logPerformanceDataAccess(
      schoolId,
      accessedBy,
      'school_threshold_check',
      'view_summary'
    );

    const now = new Date();
    const periodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get all active staff
    const staffMembers = await prisma.staff.findMany({
      where: {
        schoolId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const belowThreshold: Array<{
      staffId: string;
      name: string;
      value: number;
      threshold: number;
    }> = [];

    for (const staff of staffMembers) {
      let value: number;

      switch (metricType) {
        case 'attendance': {
          const metrics = await this.calculateAttendanceMetrics(staff.id, periodStart, now);
          value = metrics.attendanceRate;
          break;
        }
        case 'taskCompletion': {
          const metrics = await this.calculateTaskMetrics(staff.id, periodStart, now);
          value = metrics.completionRate;
          break;
        }
        case 'marksSubmission': {
          const metrics = await this.calculateMarksSubmissionMetrics(staff.id, periodStart, now);
          value = metrics.marksSubmissionTimeliness ?? 100;
          break;
        }
        default:
          value = 100;
      }

      if (value < threshold) {
        belowThreshold.push({
          staffId: staff.id,
          name: `${staff.firstName} ${staff.lastName}`,
          value: Math.round(value * 100) / 100,
          threshold,
        });
      }
    }

    return belowThreshold.sort((a, b) => a.value - b.value);
  }
}

// Export singleton instance
export const staffPerformanceService = new StaffPerformanceService();

/**
 * Custom error for performance data access denial
 * Requirements: 11.3 - Restrict to leadership roles only
 */
export class PerformanceAccessDeniedError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'PERFORMANCE_ACCESS_DENIED';

  constructor(
    message: string,
    public readonly accessedBy: string,
    public readonly targetStaffId: string
  ) {
    super(message);
    this.name = 'PerformanceAccessDeniedError';
  }
}
