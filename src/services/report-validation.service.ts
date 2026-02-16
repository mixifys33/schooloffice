/**
 * Report Validation Service
 * 
 * Validates if classes are ready for report card generation
 * Checks CA completion, Exam completion, and score approval status
 */

import { prisma } from '@/lib/db';

export interface ValidationResult {
  isReady: boolean;
  blockers: string[];
  validationChecks: {
    curriculumApproved: boolean;
    caComplete: boolean;
    examsComplete: boolean;
    scoresApproved: boolean;
    scoresLocked: boolean;
  };
}

export interface ClassValidationStatus {
  classId: string;
  className: string;
  studentCount: number;
  termName: string;
  validation: ValidationResult;
}

export class ReportValidationService {
  /**
   * Validate if a class is ready for report generation
   */
  async validateClassForReports(
    classId: string,
    termId: string
  ): Promise<ValidationResult> {
    const blockers: string[] = [];
    
    // Get student count
    const studentCount = await prisma.student.count({
      where: { classId, status: 'ACTIVE' }
    });

    if (studentCount === 0) {
      blockers.push('No active students in class');
      return {
        isReady: false,
        blockers,
        validationChecks: {
          curriculumApproved: false,
          caComplete: false,
          examsComplete: false,
          scoresApproved: false,
          scoresLocked: false
        }
      };
    }

    // Check CA completion
    const caComplete = await this.checkCAComplete(classId, termId);
    if (!caComplete) {
      blockers.push('CA entries not complete for all students');
    }

    // Check Exam completion
    const examsComplete = await this.checkExamsComplete(classId, termId);
    if (!examsComplete) {
      blockers.push('Exam entries not complete for all students');
    }

    // Check if scores are approved
    const scoresApproved = await this.checkScoresApproved(classId, termId);
    if (!scoresApproved) {
      blockers.push('Scores not approved (CA or Exam entries not submitted)');
    }

    // Scores are considered locked if they're approved
    const scoresLocked = scoresApproved;

    const isReady = blockers.length === 0;

    return {
      isReady,
      blockers,
      validationChecks: {
        curriculumApproved: true, // Simplified for now
        caComplete,
        examsComplete,
        scoresApproved,
        scoresLocked
      }
    };
  }

  /**
   * Get validation status for all classes in a term
   */
  async getValidationStatus(
    schoolId: string,
    termId: string
  ): Promise<ClassValidationStatus[]> {
    // Get term details
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { name: true }
    });

    if (!term) {
      throw new Error('Term not found');
    }

    // Get all classes
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Validate each class
    const validationStatuses = await Promise.all(
      classes.map(async (cls) => {
        const validation = await this.validateClassForReports(cls.id, termId);
        
        return {
          classId: cls.id,
          className: cls.name,
          studentCount: cls._count.students,
          termName: term.name,
          validation
        };
      })
    );

    return validationStatuses;
  }

  /**
   * Check if CA entries are complete for a class
   */
  async checkCAComplete(classId: string, termId: string): Promise<boolean> {
    // Get all active students in class
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true }
    });

    if (students.length === 0) {
      return false;
    }

    // Get all subjects for the class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      select: { subjectId: true }
    });

    if (classSubjects.length === 0) {
      return false;
    }

    // Check if each student has at least one CA entry per subject
    for (const student of students) {
      for (const classSubject of classSubjects) {
        const caCount = await prisma.cAEntry.count({
          where: {
            studentId: student.id,
            subjectId: classSubject.subjectId,
            termId
          }
        });

        if (caCount === 0) {
          return false; // Missing CA entry
        }
      }
    }

    return true;
  }

  /**
   * Check if exam entries are complete for a class
   */
  async checkExamsComplete(classId: string, termId: string): Promise<boolean> {
    // Get all active students in class
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true }
    });

    if (students.length === 0) {
      return false;
    }

    // Get all subjects for the class
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      select: { subjectId: true }
    });

    if (classSubjects.length === 0) {
      return false;
    }

    // Check if each student has an exam entry for each subject
    for (const student of students) {
      for (const classSubject of classSubjects) {
        const examEntry = await prisma.examEntry.findUnique({
          where: {
            studentId_subjectId_termId: {
              studentId: student.id,
              subjectId: classSubject.subjectId,
              termId
            }
          }
        });

        if (!examEntry) {
          return false; // Missing exam entry
        }
      }
    }

    return true;
  }

  /**
   * Check if scores are approved (all entries submitted)
   */
  async checkScoresApproved(classId: string, termId: string): Promise<boolean> {
    // Get all active students in class
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true }
    });

    if (students.length === 0) {
      return false;
    }

    // Check CA entries - all must be SUBMITTED
    const draftCACount = await prisma.cAEntry.count({
      where: {
        student: { classId },
        termId,
        status: 'DRAFT'
      }
    });

    if (draftCACount > 0) {
      return false; // Some CA entries still in draft
    }

    // Check Exam entries - all must be SUBMITTED
    const draftExamCount = await prisma.examEntry.count({
      where: {
        student: { classId },
        termId,
        status: 'DRAFT'
      }
    });

    if (draftExamCount > 0) {
      return false; // Some exam entries still in draft
    }

    return true;
  }

  /**
   * Get detailed validation report for a class
   */
  async getDetailedValidationReport(classId: string, termId: string) {
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true
      }
    });

    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: {
          select: { name: true, code: true }
        }
      }
    });

    const report = await Promise.all(
      students.map(async (student) => {
        const subjectStatus = await Promise.all(
          classSubjects.map(async (cs) => {
            const caCount = await prisma.cAEntry.count({
              where: {
                studentId: student.id,
                subjectId: cs.subjectId,
                termId
              }
            });

            const examEntry = await prisma.examEntry.findUnique({
              where: {
                studentId_subjectId_termId: {
                  studentId: student.id,
                  subjectId: cs.subjectId,
                  termId
                }
              }
            });

            return {
              subjectId: cs.subjectId,
              subjectName: cs.subject.name,
              subjectCode: cs.subject.code,
              caEntriesCount: caCount,
              hasExamEntry: !!examEntry,
              caStatus: caCount > 0 ? 'COMPLETE' : 'MISSING',
              examStatus: examEntry ? 'COMPLETE' : 'MISSING'
            };
          })
        );

        return {
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          subjects: subjectStatus
        };
      })
    );

    return report;
  }
}

// Export singleton instance
export const reportValidationService = new ReportValidationService();
