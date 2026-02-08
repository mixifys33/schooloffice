import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export class CurriculumService {
  // Get curriculum subjects for a school
  static async getCurriculumSubjects(schoolId: string) {
    try {
      // Check if the model exists by trying a simple query first
      const curriculumSubjects = await prisma.curriculumSubject.findMany({
        where: { schoolId },
        include: {
          class: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          { class: { name: 'asc' } },
          { subject: { name: 'asc' } },
        ],
      });

      return curriculumSubjects;
    } catch (error) {
      console.error('Error fetching curriculum subjects:', error);
      // Return empty array with proper structure for fallback
      return [];
    }
  }

  // Get curriculum overview statistics
  static async getCurriculumOverview(schoolId: string) {
    try {
      const [totalSubjects, approvedSubjects, pendingSubjects, classCount] = await Promise.all([
        prisma.curriculumSubject.count({
          where: { schoolId },
        }).catch(() => 0),
        prisma.curriculumSubject.count({
          where: { schoolId, dosApproved: true },
        }).catch(() => 0),
        prisma.curriculumSubject.count({
          where: { schoolId, dosApproved: false },
        }).catch(() => 0),
        prisma.class.count({
          where: { schoolId },
        }).catch(() => 0),
      ]);

      return {
        stats: {
          total: totalSubjects,
          approved: approvedSubjects,
          pending: pendingSubjects,
        },
        classCount,
      };
    } catch (error) {
      console.error('Error fetching curriculum overview:', error);
      return {
        stats: {
          total: 0,
          approved: 0,
          pending: 0,
        },
        classCount: 0,
      };
    }
  }

  // Create curriculum subject structure
  static async createCurriculumSubject(data: {
    schoolId: string;
    classId: string;
    subjectId: string;
    isCore?: boolean;
    caWeight?: number;
    examWeight?: number;
    minPassMark?: number;
    periodsPerWeek?: number;
  }) {
    try {
      // Validate weights sum to 100%
      const caWeight = data.caWeight || 20;
      const examWeight = data.examWeight || 80;
      
      if (caWeight + examWeight !== 100) {
        throw new Error('CA and Exam weights must sum to 100%');
      }

      return await prisma.curriculumSubject.create({
        data: {
          schoolId: data.schoolId,
          classId: data.classId,
          subjectId: data.subjectId,
          isCore: data.isCore || false,
          caWeight,
          examWeight,
          minPassMark: data.minPassMark || 50,
          periodsPerWeek: data.periodsPerWeek || 1,
        },
        include: {
          class: true,
          subject: true,
        },
      });
    } catch (error) {
      console.error('Error creating curriculum subject:', error);
      throw error;
    }
  }

  // Get curriculum structure for a class
  static async getClassCurriculum(classId: string) {
    try {
      return await prisma.curriculumSubject.findMany({
        where: { classId },
        include: {
          subject: true,
          class: true,
          assessmentPlans: {
            include: {
              assessments: true,
            },
          },
        },
        orderBy: {
          subject: {
            name: 'asc',
          },
        },
      });
    } catch (error) {
      console.error('Error fetching class curriculum:', error);
      return [];
    }
  }

  // DoS approve curriculum structure
  static async approveCurriculumSubject(
    curriculumSubjectId: string,
    dosUserId: string
  ) {
    try {
      const updated = await prisma.curriculumSubject.update({
        where: { id: curriculumSubjectId },
        data: {
          dosApproved: true,
          dosApprovedBy: dosUserId,
          dosApprovedAt: new Date(),
        },
      });

      // Log DoS action if audit log exists
      try {
        await prisma.doSAuditLog.create({
          data: {
            schoolId: updated.schoolId,
            dosUserId,
            action: 'approve_curriculum_subject',
            targetType: 'curriculum_subject',
            targetId: curriculumSubjectId,
            newValue: { dosApproved: true },
            timestamp: new Date(),
          },
        });
      } catch (auditError) {
        console.warn('Could not create audit log:', auditError);
      }

      return updated;
    } catch (error) {
      console.error('Error approving curriculum subject:', error);
      throw error;
    }
  }

  // Get curriculum subjects requiring DoS approval
  static async getPendingApprovals(schoolId: string) {
    try {
      return await prisma.curriculumSubject.findMany({
        where: {
          schoolId,
          dosApproved: false,
        },
        include: {
          class: true,
          subject: true,
        },
      });
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  }

  // Update curriculum subject weights
  static async updateSubjectWeights(
    curriculumSubjectId: string,
    caWeight: number,
    examWeight: number,
    dosUserId: string
  ) {
    try {
      if (caWeight + examWeight !== 100) {
        throw new Error('CA and Exam weights must sum to 100%');
      }

      const previous = await prisma.curriculumSubject.findUnique({
        where: { id: curriculumSubjectId },
      });

      const updated = await prisma.curriculumSubject.update({
        where: { id: curriculumSubjectId },
        data: {
          caWeight,
          examWeight,
          dosApproved: false, // Requires re-approval
        },
      });

      // Log DoS action if audit log exists
      try {
        await prisma.doSAuditLog.create({
          data: {
            schoolId: updated.schoolId,
            dosUserId,
            action: 'update_subject_weights',
            targetType: 'curriculum_subject',
            targetId: curriculumSubjectId,
            previousValue: {
              caWeight: previous?.caWeight,
              examWeight: previous?.examWeight,
            },
            newValue: { caWeight, examWeight },
            timestamp: new Date(),
          },
        });
      } catch (auditError) {
        console.warn('Could not create audit log:', auditError);
      }

      return updated;
    } catch (error) {
      console.error('Error updating subject weights:', error);
      throw error;
    }
  }

  // Get curriculum analytics
  static async getCurriculumAnalytics(schoolId: string, termId?: string) {
    try {
      const whereClause: Prisma.CurriculumSubjectWhereInput = {
        schoolId,
      };

      const [
        totalSubjects,
        approvedSubjects,
        coreSubjects,
        subjectsByClass,
      ] = await Promise.all([
        prisma.curriculumSubject.count({ where: whereClause }),
        prisma.curriculumSubject.count({
          where: { ...whereClause, dosApproved: true },
        }),
        prisma.curriculumSubject.count({
          where: { ...whereClause, isCore: true },
        }),
        prisma.curriculumSubject.groupBy({
          by: ['classId'],
          where: whereClause,
          _count: true,
        }),
      ]);

      return {
        totalSubjects,
        approvedSubjects,
        coreSubjects,
        approvalRate: totalSubjects > 0 ? (approvedSubjects / totalSubjects) * 100 : 0,
        subjectsByClass,
      };
    } catch (error) {
      console.error('Error fetching curriculum analytics:', error);
      return {
        totalSubjects: 0,
        approvedSubjects: 0,
        coreSubjects: 0,
        approvalRate: 0,
        subjectsByClass: [],
      };
    }
  }
}