/**
 * Staff Management Service
 * Handles staff profile management, role assignment, and responsibility management
 * for the staff-centric dashboard system.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { prisma } from '@/lib/db';
import { AuditService, AuditAction, AuditResource } from './audit.service';
import {
  Role,
  StaffRole,
  StaffStatus,
  StaffEventType,
  ResponsibilityType,
  AlertType,
  AlertSeverity,
} from '@/types/enums';
import {
  StaffProfile,
  StaffListItem,
  StaffFilters,
  StaffUpdateData,
  StaffAlert,
  PermissionSummary,
  PerformanceSummary,
  StaffResponsibility,
  ResponsibilityInput,
  ResponsibilityDetails,
  PerformanceMetrics,
  StaffHistoryEntry,
} from '@/types/staff-dashboard';

/**
 * Permission boundaries for each staff role
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
const STAFF_PERMISSION_BOUNDARIES: Record<string, PermissionSummary> = {
  [Role.TEACHER]: {
    canEnterMarks: true,
    canApproveMarks: false,
    canViewFees: false,
    canRecordPayments: false,
    canEditClassAssignments: false,
    canTrackPresence: false,
    canLogDiscipline: false,
    canSendEmergencyAlerts: false,
    canViewStudents: true,
    canGenerateReports: false,
    canLockReports: false,
    dataScope: 'assigned_classes',
  },
  [StaffRole.CLASS_TEACHER]: {
    canEnterMarks: true,
    canApproveMarks: false,
    canViewFees: true,
    canRecordPayments: false,
    canEditClassAssignments: false,
    canTrackPresence: false,
    canLogDiscipline: true,
    canSendEmergencyAlerts: false,
    canViewStudents: true,
    canGenerateReports: false,
    canLockReports: false,
    dataScope: 'assigned_classes',
  },
  [StaffRole.DOS]: {
    canEnterMarks: false,
    canApproveMarks: true,
    canViewFees: false,
    canRecordPayments: false,
    canEditClassAssignments: true,
    canTrackPresence: false,
    canLogDiscipline: false,
    canSendEmergencyAlerts: false,
    canViewStudents: true,
    canGenerateReports: true,
    canLockReports: true,
    dataScope: 'school_academics',
  },
  [StaffRole.BURSAR]: {
    canEnterMarks: false,
    canApproveMarks: false,
    canViewFees: true,
    canRecordPayments: true,
    canEditClassAssignments: false,
    canTrackPresence: false,
    canLogDiscipline: false,
    canSendEmergencyAlerts: false,
    canViewStudents: true,
    canGenerateReports: true,
    canLockReports: false,
    dataScope: 'school_finance',
  },
  [StaffRole.HOSTEL_STAFF]: {
    canEnterMarks: false,
    canApproveMarks: false,
    canViewFees: false,
    canRecordPayments: false,
    canEditClassAssignments: false,
    canTrackPresence: true,
    canLogDiscipline: true,
    canSendEmergencyAlerts: true,
    canViewStudents: true,
    canGenerateReports: false,
    canLockReports: false,
    dataScope: 'hostel_students',
  },
  [StaffRole.SUPPORT_STAFF]: {
    canEnterMarks: false,
    canApproveMarks: false,
    canViewFees: false,
    canRecordPayments: false,
    canEditClassAssignments: false,
    canTrackPresence: false,
    canLogDiscipline: false,
    canSendEmergencyAlerts: false,
    canViewStudents: false,
    canGenerateReports: false,
    canLockReports: false,
    dataScope: 'own_tasks',
  },
  [Role.SCHOOL_ADMIN]: {
    canEnterMarks: true,
    canApproveMarks: true,
    canViewFees: true,
    canRecordPayments: true,
    canEditClassAssignments: true,
    canTrackPresence: true,
    canLogDiscipline: true,
    canSendEmergencyAlerts: true,
    canViewStudents: true,
    canGenerateReports: true,
    canLockReports: true,
    dataScope: 'full_school',
  },
};

/**
 * Get permission summary for a role
 */
function getPermissionSummary(role: StaffRole | Role): PermissionSummary {
  return STAFF_PERMISSION_BOUNDARIES[role] || STAFF_PERMISSION_BOUNDARIES[Role.TEACHER];
}

export class StaffManagementService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }

  // ============================================
  // STAFF LIST AND PROFILE
  // Requirements: 2.1, 2.2, 2.3
  // ============================================

  /**
   * Get staff list with filters
   * Requirements: 2.1 - Display name, roles, department, status, phone, last activity, alerts
   */
  async getStaffList(schoolId: string, filters?: StaffFilters): Promise<StaffListItem[]> {
    const where: Record<string, unknown> = { schoolId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.department) {
      where.department = filters.department;
    }

    if (filters?.role) {
      if (Object.values(StaffRole).includes(filters.role as StaffRole)) {
        where.primaryRole = filters.role;
      } else {
        where.role = filters.role;
      }
    }

    if (filters?.searchTerm) {
      where.OR = [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { employeeNumber: { contains: filters.searchTerm, mode: 'insensitive' } },
      ];
    }

    const staffMembers = await prisma.staff.findMany({
      where,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      include: {
        tasks: {
          where: { status: 'OVERDUE' },
          select: { id: true },
        },
      },
    });

    return staffMembers.map((staff: {
      id: string;
      employeeNumber: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      primaryRole: string | null;
      secondaryRoles: string[];
      role: string;
      department: string | null;
      status: string;
      lastActivityAt: Date | null;
      tasks?: { id: string }[];
    }) => this.mapToStaffListItem(staff));
  }


  /**
   * Get full staff profile
   * Requirements: 2.3 - Contains identity, employment, responsibilities, permissions summary,
   * performance, history, documents, and audit trail
   */
  async getStaffProfile(staffId: string): Promise<StaffProfile> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        responsibilities: true,
        historyEntries: {
          orderBy: { performedAt: 'desc' },
          take: 50,
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        tasks: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
          orderBy: { deadline: 'asc' },
        },
      },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    const performanceSummary = await this.calculatePerformanceSummary(staffId);
    const alerts = await this.getStaffAlerts(staffId);
    const effectiveRole = staff.primaryRole || staff.role;

    return {
      id: staff.id,
      userId: staff.userId,
      employeeNumber: staff.employeeNumber,
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone || undefined,
      email: staff.email || undefined,
      primaryRole: (staff.primaryRole as StaffRole) || (staff.role as Role),
      secondaryRoles: (staff.secondaryRoles as StaffRole[]) || [],
      department: staff.department || undefined,
      status: staff.status as StaffStatus,
      hireDate: staff.hireDate,
      responsibilities: staff.responsibilities.map((r: {
        id: string;
        staffId: string;
        type: string;
        details: unknown;
        assignedAt: Date;
        assignedBy: string;
      }) => this.mapToResponsibility(r)),
      permissionsSummary: getPermissionSummary(effectiveRole as StaffRole | Role),
      performanceSummary,
      lastActivity: staff.lastActivityAt || undefined,
      alerts,
    };
  }

  /**
   * Update staff profile
   * Requirements: 2.5 - Record change in audit trail with actor, timestamp, and change details
   */
  async updateStaffProfile(
    staffId: string,
    data: StaffUpdateData,
    updatedBy: string
  ): Promise<StaffProfile> {
    const currentStaff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!currentStaff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    const updateData: Record<string, unknown> = {};
    const changes: Record<string, { previous: unknown; new: unknown }> = {};

    if (data.firstName !== undefined && data.firstName !== currentStaff.firstName) {
      updateData.firstName = data.firstName;
      changes.firstName = { previous: currentStaff.firstName, new: data.firstName };
    }

    if (data.lastName !== undefined && data.lastName !== currentStaff.lastName) {
      updateData.lastName = data.lastName;
      changes.lastName = { previous: currentStaff.lastName, new: data.lastName };
    }

    if (data.phone !== undefined && data.phone !== currentStaff.phone) {
      updateData.phone = data.phone;
      changes.phone = { previous: currentStaff.phone, new: data.phone };
    }

    if (data.email !== undefined && data.email !== currentStaff.email) {
      updateData.email = data.email;
      changes.email = { previous: currentStaff.email, new: data.email };
    }

    if (data.department !== undefined && data.department !== currentStaff.department) {
      updateData.department = data.department;
      changes.department = { previous: currentStaff.department, new: data.department };
    }

    await prisma.staff.update({
      where: { id: staffId },
      data: updateData,
    });

    if (Object.keys(changes).length > 0) {
      await this.auditService.log({
        schoolId: currentStaff.schoolId,
        userId: updatedBy,
        action: AuditAction.UPDATE,
        resource: AuditResource.STAFF,
        resourceId: staffId,
        previousValue: Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [k, v.previous])
        ),
        newValue: Object.fromEntries(
          Object.entries(changes).map(([k, v]) => [k, v.new])
        ),
      });
    }

    return this.getStaffProfile(staffId);
  }


  /**
   * Deactivate staff (prevent deletion, offer deactivation only)
   * Requirements: 2.4 - Prevent deletion and display deactivation option
   */
  async deactivateStaff(staffId: string, reason: string, deactivatedBy: string): Promise<void> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    if (staff.status === StaffStatus.INACTIVE) {
      throw new Error('Staff is already inactive');
    }

    await prisma.staff.update({
      where: { id: staffId },
      data: { status: StaffStatus.INACTIVE },
    });

    await prisma.staffHistoryEntry.create({
      data: {
        staffId,
        eventType: StaffEventType.DEACTIVATED,
        previousValue: StaffStatus.ACTIVE,
        newValue: StaffStatus.INACTIVE,
        reason,
        performedBy: deactivatedBy,
      },
    });

    await this.auditService.logStaffDeactivation({
      schoolId: staff.schoolId,
      adminUserId: deactivatedBy,
      staffId,
      employeeNumber: staff.employeeNumber,
      reason,
    });
  }

  // ============================================
  // SELF-MODIFICATION PREVENTION
  // Requirements: 3.5
  // ============================================

  /**
   * Check if a user is attempting to modify their own profile
   * Requirements: 3.5 - Deny self-modification and log attempt
   * 
   * @param targetStaffId - The staff ID being modified
   * @param actorUserId - The user ID performing the action
   * @returns Object with isSelfModification flag and staff details
   */
  async checkSelfModification(
    targetStaffId: string,
    actorUserId: string
  ): Promise<{ isSelfModification: boolean; staff: { id: string; schoolId: string } | null }> {
    const actorStaff = await prisma.staff.findFirst({
      where: { userId: actorUserId },
    });

    const targetStaff = await prisma.staff.findUnique({
      where: { id: targetStaffId },
      select: { id: true, schoolId: true },
    });

    if (!targetStaff) {
      return { isSelfModification: false, staff: null };
    }

    const isSelfModification = actorStaff?.id === targetStaffId;

    return { isSelfModification, staff: targetStaff };
  }

  /**
   * Log self-modification attempt to audit trail
   * Requirements: 3.5 - Log attempt in audit trail
   */
  async logSelfModificationAttempt(
    schoolId: string,
    userId: string,
    staffId: string,
    actionType: 'role_change' | 'permission_change' | 'role_removal',
    attemptedValue: unknown
  ): Promise<void> {
    await this.auditService.log({
      schoolId,
      userId,
      action: `self_${actionType}_attempt`,
      resource: AuditResource.STAFF,
      resourceId: staffId,
      newValue: {
        actionType,
        attemptedValue,
        deniedAt: new Date().toISOString(),
        reason: 'Self-modification is not permitted',
      },
    });
  }

  /**
   * Validate and prevent self-modification
   * Requirements: 3.5 - Deny role/permission changes to own profile
   * 
   * @throws Error if self-modification is attempted
   */
  async preventSelfModification(
    targetStaffId: string,
    actorUserId: string,
    actionType: 'role_change' | 'permission_change' | 'role_removal',
    attemptedValue: unknown
  ): Promise<void> {
    const { isSelfModification, staff } = await this.checkSelfModification(
      targetStaffId,
      actorUserId
    );

    if (isSelfModification && staff) {
      await this.logSelfModificationAttempt(
        staff.schoolId,
        actorUserId,
        targetStaffId,
        actionType,
        attemptedValue
      );
      throw new SelfModificationError(
        'Cannot modify your own role or permissions',
        actorUserId,
        targetStaffId,
        actionType
      );
    }
  }

  // ============================================
  // ROLE MANAGEMENT
  // Requirements: 3.1, 3.2, 3.3, 3.5
  // ============================================

  /**
   * Assign role to staff member
   * Requirements: 3.1 - Restrict to admin only
   * Requirements: 3.3 - Auto-apply permission set on role assignment
   * Requirements: 3.5 - Deny self-modification and log attempt
   */
  async assignRole(
    staffId: string,
    role: StaffRole | Role,
    assignedBy: string,
    isPrimary: boolean = false
  ): Promise<void> {
    // Check for self-modification attempt
    await this.preventSelfModification(
      staffId,
      assignedBy,
      'role_change',
      { role, isPrimary }
    );

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    const previousPrimaryRole = staff.primaryRole;
    const previousSecondaryRoles = staff.secondaryRoles;

    if (isPrimary) {
      await prisma.staff.update({
        where: { id: staffId },
        data: { primaryRole: role as StaffRole },
      });
    } else {
      const currentSecondaryRoles = staff.secondaryRoles || [];
      if (!currentSecondaryRoles.includes(role as StaffRole)) {
        await prisma.staff.update({
          where: { id: staffId },
          data: {
            secondaryRoles: [...currentSecondaryRoles, role as StaffRole],
          },
        });
      }
    }

    await prisma.staffHistoryEntry.create({
      data: {
        staffId,
        eventType: StaffEventType.ROLE_ASSIGNED,
        previousValue: isPrimary
          ? previousPrimaryRole || undefined
          : JSON.stringify(previousSecondaryRoles),
        newValue: role,
        performedBy: assignedBy,
      },
    });

    await this.auditService.logRoleChange({
      schoolId: staff.schoolId,
      adminUserId: assignedBy,
      targetUserId: staff.userId,
      previousRole: isPrimary
        ? (previousPrimaryRole || 'none')
        : JSON.stringify(previousSecondaryRoles),
      newRole: role,
      reason: isPrimary ? 'Primary role assignment' : 'Secondary role assignment',
    });
  }


  /**
   * Remove role from staff member
   * Requirements: 3.1 - Restrict to admin only
   * Requirements: 3.5 - Deny self-modification and log attempt
   */
  async removeRole(
    staffId: string,
    role: StaffRole | Role,
    removedBy: string
  ): Promise<void> {
    // Check for self-modification attempt
    await this.preventSelfModification(
      staffId,
      removedBy,
      'role_removal',
      { role }
    );

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    if (staff.primaryRole === role) {
      await prisma.staff.update({
        where: { id: staffId },
        data: { primaryRole: null },
      });
    } else {
      const currentSecondaryRoles = staff.secondaryRoles || [];
      const updatedRoles = currentSecondaryRoles.filter((r: string) => r !== role);
      await prisma.staff.update({
        where: { id: staffId },
        data: { secondaryRoles: updatedRoles },
      });
    }

    await prisma.staffHistoryEntry.create({
      data: {
        staffId,
        eventType: StaffEventType.ROLE_REMOVED,
        previousValue: role,
        newValue: undefined,
        performedBy: removedBy,
      },
    });

    await this.auditService.logRoleChange({
      schoolId: staff.schoolId,
      adminUserId: removedBy,
      targetUserId: staff.userId,
      previousRole: role,
      newRole: 'removed',
      reason: 'Role removal',
    });
  }

  // ============================================
  // RESPONSIBILITY MANAGEMENT
  // Requirements: 3.4
  // ============================================

  /**
   * Assign responsibility to staff member
   * Requirements: 3.4 - Define specific duties separate from permissions
   */
  async assignResponsibility(
    staffId: string,
    responsibility: ResponsibilityInput
  ): Promise<void> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    await prisma.staffResponsibility.create({
      data: {
        staffId,
        type: responsibility.type,
        details: JSON.parse(JSON.stringify(responsibility.details)),
        assignedBy: responsibility.assignedBy,
      },
    });

    await prisma.staffHistoryEntry.create({
      data: {
        staffId,
        eventType: StaffEventType.RESPONSIBILITY_ASSIGNED,
        newValue: JSON.stringify({
          type: responsibility.type,
          details: responsibility.details,
        }),
        performedBy: responsibility.assignedBy,
      },
    });

    await this.auditService.log({
      schoolId: staff.schoolId,
      userId: responsibility.assignedBy,
      action: 'responsibility_assigned',
      resource: AuditResource.STAFF,
      resourceId: staffId,
      newValue: {
        type: responsibility.type,
        details: responsibility.details,
      },
    });
  }


  /**
   * Remove responsibility from staff member
   * Requirements: 3.4 - Manage responsibilities separate from permissions
   */
  async removeResponsibility(
    staffId: string,
    responsibilityId: string,
    removedBy: string
  ): Promise<void> {
    const responsibility = await prisma.staffResponsibility.findUnique({
      where: { id: responsibilityId },
      include: { staff: true },
    });

    if (!responsibility) {
      throw new Error(`Responsibility not found: ${responsibilityId}`);
    }

    if (responsibility.staffId !== staffId) {
      throw new Error('Responsibility does not belong to this staff member');
    }

    await prisma.staffResponsibility.delete({
      where: { id: responsibilityId },
    });

    await prisma.staffHistoryEntry.create({
      data: {
        staffId,
        eventType: StaffEventType.RESPONSIBILITY_REMOVED,
        previousValue: JSON.stringify({
          type: responsibility.type,
          details: responsibility.details,
        }),
        performedBy: removedBy,
      },
    });

    await this.auditService.log({
      schoolId: responsibility.staff.schoolId,
      userId: removedBy,
      action: 'responsibility_removed',
      resource: AuditResource.STAFF,
      resourceId: staffId,
      previousValue: {
        type: responsibility.type,
        details: responsibility.details,
      },
    });
  }

  // ============================================
  // PERFORMANCE AND HISTORY
  // Requirements: 11.1, 13.1
  // ============================================

  /**
   * Get performance metrics for a staff member
   * Requirements: 11.1 - Track attendance consistency, marks submission timeliness,
   * report completion, and task completion
   */
  async getPerformanceMetrics(staffId: string): Promise<PerformanceMetrics> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${staffId}`);
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get task metrics - real data from StaffTask
    const tasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const tasksAssigned = tasks.length;
    const tasksCompleted = tasks.filter((t: { status: string }) => t.status === 'COMPLETED').length;
    const tasksOverdue = tasks.filter((t: { status: string }) => t.status === 'OVERDUE').length;
    const completionRate = tasksAssigned > 0 ? (tasksCompleted / tasksAssigned) * 100 : 100;

    // Get marks submission metrics - real data from Mark entries
    const marksEntries = await prisma.mark.findMany({
      where: {
        enteredBy: staffId,
        enteredAt: { gte: thirtyDaysAgo },
      },
      include: {
        exam: {
          select: { endDate: true },
        },
      },
    });

    // Calculate marks submission timeliness
    let onTimeSubmissions = 0;
    let totalDelayDays = 0;
    for (const mark of marksEntries) {
      if (mark.exam.endDate) {
        const deadline = new Date(mark.exam.endDate);
        deadline.setDate(deadline.getDate() + 3); // 3 days grace period after exam
        if (mark.enteredAt <= deadline) {
          onTimeSubmissions++;
        } else {
          const delayMs = mark.enteredAt.getTime() - deadline.getTime();
          totalDelayDays += delayMs / (1000 * 60 * 60 * 24);
        }
      } else {
        onTimeSubmissions++; // No deadline means on time
      }
    }
    const marksSubmissionTimeliness = marksEntries.length > 0 
      ? (onTimeSubmissions / marksEntries.length) * 100 
      : undefined;
    const averageSubmissionDelay = marksEntries.length > onTimeSubmissions 
      ? totalDelayDays / (marksEntries.length - onTimeSubmissions) 
      : 0;

    // Get report tasks specifically
    const reportTasks = tasks.filter((t: { type: string }) => 
      t.type === 'SUBMIT_REPORT' || t.type === 'GENERATE_REPORTS'
    );
    const reportsAssigned = reportTasks.length;
    const reportsCompleted = reportTasks.filter((t: { status: string }) => t.status === 'COMPLETED').length;

    // Get staff attendance metrics from StaffAttendance model
    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: {
        staffId,
        date: { gte: thirtyDaysAgo },
      },
    });

    // Calculate attendance metrics
    let attendanceRate: number | undefined = undefined;
    let lateCount: number | undefined = undefined;
    let absentCount: number | undefined = undefined;

    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter(
        (r: { status: string }) => r.status === 'PRESENT' || r.status === 'LATE'
      ).length;
      lateCount = attendanceRecords.filter(
        (r: { status: string }) => r.status === 'LATE'
      ).length;
      absentCount = attendanceRecords.filter(
        (r: { status: string }) => r.status === 'ABSENT'
      ).length;
      
      // Calculate attendance rate (present + late / total records)
      attendanceRate = (presentCount / attendanceRecords.length) * 100;
    }

    // Staff attendance is not yet tracked in the system
    // Return undefined to indicate data is not available
    return {
      staffId,
      period: { start: thirtyDaysAgo, end: now },
      attendanceRate,
      lateCount,
      absentCount,
      tasksAssigned,
      tasksCompleted,
      tasksOverdue,
      completionRate,
      marksSubmissionTimeliness,
      averageSubmissionDelay,
      reportsAssigned: reportsAssigned > 0 ? reportsAssigned : undefined,
      reportsCompleted: reportsAssigned > 0 ? reportsCompleted : undefined,
    };
  }

  /**
   * Get staff history
   * Requirements: 13.1 - Track promotions, role changes, transfers, exit reasons
   */
  async getStaffHistory(staffId: string): Promise<StaffHistoryEntry[]> {
    const historyEntries = await prisma.staffHistoryEntry.findMany({
      where: { staffId },
      orderBy: { performedAt: 'desc' },
    });

    return historyEntries.map((entry: {
      id: string;
      staffId: string;
      eventType: string;
      previousValue: string | null;
      newValue: string | null;
      reason: string | null;
      performedBy: string;
      performedAt: Date;
    }) => ({
      id: entry.id,
      staffId: entry.staffId,
      eventType: entry.eventType as StaffEventType,
      previousValue: entry.previousValue || undefined,
      newValue: entry.newValue || undefined,
      reason: entry.reason || undefined,
      performedBy: entry.performedBy,
      performedAt: entry.performedAt,
    }));
  }


  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map Prisma staff to StaffListItem
   */
  private mapToStaffListItem(staff: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    primaryRole: string | null;
    secondaryRoles: string[];
    role: string;
    department: string | null;
    status: string;
    lastActivityAt: Date | null;
    tasks?: { id: string }[];
  }): StaffListItem {
    const alerts: StaffAlert[] = [];

    if (staff.tasks && staff.tasks.length > 0) {
      alerts.push({
        id: `overdue-${staff.id}`,
        type: AlertType.TASK_OVERDUE,
        severity: AlertSeverity.WARNING,
        message: `${staff.tasks.length} overdue task(s)`,
        createdAt: new Date(),
      });
    }

    return {
      id: staff.id,
      name: `${staff.firstName} ${staff.lastName}`,
      employeeNumber: staff.employeeNumber,
      primaryRole: (staff.primaryRole as StaffRole) || (staff.role as Role),
      secondaryRoles: (staff.secondaryRoles as StaffRole[]) || [],
      department: staff.department || undefined,
      status: staff.status as StaffStatus,
      phone: staff.phone || undefined,
      lastActivity: staff.lastActivityAt || undefined,
      alerts,
    };
  }

  /**
   * Map Prisma responsibility to StaffResponsibility
   */
  private mapToResponsibility(responsibility: {
    id: string;
    staffId: string;
    type: string;
    details: unknown;
    assignedAt: Date;
    assignedBy: string;
  }): StaffResponsibility {
    return {
      id: responsibility.id,
      staffId: responsibility.staffId,
      type: responsibility.type as ResponsibilityType,
      details: responsibility.details as ResponsibilityDetails,
      assignedAt: responsibility.assignedAt,
      assignedBy: responsibility.assignedBy,
    };
  }

  /**
   * Calculate performance summary for staff profile
   */
  private async calculatePerformanceSummary(staffId: string): Promise<PerformanceSummary> {
    const metrics = await this.getPerformanceMetrics(staffId);

    return {
      attendanceRate: metrics.attendanceRate,
      taskCompletionRate: metrics.completionRate,
      marksSubmissionTimeliness: metrics.marksSubmissionTimeliness,
      reportCompletionRate:
        metrics.reportsAssigned && metrics.reportsAssigned > 0
          ? ((metrics.reportsCompleted || 0) / metrics.reportsAssigned) * 100
          : undefined,
    };
  }

  /**
   * Get alerts for a staff member
   */
  private async getStaffAlerts(staffId: string): Promise<StaffAlert[]> {
    const alerts: StaffAlert[] = [];

    const overdueTasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        status: 'OVERDUE',
      },
    });

    for (const task of overdueTasks) {
      alerts.push({
        id: `task-${task.id}`,
        type: AlertType.TASK_OVERDUE,
        severity: AlertSeverity.WARNING,
        message: `Overdue: ${task.title}`,
        actionUrl: `/dashboard/tasks/${task.id}`,
        createdAt: task.deadline,
      });
    }

    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const urgentTasks = await prisma.staffTask.findMany({
      where: {
        staffId,
        status: 'PENDING',
        deadline: { lte: twoDaysFromNow },
      },
    });

    for (const task of urgentTasks) {
      alerts.push({
        id: `urgent-${task.id}`,
        type: AlertType.MARKS_DEADLINE,
        severity: AlertSeverity.INFO,
        message: `Due soon: ${task.title}`,
        actionUrl: `/dashboard/tasks/${task.id}`,
        createdAt: new Date(),
      });
    }

    return alerts;
  }

  // ============================================
  // STAFF ATTENDANCE MANAGEMENT
  // ============================================

  /**
   * Record staff attendance for a specific date
   */
  async recordStaffAttendance(
    staffId: string,
    schoolId: string,
    date: Date,
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE',
    recordedBy: string,
    options?: {
      checkInAt?: Date;
      checkOutAt?: Date;
      lateMinutes?: number;
      remarks?: string;
    }
  ): Promise<{ id: string; staffId: string; date: Date; status: string }> {
    // Verify staff exists and belongs to school
    const staff = await prisma.staff.findFirst({
      where: { id: staffId, schoolId },
    });

    if (!staff) {
      throw new Error('Staff not found in this school');
    }

    // Normalize date to start of day
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Upsert attendance record
    const attendance = await prisma.staffAttendance.upsert({
      where: {
        staffId_date: {
          staffId,
          date: normalizedDate,
        },
      },
      create: {
        staffId,
        schoolId,
        date: normalizedDate,
        status,
        checkInAt: options?.checkInAt,
        checkOutAt: options?.checkOutAt,
        lateMinutes: options?.lateMinutes || 0,
        remarks: options?.remarks,
        recordedBy,
      },
      update: {
        status,
        checkInAt: options?.checkInAt,
        checkOutAt: options?.checkOutAt,
        lateMinutes: options?.lateMinutes || 0,
        remarks: options?.remarks,
        recordedBy,
        recordedAt: new Date(),
      },
    });

    return {
      id: attendance.id,
      staffId: attendance.staffId,
      date: attendance.date,
      status: attendance.status,
    };
  }

  /**
   * Get staff attendance records for a date range
   */
  async getStaffAttendance(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    id: string;
    date: Date;
    status: string;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    lateMinutes: number;
    remarks: string | null;
  }>> {
    const records = await prisma.staffAttendance.findMany({
      where: {
        staffId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });

    return records.map(r => ({
      id: r.id,
      date: r.date,
      status: r.status,
      checkInAt: r.checkInAt,
      checkOutAt: r.checkOutAt,
      lateMinutes: r.lateMinutes,
      remarks: r.remarks,
    }));
  }

  /**
   * Get attendance summary for all staff in a school
   */
  async getSchoolStaffAttendanceSummary(
    schoolId: string,
    date: Date
  ): Promise<Array<{
    staffId: string;
    staffName: string;
    status: string | null;
    checkInAt: Date | null;
  }>> {
    // Normalize date
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Get all active staff
    const staffList = await prisma.staff.findMany({
      where: { schoolId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    // Get attendance records for the date
    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: {
        schoolId,
        date: normalizedDate,
      },
    });

    // Map attendance to staff
    const attendanceMap = new Map(
      attendanceRecords.map(r => [r.staffId, r])
    );

    return staffList.map(staff => {
      const attendance = attendanceMap.get(staff.id);
      return {
        staffId: staff.id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        status: attendance?.status || null,
        checkInAt: attendance?.checkInAt || null,
      };
    });
  }

  /**
   * Bulk record staff attendance
   */
  async bulkRecordAttendance(
    schoolId: string,
    date: Date,
    records: Array<{
      staffId: string;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
      checkInAt?: Date;
      lateMinutes?: number;
      remarks?: string;
    }>,
    recordedBy: string
  ): Promise<{ recorded: number; failed: number }> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    let recorded = 0;
    let failed = 0;

    for (const record of records) {
      try {
        await prisma.staffAttendance.upsert({
          where: {
            staffId_date: {
              staffId: record.staffId,
              date: normalizedDate,
            },
          },
          create: {
            staffId: record.staffId,
            schoolId,
            date: normalizedDate,
            status: record.status,
            checkInAt: record.checkInAt,
            lateMinutes: record.lateMinutes || 0,
            remarks: record.remarks,
            recordedBy,
          },
          update: {
            status: record.status,
            checkInAt: record.checkInAt,
            lateMinutes: record.lateMinutes || 0,
            remarks: record.remarks,
            recordedBy,
            recordedAt: new Date(),
          },
        });
        recorded++;
      } catch (error) {
        console.error(`Failed to record attendance for staff ${record.staffId}:`, error);
        failed++;
      }
    }

    return { recorded, failed };
  }
}

// Export singleton instance
export const staffManagementService = new StaffManagementService();

/**
 * Custom error for self-modification attempts
 * Requirements: 3.5 - Deny self-modification
 */
export class SelfModificationError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'SELF_MODIFICATION_DENIED';

  constructor(
    message: string,
    public readonly actorUserId: string,
    public readonly targetStaffId: string,
    public readonly actionType: 'role_change' | 'permission_change' | 'role_removal'
  ) {
    super(message);
    this.name = 'SelfModificationError';
  }
}
