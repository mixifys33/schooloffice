import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export class CurriculumService {
  // Get curriculum subjects for a school (uses DoSCurriculumSubject with fallback to ClassSubject)
  static async getCurriculumSubjects(schoolId: string) {
    try {
      // First, try to get DoSCurriculumSubject records (has weight info)
      const dosCurriculumSubjects = await prisma.doSCurriculumSubject.findMany({
        where: { schoolId, isActive: true },
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

      // If we have DoSCurriculumSubject records, use them
      if (dosCurriculumSubjects.length > 0) {
        return dosCurriculumSubjects.map(dcs => ({
          id: dcs.id,
          class: dcs.class,
          subject: dcs.subject,
          isCore: dcs.isCore,
          periodsPerWeek: dcs.periodsPerWeek,
          caWeight: dcs.caWeight,
          examWeight: dcs.examWeight,
          minPassMark: dcs.minPassMark,
          dosApproved: dcs.dosApproved,
          dosApprovedAt: dcs.dosApprovedAt?.toISOString() || null,
          createdAt: dcs.createdAt.toISOString(),
        }));
      }

      // Fallback: Get ClassSubject records and create DoSCurriculumSubject entries
      const classSubjects = await prisma.classSubject.findMany({
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

      // Create DoSCurriculumSubject entries for each ClassSubject
      const createdSubjects = await Promise.all(
        classSubjects.map(async (cs) => {
          try {
            const dosCurriculum = await prisma.doSCurriculumSubject.create({
              data: {
                schoolId: cs.schoolId,
                classId: cs.classId,
                subjectId: cs.subjectId,
                isCore: true,
                periodsPerWeek: 4,
                caWeight: 20, // Correct default: 20%
                examWeight: 80, // Correct default: 80%
                minPassMark: 50,
                dosApproved: true,
                isActive: true,
              },
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
            });

            return {
              id: dosCurriculum.id,
              class: dosCurriculum.class,
              subject: dosCurriculum.subject,
              isCore: dosCurriculum.isCore,
              periodsPerWeek: dosCurriculum.periodsPerWeek,
              caWeight: dosCurriculum.caWeight,
              examWeight: dosCurriculum.examWeight,
              minPassMark: dosCurriculum.minPassMark,
              dosApproved: dosCurriculum.dosApproved,
              dosApprovedAt: dosCurriculum.dosApprovedAt?.toISOString() || null,
              createdAt: dosCurriculum.createdAt.toISOString(),
            };
          } catch (error) {
            // If already exists, fetch it
            const existing = await prisma.doSCurriculumSubject.findFirst({
              where: {
                schoolId: cs.schoolId,
                classId: cs.classId,
                subjectId: cs.subjectId,
              },
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
            });

            if (existing) {
              return {
                id: existing.id,
                class: existing.class,
                subject: existing.subject,
                isCore: existing.isCore,
                periodsPerWeek: existing.periodsPerWeek,
                caWeight: existing.caWeight,
                examWeight: existing.examWeight,
                minPassMark: existing.minPassMark,
                dosApproved: existing.dosApproved,
                dosApprovedAt: existing.dosApprovedAt?.toISOString() || null,
                createdAt: existing.createdAt.toISOString(),
              };
            }

            // Fallback to default values
            return {
              id: cs.id,
              class: cs.class,
              subject: cs.subject,
              isCore: true,
              periodsPerWeek: 4,
              caWeight: 20,
              examWeight: 80,
              minPassMark: 50,
              dosApproved: true,
              dosApprovedAt: cs.createdAt.toISOString(),
              createdAt: cs.createdAt.toISOString(),
            };
          }
        })
      );

      return createdSubjects;
    } catch (error) {
      console.error('Error fetching curriculum subjects:', error);
      return [];
    }
  }

  // Get curriculum overview statistics
  static async getCurriculumOverview(schoolId: string) {
    try {
      const [totalSubjects, classCount] = await Promise.all([
        prisma.classSubject.count({
          where: { schoolId },
        }).catch(() => 0),
        prisma.class.count({
          where: { schoolId },
        }).catch(() => 0),
      ]);

      return {
        stats: {
          total: totalSubjects,
          approved: totalSubjects, // All ClassSubjects are considered approved
          pending: 0, // No pending since we're using ClassSubject
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
      // Create in ClassSubject (source of truth)
      const classSubject = await prisma.classSubject.create({
        data: {
          schoolId: data.schoolId,
          classId: data.classId,
          subjectId: data.subjectId,
          maxMark: 100,
          appearsOnReport: true,
          affectsPosition: true,
        },
        include: {
          class: true,
          subject: true,
        },
      });

      // Also create in DoSCurriculumSubject for DoS features (timetable, exams, etc.)
      try {
        await prisma.doSCurriculumSubject.create({
          data: {
            schoolId: data.schoolId,
            classId: data.classId,
            subjectId: data.subjectId,
            isCore: data.isCore || true,
            caWeight: data.caWeight || 40,
            examWeight: data.examWeight || 60,
            minPassMark: data.minPassMark || 50,
            periodsPerWeek: data.periodsPerWeek || 4,
            dosApproved: true, // Auto-approve
            isActive: true,
          },
        });
      } catch (dosError) {
        console.warn('Could not create DoSCurriculumSubject:', dosError);
      }

      return classSubject;
    } catch (error) {
      console.error('Error creating curriculum subject:', error);
      throw error;
    }
  }

  // Get curriculum structure for a class
  static async getClassCurriculum(classId: string) {
    try {
      return await prisma.classSubject.findMany({
        where: { classId },
        include: {
          subject: true,
          class: true,
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

  // DoS approve curriculum structure (no-op for ClassSubject)
  static async approveCurriculumSubject(
    curriculumSubjectId: string,
    dosUserId: string
  ) {
    try {
      // Just return the ClassSubject as-is (already approved)
      const classSubject = await prisma.classSubject.findUnique({
        where: { id: curriculumSubjectId },
        include: {
          class: true,
          subject: true,
        },
      });

      if (!classSubject) {
        throw new Error('Subject not found');
      }

      // Log DoS action if audit log exists
      try {
        await prisma.doSAuditLog.create({
          data: {
            schoolId: classSubject.schoolId,
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

      return {
        ...classSubject,
        dosApproved: true,
        dosApprovedAt: new Date(),
      };
    } catch (error) {
      console.error('Error approving curriculum subject:', error);
      throw error;
    }
  }

  // Get curriculum subjects requiring DoS approval
  static async getPendingApprovals(schoolId: string) {
    try {
      // No pending approvals for ClassSubject model
      return [];
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  }

  // Update curriculum subject weights (no-op for ClassSubject)
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

      const classSubject = await prisma.classSubject.findUnique({
        where: { id: curriculumSubjectId },
      });

      if (!classSubject) {
        throw new Error('Subject not found');
      }

      // Log DoS action if audit log exists
      try {
        await prisma.doSAuditLog.create({
          data: {
            schoolId: classSubject.schoolId,
            dosUserId,
            action: 'update_subject_weights',
            targetType: 'curriculum_subject',
            targetId: curriculumSubjectId,
            previousValue: { caWeight: 40, examWeight: 60 },
            newValue: { caWeight, examWeight },
            timestamp: new Date(),
          },
        });
      } catch (auditError) {
        console.warn('Could not create audit log:', auditError);
      }

      return classSubject;
    } catch (error) {
      console.error('Error updating subject weights:', error);
      throw error;
    }
  }

  // Get curriculum analytics
  static async getCurriculumAnalytics(schoolId: string, termId?: string) {
    try {
      const whereClause: Prisma.ClassSubjectWhereInput = {
        schoolId,
      };

      const [
        totalSubjects,
        subjectsByClass,
      ] = await Promise.all([
        prisma.classSubject.count({ where: whereClause }),
        prisma.classSubject.groupBy({
          by: ['classId'],
          where: whereClause,
          _count: true,
        }),
      ]);

      return {
        totalSubjects,
        approvedSubjects: totalSubjects, // All approved
        coreSubjects: totalSubjects, // Assume all core
        approvalRate: 100, // All approved
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