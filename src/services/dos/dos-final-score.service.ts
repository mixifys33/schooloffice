/**
 * DoS Final Score Service
 * 
 * THE HEART of the DoS system - merges CA (20%) + Exam (80%) results.
 * Handles final score calculation, grade assignment, and anomaly detection.
 * 
 * Requirements:
 * - Controlled merge of CA and Exam streams
 * - Automatic grade calculation
 * - Anomaly detection (e.g., 95 exam, 2 CA)
 * - DoS approval workflow
 * - No manual calculation once locked
 */

import { prisma } from '@/lib/db';
import { DoSAuditService } from './dos-audit.service';
import { DoSAssessmentService } from './dos-assessment.service';
import { DoSExamService } from './dos-exam.service';
import type { 
  DoSFinalScore,
  DoSGradeDescriptor 
} from '@prisma/client';

export interface CalculateFinalScoreInput {
  curriculumSubjectId: string;
  studentId: string;
  termId: string;
  calculatedBy: string;
}

export interface GradeScale {
  minScore: number;
  maxScore: number;
  grade: string;
  descriptor: DoSGradeDescriptor;
  points: number;
}

export interface DoSApprovalInput {
  dosUserId: string;
  reason?: string;
  ipAddress?: string;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType?: 'HIGH_EXAM_LOW_CA' | 'LOW_EXAM_HIGH_CA' | 'EXTREME_DIFFERENCE' | 'MISSING_COMPONENT';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  caScore?: number;
  examScore?: number;
  difference?: number;
}

export class DoSFinalScoreService {
  private auditService = new DoSAuditService();
  private assessmentService = new DoSAssessmentService();
  private examService = new DoSExamService();

  // Standard grading scale - can be customized per school
  private defaultGradeScale: GradeScale[] = [
    { minScore: 80, maxScore: 100, grade: 'A', descriptor: 'DISTINCTION', points: 4.0 },
    { minScore: 70, maxScore: 79, grade: 'B', descriptor: 'CREDIT', points: 3.0 },
    { minScore: 50, maxScore: 69, grade: 'C', descriptor: 'PASS', points: 2.0 },
    { minScore: 0, maxScore: 49, grade: 'F', descriptor: 'FAIL', points: 0.0 }
  ];

  /**
   * Calculate final score for a student in a subject (THE HEART)
   */
  async calculateFinalScore(input: CalculateFinalScoreInput): Promise<DoSFinalScore> {
    // Get curriculum subject details
    const curriculumSubject = await db.doSCurriculumSubject.findUnique({
      where: { id: input.curriculumSubjectId },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } }
      }
    });

    if (!curriculumSubject) {
      throw new Error('Curriculum subject not found');
    }

    if (!curriculumSubject.dosApproved) {
      throw new Error('Curriculum subject must be DoS approved before calculating final scores');
    }

    // Calculate CA total (20%)
    const caCalculation = await this.assessmentService.calculateCATotal(
      input.studentId,
      input.curriculumSubjectId,
      input.termId
    );

    // Calculate Exam total (80%)
    const examCalculation = await this.examService.calculateExamTotal(
      input.studentId,
      input.curriculumSubjectId,
      input.termId
    );

    // Validate both components exist
    if (caCalculation.assessmentBreakdown.length === 0) {
      throw new Error('No continuous assessments found for this student and subject');
    }

    if (examCalculation.examBreakdown.length === 0) {
      throw new Error('No exam results found for this student and subject');
    }

    // Calculate final score using curriculum weights
    const caWeight = curriculumSubject.caWeight / 100; // Convert to decimal
    const examWeight = curriculumSubject.examWeight / 100; // Convert to decimal

    const caScore = caCalculation.caPercentage * caWeight;
    const examScore = examCalculation.examPercentage * examWeight;
    const finalScore = caScore + examScore;

    // Determine grade and descriptor
    const gradeInfo = this.calculateGrade(finalScore, curriculumSubject.minPassMark);

    // Detect anomalies
    const anomalyResult = this.detectAnomalies(
      caCalculation.caPercentage,
      examCalculation.examPercentage,
      finalScore
    );

    // Check if final score already exists
    const existing = await db.doSFinalScore.findUnique({
      where: {
        curriculumSubjectId_studentId_termId: {
          curriculumSubjectId: input.curriculumSubjectId,
          studentId: input.studentId,
          termId: input.termId
        }
      }
    });

    let finalScoreRecord: DoSFinalScore;

    if (existing) {
      // Update existing record
      finalScoreRecord = await db.doSFinalScore.update({
        where: { id: existing.id },
        data: {
          caScore,
          examScore,
          finalScore,
          grade: gradeInfo.grade,
          gradeDescriptor: gradeInfo.descriptor,
          calculatedAt: new Date(),
          // Reset DoS approval if score changed significantly
          dosApproved: Math.abs((existing.finalScore || 0) - finalScore) > 5 ? false : existing.dosApproved,
          dosApprovedBy: Math.abs((existing.finalScore || 0) - finalScore) > 5 ? null : existing.dosApprovedBy,
          dosApprovedAt: Math.abs((existing.finalScore || 0) - finalScore) > 5 ? null : existing.dosApprovedAt
        },
        include: {
          curriculumSubject: {
            include: {
              subject: { select: { name: true } },
              class: { select: { name: true } }
            }
          },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } }
        }
      });

      // Audit log
      await this.auditService.log({
        schoolId: curriculumSubject.schoolId,
        userId: input.calculatedBy,
        action: 'RECALCULATE_FINAL_SCORE',
        resourceType: 'DoSFinalScore',
        resourceId: finalScoreRecord.id,
        resourceName: `${curriculumSubject.subject.name} - ${finalScoreRecord.student.admissionNumber}`,
        previousValue: existing,
        newValue: finalScoreRecord
      });
    } else {
      // Create new record
      finalScoreRecord = await db.doSFinalScore.create({
        data: {
          curriculumSubjectId: input.curriculumSubjectId,
          studentId: input.studentId,
          termId: input.termId,
          caScore,
          examScore,
          finalScore,
          grade: gradeInfo.grade,
          gradeDescriptor: gradeInfo.descriptor,
          calculatedAt: new Date()
        },
        include: {
          curriculumSubject: {
            include: {
              subject: { select: { name: true } },
              class: { select: { name: true } }
            }
          },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } }
        }
      });

      // Audit log
      await this.auditService.log({
        schoolId: curriculumSubject.schoolId,
        userId: input.calculatedBy,
        action: 'CALCULATE_FINAL_SCORE',
        resourceType: 'DoSFinalScore',
        resourceId: finalScoreRecord.id,
        resourceName: `${curriculumSubject.subject.name} - ${finalScoreRecord.student.admissionNumber}`,
        newValue: finalScoreRecord
      });
    }

    // Log anomaly if detected
    if (anomalyResult.isAnomaly) {
      await this.auditService.log({
        schoolId: curriculumSubject.schoolId,
        userId: input.calculatedBy,
        action: 'DETECT_SCORE_ANOMALY',
        resourceType: 'DoSFinalScore',
        resourceId: finalScoreRecord.id,
        resourceName: `${curriculumSubject.subject.name} - ${finalScoreRecord.student.admissionNumber}`,
        reason: `${anomalyResult.anomalyType}: ${anomalyResult.description}`,
        newValue: anomalyResult
      });
    }

    return finalScoreRecord;
  }

  /**
   * Calculate grade based on final score
   */
  private calculateGrade(finalScore: number, minPassMark: number): {
    grade: string;
    descriptor: DoSGradeDescriptor;
    points: number;
  } {
    // Use custom pass mark if different from standard
    let gradeScale = [...this.defaultGradeScale];
    
    if (minPassMark !== 50) {
      // Adjust the pass/fail boundary
      gradeScale = gradeScale.map(scale => {
        if (scale.grade === 'C') {
          return { ...scale, minScore: minPassMark };
        }
        if (scale.grade === 'F') {
          return { ...scale, maxScore: minPassMark - 1 };
        }
        return scale;
      });
    }

    const grade = gradeScale.find(scale => 
      finalScore >= scale.minScore && finalScore <= scale.maxScore
    ) || gradeScale[gradeScale.length - 1]; // Default to F if not found

    return {
      grade: grade.grade,
      descriptor: grade.descriptor,
      points: grade.points
    };
  }

  /**
   * Detect anomalies in score patterns
   */
  private detectAnomalies(
    caPercentage: number,
    examPercentage: number,
    finalScore: number
  ): AnomalyDetectionResult {
    const difference = Math.abs(caPercentage - examPercentage);

    // High exam, low CA (e.g., 95 exam, 20 CA)
    if (examPercentage >= 80 && caPercentage <= 30 && difference >= 50) {
      return {
        isAnomaly: true,
        anomalyType: 'HIGH_EXAM_LOW_CA',
        severity: 'HIGH',
        description: `High exam performance (${examPercentage.toFixed(1)}%) with very low CA (${caPercentage.toFixed(1)}%)`,
        caScore: caPercentage,
        examScore: examPercentage,
        difference
      };
    }

    // Low exam, high CA (e.g., 20 exam, 90 CA)
    if (caPercentage >= 80 && examPercentage <= 30 && difference >= 50) {
      return {
        isAnomaly: true,
        anomalyType: 'LOW_EXAM_HIGH_CA',
        severity: 'HIGH',
        description: `High CA performance (${caPercentage.toFixed(1)}%) with very low exam (${examPercentage.toFixed(1)}%)`,
        caScore: caPercentage,
        examScore: examPercentage,
        difference
      };
    }

    // Extreme difference (40+ point gap)
    if (difference >= 40) {
      return {
        isAnomaly: true,
        anomalyType: 'EXTREME_DIFFERENCE',
        severity: 'MEDIUM',
        description: `Large performance gap between CA (${caPercentage.toFixed(1)}%) and Exam (${examPercentage.toFixed(1)}%)`,
        caScore: caPercentage,
        examScore: examPercentage,
        difference
      };
    }

    // Missing component (zero scores)
    if (caPercentage === 0 || examPercentage === 0) {
      return {
        isAnomaly: true,
        anomalyType: 'MISSING_COMPONENT',
        severity: 'HIGH',
        description: `Missing ${caPercentage === 0 ? 'CA' : 'Exam'} component`,
        caScore: caPercentage,
        examScore: examPercentage,
        difference
      };
    }

    return {
      isAnomaly: false,
      severity: 'LOW',
      description: 'No anomalies detected'
    };
  }

  /**
   * DoS approval of final scores
   */
  async approveFinalScore(
    id: string,
    approval: DoSApprovalInput
  ): Promise<DoSFinalScore> {
    const existing = await db.doSFinalScore.findUnique({
      where: { id },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        student: { select: { firstName: true, lastName: true, admissionNumber: true } }
      }
    });

    if (!existing) {
      throw new Error('Final score not found');
    }

    if (existing.dosApproved) {
      throw new Error('Final score already approved');
    }

    const approved = await db.doSFinalScore.update({
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
        },
        student: { select: { firstName: true, lastName: true, admissionNumber: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.curriculumSubject.schoolId,
      userId: approval.dosUserId,
      action: 'APPROVE_FINAL_SCORE',
      resourceType: 'DoSFinalScore',
      resourceId: id,
      resourceName: `${existing.curriculumSubject.subject.name} - ${existing.student.admissionNumber}`,
      reason: approval.reason,
      ipAddress: approval.ipAddress,
      previousValue: existing,
      newValue: approved
    });

    return approved;
  }

  /**
   * Lock final scores (prevents further changes)
   */
  async lockFinalScore(
    id: string,
    lockedBy: string,
    reason?: string
  ): Promise<DoSFinalScore> {
    const existing = await db.doSFinalScore.findUnique({
      where: { id },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        student: { select: { firstName: true, lastName: true, admissionNumber: true } }
      }
    });

    if (!existing) {
      throw new Error('Final score not found');
    }

    if (existing.isLocked) {
      throw new Error('Final score already locked');
    }

    const locked = await db.doSFinalScore.update({
      where: { id },
      data: { isLocked: true },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        student: { select: { firstName: true, lastName: true, admissionNumber: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.curriculumSubject.schoolId,
      userId: lockedBy,
      action: 'LOCK_FINAL_SCORE',
      resourceType: 'DoSFinalScore',
      resourceId: id,
      resourceName: `${existing.curriculumSubject.subject.name} - ${existing.student.admissionNumber}`,
      reason,
      previousValue: existing,
      newValue: locked
    });

    return locked;
  }

  /**
   * Bulk calculate final scores for a class and term
   */
  async bulkCalculateFinalScores(
    schoolId: string,
    classId: string,
    termId: string,
    calculatedBy: string
  ): Promise<{
    calculated: number;
    errors: Array<{ studentId: string; subjectId: string; error: string }>;
  }> {
    // Get all curriculum subjects for the class
    const curriculumSubjects = await db.doSCurriculumSubject.findMany({
      where: {
        schoolId,
        classId,
        dosApproved: true
      }
    });

    // Get all students in the class
    const students = await db.student.findMany({
      where: { classId },
      select: { id: true }
    });

    let calculated = 0;
    const errors: Array<{ studentId: string; subjectId: string; error: string }> = [];

    // Calculate for each student-subject combination
    for (const student of students) {
      for (const subject of curriculumSubjects) {
        try {
          await this.calculateFinalScore({
            curriculumSubjectId: subject.id,
            studentId: student.id,
            termId,
            calculatedBy
          });
          calculated++;
        } catch (error) {
          errors.push({
            studentId: student.id,
            subjectId: subject.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    // Audit bulk operation
    await this.auditService.log({
      schoolId,
      userId: calculatedBy,
      action: 'BULK_CALCULATE_FINAL_SCORES',
      resourceType: 'DoSFinalScore',
      resourceId: `${classId}-${termId}`,
      resourceName: `Class ${classId} - Term ${termId}`,
      newValue: { calculated, errors: errors.length }
    });

    return { calculated, errors };
  }

  /**
   * Get final scores for a student in a term
   */
  async getStudentFinalScores(
    studentId: string,
    termId: string
  ): Promise<DoSFinalScore[]> {
    return db.doSFinalScore.findMany({
      where: {
        studentId,
        termId
      },
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true, code: true } }
          }
        }
      },
      orderBy: {
        curriculumSubject: {
          subject: { name: 'asc' }
        }
      }
    });
  }

  /**
   * Get anomaly report for DoS review
   */
  async getAnomalyReport(
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

    const finalScores = await db.doSFinalScore.findMany({
      where,
      include: {
        curriculumSubject: {
          include: {
            subject: { select: { name: true } },
            class: { select: { name: true } }
          }
        },
        student: { select: { firstName: true, lastName: true, admissionNumber: true } }
      }
    });

    const anomalies = finalScores
      .map(score => {
        if (!score.caScore || !score.examScore) return null;

        const caPercentage = (score.caScore / 20) * 100; // Convert back to percentage
        const examPercentage = (score.examScore / 80) * 100; // Convert back to percentage
        
        const anomalyResult = this.detectAnomalies(
          caPercentage,
          examPercentage,
          score.finalScore || 0
        );

        if (anomalyResult.isAnomaly) {
          return {
            finalScoreId: score.id,
            studentName: `${score.student.firstName} ${score.student.lastName}`,
            admissionNumber: score.student.admissionNumber,
            subjectName: score.curriculumSubject.subject.name,
            className: score.curriculumSubject.class.name,
            caScore: score.caScore,
            examScore: score.examScore,
            finalScore: score.finalScore,
            caPercentage,
            examPercentage,
            anomaly: anomalyResult,
            dosApproved: score.dosApproved
          };
        }

        return null;
      })
      .filter(Boolean);

    return {
      anomalies,
      summary: {
        totalAnomalies: anomalies.length,
        highSeverity: anomalies.filter(a => a?.anomaly.severity === 'HIGH').length,
        mediumSeverity: anomalies.filter(a => a?.anomaly.severity === 'MEDIUM').length,
        unapprovedAnomalies: anomalies.filter(a => !a?.dosApproved).length
      }
    };
  }

  /**
   * Get final scores summary for DoS dashboard
   */
  async getFinalScoresSummary(
    schoolId: string,
    termId: string
  ) {
    const [
      totalScores,
      approvedScores,
      lockedScores,
      passedScores,
      failedScores
    ] = await Promise.all([
      db.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId
        }
      }),
      db.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          dosApproved: true
        }
      }),
      db.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          isLocked: true
        }
      }),
      db.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          gradeDescriptor: { in: ['DISTINCTION', 'CREDIT', 'PASS'] }
        }
      }),
      db.doSFinalScore.count({
        where: {
          curriculumSubject: { schoolId },
          termId,
          gradeDescriptor: 'FAIL'
        }
      })
    ]);

    const approvalRate = totalScores > 0 ? (approvedScores / totalScores) * 100 : 0;
    const passRate = totalScores > 0 ? (passedScores / totalScores) * 100 : 0;

    return {
      totalScores,
      approvedScores,
      pendingApproval: totalScores - approvedScores,
      lockedScores,
      passedScores,
      failedScores,
      approvalRate: Math.round(approvalRate * 100) / 100,
      passRate: Math.round(passRate * 100) / 100
    };
  }
}