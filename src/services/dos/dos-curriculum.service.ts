/**
 * DoS Curriculum Service
 * 
 * Core service for Director of Studies curriculum management.
 * Handles curriculum structure, subject approval, and academic integrity.
 * 
 * Requirements:
 * - Curriculum subject approval and management
 * - Academic weighting control (20% CA, 80% Exam)
 * - Core subject designation for promotion
 * - DoS approval workflow
 */

import { prisma } from '@/lib/db';
import { DoSAuditService } from './dos-audit.service';
import type { 
  DoSCurriculumSubject, 
  DoSAssessmentType, 
  DoSExamType,
  DoSGradeDescriptor,
  DoSPromotionStatus 
} from '@prisma/client';

export interface CreateCurriculumSubjectInput {
  schoolId: string;
  classId: string;
  subjectId: string;
  isCore: boolean;
  caWeight?: number;
  examWeight?: number;
  minPassMark?: number;
  periodsPerWeek: number;
  practicalPeriods?: number;
  createdBy: string;
}

export interface UpdateCurriculumSubjectInput {
  isCore?: boolean;
  caWeight?: number;
  examWeight?: number;
  minPassMark?: number;
  periodsPerWeek?: number;
  practicalPeriods?: number;
}

export interface DoSApprovalInput {
  dosUserId: string;
  reason?: string;
  ipAddress?: string;
}

export class DoSCurriculumService {
  private auditService = new DoSAuditService();

  /**
   * Create a new curriculum subject for DoS management
   */
  async createCurriculumSubject(input: CreateCurriculumSubjectInput): Promise<DoSCurriculumSubject> {
    // Validate weights sum to 100%
    const caWeight = input.caWeight || 20.0;
    const examWeight = input.examWeight || 80.0;
    
    if (caWeight + examWeight !== 100.0) {
      throw new Error('CA weight and Exam weight must sum to 100%');
    }

    // Get subject details for caching
    const subject = await prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: { name: true, code: true }
    });

    if (!subject) {
      throw new Error('Subject not found');
    }

    const curriculumSubject = await prisma.doSCurriculumSubject.create({
      data: {
        schoolId: input.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        subjectName: subject.name,
        subjectCode: subject.code,
        isCore: input.isCore,
        caWeight,
        examWeight,
        minPassMark: input.minPassMark || 50.0,
        periodsPerWeek: input.periodsPerWeek,
        practicalPeriods: input.practicalPeriods || 0,
        createdBy: input.createdBy
      },
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true, code: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: input.schoolId,
      userId: input.createdBy,
      action: 'CREATE_CURRICULUM_SUBJECT',
      resourceType: 'DoSCurriculumSubject',
      resourceId: curriculumSubject.id,
      resourceName: `${subject.name} - ${curriculumSubject.class.name}`,
      newValue: curriculumSubject
    });

    return curriculumSubject;
  }

  /**
   * Update curriculum subject configuration
   */
  async updateCurriculumSubject(
    id: string, 
    input: UpdateCurriculumSubjectInput,
    updatedBy: string
  ): Promise<DoSCurriculumSubject> {
    const existing = await prisma.doSCurriculumSubject.findUnique({
      where: { id },
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } }
      }
    });

    if (!existing) {
      throw new Error('Curriculum subject not found');
    }

    // Validate weights if provided
    if (input.caWeight !== undefined || input.examWeight !== undefined) {
      const caWeight = input.caWeight ?? existing.caWeight;
      const examWeight = input.examWeight ?? existing.examWeight;
      
      if (caWeight + examWeight !== 100.0) {
        throw new Error('CA weight and Exam weight must sum to 100%');
      }
    }

    const updated = await prisma.doSCurriculumSubject.update({
      where: { id },
      data: {
        ...input,
        // Reset DoS approval if significant changes
        dosApproved: (input.caWeight !== undefined || input.examWeight !== undefined || input.isCore !== undefined) 
          ? false 
          : existing.dosApproved,
        dosApprovedBy: (input.caWeight !== undefined || input.examWeight !== undefined || input.isCore !== undefined)
          ? null
          : existing.dosApprovedBy,
        dosApprovedAt: (input.caWeight !== undefined || input.examWeight !== undefined || input.isCore !== undefined)
          ? null
          : existing.dosApprovedAt
      },
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.schoolId,
      userId: updatedBy,
      action: 'UPDATE_CURRICULUM_SUBJECT',
      resourceType: 'DoSCurriculumSubject',
      resourceId: id,
      resourceName: `${existing.subject.name} - ${existing.class.name}`,
      previousValue: existing,
      newValue: updated
    });

    return updated;
  }

  /**
   * DoS approval of curriculum subject
   */
  async approveCurriculumSubject(
    id: string, 
    approval: DoSApprovalInput
  ): Promise<DoSCurriculumSubject> {
    const existing = await prisma.doSCurriculumSubject.findUnique({
      where: { id },
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } }
      }
    });

    if (!existing) {
      throw new Error('Curriculum subject not found');
    }

    if (existing.dosApproved) {
      throw new Error('Curriculum subject already approved');
    }

    const approved = await prisma.doSCurriculumSubject.update({
      where: { id },
      data: {
        dosApproved: true,
        dosApprovedBy: approval.dosUserId,
        dosApprovedAt: new Date()
      },
      include: {
        school: { select: { name: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.schoolId,
      userId: approval.dosUserId,
      action: 'APPROVE_CURRICULUM_SUBJECT',
      resourceType: 'DoSCurriculumSubject',
      resourceId: id,
      resourceName: `${existing.subject.name} - ${existing.class.name}`,
      reason: approval.reason,
      ipAddress: approval.ipAddress,
      previousValue: existing,
      newValue: approved
    });

    return approved;
  }

  /**
   * Get curriculum subjects for a class
   */
  async getCurriculumSubjectsByClass(
    schoolId: string, 
    classId: string
  ): Promise<DoSCurriculumSubject[]> {
    return prisma.doSCurriculumSubject.findMany({
      where: {
        schoolId,
        classId
      },
      include: {
        subject: {
          select: { name: true, code: true }
        }
      },
      orderBy: [
        { isCore: 'desc' },
        { subject: { name: 'asc' } }
      ]
    });
  }

  /**
   * Get curriculum subjects pending DoS approval
   */
  async getPendingApprovals(schoolId: string): Promise<DoSCurriculumSubject[]> {
    return prisma.doSCurriculumSubject.findMany({
      where: {
        schoolId,
        dosApproved: false
      },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Validate curriculum structure for a class
   */
  async validateCurriculumStructure(
    schoolId: string, 
    classId: string
  ): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const subjects = await this.getCurriculumSubjectsByClass(schoolId, classId);
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for core subjects
    const coreSubjects = subjects.filter(s => s.isCore);
    if (coreSubjects.length === 0) {
      errors.push('No core subjects defined for promotion requirements');
    }

    // Check weight consistency
    for (const subject of subjects) {
      if (subject.caWeight + subject.examWeight !== 100.0) {
        errors.push(`${subject.subjectName}: CA and Exam weights must sum to 100%`);
      }
    }

    // Check for unapproved subjects
    const unapproved = subjects.filter(s => !s.dosApproved);
    if (unapproved.length > 0) {
      warnings.push(`${unapproved.length} subjects pending DoS approval`);
    }

    // Check minimum periods
    const lowPeriods = subjects.filter(s => s.periodsPerWeek < 1);
    if (lowPeriods.length > 0) {
      warnings.push(`${lowPeriods.length} subjects have less than 1 period per week`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get DoS curriculum overview for school
   * Falls back to ClassSubject data if DoSCurriculumSubject is empty
   */
  async getCurriculumOverview(schoolId: string) {
    // First try to get data from DoSCurriculumSubject
    const [
      dosTotalSubjects,
      dosApprovedSubjects,
      dosCoreSubjects,
      dosClasses
    ] = await Promise.all([
      prisma.doSCurriculumSubject.count({
        where: { schoolId }
      }),
      prisma.doSCurriculumSubject.count({
        where: { schoolId, dosApproved: true }
      }),
      prisma.doSCurriculumSubject.count({
        where: { schoolId, isCore: true }
      }),
      prisma.doSCurriculumSubject.groupBy({
        by: ['classId'],
        where: { schoolId },
        _count: { id: true }
      })
    ]);

    // If DoS curriculum data exists, use it
    if (dosTotalSubjects > 0) {
      const approvalRate = dosTotalSubjects > 0 ? (dosApprovedSubjects / dosTotalSubjects) * 100 : 0;

      return {
        totalSubjects: dosTotalSubjects,
        approvedSubjects: dosApprovedSubjects,
        pendingApproval: dosTotalSubjects - dosApprovedSubjects,
        coreSubjects: dosCoreSubjects,
        approvalRate: Math.round(approvalRate * 100) / 100,
        classesWithSubjects: dosClasses.length,
        averageSubjectsPerClass: dosClasses.length > 0 
          ? Math.round((dosTotalSubjects / dosClasses.length) * 100) / 100 
          : 0
      };
    }

    // Fallback to ClassSubject data for schools not yet migrated to DoS system
    console.log('📚 DoS curriculum empty, falling back to ClassSubject data');
    
    const [
      classSubjects,
      classesWithSubjects
    ] = await Promise.all([
      prisma.classSubject.findMany({
        where: {
          class: { schoolId }
        },
        include: {
          class: { select: { id: true, name: true } },
          subject: { select: { name: true, code: true } }
        }
      }),
      prisma.class.findMany({
        where: { 
          schoolId,
          classSubjects: { some: {} }
        },
        select: { id: true, name: true }
      })
    ]);

    const totalSubjects = classSubjects.length;
    // For fallback, assume all subjects are "approved" since they're already assigned
    const approvedSubjects = totalSubjects;
    // Estimate core subjects (Math, English, Sciences)
    const coreSubjectNames = ['Mathematics', 'English Language', 'Biology', 'Chemistry', 'Physics'];
    const coreSubjects = classSubjects.filter(cs => 
      coreSubjectNames.some(core => cs.subject.name.includes(core))
    ).length;

    return {
      totalSubjects,
      approvedSubjects,
      pendingApproval: 0, // No pending approvals in fallback mode
      coreSubjects,
      approvalRate: 100, // All assigned subjects are considered approved
      classesWithSubjects: classesWithSubjects.length,
      averageSubjectsPerClass: classesWithSubjects.length > 0 
        ? Math.round((totalSubjects / classesWithSubjects.length) * 100) / 100 
        : 0
    };
  }

  /**
   * Delete curriculum subject (with validation)
   */
  async deleteCurriculumSubject(
    id: string, 
    deletedBy: string,
    reason?: string
  ): Promise<void> {
    const existing = await prisma.doSCurriculumSubject.findUnique({
      where: { id },
      include: {
        assessmentPlans: { select: { id: true } },
        exams: { select: { id: true } },
        finalScores: { select: { id: true } },
        class: { select: { name: true } },
        subject: { select: { name: true } }
      }
    });

    if (!existing) {
      throw new Error('Curriculum subject not found');
    }

    // Check for dependent records
    if (existing.assessmentPlans.length > 0 || 
        existing.exams.length > 0 || 
        existing.finalScores.length > 0) {
      throw new Error('Cannot delete curriculum subject with existing assessments or results');
    }

    // Audit log before deletion
    await this.auditService.log({
      schoolId: existing.schoolId,
      userId: deletedBy,
      action: 'DELETE_CURRICULUM_SUBJECT',
      resourceType: 'DoSCurriculumSubject',
      resourceId: id,
      resourceName: `${existing.subject.name} - ${existing.class.name}`,
      reason,
      previousValue: existing
    });

    await prisma.doSCurriculumSubject.delete({
      where: { id }
    });
  }
}