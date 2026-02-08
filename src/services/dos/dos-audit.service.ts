/**
 * DoS Audit Service
 * 
 * Immutable audit logging for all Director of Studies actions.
 * Ensures complete traceability of academic decisions and changes.
 * 
 * Requirements:
 * - Immutable audit trail
 * - Complete action logging
 * - User and IP tracking
 * - Resource identification
 */

import { prisma } from '@/lib/db';
import type { Role } from '@prisma/client';

export interface DoSAuditLogInput {
  schoolId: string;
  userId: string;
  userRole?: Role;
  action: string;
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  previousValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DoSAuditQuery {
  schoolId: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class DoSAuditService {
  /**
   * Log a DoS action (immutable)
   */
  async log(input: DoSAuditLogInput): Promise<void> {
    try {
      // Get user role if not provided
      let userRole = input.userRole;
      if (!userRole) {
        const user = await prisma.user.findUnique({
          where: { id: input.userId },
          select: { role: true }
        });
        userRole = user?.role || 'TEACHER';
      }

      await prisma.doSAuditLog.create({
        data: {
          schoolId: input.schoolId,
          userId: input.userId,
          userRole,
          action: input.action,
          resourceType: input.resourceType,
          resourceId: input.resourceId,
          resourceName: input.resourceName,
          previousValue: input.previousValue ? JSON.parse(JSON.stringify(input.previousValue)) : null,
          newValue: input.newValue ? JSON.parse(JSON.stringify(input.newValue)) : null,
          reason: input.reason,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent
        }
      });
    } catch (error) {
      // Log audit failures but don't throw - audit should not break business logic
      console.error('DoS Audit logging failed:', error);
    }
  }

  /**
   * Query audit logs with filters
   */
  async queryLogs(query: DoSAuditQuery) {
    const where: any = {
      schoolId: query.schoolId
    };

    if (query.userId) where.userId = query.userId;
    if (query.action) where.action = query.action;
    if (query.resourceType) where.resourceType = query.resourceType;
    if (query.resourceId) where.resourceId = query.resourceId;
    
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) where.timestamp.gte = query.startDate;
      if (query.endDate) where.timestamp.lte = query.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.doSAuditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
        include: {
          // Note: We don't include user details to maintain audit integrity
          // User details should be resolved separately if needed
        }
      }),
      prisma.doSAuditLog.count({ where })
    ]);

    return {
      logs,
      total,
      hasMore: (query.offset || 0) + logs.length < total
    };
  }

  /**
   * Get audit summary for a resource
   */
  async getResourceAuditSummary(
    schoolId: string,
    resourceType: string,
    resourceId: string
  ) {
    const logs = await prisma.doSAuditLog.findMany({
      where: {
        schoolId,
        resourceType,
        resourceId
      },
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        userId: true,
        userRole: true,
        reason: true,
        timestamp: true
      }
    });

    const summary = {
      totalActions: logs.length,
      firstAction: logs[logs.length - 1],
      lastAction: logs[0],
      actionTypes: {} as Record<string, number>,
      userActions: {} as Record<string, number>
    };

    logs.forEach(log => {
      // Count action types
      summary.actionTypes[log.action] = (summary.actionTypes[log.action] || 0) + 1;
      
      // Count user actions
      summary.userActions[log.userId] = (summary.userActions[log.userId] || 0) + 1;
    });

    return summary;
  }

  /**
   * Get DoS activity overview for school
   */
  async getActivityOverview(
    schoolId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const where: any = { schoolId };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [
      totalActions,
      actionsByType,
      actionsByUser,
      recentActions
    ] = await Promise.all([
      prisma.doSAuditLog.count({ where }),
      
      prisma.doSAuditLog.groupBy({
        by: ['action'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      prisma.doSAuditLog.groupBy({
        by: ['userId', 'userRole'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      prisma.doSAuditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 10,
        select: {
          action: true,
          resourceType: true,
          resourceName: true,
          userId: true,
          userRole: true,
          timestamp: true
        }
      })
    ]);

    return {
      totalActions,
      actionsByType: actionsByType.map(item => ({
        action: item.action,
        count: item._count.id
      })),
      actionsByUser: actionsByUser.map(item => ({
        userId: item.userId,
        userRole: item.userRole,
        count: item._count.id
      })),
      recentActions
    };
  }

  /**
   * Get critical DoS actions (approvals, locks, overrides)
   */
  async getCriticalActions(
    schoolId: string,
    days: number = 30
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const criticalActions = [
      'APPROVE_CURRICULUM_SUBJECT',
      'APPROVE_ASSESSMENT_PLAN',
      'APPROVE_EXAM',
      'LOCK_ASSESSMENT',
      'LOCK_EXAM',
      'LOCK_FINAL_SCORES',
      'APPROVE_REPORT_CARD',
      'PUBLISH_REPORT_CARD',
      'OVERRIDE_PROMOTION',
      'LOCK_PROMOTION_DECISION'
    ];

    return prisma.doSAuditLog.findMany({
      where: {
        schoolId,
        action: { in: criticalActions },
        timestamp: { gte: startDate }
      },
      orderBy: { timestamp: 'desc' },
      select: {
        action: true,
        resourceType: true,
        resourceName: true,
        userId: true,
        userRole: true,
        reason: true,
        timestamp: true
      }
    });
  }

  /**
   * Export audit logs for compliance
   */
  async exportAuditLogs(
    schoolId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json'
  ) {
    const logs = await prisma.doSAuditLog.findMany({
      where: {
        schoolId,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    if (format === 'csv') {
      // Convert to CSV format
      const headers = [
        'Timestamp',
        'User ID',
        'User Role', 
        'Action',
        'Resource Type',
        'Resource ID',
        'Resource Name',
        'Reason',
        'IP Address'
      ];

      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        log.userId,
        log.userRole,
        log.action,
        log.resourceType,
        log.resourceId,
        log.resourceName || '',
        log.reason || '',
        log.ipAddress || ''
      ]);

      return {
        headers,
        rows: csvRows,
        filename: `dos-audit-${schoolId}-${startDate.toISOString().split('T')[0]}-${endDate.toISOString().split('T')[0]}.csv`
      };
    }

    return {
      logs,
      metadata: {
        schoolId,
        startDate,
        endDate,
        totalRecords: logs.length,
        exportedAt: new Date().toISOString()
      }
    };
  }
}