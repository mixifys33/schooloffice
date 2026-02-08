/**
 * Enhanced Fee Structure Service
 * Implements term-scoped fee structures with milestone tracking
 * PART 2.1: INTRODUCE FEE STRUCTURE PER TERM
 */

import { prisma } from '@/lib/db';
import { FinanceAuditService } from './finance-audit.service';

// Types
interface FeeStructure {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  termId: string;
  termName: string;
  studentType: string;
  totalAmount: number;
  dueDate: Date | null;
  isActive: boolean;
  milestones: Array<{ week: number; percentage: number }> | null;
  lockedAt: Date | null;
  items: FeeItem[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface FeeItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  isOptional: boolean;
  isOneTime: boolean;
  description?: string;
}

interface CreateFeeStructureInput {
  schoolId: string;
  classId: string;
  termId: string;
  studentType: string;
  totalAmount: number;
  dueDate?: Date;
  milestones?: Array<{ week: number; percentage: number }>;
  items: Array<{
    name: string;
    category: string;
    amount: number;
    isOptional: boolean;
    isOneTime: boolean;
    description?: string;
  }>;
  createdBy: string;
}

interface UpdateFeeStructureInput {
  dueDate?: Date;
  isActive?: boolean;
  milestones?: Array<{ week: number; percentage: number }>;
  items?: Array<{
    id?: string;
    name: string;
    category: string;
    amount: number;
    isOptional: boolean;
    isOneTime: boolean;
    description?: string;
  }>;
}

export class EnhancedFeeStructureService {
  /**
   * Create a new fee structure with milestones
   */
  static async create(input: CreateFeeStructureInput): Promise<FeeStructure> {
    // Validate milestones if provided
    if (input.milestones) {
      this.validateMilestones(input.milestones);
    }

    // Calculate total amount from items
    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

    // Create fee structure with milestones
    const feeStructure = await prisma.feeStructure.create({
      data: {
        schoolId: input.schoolId,
        classId: input.classId,
        termId: input.termId,
        studentType: input.studentType,
        totalAmount,
        dueDate: input.dueDate || null,
        isActive: true,
        createdBy: input.createdBy,
        milestones: input.milestones ? JSON.stringify(input.milestones) : null,
        items: {
          create: input.items.map(item => ({
            name: item.name,
            category: item.category,
            amount: item.amount,
            isOptional: item.isOptional,
            isOneTime: item.isOneTime,
            description: item.description || null,
          })),
        },
      },
      include: {
        items: true,
        class: true,
        term: true,
      },
    });

    // Log creation
    await FinanceAuditService.logAction({
      schoolId: input.schoolId,
      userId: input.createdBy,
      action: 'FEE_STRUCTURE_CREATED',
      resourceType: 'FeeStructure',
      resourceId: feeStructure.id,
      newValue: {
        classId: input.classId,
        termId: input.termId,
        studentType: input.studentType,
        totalAmount,
        milestoneCount: input.milestones?.length || 0,
        hasMilestones: !!input.milestones,
      },
    });

    return this.mapToFeeStructure(feeStructure);
  }

  /**
   * Update fee structure - with locking mechanism
   */
  static async update(
    id: string,
    schoolId: string,
    userId: string,
    input: UpdateFeeStructureInput
  ): Promise<FeeStructure> {
    const existing = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
      include: { items: true, class: true, term: true },
    });

    if (!existing) {
      throw new Error('Fee structure not found');
    }

    // Check if structure is locked
    if (existing.lockedAt) {
      throw new Error('Fee structure is locked and cannot be modified');
    }

    const previousValue = {
      totalAmount: existing.totalAmount,
      dueDate: existing.dueDate?.toISOString() || null,
      isActive: existing.isActive,
      milestoneCount: existing.milestones ? JSON.parse(existing.milestones as string).length : 0,
    };

    // Validate milestones if provided
    if (input.milestones) {
      this.validateMilestones(input.milestones);
    }

    // Prepare update data
    const updateData: any = {};

    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.milestones !== undefined) updateData.milestones = JSON.stringify(input.milestones);

    // Handle items update
    if (input.items) {
      // Delete existing items
      await prisma.feeItem.deleteMany({ where: { feeStructureId: id } });

      // Add new items
      updateData.items = {
        create: input.items.map(item => ({
          name: item.name,
          category: item.category,
          amount: item.amount,
          isOptional: item.isOptional,
          isOneTime: item.isOneTime,
          description: item.description || null,
        })),
      };

      // Recalculate total amount
      const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);
      updateData.totalAmount = totalAmount;
    }

    const updated = await prisma.feeStructure.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        class: true,
        term: true,
      },
    });

    // Log update
    await FinanceAuditService.logAction({
      schoolId,
      userId,
      action: 'FEE_STRUCTURE_UPDATED',
      resourceType: 'FeeStructure',
      resourceId: id,
      previousValue,
      newValue: {
        totalAmount: updated.totalAmount,
        dueDate: updated.dueDate?.toISOString() || null,
        isActive: updated.isActive,
        milestoneCount: updated.milestones ? JSON.parse(updated.milestones as string).length : 0,
      },
    });

    return this.mapToFeeStructure(updated);
  }

  /**
   * Lock fee structure to prevent further modifications
   */
  static async lock(id: string, schoolId: string, userId: string): Promise<FeeStructure> {
    const feeStructure = await prisma.feeStructure.update({
      where: { id, schoolId },
      data: {
        lockedAt: new Date(),
      },
      include: {
        items: true,
        class: true,
        term: true,
      },
    });

    // Log locking
    await FinanceAuditService.logAction({
      schoolId,
      userId,
      action: 'FEE_STRUCTURE_LOCKED',
      resourceType: 'FeeStructure',
      resourceId: id,
      newValue: { lockedAt: new Date().toISOString() },
    });

    return this.mapToFeeStructure(feeStructure);
  }

  /**
   * Get fee structure by ID
   */
  static async getById(id: string, schoolId: string): Promise<FeeStructure | null> {
    const feeStructure = await prisma.feeStructure.findFirst({
      where: { id, schoolId },
      include: {
        items: true,
        class: true,
        term: true,
      },
    });

    if (!feeStructure) {
      return null;
    }

    return this.mapToFeeStructure(feeStructure);
  }

  /**
   * Get fee structure by class, term, and student type
   */
  static async getByClassTermType(
    classId: string,
    termId: string,
    studentType: string
  ): Promise<FeeStructure | null> {
    const feeStructure = await prisma.feeStructure.findFirst({
      where: {
        classId,
        termId,
        studentType,
        isActive: true,
      },
      include: {
        items: true,
        class: true,
        term: true,
      },
    });

    if (!feeStructure) {
      return null;
    }

    return this.mapToFeeStructure(feeStructure);
  }

  /**
   * Validate that milestones total 100%
   */
  static validateMilestones(milestones: Array<{ week: number; percentage: number }>): void {
    if (!milestones || milestones.length === 0) {
      throw new Error('Milestones cannot be empty');
    }

    // Validate week numbers are positive integers
    for (const milestone of milestones) {
      if (!Number.isInteger(milestone.week) || milestone.week <= 0) {
        throw new Error(`Invalid week number: ${milestone.week}`);
      }
    }

    // Calculate total percentage
    const totalPercentage = milestones.reduce((sum, m) => sum + m.percentage, 0);
    
    // Allow small floating point differences
    if (Math.abs(totalPercentage - 100) > 0.1) {
      throw new Error(`Milestones must total 100%, but got ${totalPercentage}%`);
    }
  }

  /**
   * Map Prisma fee structure to API type
   */
  static mapToFeeStructure(prismaFeeStructure: any): FeeStructure {
    return {
      id: prismaFeeStructure.id,
      schoolId: prismaFeeStructure.schoolId,
      classId: prismaFeeStructure.classId,
      className: prismaFeeStructure.class.name,
      termId: prismaFeeStructure.termId,
      termName: prismaFeeStructure.term.name,
      studentType: prismaFeeStructure.studentType,
      totalAmount: prismaFeeStructure.totalAmount,
      dueDate: prismaFeeStructure.dueDate,
      isActive: prismaFeeStructure.isActive,
      milestones: prismaFeeStructure.milestones ? JSON.parse(prismaFeeStructure.milestones as string) : null,
      lockedAt: prismaFeeStructure.lockedAt,
      items: prismaFeeStructure.items.map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        amount: item.amount,
        isOptional: item.isOptional,
        isOneTime: item.isOneTime,
        description: item.description || undefined,
      })),
      createdBy: prismaFeeStructure.createdBy,
      createdAt: prismaFeeStructure.createdAt,
      updatedAt: prismaFeeStructure.updatedAt,
    };
  }

  /**
   * Get all fee structures for a term
   */
  static async getByTerm(termId: string, schoolId: string): Promise<FeeStructure[]> {
    const feeStructures = await prisma.feeStructure.findMany({
      where: {
        termId,
        schoolId,
        isActive: true,
      },
      include: {
        items: true,
        class: true,
        term: true,
      },
    });

    return feeStructures.map(this.mapToFeeStructure);
  }
}

export default EnhancedFeeStructureService;