import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schemas
const CreateDoSExamSchema = z.object({
  curriculumSubjectId: z.string(),
  termId: z.string(),
  examType: z.enum(['MID_TERM', 'END_TERM', 'END_YEAR', 'MOCK']),
  examName: z.string(),
  maxScore: z.number().min(1).max(100),
  examDate: z.date(),
  durationMinutes: z.number().min(30).max(300).optional(),
  createdBy: z.string(),
});

const EnterExamResultSchema = z.object({
  dosExamId: z.string(),
  studentId: z.string(),
  score: z.number().min(0).optional(),
  isAbsent: z.boolean().default(false),
  enteredBy: z.string(),
});

const ApplyModerationSchema = z.object({
  dosExamId: z.string(),
  moderationFactor: z.number().min(0.5).max(2.0), // 50% to 200% moderation
  reason: z.string(),
  dosUserId: z.string(),
});

export class ExamService {
  /**
   * Create DoS exam (80% stream)
   */
  static async createDoSExam(data: z.infer<typeof CreateDoSExamSchema>) {
    const validatedData = CreateDoSExamSchema.parse(data);

    // Check if exam already exists for this subject and term
    const existing = await prisma.doSExam.findFirst({
      where: {
        curriculumSubjectId: validatedData.curriculumSubjectId,
        termId: validatedData.termId,
        examType: validatedData.examType,
      },
    });

    if (existing) {
      throw new Error(`${validatedData.examType} exam already exists for this subject and term`);
    }

    return await prisma.doSExam.create({
      data: validatedData,
      include: {
        curriculumSubject: {
          include: {
            subject: true,
            class: true,
          },
        },
        term: true,
      },
    });
  }

  /**
   * Get exams for a subject and term
   */
  static async getDoSExams(curriculumSubjectId: string, termId?: string) {
    const whereClause: any = { curriculumSubjectId };
    if (termId) {
      whereClause.termId = termId;
    }

    return await prisma.doSExam.findMany({
      where: whereClause,
      include: {
        curriculumSubject: {
          include: {
            subject: true,
            class: true,
          },
        },
        term: true,
        examResults: {
          include: {
            student: true,
          },
        },
      },
      orderBy: {
        examDate: 'asc',
      },
    });
  }

  /**
   * Enter exam result
   */
  static async enterExamResult(data: z.infer<typeof EnterExamResultSchema>) {
    const validatedData = EnterExamResultSchema.parse(data);

    // Verify exam exists and is not locked
    const dosExam = await prisma.doSExam.findUnique({
      where: { id: validatedData.dosExamId },
    });

    if (!dosExam) {
      throw new Error('Exam not found');
    }

    if (dosExam.isLocked) {
      throw new Error('Exam is locked and cannot be modified');
    }

    // Validate score against max score (if not absent)
    if (!validatedData.isAbsent && validatedData.score !== undefined) {
      if (validatedData.score > dosExam.maxScore) {
        throw new Error(`Score cannot exceed maximum score of ${dosExam.maxScore}`);
      }
    }

    return await prisma.doSExamResult.upsert({
      where: {
        dosExamId_studentId: {
          dosExamId: validatedData.dosExamId,
          studentId: validatedData.studentId,
        },
      },
      update: {
        score: validatedData.isAbsent ? null : validatedData.score,
        isAbsent: validatedData.isAbsent,
        enteredAt: new Date(),
      },
      create: {
        ...validatedData,
        score: validatedData.isAbsent ? null : validatedData.score,
        enteredAt: new Date(),
      },
      include: {
        dosExam: true,
        student: true,
        staff: true,
      },
    });
  }

  /**
   * Apply moderation to exam results (DoS action)
   */
  static async applyModeration(data: z.infer<typeof ApplyModerationSchema>) {
    const validatedData = ApplyModerationSchema.parse(data);

    // Verify DoS permissions
    const user = await prisma.user.findFirst({
      where: {
        id: validatedData.dosUserId,
        roles: { has: 'DOS' },
      },
    });

    if (!user) {
      throw new Error('Unauthorized: DoS role required');
    }

    // Get exam and results
    const dosExam = await prisma.doSExam.findUnique({
      where: { id: validatedData.dosExamId },
      include: {
        examResults: true,
      },
    });

    if (!dosExam) {
      throw new Error('Exam not found');
    }

    if (dosExam.isLocked) {
      throw new Error('Cannot apply moderation to locked exam');
    }

    // Apply moderation to all results
    const moderatedResults = [];
    for (const result of dosExam.examResults) {
      if (result.score !== null && !result.isAbsent) {
        const moderatedScore = Math.min(
          Math.round(result.score * validatedData.moderationFactor),
          dosExam.maxScore
        );

        const updated = await prisma.doSExamResult.update({
          where: { id: result.id },
          data: { score: moderatedScore },
        });

        moderatedResults.push(updated);
      }
    }

    // Update exam with moderation info
    const updatedExam = await prisma.doSExam.update({
      where: { id: validatedData.dosExamId },
      data: {
        moderationApplied: true,
        moderationFactor: validatedData.moderationFactor,
      },
    });

    // Log DoS action
    await this.logDoSAction({
      schoolId: user.schoolId!,
      userId: validatedData.dosUserId,
      action: 'APPLY_EXAM_MODERATION',
      resourceType: 'DoSExam',
      resourceId: validatedData.dosExamId,
      newValue: {
        moderationApplied: true,
        moderationFactor: validatedData.moderationFactor,
      },
      reason: validatedData.reason,
    });

    return {
      exam: updatedExam,
      moderatedResults,
      affectedStudents: moderatedResults.length,
    };
  }

  /**
   * Lock exam (DoS action)
   */
  static async lockExam(dosExamId: string, dosUserId: string, schoolId: string) {
    // Verify DoS permissions
    const user = await prisma.user.findFirst({
      where: {
        id: dosUserId,
        schoolId,
        roles: { has: 'DOS' },
      },
    });

    if (!user) {
      throw new Error('Unauthorized: DoS role required');
    }

    const updated = await prisma.doSExam.update({
      where: { id: dosExamId },
      data: { isLocked: true },
    });

    // Log DoS action
    await this.logDoSAction({
      schoolId,
      userId: dosUserId,
      action: 'LOCK_EXAM',
      resourceType: 'DoSExam',
      resourceId: dosExamId,
      newValue: { isLocked: true },
    });

    return updated;
  }

  /**
   * Approve exam (DoS action)
   */
  static async approveExam(dosExamId: string, dosUserId: string, schoolId: string) {
    // Verify DoS permissions
    const user = await prisma.user.findFirst({
      where: {
        id: dosUserId,
        schoolId,
        roles: { has: 'DOS' },
      },
    });

    if (!user) {
      throw new Error('Unauthorized: DoS role required');
    }

    const updated = await prisma.doSExam.update({
      where: { id: dosExamId },
      data: {
        dosApproved: true,
        dosApprovedBy: dosUserId,
        dosApprovedAt: new Date(),
      },
    });

    // Log DoS action
    await this.logDoSAction({
      schoolId,
      userId: dosUserId,
      action: 'APPROVE_EXAM',
      resourceType: 'DoSExam',
      resourceId: dosExamId,
      newValue: { dosApproved: true },
    });

    return updated;
  }

  /**
   * Get exam monitoring dashboard for DoS
   */
  static async getExamMonitoring(schoolId: string, termId?: string) {
    const whereClause: any = {
      curriculumSubject: { schoolId },
    };

    if (termId) {
      whereClause.termId = termId;
    }

    const exams = await prisma.doSExam.findMany({
      where: whereClause,
      include: {
        curriculumSubject: {
          include: {
            subject: true,
            class: true,
          },
        },
        examResults: true,
        term: true,
      },
    });

    // Calculate completion and statistics
    const monitoring = exams.map(exam => {
      const results = exam.examResults;
      const totalStudents = results.length;
      const completedResults = results.filter(r => r.score !== null || r.isAbsent).length;
      const absentCount = results.filter(r => r.isAbsent).length;
      const scores = results.filter(r => r.score !== null).map(r => r.score!);
      
      const stats = {
        average: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        highest: scores.length > 0 ? Math.max(...scores) : 0,
        lowest: scores.length > 0 ? Math.min(...scores) : 0,
        passCount: scores.filter(s => s >= (exam.maxScore * 0.5)).length, // Assuming 50% pass mark
      };

      return {
        ...exam,
        completionRate: totalStudents > 0 ? (completedResults / totalStudents) * 100 : 0,
        totalStudents,
        completedResults,
        absentCount,
        stats,
        isOverdue: new Date() > exam.examDate && !exam.isLocked,
      };
    });

    return monitoring;
  }

  /**
   * Get exam analytics for DoS review
   */
  static async getExamAnalytics(schoolId: string, termId: string) {
    const exams = await prisma.doSExam.findMany({
      where: {
        curriculumSubject: { schoolId },
        termId,
      },
      include: {
        curriculumSubject: {
          include: {
            subject: true,
            class: true,
          },
        },
        examResults: {
          include: {
            student: true,
          },
        },
      },
    });

    // Detect anomalies and patterns
    const analytics = {
      totalExams: exams.length,
      completedExams: exams.filter(e => e.isLocked).length,
      pendingApproval: exams.filter(e => !e.dosApproved).length,
      anomalies: [] as any[],
      subjectPerformance: [] as any[],
    };

    for (const exam of exams) {
      const scores = exam.examResults
        .filter(r => r.score !== null && !r.isAbsent)
        .map(r => r.score!);

      if (scores.length > 0) {
        const average = scores.reduce((a, b) => a + b, 0) / scores.length;
        const passRate = scores.filter(s => s >= (exam.maxScore * 0.5)).length / scores.length * 100;

        // Detect anomalies
        if (average < exam.maxScore * 0.3) {
          analytics.anomalies.push({
            type: 'LOW_AVERAGE',
            exam: exam,
            average,
            message: `Very low average score: ${average.toFixed(1)}/${exam.maxScore}`,
          });
        }

        if (passRate < 30) {
          analytics.anomalies.push({
            type: 'LOW_PASS_RATE',
            exam: exam,
            passRate,
            message: `Low pass rate: ${passRate.toFixed(1)}%`,
          });
        }

        analytics.subjectPerformance.push({
          subject: exam.curriculumSubject.subject.name,
          class: exam.curriculumSubject.class.name,
          examType: exam.examType,
          average,
          passRate,
          totalStudents: scores.length,
        });
      }
    }

    return analytics;
  }

  /**
   * Log DoS actions for audit trail
   */
  private static async logDoSAction(data: {
    schoolId: string;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    previousValue?: any;
    newValue?: any;
    reason?: string;
  }) {
    return await prisma.doSAuditLog.create({
      data: {
        ...data,
        timestamp: new Date(),
      },
    });
  }
}