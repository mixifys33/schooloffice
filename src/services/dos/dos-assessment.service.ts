/**
 * DoS Assessment Service
 * 
 * Manages continuous assessment (20% component) of the DoS system.
 * Handles assessment plans, individual assessments, and CA completion tracking.
 * 
 * Requirements:
 * - Assessment plan creation and approval
 * - Weight allocation within 20% CA limit
 * - Assessment entry and evidence tracking
 * - DoS oversight and locking
 */

import { prisma } from '@/lib/db';
import { DoSAuditService } from './dos-audit.service';
import type { 
  DoSAssessmentPlan,
  DoSContinuousAssessment,
  DoSAssessmentType 
} from '@prisma/client';

export interface CreateAssessmentPlanInput {
  curriculumSubjectId: string;
  termId: string;
  assessmentType: DoSAssessmentType;
  assessmentName: string;
  maxScore: number;
  weightPercentage: number; // Within the 20% CA allocation
  dueDate: Date;
  instructions?: string;
  evidenceRequired?: boolean;
  createdBy: string;
}

export interface CreateAssessmentInput {
  assessmentPlanId: string;
  studentId: string;
  score?: number;
  evidenceUrl?: string;
  teacherRemarks?: string;
  teacherId: string;
}

export interface UpdateAssessmentInput {
  score?: number;
  evidenceUrl?: string;
  teacherRemarks?: string;
}

export interface DoSApprovalInput {
  dosUserId: string;
  reason?: string;
  ipAddress?: string;
}

export class DoSAssessmentService {
  private auditService = new DoSAuditService();

  /**
   * Create assessment plan for a curriculum subject
   */
  async createAssessmentPlan(input: CreateAssessmentPlanInput): Promise<DoSAssessmentPlan> {
    // Validate weight allocation doesn't exceed 20%
    const existingPlans = await prisma.doSAssessmentPlan.findMany({
      where: {
        curriculumSubjectId: input.curriculumSubjectId,
        termId: input.termId
      },
      select: { weightPercentage: true }
    });

    const totalExistingWeight = existingPlans.reduce((sum, plan) => sum + plan.weightPercentage, 0);
    
    if (totalExistingWeight + input.weightPercentage > 20.0) {
      throw new Error(`Total CA weight would exceed 20%. Current: ${totalExistingWeight}%, Attempting to add: ${input.weightPercentage}%`);
    }

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

    const assessmentPlan = await prisma.doSAssessmentPlan.create({
      data: {
        curriculumSubjectId: input.curriculumSubjectId,
        termId: input.termId,
        assessmentType: input.assessmentType,
        assessmentName: input.assessmentName,
        maxScore: input.maxScore,
        weightPercentage: input.weightPercentage,
        dueDate: input.dueDate,
        instructions: input.instructions,
        evidenceRequired: input.evidenceRequired || false,
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
      action: 'CREATE_ASSESSMENT_PLAN',
      resourceType: 'DoSAssessmentPlan',
      resourceId: assessmentPlan.id,
      resourceName: `${input.assessmentName} - ${curriculumSubject.subject.name} - ${curriculumSubject.class.name}`,
      newValue: assessmentPlan
    });

    return assessmentPlan;
  }

  /**
   * DoS approval of assessment plan
   */
  async approveAssessmentPlan(
    id: string,
    approval: DoSApprovalInput
  ): Promise<DoSAssessmentPlan> {
    const existing = await prisma.doSAssessmentPlan.findUnique({
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
      throw new Error('Assessment plan not found');
    }

    if (existing.dosApproved) {
      throw new Error('Assessment plan already approved');
    }

    const approved = await prisma.doSAssessmentPlan.update({
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
      action: 'APPROVE_ASSESSMENT_PLAN',
      resourceType: 'DoSAssessmentPlan',
      resourceId: id,
      resourceName: `${existing.assessmentName} - ${existing.curriculumSubject.subject.name}`,
      reason: approval.reason,
      ipAddress: approval.ipAddress,
      previousValue: existing,
      newValue: approved
    });

    return approved;
  }

  /**
   * Lock assessment plan (prevents further changes)
   */
  async lockAssessmentPlan(
    id: string,
    lockedBy: string,
    reason?: string
  ): Promise<DoSAssessmentPlan> {
    const existing = await prisma.doSAssessmentPlan.findUnique({
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
      throw new Error('Assessment plan not found');
    }

    if (existing.isLocked) {
      throw new Error('Assessment plan already locked');
    }

    const locked = await prisma.doSAssessmentPlan.update({
      where: { id },
      data: { isLocked: true },
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
      userId: lockedBy,
      action: 'LOCK_ASSESSMENT_PLAN',
      resourceType: 'DoSAssessmentPlan',
      resourceId: id,
      resourceName: `${existing.assessmentName} - ${existing.curriculumSubject.subject.name}`,
      reason,
      previousValue: existing,
      newValue: locked
    });

    return locked;
  }

  /**
   * Create or update continuous assessment for a student
   */
  async createOrUpdateAssessment(input: CreateAssessmentInput): Promise<DoSContinuousAssessment> {
    // Get assessment plan details
    const assessmentPlan = await prisma.doSAssessmentPlan.findUnique({
      where: { id: input.assessmentPlanId },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        }
      }
    });

    if (!assessmentPlan) {
      throw new Error('Assessment plan not found');
    }

    if (assessmentPlan.isLocked) {
      throw new Error('Cannot modify assessment - plan is locked');
    }

    // Validate score if provided
    if (input.score !== undefined && input.score > assessmentPlan.maxScore) {
      throw new Error(`Score cannot exceed maximum score of ${assessmentPlan.maxScore}`);
    }

    // Calculate percentage if score provided
    const percentage = input.score !== undefined 
      ? (input.score / assessmentPlan.maxScore) * 100 
      : undefined;

    // Check if assessment already exists
    const existing = await prisma.doSContinuousAssessment.findUnique({
      where: {
        assessmentPlanId_studentId: {
          assessmentPlanId: input.assessmentPlanId,
          studentId: input.studentId
        }
      }
    });

    let assessment: DoSContinuousAssessment;
    
    if (existing) {
      // Update existing assessment
      assessment = await prisma.doSContinuousAssessment.update({
        where: { id: existing.id },
        data: {
          score: input.score,
          maxScore: assessmentPlan.maxScore,
          percentage,
          evidenceUrl: input.evidenceUrl,
          teacherRemarks: input.teacherRemarks,
          submittedAt: input.score !== undefined ? new Date() : existing.submittedAt,
          teacherId: input.teacherId
        },
        include: {
          assessmentPlan: {
            include: {
              curriculumSubject: {
                include: {
                  subject: { select: { name: true } },
                  class: { select: { name: true } }
                }
              }
            }
          },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } }
        }
      });

      // Audit log
      await this.auditService.log({
        schoolId: assessmentPlan.curriculumSubject.schoolId,
        userId: input.teacherId,
        action: 'UPDATE_CONTINUOUS_ASSESSMENT',
        resourceType: 'DoSContinuousAssessment',
        resourceId: assessment.id,
        resourceName: `${assessmentPlan.assessmentName} - ${assessment.student.admissionNumber}`,
        previousValue: existing,
        newValue: assessment
      });
    } else {
      // Create new assessment
      assessment = await prisma.doSContinuousAssessment.create({
        data: {
          assessmentPlanId: input.assessmentPlanId,
          studentId: input.studentId,
          score: input.score,
          maxScore: assessmentPlan.maxScore,
          percentage,
          evidenceUrl: input.evidenceUrl,
          teacherRemarks: input.teacherRemarks,
          submittedAt: input.score !== undefined ? new Date() : undefined,
          teacherId: input.teacherId
        },
        include: {
          assessmentPlan: {
            include: {
              curriculumSubject: {
                include: {
                  subject: { select: { name: true } },
                  class: { select: { name: true } }
                }
              }
            }
          },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } }
        }
      });

      // Audit log
      await this.auditService.log({
        schoolId: assessmentPlan.curriculumSubject.schoolId,
        userId: input.teacherId,
        action: 'CREATE_CONTINUOUS_ASSESSMENT',
        resourceType: 'DoSContinuousAssessment',
        resourceId: assessment.id,
        resourceName: `${assessmentPlan.assessmentName} - ${assessment.student.admissionNumber}`,
        newValue: assessment
      });
    }

    return assessment;
  }

  /**
   * Get assessment plans for a curriculum subject and term
   */
  async getAssessmentPlans(
    curriculumSubjectId: string,
    termId: string
  ): Promise<DoSAssessmentPlan[]> {
    return prisma.doSAssessmentPlan.findMany({
      where: {
        curriculumSubjectId,
        termId
      },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        assessments: {
          select: {
            id: true,
            studentId: true,
            score: true,
            submittedAt: true
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  /**
   * Get continuous assessments for a student in a term
   */
  async getStudentAssessments(
    studentId: string,
    termId: string,
    curriculumSubjectId?: string
  ): Promise<DoSContinuousAssessment[]> {
    const where: any = {
      studentId,
      assessmentPlan: { termId }
    };

    if (curriculumSubjectId) {
      where.assessmentPlan.curriculumSubjectId = curriculumSubjectId;
    }

    return prisma.doSContinuousAssessment.findMany({
      where,
      include: {
        assessmentPlan: {
          include: {
            curriculumSubject: {
              include: {
                subject: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: {
        assessmentPlan: { dueDate: 'asc' }
      }
    });
  }

  /**
   * Get CA completion report for DoS monitoring
   */
  async getCACompletionReport(
    schoolId: string,
    termId: string,
    classId?: string
  ) {
    const where: any = {
      curriculumSubject: { schoolId },
      termId
    };

    if (classId) {
      where.curriculumSubject.classId = classId;
    }

    const assessmentPlans = await prisma.doSAssessmentPlan.findMany({
      where,
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        assessments: {
          select: {
            id: true,
            score: true,
            submittedAt: true
          }
        }
      }
    });

    const report = assessmentPlans.map(plan => {
      const totalAssessments = plan.assessments.length;
      const completedAssessments = plan.assessments.filter(a => a.score !== null).length;
      const submittedAssessments = plan.assessments.filter(a => a.submittedAt !== null).length;
      
      return {
        assessmentPlanId: plan.id,
        assessmentName: plan.assessmentName,
        subjectName: plan.curriculumSubject.subject.name,
        className: plan.curriculumSubject.class.name,
        dueDate: plan.dueDate,
        weightPercentage: plan.weightPercentage,
        totalAssessments,
        completedAssessments,
        submittedAssessments,
        completionRate: totalAssessments > 0 ? (completedAssessments / totalAssessments) * 100 : 0,
        isOverdue: plan.dueDate < new Date() && completedAssessments < totalAssessments,
        dosApproved: plan.dosApproved,
        isLocked: plan.isLocked
      };
    });

    return {
      assessmentPlans: report,
      summary: {
        totalPlans: report.length,
        approvedPlans: report.filter(p => p.dosApproved).length,
        lockedPlans: report.filter(p => p.isLocked).length,
        overduePlans: report.filter(p => p.isOverdue).length,
        averageCompletion: report.length > 0 
          ? report.reduce((sum, p) => sum + p.completionRate, 0) / report.length 
          : 0
      }
    };
  }

  /**
   * Calculate CA total for a student in a subject
   */
  async calculateCATotal(
    studentId: string,
    curriculumSubjectId: string,
    termId: string
  ): Promise<{
    caScore: number;
    maxCAScore: number;
    caPercentage: number;
    scaledCAScore: number; // Scaled to 20%
    assessmentBreakdown: Array<{
      assessmentName: string;
      score: number | null;
      maxScore: number;
      weight: number;
      weightedScore: number;
    }>;
  }> {
    const assessments = await prisma.doSContinuousAssessment.findMany({
      where: {
        studentId,
        assessmentPlan: {
          curriculumSubjectId,
          termId
        }
      },
      include: {
        assessmentPlan: {
          select: {
            assessmentName: true,
            maxScore: true,
            weightPercentage: true
          }
        }
      }
    });

    let totalWeightedScore = 0;
    let totalWeight = 0;
    
    const assessmentBreakdown = assessments.map(assessment => {
      const score = assessment.score || 0;
      const maxScore = assessment.assessmentPlan.maxScore;
      const weight = assessment.assessmentPlan.weightPercentage;
      const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
      const weightedScore = (percentage * weight) / 100;

      totalWeightedScore += weightedScore;
      totalWeight += weight;

      return {
        assessmentName: assessment.assessmentPlan.assessmentName,
        score: assessment.score,
        maxScore,
        weight,
        weightedScore
      };
    });

    // CA score out of the total weight allocated
    const caScore = totalWeightedScore;
    const maxCAScore = totalWeight;
    const caPercentage = maxCAScore > 0 ? (caScore / maxCAScore) * 100 : 0;
    
    // Scale to 20% (standard CA weight)
    const scaledCAScore = (caPercentage * 20) / 100;

    return {
      caScore,
      maxCAScore,
      caPercentage,
      scaledCAScore,
      assessmentBreakdown
    };
  }

  /**
   * Get teacher assessment behavior report (DoS monitoring)
   */
  async getTeacherAssessmentReport(
    schoolId: string,
    termId: string,
    teacherId?: string
  ) {
    const where: any = {
      assessmentPlan: {
        curriculumSubject: { schoolId },
        termId
      }
    };

    if (teacherId) {
      where.teacherId = teacherId;
    }

    const assessments = await prisma.doSContinuousAssessment.findMany({
      where,
      include: {
        assessmentPlan: {
          include: {
            curriculumSubject: {
              include: {
                subject: { select: { name: true } },
                class: { select: { name: true } }
              }
            }
          }
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Group by teacher
    const teacherStats = assessments.reduce((acc, assessment) => {
      const teacherId = assessment.teacherId;
      
      if (!acc[teacherId]) {
        acc[teacherId] = {
          teacherId,
          teacherName: `${assessment.teacher.firstName} ${assessment.teacher.lastName}`,
          totalAssessments: 0,
          completedAssessments: 0,
          onTimeSubmissions: 0,
          lateSubmissions: 0,
          subjects: new Set(),
          classes: new Set()
        };
      }

      const stats = acc[teacherId];
      stats.totalAssessments++;
      
      if (assessment.score !== null) {
        stats.completedAssessments++;
      }

      if (assessment.submittedAt) {
        if (assessment.submittedAt <= assessment.assessmentPlan.dueDate) {
          stats.onTimeSubmissions++;
        } else {
          stats.lateSubmissions++;
        }
      }

      stats.subjects.add(assessment.assessmentPlan.curriculumSubject.subject.name);
      stats.classes.add(assessment.assessmentPlan.curriculumSubject.class.name);

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and calculate rates
    const teacherReport = Object.values(teacherStats).map((stats: any) => ({
      teacherId: stats.teacherId,
      teacherName: stats.teacherName,
      totalAssessments: stats.totalAssessments,
      completedAssessments: stats.completedAssessments,
      completionRate: stats.totalAssessments > 0 
        ? (stats.completedAssessments / stats.totalAssessments) * 100 
        : 0,
      onTimeSubmissions: stats.onTimeSubmissions,
      lateSubmissions: stats.lateSubmissions,
      onTimeRate: (stats.onTimeSubmissions + stats.lateSubmissions) > 0
        ? (stats.onTimeSubmissions / (stats.onTimeSubmissions + stats.lateSubmissions)) * 100
        : 0,
      subjectCount: stats.subjects.size,
      classCount: stats.classes.size
    }));

    return {
      teachers: teacherReport.sort((a, b) => b.completionRate - a.completionRate),
      summary: {
        totalTeachers: teacherReport.length,
        averageCompletionRate: teacherReport.length > 0
          ? teacherReport.reduce((sum, t) => sum + t.completionRate, 0) / teacherReport.length
          : 0,
        teachersUnderAssessing: teacherReport.filter(t => t.completionRate < 50).length,
        teachersOverAssessing: teacherReport.filter(t => t.completionRate > 90).length
      }
    };
  }
}

// Export singleton instance
export const dosAssessmentService = new DoSAssessmentService();
