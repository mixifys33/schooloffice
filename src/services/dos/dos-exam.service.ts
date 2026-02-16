/**
 * DoS Exam Service
 * 
 * Manages examinations (80% component) of the DoS system.
 * Handles exam creation, result entry, moderation, and DoS approval.
 * 
 * Requirements:
 * - Exam creation and scheduling
 * - Result entry and validation
 * - Moderation application
 * - DoS approval and locking
 */

import { prisma } from '@/lib/db';
import { DoSAuditService } from './dos-audit.service';
import type { 
  DoSExam,
  DoSExamResult,
  DoSExamType 
} from '@prisma/client';

export interface CreateExamInput {
  curriculumSubjectId: string;
  termId: string;
  examType: DoSExamType;
  examName: string;
  maxScore: number;
  examDate: Date;
  durationMinutes?: number;
  instructions?: string;
  createdBy: string;
}

export interface CreateExamResultInput {
  examId: string;
  studentId: string;
  score?: number;
  isAbsent?: boolean;
  enteredBy: string;
}

export interface UpdateExamResultInput {
  score?: number;
  isAbsent?: boolean;
}

export interface ApplyModerationInput {
  examId: string;
  moderationFactor: number; // Multiplier (e.g., 1.1 for 10% increase)
  appliedBy: string;
  reason: string;
}

export interface DoSApprovalInput {
  dosUserId: string;
  reason?: string;
  ipAddress?: string;
}

export class DoSExamService {
  private auditService = new DoSAuditService();

  /**
   * Create exam for a curriculum subject
   */
  async createExam(input: CreateExamInput): Promise<DoSExam> {
    // Get curriculum subject details
    const curriculumSubject = await prisma.doSCurriculumSubject.findUnique({
      where: { id: input.curriculumSubjectId },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } }
      }
    });

    if (!curriculumSubject) {
      throw new Error('Curriculum subject not found');
    }

    // Check for duplicate exam type in same term
    const existingExam = await prisma.doSExam.findFirst({
      where: {
        curriculumSubjectId: input.curriculumSubjectId,
        termId: input.termId,
        examType: input.examType
      }
    });

    if (existingExam) {
      throw new Error(`${input.examType} exam already exists for this subject in this term`);
    }

    const exam = await prisma.doSExam.create({
      data: {
        curriculumSubjectId: input.curriculumSubjectId,
        termId: input.termId,
        examType: input.examType,
        examName: input.examName,
        maxScore: input.maxScore,
        examDate: input.examDate,
        durationMinutes: input.durationMinutes,
        instructions: input.instructions,
        createdBy: input.createdBy
      },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        term: { select: { name: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: curriculumSubject.schoolId,
      userId: input.createdBy,
      action: 'CREATE_EXAM',
      resource: "DoSExam",
      resourceId: exam.id,
      resourceName: `${input.examName} - ${curriculumSubject.subject.name} - ${curriculumSubject.class.name}`,
      newValue: exam
    });

    return exam;
  }

  /**
   * DoS approval of exam
   */
  async approveExam(
    id: string,
    approval: DoSApprovalInput
  ): Promise<DoSExam> {
    const existing = await prisma.doSExam.findUnique({
      where: { id },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        }
      }
    });

    if (!existing) {
      throw new Error('Exam not found');
    }

    if (existing.dosApproved) {
      throw new Error('Exam already approved');
    }

    const approved = await prisma.doSExam.update({
      where: { id },
      data: {
        dosApproved: true,
        dosApprovedBy: approval.dosUserId,
        dosApprovedAt: new Date()
      },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.curriculumSubject.schoolId,
      userId: approval.dosUserId,
      action: 'APPROVE_EXAM',
      resource: "DoSExam",
      resourceId: id,
      resourceName: `${existing.examName} - ${existing.curriculumSubject.subject.name}`,
      reason: approval.reason,
      ipAddress: approval.ipAddress,
      previousValue: existing,
      newValue: approved
    });

    return approved;
  }

  /**
   * Get exams for a school with optional filters
   */
  async getExams(filters: {
    schoolId: string;
    termId?: string;
    examType?: DoSExamType;
    classId?: string;
  }): Promise<DoSExam[]> {
    const where: any = {
      curriculumSubject: {
        schoolId: filters.schoolId
      }
    };

    if (filters.termId) {
      where.termId = filters.termId;
    }

    if (filters.examType) {
      where.examType = filters.examType;
    }

    if (filters.classId) {
      where.curriculumSubject.classId = filters.classId;
    }

    return prisma.doSExam.findMany({
      where,
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        examResults: {
          select: {
            id: true,
            studentId: true,
            score: true,
            isAbsent: true,
            enteredAt: true
          }
        }
      },
      orderBy: { examDate: 'asc' }
    });
  }
}

// Export singleton instance
export const dosExamService = new DoSExamService();