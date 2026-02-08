import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Grade boundaries configuration
const GRADE_BOUNDARIES = {
  A: { min: 80, max: 100, descriptor: 'DISTINCTION' },
  B: { min: 70, max: 79, descriptor: 'CREDIT' },
  C: { min: 60, max: 69, descriptor: 'CREDIT' },
  D: { min: 50, max: 59, descriptor: 'PASS' },
  E: { min: 40, max: 49, descriptor: 'PASS' },
  F: { min: 0, max: 39, descriptor: 'FAIL' },
} as const;

export class ScoreCalculationService {
  /**
   * Calculate final scores for all students in a subject and term
   * Merges CA (20%) + Exam (80%) = Final Score (100%)
   */
  static async calculateFinalScores(
    curriculumSubjectId: string,
    termId: string,
    dosUserId: string,
    schoolId: string
  ) {
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

    // Get curriculum subject info
    const curriculumSubject = await prisma.curriculumSubject.findUnique({
      where: { id: curriculumSubjectId },
      include: {
        subject: true,
        class: true,
      },
    });

    if (!curriculumSubject) {
      throw new Error('Curriculum subject not found');
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId: curriculumSubject.classId,
        status: 'ACTIVE',
      },
    });

    // Calculate CA totals (20%)
    const caTotals = await this.calculateCATotals(curriculumSubjectId, termId);

    // Get exam results (80%)
    const examResults = await this.getExamResults(curriculumSubjectId, termId);

    // Calculate final scores for each student
    const finalScores = [];
    
    for (const student of students) {
      const caData = caTotals.get(student.id);
      const examData = examResults.get(student.id);

      // Calculate final score only if both CA and Exam data exist
      let finalScore = null;
      let grade = null;
      let gradeDescriptor = null;

      if (caData && examData && examData.score !== null) {
        // CA contributes 20%, Exam contributes 80%
        finalScore = caData.percentage + (examData.score / examData.maxScore) * 80;
        
        // Determine grade
        const gradeInfo = this.calculateGrade(finalScore);
        grade = gradeInfo.grade;
        gradeDescriptor = gradeInfo.descriptor;
      }

      // Create or update final score record
      const finalScoreRecord = await prisma.finalScore.upsert({
        where: {
          curriculumSubjectId_studentId_termId: {
            curriculumSubjectId,
            studentId: student.id,
            termId,
          },
        },
        update: {
          caScore: caData?.percentage || null,
          examScore: examData ? (examData.score / examData.maxScore) * 80 : null,
          finalScore,
          grade,
          gradeDescriptor: gradeDescriptor as any,
          calculatedAt: new Date(),
        },
        create: {
          curriculumSubjectId,
          studentId: student.id,
          termId,
          caScore: caData?.percentage || null,
          examScore: examData ? (examData.score / examData.maxScore) * 80 : null,
          finalScore,
          grade,
          gradeDescriptor: gradeDescriptor as any,
          calculatedAt: new Date(),
        },
      });

      finalScores.push(finalScoreRecord);
    }

    return {
      curriculumSubject,
      finalScores,
      summary: {
        totalStudents: students.length,
        scoresCalculated: finalScores.filter(fs => fs.finalScore !== null).length,
        missingCA: finalScores.filter(fs => fs.caScore === null).length,
        missingExam: finalScores.filter(fs => fs.examScore === null).length,
      },
    };
  }

  /**
   * Calculate CA totals for all students (20% allocation)
   */
  private static async calculateCATotals(curriculumSubjectId: string, termId: string) {
    const assessmentPlans = await prisma.assessmentPlan.findMany({
      where: {
        curriculumSubjectId,
        termId,
        dosApproved: true,
      },
      include: {
        continuousAssessments: true,
      },
    });

    const studentTotals = new Map<string, { totalScore: number; maxScore: number; percentage: number }>();

    for (const plan of assessmentPlans) {
      for (const assessment of plan.continuousAssessments) {
        if (assessment.score !== null) {
          const studentId = assessment.studentId;
          const current = studentTotals.get(studentId) || { totalScore: 0, maxScore: 0, percentage: 0 };
          
          const weightedScore = (assessment.score / plan.maxScore) * plan.weightPercentage;
          
          current.totalScore += weightedScore;
          current.maxScore += plan.weightPercentage;
          
          studentTotals.set(studentId, current);
        }
      }
    }

    for (const [studentId, totals] of studentTotals) {
      if (totals.maxScore > 0) {
        totals.percentage = (totals.totalScore / totals.maxScore) * 20;
      } else {
        totals.percentage = 0;
      }
    }

    return studentTotals;
  }

  /**
   * Get exam results for all students (80% allocation)
   */
  private static async getExamResults(curriculumSubjectId: string, termId: string) {
    const exams = await prisma.doSExam.findMany({
      where: {
        curriculumSubjectId,
        termId,
        dosApproved: true,
      },
      include: {
        examResults: true,
      },
    });

    const studentResults = new Map<string, { score: number; maxScore: number; isAbsent: boolean }>();

    const mainExam = exams.find(e => e.examType === 'END_TERM' || e.examType === 'END_YEAR') || exams[0];

    if (mainExam) {
      for (const result of mainExam.examResults) {
        studentResults.set(result.studentId, {
          score: result.score || 0,
          maxScore: mainExam.maxScore,
          isAbsent: result.isAbsent,
        });
      }
    }

    return studentResults;
  }

  /**
   * Calculate grade based on final score
   */
  private static calculateGrade(finalScore: number): { grade: string; descriptor: string } {
    for (const [grade, boundary] of Object.entries(GRADE_BOUNDARIES)) {
      if (finalScore >= boundary.min && finalScore <= boundary.max) {
        return { grade, descriptor: boundary.descriptor };
      }
    }
    return { grade: 'F', descriptor: 'FAIL' };
  }
}