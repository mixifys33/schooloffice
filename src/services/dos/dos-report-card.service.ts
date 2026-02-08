/**
 * DoS Report Card Service
 * 
 * Manages official academic report card generation and publication.
 * Handles immutable report generation, DoS approval, and controlled release.
 * 
 * Requirements:
 * - Complete CA and Exam data validation
 * - Immutable report generation
 * - DoS approval workflow
 * - Watermarking until official release
 * - Bulk generation and download
 */

import { prisma } from '@/lib/db';
import { DoSAuditService } from './dos-audit.service';
import { DoSFinalScoreService } from './dos-final-score.service';
import type { 
  DoSReportCard,
  DoSReportCardStatus,
  DoSPromotionStatus 
} from '@prisma/client';

export interface GenerateReportCardInput {
  studentId: string;
  termId: string;
  schoolId: string;
  classTeacherRemarks?: string;
  dosAcademicComment?: string;
  headTeacherRemarks?: string;
  generatedBy: string;
}

export interface BulkGenerateReportCardsInput {
  classId: string;
  termId: string;
  schoolId: string;
  generatedBy: string;
}

export interface DoSApprovalInput {
  dosUserId: string;
  reason?: string;
  ipAddress?: string;
}

export interface PublishReportCardInput {
  reportCardId: string;
  publishedBy: string;
  removeWatermark?: boolean;
}

export class DoSReportCardService {
  private auditService = new DoSAuditService();
  private finalScoreService = new DoSFinalScoreService();

  /**
   * Generate report card for a student (VERY IMPORTANT)
   */
  async generateReportCard(input: GenerateReportCardInput): Promise<DoSReportCard> {
    // Validate that all required data exists
    await this.validateReportCardData(input.studentId, input.termId, input.schoolId);

    // Get student details (snapshot for immutability)
    const student = await db.student.findUnique({
      where: { id: input.studentId },
      include: {
        class: { select: { name: true } },
        stream: { select: { name: true } }
      }
    });

    if (!student) {
      throw new Error('Student not found');
    }

    // Get term and academic year details
    const term = await db.term.findUnique({
      where: { id: input.termId },
      include: {
        academicYear: { select: { name: true } }
      }
    });

    if (!term) {
      throw new Error('Term not found');
    }

    // Get final scores for the student
    const finalScores = await this.finalScoreService.getStudentFinalScores(
      input.studentId,
      input.termId
    );

    if (finalScores.length === 0) {
      throw new Error('No final scores found for this student and term');
    }

    // Calculate overall performance
    const totalMarks = finalScores.reduce((sum, score) => sum + (score.finalScore || 0), 0);
    const averageScore = totalMarks / finalScores.length;
    
    // Determine overall grade
    const overallGrade = this.calculateOverallGrade(averageScore);

    // Get class position (if calculable)
    const { position, totalStudents } = await this.calculateClassPosition(
      input.studentId,
      input.termId,
      student.classId
    );

    // Get attendance summary
    const attendanceSummary = await this.getAttendanceSummary(
      input.studentId,
      input.termId
    );

    // Determine promotion recommendation
    const promotionRecommendation = await this.calculatePromotionRecommendation(
      input.studentId,
      input.termId,
      finalScores
    );

    // Check if report card already exists
    const existing = await db.doSReportCard.findUnique({
      where: {
        studentId_termId: {
          studentId: input.studentId,
          termId: input.termId
        }
      }
    });

    let reportCard: DoSReportCard;

    if (existing) {
      // Update existing report card
      reportCard = await db.doSReportCard.update({
        where: { id: existing.id },
        data: {
          // Update snapshot data
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          className: student.class.name,
          streamName: student.stream?.name,
          termName: term.name,
          academicYear: term.academicYear.name,
          // Update calculated data
          totalMarks,
          averageScore,
          position,
          totalStudents,
          overallGrade,
          // Update remarks
          classTeacherRemarks: input.classTeacherRemarks,
          dosAcademicComment: input.dosAcademicComment,
          headTeacherRemarks: input.headTeacherRemarks,
          // Update promotion and attendance
          promotionRecommendation,
          attendanceSummary,
          // Reset status if significant changes
          status: 'DRAFT',
          dosApproved: false,
          dosApprovedBy: null,
          dosApprovedAt: null,
          watermarked: true,
          publishedAt: null,
          publishedBy: null
        },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
          term: { select: { name: true } }
        }
      });

      // Audit log
      await this.auditService.log({
        schoolId: input.schoolId,
        userId: input.generatedBy,
        action: 'REGENERATE_REPORT_CARD',
        resourceType: 'DoSReportCard',
        resourceId: reportCard.id,
        resourceName: `${student.admissionNumber} - ${term.name}`,
        previousValue: existing,
        newValue: reportCard
      });
    } else {
      // Create new report card
      reportCard = await db.doSReportCard.create({
        data: {
          studentId: input.studentId,
          termId: input.termId,
          schoolId: input.schoolId,
          // Snapshot data for immutability
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          className: student.class.name,
          streamName: student.stream?.name,
          termName: term.name,
          academicYear: term.academicYear.name,
          // Calculated data
          totalMarks,
          averageScore,
          position,
          totalStudents,
          overallGrade,
          // Remarks
          classTeacherRemarks: input.classTeacherRemarks,
          dosAcademicComment: input.dosAcademicComment,
          headTeacherRemarks: input.headTeacherRemarks,
          // Promotion and attendance
          promotionRecommendation,
          attendanceSummary,
          // Status
          status: 'DRAFT',
          watermarked: true
        },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
          term: { select: { name: true } }
        }
      });

      // Audit log
      await this.auditService.log({
        schoolId: input.schoolId,
        userId: input.generatedBy,
        action: 'GENERATE_REPORT_CARD',
        resourceType: 'DoSReportCard',
        resourceId: reportCard.id,
        resourceName: `${student.admissionNumber} - ${term.name}`,
        newValue: reportCard
      });
    }

    return reportCard;
  }

  /**
   * Validate that all required data exists for report generation
   */
  private async validateReportCardData(
    studentId: string,
    termId: string,
    schoolId: string
  ): Promise<void> {
    // Check for final scores
    const finalScores = await db.doSFinalScore.findMany({
      where: {
        studentId,
        termId,
        curriculumSubject: { schoolId }
      }
    });

    if (finalScores.length === 0) {
      throw new Error('No final scores found. Calculate final scores before generating report cards.');
    }

    // Check for unapproved final scores
    const unapprovedScores = finalScores.filter(score => !score.dosApproved);
    if (unapprovedScores.length > 0) {
      throw new Error(`${unapprovedScores.length} final scores pending DoS approval`);
    }

    // Check for missing CA or Exam components
    const incompleteScores = finalScores.filter(score => 
      score.caScore === null || score.examScore === null
    );
    if (incompleteScores.length > 0) {
      throw new Error(`${incompleteScores.length} subjects have incomplete CA or Exam data`);
    }
  }

  /**
   * Calculate overall grade based on average score
   */
  private calculateOverallGrade(averageScore: number): string {
    if (averageScore >= 80) return 'A';
    if (averageScore >= 70) return 'B';
    if (averageScore >= 50) return 'C';
    return 'F';
  }

  /**
   * Calculate class position
   */
  private async calculateClassPosition(
    studentId: string,
    termId: string,
    classId: string
  ): Promise<{ position: number | null; totalStudents: number }> {
    // Get all students' average scores in the class
    const classAverages = await db.$queryRaw<Array<{
      studentId: string;
      averageScore: number;
    }>>`
      SELECT 
        fs.studentId,
        AVG(fs.finalScore) as averageScore
      FROM DoSFinalScore fs
      JOIN DoSCurriculumSubject cs ON fs.curriculumSubjectId = cs.id
      JOIN Student s ON fs.studentId = s.id
      WHERE fs.termId = ${termId}
        AND s.classId = ${classId}
        AND fs.finalScore IS NOT NULL
      GROUP BY fs.studentId
      ORDER BY averageScore DESC
    `;

    const totalStudents = classAverages.length;
    const studentIndex = classAverages.findIndex(avg => avg.studentId === studentId);
    const position = studentIndex >= 0 ? studentIndex + 1 : null;

    return { position, totalStudents };
  }

  /**
   * Get attendance summary for the term
   */
  private async getAttendanceSummary(
    studentId: string,
    termId: string
  ): Promise<any> {
    const attendance = await db.attendance.findMany({
      where: {
        studentId,
        // Note: We'd need to filter by term dates in a real implementation
      }
    });

    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
    const absentDays = attendance.filter(a => a.status === 'ABSENT').length;
    const lateDays = attendance.filter(a => a.status === 'LATE').length;

    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendanceRate: Math.round(attendanceRate * 100) / 100
    };
  }

  /**
   * Calculate promotion recommendation
   */
  private async calculatePromotionRecommendation(
    studentId: string,
    termId: string,
    finalScores: any[]
  ): Promise<DoSPromotionStatus> {
    const coreSubjects = finalScores.filter(score => 
      score.curriculumSubject.isCore
    );
    
    const passedCoreSubjects = coreSubjects.filter(score => 
      score.gradeDescriptor !== 'FAIL'
    );

    const totalPassed = finalScores.filter(score => 
      score.gradeDescriptor !== 'FAIL'
    ).length;

    const averageScore = finalScores.reduce((sum, score) => 
      sum + (score.finalScore || 0), 0
    ) / finalScores.length;

    // Promotion logic (can be customized per school)
    if (passedCoreSubjects.length === coreSubjects.length && totalPassed >= finalScores.length * 0.6) {
      return 'PROMOTED';
    } else if (totalPassed >= finalScores.length * 0.4) {
      return 'RETAKE';
    } else {
      return 'REPEAT';
    }
  }

  /**
   * DoS approval of report card
   */
  async approveReportCard(
    id: string,
    approval: DoSApprovalInput
  ): Promise<DoSReportCard> {
    const existing = await db.doSReportCard.findUnique({
      where: { id },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { name: true } }
      }
    });

    if (!existing) {
      throw new Error('Report card not found');
    }

    if (existing.dosApproved) {
      throw new Error('Report card already approved');
    }

    const approved = await db.doSReportCard.update({
      where: { id },
      data: {
        status: 'APPROVED',
        dosApproved: true,
        dosApprovedBy: approval.dosUserId,
        dosApprovedAt: new Date()
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { name: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.schoolId,
      userId: approval.dosUserId,
      action: 'APPROVE_REPORT_CARD',
      resourceType: 'DoSReportCard',
      resourceId: id,
      resourceName: `${existing.admissionNumber} - ${existing.termName}`,
      reason: approval.reason,
      ipAddress: approval.ipAddress,
      previousValue: existing,
      newValue: approved
    });

    return approved;
  }

  /**
   * Publish report card (remove watermark, make accessible)
   */
  async publishReportCard(input: PublishReportCardInput): Promise<DoSReportCard> {
    const existing = await db.doSReportCard.findUnique({
      where: { id: input.reportCardId },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { name: true } }
      }
    });

    if (!existing) {
      throw new Error('Report card not found');
    }

    if (!existing.dosApproved) {
      throw new Error('Report card must be DoS approved before publishing');
    }

    if (existing.publishedAt) {
      throw new Error('Report card already published');
    }

    const published = await db.doSReportCard.update({
      where: { id: input.reportCardId },
      data: {
        status: 'PUBLISHED',
        watermarked: input.removeWatermark ? false : existing.watermarked,
        publishedAt: new Date(),
        publishedBy: input.publishedBy
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { name: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.schoolId,
      userId: input.publishedBy,
      action: 'PUBLISH_REPORT_CARD',
      resourceType: 'DoSReportCard',
      resourceId: input.reportCardId,
      resourceName: `${existing.admissionNumber} - ${existing.termName}`,
      previousValue: existing,
      newValue: published
    });

    return published;
  }

  /**
   * Lock report card (makes it read-only)
   */
  async lockReportCard(
    id: string,
    lockedBy: string,
    reason?: string
  ): Promise<DoSReportCard> {
    const existing = await db.doSReportCard.findUnique({
      where: { id },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { name: true } }
      }
    });

    if (!existing) {
      throw new Error('Report card not found');
    }

    if (existing.isLocked) {
      throw new Error('Report card already locked');
    }

    const locked = await db.doSReportCard.update({
      where: { id },
      data: {
        status: 'LOCKED',
        isLocked: true
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        term: { select: { name: true } }
      }
    });

    // Audit log
    await this.auditService.log({
      schoolId: existing.schoolId,
      userId: lockedBy,
      action: 'LOCK_REPORT_CARD',
      resourceType: 'DoSReportCard',
      resourceId: id,
      resourceName: `${existing.admissionNumber} - ${existing.termName}`,
      reason,
      previousValue: existing,
      newValue: locked
    });

    return locked;
  }

  /**
   * Bulk generate report cards for a class
   */
  async bulkGenerateReportCards(input: BulkGenerateReportCardsInput): Promise<{
    generated: number;
    errors: Array<{ studentId: string; error: string }>;
  }> {
    // Get all students in the class
    const students = await db.student.findMany({
      where: { 
        classId: input.classId,
        status: 'ACTIVE'
      },
      select: { id: true, admissionNumber: true }
    });

    let generated = 0;
    const errors: Array<{ studentId: string; error: string }> = [];

    // Generate report card for each student
    for (const student of students) {
      try {
        await this.generateReportCard({
          studentId: student.id,
          termId: input.termId,
          schoolId: input.schoolId,
          generatedBy: input.generatedBy
        });
        generated++;
      } catch (error) {
        errors.push({
          studentId: student.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Audit bulk operation
    await this.auditService.log({
      schoolId: input.schoolId,
      userId: input.generatedBy,
      action: 'BULK_GENERATE_REPORT_CARDS',
      resourceType: 'DoSReportCard',
      resourceId: `${input.classId}-${input.termId}`,
      resourceName: `Class ${input.classId} - Term ${input.termId}`,
      newValue: { generated, errors: errors.length }
    });

    return { generated, errors };
  }

  /**
   * Get report cards for a class and term
   */
  async getClassReportCards(
    schoolId: string,
    classId: string,
    termId: string
  ): Promise<DoSReportCard[]> {
    return db.doSReportCard.findMany({
      where: {
        schoolId,
        termId,
        student: { classId }
      },
      include: {
        student: { 
          select: { 
            firstName: true, 
            lastName: true, 
            admissionNumber: true 
          } 
        }
      },
      orderBy: [
        { position: 'asc' },
        { student: { admissionNumber: 'asc' } }
      ]
    });
  }

  /**
   * Get report card generation status for DoS monitoring
   */
  async getReportCardStatus(
    schoolId: string,
    termId: string,
    classId?: string
  ) {
    const where: any = {
      schoolId,
      termId
    };

    if (classId) {
      where.student = { classId };
    }

    const [
      totalReports,
      draftReports,
      approvedReports,
      publishedReports,
      lockedReports
    ] = await Promise.all([
      db.doSReportCard.count({ where }),
      db.doSReportCard.count({ where: { ...where, status: 'DRAFT' } }),
      db.doSReportCard.count({ where: { ...where, status: 'APPROVED' } }),
      db.doSReportCard.count({ where: { ...where, status: 'PUBLISHED' } }),
      db.doSReportCard.count({ where: { ...where, status: 'LOCKED' } })
    ]);

    const approvalRate = totalReports > 0 ? (approvedReports / totalReports) * 100 : 0;
    const publicationRate = totalReports > 0 ? (publishedReports / totalReports) * 100 : 0;

    return {
      totalReports,
      draftReports,
      approvedReports,
      publishedReports,
      lockedReports,
      pendingApproval: draftReports,
      pendingPublication: approvedReports,
      approvalRate: Math.round(approvalRate * 100) / 100,
      publicationRate: Math.round(publicationRate * 100) / 100
    };
  }

  /**
   * Generate PDF report card (placeholder - would integrate with PDF generation service)
   */
  async generatePDF(reportCardId: string): Promise<string> {
    const reportCard = await db.doSReportCard.findUnique({
      where: { id: reportCardId },
      include: {
        student: true,
        term: {
          include: {
            academicYear: true
          }
        }
      }
    });

    if (!reportCard) {
      throw new Error('Report card not found');
    }

    // Get final scores for the report
    const finalScores = await this.finalScoreService.getStudentFinalScores(
      reportCard.studentId,
      reportCard.termId
    );

    // TODO: Integrate with PDF generation service
    // This would generate a PDF with:
    // - School branding
    // - Student details
    // - Subject-by-subject breakdown
    // - CA and Exam scores
    // - Final scores and grades
    // - Teacher remarks
    // - DoS academic comment
    // - Attendance summary
    // - Promotion recommendation
    // - Watermark (if not published)

    const pdfUrl = `https://example.com/reports/${reportCardId}.pdf`;

    // Update report card with PDF URL
    await db.doSReportCard.update({
      where: { id: reportCardId },
      data: { pdfUrl }
    });

    return pdfUrl;
  }
}