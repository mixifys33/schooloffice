/**
 * Staff History Service
 * Tracks promotions, role changes, transfers, and exits for staff members.
 * Creates history entries for all tracked events with actor, timestamp, and details.
 * 
 * Requirements: 13.1 - Staff history tracking
 * Property 35: Staff History Tracking - For any promotion, role change, transfer, 
 * or exit event, the Staff_History should record the event.
 */

import { prisma } from '@/lib/db';
import { AuditService, AuditAction, AuditResource } from './audit.service';
import { StaffEventType, StaffStatus, StaffRole, Role } from '@/types/enums';
import {
  StaffHistoryEntry,
  CreateStaffHistoryEntryInput,
} from '@/types/staff-dashboard';

/**
 * Input for recording a promotion event
 */
export interface PromotionInput {
  staffId: string;
  previousRole: StaffRole | Role | string;
  newRole: StaffRole | Role | string;
  reason?: string;
  performedBy: string;
}

/**
 * Input for recording a role change event
 */
export interface RoleChangeInput {
  staffId: string;
  previousRole?: StaffRole | Role | string;
  newRole: StaffRole | Role | string;
  isAssignment: boolean; // true for assignment, false for removal
  reason?: string;
  performedBy: string;
}

/**
 * Input for recording a transfer event
 */
export interface TransferInput {
  staffId: string;
  previousDepartment?: string;
  newDepartment: string;
  previousSchoolId?: string;
  newSchoolId?: string;
  reason?: string;
  performedBy: string;
}

/**
 * Input for recording an exit/deactivation event
 */
export interface ExitInput {
  staffId: string;
  exitType: 'DEACTIVATED' | 'RESIGNED' | 'TERMINATED' | 'RETIRED';
  reason: string;
  performedBy: string;
}

/**
 * Input for recording a status change event
 */
export interface StatusChangeInput {
  staffId: string;
  previousStatus: StaffStatus;
  newStatus: StaffStatus;
  reason?: string;
  performedBy: string;
}

/**
 * Input for recording a responsibility change event
 */
export interface ResponsibilityChangeInput {
  staffId: string;
  responsibilityType: string;
  responsibilityDetails: Record<string, unknown>;
  isAssignment: boolean; // true for assignment, false for removal
  performedBy: string;
}

/**
 * Filter options for querying staff history
 */
export interface StaffHistoryFilter {
  staffId?: string;
  eventTypes?: StaffEventType[];
  dateFrom?: Date;
  dateTo?: Date;
  performedBy?: string;
}

export class StaffHistoryService {
  private auditService: AuditService;

  constructor() {
    this.auditService = new AuditService();
  }


  // ============================================
  // CORE HISTORY ENTRY METHODS
  // Requirements: 13.1 - Track promotions, role changes, transfers, exits
  // ============================================

  /**
   * Create a history entry for any staff event
   * Requirements: 13.1 - Record event with actor, timestamp, details
   */
  async createHistoryEntry(input: CreateStaffHistoryEntryInput): Promise<StaffHistoryEntry> {
    const staff = await prisma.staff.findUnique({
      where: { id: input.staffId },
      select: { id: true, schoolId: true },
    });

    if (!staff) {
      throw new Error(`Staff not found: ${input.staffId}`);
    }

    const entry = await prisma.staffHistoryEntry.create({
      data: {
        staffId: input.staffId,
        eventType: input.eventType,
        previousValue: input.previousValue || null,
        newValue: input.newValue || null,
        reason: input.reason || null,
        performedBy: input.performedBy,
      },
    });

    // Also log to audit trail for comprehensive tracking
    await this.auditService.log({
      schoolId: staff.schoolId,
      userId: input.performedBy,
      action: `staff_${input.eventType.toLowerCase()}`,
      resource: AuditResource.STAFF,
      resourceId: input.staffId,
      previousValue: input.previousValue ? { value: input.previousValue } : undefined,
      newValue: input.newValue ? { value: input.newValue, reason: input.reason } : undefined,
    });

    return this.mapToStaffHistoryEntry(entry);
  }

  /**
   * Get staff history for a specific staff member
   * Requirements: 13.1 - Return chronological history
   */
  async getStaffHistory(staffId: string): Promise<StaffHistoryEntry[]> {
    const entries = await prisma.staffHistoryEntry.findMany({
      where: { staffId },
      orderBy: { performedAt: 'desc' },
    });

    return entries.map(this.mapToStaffHistoryEntry);
  }

  /**
   * Get staff history with filters
   */
  async getStaffHistoryFiltered(filter: StaffHistoryFilter): Promise<StaffHistoryEntry[]> {
    const where: Record<string, unknown> = {};

    if (filter.staffId) {
      where.staffId = filter.staffId;
    }

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      where.eventType = { in: filter.eventTypes };
    }

    if (filter.performedBy) {
      where.performedBy = filter.performedBy;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.performedAt = {};
      if (filter.dateFrom) {
        (where.performedAt as Record<string, Date>).gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        (where.performedAt as Record<string, Date>).lte = filter.dateTo;
      }
    }

    const entries = await prisma.staffHistoryEntry.findMany({
      where,
      orderBy: { performedAt: 'desc' },
    });

    return entries.map(this.mapToStaffHistoryEntry);
  }

  // ============================================
  // PROMOTION TRACKING
  // Requirements: 13.1 - Track promotions
  // ============================================

  /**
   * Record a promotion event
   * Requirements: 13.1 - Track promotions
   */
  async recordPromotion(input: PromotionInput): Promise<StaffHistoryEntry> {
    return this.createHistoryEntry({
      staffId: input.staffId,
      eventType: StaffEventType.PROMOTED,
      previousValue: String(input.previousRole),
      newValue: String(input.newRole),
      reason: input.reason,
      performedBy: input.performedBy,
    });
  }

  // ============================================
  // ROLE CHANGE TRACKING
  // Requirements: 13.1 - Track role changes
  // ============================================

  /**
   * Record a role assignment event
   * Requirements: 13.1 - Track role changes
   */
  async recordRoleAssignment(input: RoleChangeInput): Promise<StaffHistoryEntry> {
    const eventType = input.isAssignment
      ? StaffEventType.ROLE_ASSIGNED
      : StaffEventType.ROLE_REMOVED;

    return this.createHistoryEntry({
      staffId: input.staffId,
      eventType,
      previousValue: input.previousRole ? String(input.previousRole) : undefined,
      newValue: String(input.newRole),
      reason: input.reason,
      performedBy: input.performedBy,
    });
  }

  /**
   * Record a role removal event
   * Requirements: 13.1 - Track role changes
   */
  async recordRoleRemoval(
    staffId: string,
    role: StaffRole | Role | string,
    performedBy: string,
    reason?: string
  ): Promise<StaffHistoryEntry> {
    return this.createHistoryEntry({
      staffId,
      eventType: StaffEventType.ROLE_REMOVED,
      previousValue: String(role),
      newValue: undefined,
      reason,
      performedBy,
    });
  }


  // ============================================
  // TRANSFER TRACKING
  // Requirements: 13.1 - Track transfers
  // ============================================

  /**
   * Record a transfer event
   * Requirements: 13.1 - Track transfers
   */
  async recordTransfer(input: TransferInput): Promise<StaffHistoryEntry> {
    const previousValue = JSON.stringify({
      department: input.previousDepartment,
      schoolId: input.previousSchoolId,
    });

    const newValue = JSON.stringify({
      department: input.newDepartment,
      schoolId: input.newSchoolId,
    });

    return this.createHistoryEntry({
      staffId: input.staffId,
      eventType: StaffEventType.TRANSFERRED,
      previousValue,
      newValue,
      reason: input.reason,
      performedBy: input.performedBy,
    });
  }

  // ============================================
  // EXIT/DEACTIVATION TRACKING
  // Requirements: 13.1 - Track exit reasons
  // ============================================

  /**
   * Record an exit/deactivation event
   * Requirements: 13.1 - Track exit reasons
   */
  async recordExit(input: ExitInput): Promise<StaffHistoryEntry> {
    return this.createHistoryEntry({
      staffId: input.staffId,
      eventType: StaffEventType.DEACTIVATED,
      previousValue: StaffStatus.ACTIVE,
      newValue: input.exitType,
      reason: input.reason,
      performedBy: input.performedBy,
    });
  }

  // ============================================
  // STATUS CHANGE TRACKING
  // Requirements: 13.1 - Track status changes
  // ============================================

  /**
   * Record a status change event
   * Requirements: 13.1 - Track status changes
   */
  async recordStatusChange(input: StatusChangeInput): Promise<StaffHistoryEntry> {
    return this.createHistoryEntry({
      staffId: input.staffId,
      eventType: StaffEventType.STATUS_CHANGED,
      previousValue: input.previousStatus,
      newValue: input.newStatus,
      reason: input.reason,
      performedBy: input.performedBy,
    });
  }

  // ============================================
  // RESPONSIBILITY CHANGE TRACKING
  // Requirements: 13.1 - Track responsibility changes
  // ============================================

  /**
   * Record a responsibility assignment event
   */
  async recordResponsibilityAssignment(input: ResponsibilityChangeInput): Promise<StaffHistoryEntry> {
    const eventType = input.isAssignment
      ? StaffEventType.RESPONSIBILITY_ASSIGNED
      : StaffEventType.RESPONSIBILITY_REMOVED;

    const value = JSON.stringify({
      type: input.responsibilityType,
      details: input.responsibilityDetails,
    });

    return this.createHistoryEntry({
      staffId: input.staffId,
      eventType,
      previousValue: input.isAssignment ? undefined : value,
      newValue: input.isAssignment ? value : undefined,
      performedBy: input.performedBy,
    });
  }

  // ============================================
  // HIRE TRACKING
  // ============================================

  /**
   * Record a hire event (when staff is first created)
   */
  async recordHire(
    staffId: string,
    initialRole: StaffRole | Role | string,
    performedBy: string
  ): Promise<StaffHistoryEntry> {
    return this.createHistoryEntry({
      staffId,
      eventType: StaffEventType.HIRED,
      newValue: String(initialRole),
      performedBy,
    });
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  /**
   * Get history entries by event type
   */
  async getHistoryByEventType(
    staffId: string,
    eventType: StaffEventType
  ): Promise<StaffHistoryEntry[]> {
    const entries = await prisma.staffHistoryEntry.findMany({
      where: {
        staffId,
        eventType,
      },
      orderBy: { performedAt: 'desc' },
    });

    return entries.map(this.mapToStaffHistoryEntry);
  }

  /**
   * Get the most recent history entry for a staff member
   */
  async getMostRecentEntry(staffId: string): Promise<StaffHistoryEntry | null> {
    const entry = await prisma.staffHistoryEntry.findFirst({
      where: { staffId },
      orderBy: { performedAt: 'desc' },
    });

    return entry ? this.mapToStaffHistoryEntry(entry) : null;
  }

  /**
   * Get history entries within a date range
   */
  async getHistoryInDateRange(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StaffHistoryEntry[]> {
    const entries = await prisma.staffHistoryEntry.findMany({
      where: {
        staffId,
        performedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { performedAt: 'desc' },
    });

    return entries.map(this.mapToStaffHistoryEntry);
  }

  /**
   * Count history entries for a staff member
   */
  async countHistoryEntries(staffId: string, eventType?: StaffEventType): Promise<number> {
    const where: Record<string, unknown> = { staffId };
    if (eventType) {
      where.eventType = eventType;
    }

    return prisma.staffHistoryEntry.count({ where });
  }

  /**
   * Get all promotions for a staff member
   */
  async getPromotionHistory(staffId: string): Promise<StaffHistoryEntry[]> {
    return this.getHistoryByEventType(staffId, StaffEventType.PROMOTED);
  }

  /**
   * Get all role changes for a staff member
   */
  async getRoleChangeHistory(staffId: string): Promise<StaffHistoryEntry[]> {
    const entries = await prisma.staffHistoryEntry.findMany({
      where: {
        staffId,
        eventType: {
          in: [StaffEventType.ROLE_ASSIGNED, StaffEventType.ROLE_REMOVED],
        },
      },
      orderBy: { performedAt: 'desc' },
    });

    return entries.map(this.mapToStaffHistoryEntry);
  }

  /**
   * Get all transfers for a staff member
   */
  async getTransferHistory(staffId: string): Promise<StaffHistoryEntry[]> {
    return this.getHistoryByEventType(staffId, StaffEventType.TRANSFERRED);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map Prisma StaffHistoryEntry to domain type
   */
  private mapToStaffHistoryEntry(entry: {
    id: string;
    staffId: string;
    eventType: string;
    previousValue: string | null;
    newValue: string | null;
    reason: string | null;
    performedBy: string;
    performedAt: Date;
  }): StaffHistoryEntry {
    return {
      id: entry.id,
      staffId: entry.staffId,
      eventType: entry.eventType as StaffEventType,
      previousValue: entry.previousValue || undefined,
      newValue: entry.newValue || undefined,
      reason: entry.reason || undefined,
      performedBy: entry.performedBy,
      performedAt: entry.performedAt,
    };
  }
}

// Export singleton instance
export const staffHistoryService = new StaffHistoryService();
