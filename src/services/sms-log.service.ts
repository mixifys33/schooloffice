/**
 * SMS Log Service
 * Implements SMS infrastructure tracking
 * PART 2.5: PREPARE SMS INFRASTRUCTURE (BUT DISABLE IT)
 */

import { prisma } from '@/lib/db';

// Types for SmsLog
interface SmsLog {
  id: string;
  schoolId: string;
  studentId: string;
  guardianId: string;
  phoneNumber: string;
  message: string;
  messageType: string;
  status: string;
  sentAt: Date | null;
  deliveredAt: Date | null;
  errorMessage: string | null;
  cost: number | null;
  segments: number;
  senderId: string;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateSmsLogInput {
  schoolId: string;
  studentId: string;
  guardianId: string;
  phoneNumber: string;
  message: string;
  messageType: string;
  status?: string;
  cost?: number;
  segments?: number;
  senderId: string;
  metadata?: any;
}

interface UpdateSmsLogInput {
  status?: string;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  errorMessage?: string | null;
}

export class SmsLogService {
  /**
   * Create a new SMS log entry
   */
  static async create(input: CreateSmsLogInput): Promise<SmsLog> {
    return await prisma.smsLog.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        phoneNumber: input.phoneNumber,
        message: input.message,
        messageType: input.messageType,
        status: input.status || 'QUEUED',
        cost: input.cost || null,
        segments: input.segments || 1,
        senderId: input.senderId,
        metadata: input.metadata || null,
      },
    });
  }

  /**
   * Update SMS log status
   */
  static async update(id: string, input: UpdateSmsLogInput): Promise<SmsLog> {
    return await prisma.smsLog.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Get SMS logs for a student
   */
  static async getByStudent(studentId: string, limit: number = 50): Promise<SmsLog[]> {
    return await prisma.smsLog.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get SMS logs for a guardian
   */
  static async getByGuardian(guardianId: string, limit: number = 50): Promise<SmsLog[]> {
    return await prisma.smsLog.findMany({
      where: { guardianId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get SMS logs for a school
   */
  static async getBySchool(schoolId: string, filters?: {
    messageType?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: SmsLog[]; total: number }> {
    const where: any = { schoolId };
    
    if (filters?.messageType) {
      where.messageType = filters.messageType;
    }
    
    if (filters?.status) {
      where.status = filters.status;
    }
    
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }
    
    const [logs, total] = await Promise.all([
      prisma.smsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      prisma.smsLog.count({ where }),
    ]);
    
    return { logs, total };
  }

  /**
   * Log a manual test send (for SMS infrastructure proof)
   */
  static async logManualTestSend(input: {
    schoolId: string;
    studentId: string;
    guardianId: string;
    phoneNumber: string;
    message: string;
    senderId: string;
    testType: string;
  }): Promise<SmsLog> {
    return await prisma.smsLog.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,
        guardianId: input.guardianId,
        phoneNumber: input.phoneNumber,
        message: input.message,
        messageType: `TEST_${input.testType.toUpperCase()}`,
        status: 'QUEUED', // Will remain queued as automation is disabled
        segments: Math.ceil(input.message.length / 160), // Approximate segment count
        senderId: input.senderId,
        metadata: {
          testType: input.testType,
          isTest: true,
          automationDisabled: true,
        },
      },
    });
  }

  /**
   * Get SMS statistics for a school
   */
  static async getStats(schoolId: string, dateFrom?: Date, dateTo?: Date): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    queued: number;
    totalCost: number;
    byMessageType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const where: any = { schoolId };
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }
    
    const logs = await prisma.smsLog.findMany({ where });
    
    let sent = 0, delivered = 0, failed = 0, queued = 0, totalCost = 0;
    const byMessageType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    
    for (const log of logs) {
      totalCost += log.cost || 0;
      
      if (log.status === 'SENT') sent++;
      else if (log.status === 'DELIVERED') delivered++;
      else if (log.status === 'FAILED') failed++;
      else if (log.status === 'QUEUED') queued++;
      
      byMessageType[log.messageType] = (byMessageType[log.messageType] || 0) + 1;
      byStatus[log.status] = (byStatus[log.status] || 0) + 1;
    }
    
    return {
      total: logs.length,
      sent,
      delivered,
      failed,
      queued,
      totalCost,
      byMessageType,
      byStatus,
    };
  }
}

export default SmsLogService;