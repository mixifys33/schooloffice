/**
 * Report Generation Service
 * Generates CA-Only, Exam-Only, and Final Term Reports
 */

import { prisma } from '@/lib/db'
import { calculateGradeSync, getGradingSystem } from '@/lib/grading'
   
// Types
export interface ReportGenerationInput {
  classId: string
  subjectId: string
  termId: string
  schoolId: string
  teacherId: string
  studentIds?: string[]
}

export interface CAOnlyReportData {
  reportType: 'ca-only'
  student: {
    id: string
    name: string
    admissionNumber: string
    class: string
    stream?: string
  }
  subject: { id: string; name: string; code: string }
  term: { id: string; name: string; academicYear: string }
  caActivities: Array<{
    name: string
    type: 'TEST' | 'ASSIGNMENT' | 'PROJECT' | 'PRACTICAL' | 'OBSERVATION'
    score: number
    maxScore: number
    percentage: number
    grade: string
    date: Date
  }>
  caSummary: {
    totalActivities: number
    averagePercentage: number
    caContribution: number
    overallGrade: string
    gradePoints: number
  }
  generatedAt: Date
  generatedBy: string
}

export interface ExamOnlyReportData {
  reportType: 'exam-only'
  student: {
    id: string
    name: string
    admissionNumber: string
    class: string
    stream?: string
  }
  subject: { id: string; name: string; code: string }
  term: { id: string; name: string; academicYear: string }
  examScore: number
  examMaxScore: number
  examPercentage: number
  examContribution: number
  examGrade: string
  gradePoints: number
  caStatus: 'PENDING' | 'INCOMPLETE' | 'COMPLETE'
  statusNote: string
  generatedAt: Date
  generatedBy: string
}

export interface FinalReportSubject {
  subjectId: string
  subjectName: string
  subjectCode: string
  caContribution: number
  examContribution: number
  finalScore: number
  grade: string
  gradePoints: number
  teacherName?: string
}

export interface FinalReportData {
  reportType: 'final'
  student: {
    id: string
    name: string
    admissionNumber: string
    class: string
    stream?: string
  }
  term: {
    id: string
    name: string
    academicYear: string
    startDate: Date
    endDate: Date
  }
  subjects: FinalReportSubject[]
  summary: {
    totalMarks: number
    averageScore: number
    position: number
    totalStudents: number
    overallGrade: string
    gradePoints: number
  }
  attendance: {
    daysPresent: number
    daysAbsent: number
    totalDays: number
    attendanceRate: number
  }
  remarks: {
    classTeacher?: string
    dos?: string
    headTeacher?: string
  }
  promotionDecision?: 'PROMOTED' | 'REPEAT' | 'CONDITIONAL' | 'PENDING'
  promotionReason?: string
  generatedAt: Date
  generatedBy: string
}

export type ReportData = CAOnlyReportData | ExamOnlyReportData | FinalReportData

export class ReportGenerationService {
  /**
   * Generate CA-Only Report
   */
  async generateCAOnlyReport(input: ReportGenerationInput): Promise<CAOnlyReportData[]> {
    const students = await this.getStudents(input.classId, input.studentIds)
    const term = await this.getTermDetails(input.termId)
    const subject = await this.getSubjectDetails(input.subjectId)
    const gradingSystem = await getGradingSystem(input.schoolId, 'CA_ONLY', input.classId, input.termId)
    
    if (!gradingSystem) {
      throw new Error('No CA grading system found')
    }
    
    const reports: CAOnlyReportData[] = []
    
    for (const student of students) {
      const caEntries = await prisma.cAEntry.findMany({
        where: {
          studentId: student.id,
          subjectId: input.subjectId,
          termId: input.termId,
          teacherId: input.teacherId,
        },
        orderBy: { createdAt: 'asc' },
      })
      
      if (caEntries.length === 0) continue
      
      const caActivities = caEntries.map(entry => {
        const percentage = (entry.rawScore / entry.maxScore) * 100
        const gradeResult = calculateGradeSync(percentage, gradingSystem.grades)
        
        return {
          name: entry.name,
          type: entry.type,
          score: entry.rawScore,
          maxScore: entry.maxScore,
          percentage: Math.round(percentage * 10) / 10,
          grade: gradeResult?.grade || 'N/A',
          date: entry.createdAt,
        }
      })
      
      const averagePercentage = caActivities.reduce((sum, act) => sum + act.percentage, 0) / caActivities.length
      const caContribution = (averagePercentage / 100) * 20
      const overallGradeResult = calculateGradeSync(averagePercentage, gradingSystem.grades)
      
      reports.push({
        reportType: 'ca-only',
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.class.name,
          stream: student.stream?.name,
        },
        subject: {
          id: subject.id,
          name: subject.name,
          code: subject.code,
        },
        term: {
          id: term.id,
          name: term.name,
          academicYear: term.academicYear.name,
        },
        caActivities,
        caSummary: {
          totalActivities: caActivities.length,
          averagePercentage: Math.round(averagePercentage * 10) / 10,
          caContribution: Math.round(caContribution * 10) / 10,
          overallGrade: overallGradeResult?.grade || 'N/A',
          gradePoints: overallGradeResult?.points || 0,
        },
        generatedAt: new Date(),
        generatedBy: input.teacherId,
      })
    }
    
    return reports
  }

  /**
   * Generate Exam-Only Report
   */
  async generateExamOnlyReport(input: ReportGenerationInput): Promise<ExamOnlyReportData[]> {
    const students = await this.getStudents(input.classId, input.studentIds)
    const term = await this.getTermDetails(input.termId)
    const subject = await this.getSubjectDetails(input.subjectId)
    const gradingSystem = await getGradingSystem(input.schoolId, 'EXAM_ONLY', input.classId, input.termId)
    
    if (!gradingSystem) {
      throw new Error('No Exam grading system found')
    }
    
    const reports: ExamOnlyReportData[] = []
    
    for (const student of students) {
      const examEntry = await prisma.examEntry.findFirst({
        where: {
          studentId: student.id,
          subjectId: input.subjectId,
          termId: input.termId,
          teacherId: input.teacherId,
        },
      })
      
      if (!examEntry) continue
      
      const examPercentage = (examEntry.examScore / examEntry.maxScore) * 100
      const examContribution = (examPercentage / 100) * 80
      const gradeResult = calculateGradeSync(examPercentage, gradingSystem.grades)
      
      const caCount = await prisma.cAEntry.count({
        where: {
          studentId: student.id,
          subjectId: input.subjectId,
          termId: input.termId,
        },
      })
      
      let caStatus: 'PENDING' | 'INCOMPLETE' | 'COMPLETE'
      let statusNote: string
      
      if (caCount === 0) {
        caStatus = 'PENDING'
        statusNote = 'CA pending - final score not available yet'
      } else if (caCount < 3) {
        caStatus = 'INCOMPLETE'
        statusNote = `CA incomplete (${caCount}/3 activities) - final score not available yet`
      } else {
        caStatus = 'COMPLETE'
        statusNote = 'CA complete - final report available'
      }
      
      reports.push({
        reportType: 'exam-only',
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.class.name,
          stream: student.stream?.name,
        },
        subject: {
          id: subject.id,
          name: subject.name,
          code: subject.code,
        },
        term: {
          id: term.id,
          name: term.name,
          academicYear: term.academicYear.name,
        },
        examScore: examEntry.examScore,
        examMaxScore: examEntry.maxScore,
        examPercentage: Math.round(examPercentage * 10) / 10,
        examContribution: Math.round(examContribution * 10) / 10,
        examGrade: gradeResult?.grade || 'N/A',
        gradePoints: gradeResult?.points || 0,
        caStatus,
        statusNote,
        generatedAt: new Date(),
        generatedBy: input.teacherId,
      })
    }
    
    return reports
  }

  /**
   * Generate Final Term Report
   */
  async generateFinalReport(
    classId: string,
    termId: string,
    schoolId: string,
    teacherId: string,
    studentIds?: string[]
  ): Promise<FinalReportData[]> {
    const students = await this.getStudents(classId, studentIds)
    const term = await this.getTermDetails(termId)
    const classSubjects = await prisma.classSubject.findMany({
      where: { classId },
      include: {
        subject: { select: { id: true, name: true, code: true } },
      },
    })
    
    const gradingSystem = await getGradingSystem(schoolId, 'FINAL', classId, termId)
    
    if (!gradingSystem) {
      throw new Error('No Final grading system found')
    }
    
    const reports: FinalReportData[] = []
    
    for (const student of students) {
      const subjects: FinalReportSubject[] = []
      
      for (const classSubject of classSubjects) {
        const subjectId = classSubject.subjectId
        
        const caEntries = await prisma.cAEntry.findMany({
          where: { studentId: student.id, subjectId, termId },
        })
        
        const examEntry = await prisma.examEntry.findFirst({
          where: { studentId: student.id, subjectId, termId },
        })
        
        if (caEntries.length === 0 && !examEntry) continue
        
        let caContribution = 0
        if (caEntries.length > 0) {
          const caPercentages = caEntries.map(ca => (ca.rawScore / ca.maxScore) * 100)
          const caAverage = caPercentages.reduce((sum, p) => sum + p, 0) / caPercentages.length
          caContribution = (caAverage / 100) * 20
        }
        
        let examContribution = 0
        if (examEntry) {
          const examPercentage = (examEntry.examScore / examEntry.maxScore) * 100
          examContribution = (examPercentage / 100) * 80
        }
        
        const finalScore = caContribution + examContribution
        const gradeResult = calculateGradeSync(finalScore, gradingSystem.grades)
        
        const teacher = await prisma.staff.findFirst({
          where: {
            schoolId,
            staffSubjects: { some: { classId, subjectId } },
          },
          select: { firstName: true, lastName: true },
        })
        
        subjects.push({
          subjectId,
          subjectName: classSubject.subject.name,
          subjectCode: classSubject.subject.code,
          caContribution: Math.round(caContribution * 10) / 10,
          examContribution: Math.round(examContribution * 10) / 10,
          finalScore: Math.round(finalScore * 10) / 10,
          grade: gradeResult?.grade || 'N/A',
          gradePoints: gradeResult?.points || 0,
          teacherName: teacher ? `${teacher.firstName} ${teacher.lastName}` : undefined,
        })
      }
      
      const totalMarks = subjects.reduce((sum, s) => sum + s.finalScore, 0)
      const averageScore = subjects.length > 0 ? totalMarks / subjects.length : 0
      const overallGradeResult = calculateGradeSync(averageScore, gradingSystem.grades)
      
      const { position, totalStudents } = await this.calculatePosition(student.id, classId, termId)
      const attendance = await this.getAttendanceSummary(student.id, termId)
      const promotionDecision = this.determinePromotionDecision(subjects, averageScore)
      
      reports.push({
        reportType: 'final',
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          admissionNumber: student.admissionNumber,
          class: student.class.name,
          stream: student.stream?.name,
        },
        term: {
          id: term.id,
          name: term.name,
          academicYear: term.academicYear.name,
          startDate: term.startDate,
          endDate: term.endDate,
        },
        subjects,
        summary: {
          totalMarks: Math.round(totalMarks * 10) / 10,
          averageScore: Math.round(averageScore * 10) / 10,
          position,
          totalStudents,
          overallGrade: overallGradeResult?.grade || 'N/A',
          gradePoints: overallGradeResult?.points || 0,
        },
        attendance,
        remarks: {},
        promotionDecision: promotionDecision.decision,
        promotionReason: promotionDecision.reason,
        generatedAt: new Date(),
        generatedBy: teacherId,
      })
    }
    
    return reports
  }

  // Helper Methods
  
  private async getStudents(classId: string, studentIds?: string[]) {
    return await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
        ...(studentIds && { id: { in: studentIds } }),
      },
      include: {
        class: { select: { name: true } },
        stream: { select: { name: true } },
      },
      orderBy: { lastName: 'asc' },
    })
  }
  
  private async getTermDetails(termId: string) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: { select: { name: true } } },
    })
    
    if (!term) throw new Error('Term not found')
    return term
  }
  
  private async getSubjectDetails(subjectId: string) {
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true, code: true },
    })
    
    if (!subject) throw new Error('Subject not found')
    return subject
  }
  
  private async calculatePosition(
    studentId: string,
    classId: string,
    termId: string
  ): Promise<{ position: number; totalStudents: number }> {
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true },
    })
    
    const studentAverages: Array<{ studentId: string; average: number }> = []
    
    for (const student of students) {
      const caEntries = await prisma.cAEntry.findMany({
        where: { studentId: student.id, termId },
      })
      
      const examEntries = await prisma.examEntry.findMany({
        where: { studentId: student.id, termId },
      })
      
      if (caEntries.length === 0 && examEntries.length === 0) continue
      
      let totalScore = 0
      let count = 0
      
      for (const ca of caEntries) {
        totalScore += (ca.rawScore / ca.maxScore) * 20
        count++
      }
      
      for (const exam of examEntries) {
        totalScore += (exam.examScore / exam.maxScore) * 80
        count++
      }
      
      const average = count > 0 ? totalScore / count : 0
      studentAverages.push({ studentId: student.id, average })
    }
    
    studentAverages.sort((a, b) => b.average - a.average)
    const position = studentAverages.findIndex(s => s.studentId === studentId) + 1
    
    return {
      position: position || studentAverages.length + 1,
      totalStudents: studentAverages.length,
    }
  }
  
  private async getAttendanceSummary(studentId: string, termId: string) {
    const term = await prisma.term.findUnique({
      where: { id: termId },
      select: { startDate: true, endDate: true },
    })
    
    if (!term) {
      return { daysPresent: 0, daysAbsent: 0, totalDays: 0, attendanceRate: 0 }
    }
    
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId,
        date: { gte: term.startDate, lte: term.endDate },
      },
    })
    
    const daysPresent = attendanceRecords.filter(a => a.status === 'PRESENT').length
    const daysAbsent = attendanceRecords.filter(a => a.status === 'ABSENT').length
    const totalDays = attendanceRecords.length
    const attendanceRate = totalDays > 0 ? (daysPresent / totalDays) * 100 : 0
    
    return {
      daysPresent,
      daysAbsent,
      totalDays,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
    }
  }
  
  private determinePromotionDecision(
    subjects: FinalReportSubject[],
    averageScore: number
  ): { decision: 'PROMOTED' | 'REPEAT' | 'CONDITIONAL' | 'PENDING'; reason: string } {
    if (subjects.length === 0) {
      return { decision: 'PENDING', reason: 'No subject scores available' }
    }
    
    const passedSubjects = subjects.filter(s => s.finalScore >= 50).length
    const totalSubjects = subjects.length
    const passRate = (passedSubjects / totalSubjects) * 100
    
    if (averageScore >= 50 && passRate >= 70) {
      return {
        decision: 'PROMOTED',
        reason: `Passed ${passedSubjects}/${totalSubjects} subjects with ${Math.round(averageScore)}% average`,
      }
    } else if (averageScore >= 40 && passRate >= 50) {
      return {
        decision: 'CONDITIONAL',
        reason: `Conditional promotion - passed ${passedSubjects}/${totalSubjects} subjects`,
      }
    } else {
      return {
        decision: 'REPEAT',
        reason: `Failed to meet promotion criteria - passed only ${passedSubjects}/${totalSubjects} subjects`,
      }
    }
  }

  /**
   * Generate Report Cards for Entire Class
   * Creates ReportCard records with DRAFT status
   */
  async generateClassReportCards(
    classId: string,
    termId: string,
    templateId: string,
    schoolId: string,
    generatedBy: string
  ): Promise<{
    successCount: number
    failureCount: number
    errors: string[]
    reportIds: string[]
  }> {
    const startTime = Date.now()
    const errors: string[] = []
    const reportIds: string[] = []
    let successCount = 0
    let failureCount = 0

    try {
      // Get all active students in the class
      const students = await prisma.student.findMany({
        where: { classId, status: 'ACTIVE' },
        select: { id: true },
      })

      // Generate report card for each student
      for (const student of students) {
        try {
          const reportCard = await this.generateStudentReportCard(
            student.id,
            termId,
            templateId,
            schoolId,
            generatedBy
          )
          reportIds.push(reportCard.id)
          successCount++
        } catch (error) {
          failureCount++
          errors.push(`Student ${student.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Log the generation
      const generationTime = (Date.now() - startTime) / 1000
      await prisma.reportGenerationLog.create({
        data: {
          schoolId,
          classId,
          termId,
          action: 'GENERATED',
          status: failureCount === 0 ? 'SUCCESS' : failureCount === students.length ? 'FAILED' : 'PARTIAL',
          totalStudents: students.length,
          successCount,
          failureCount,
          generationTime,
          errors: errors.length > 0 ? errors : null,
          performedBy: generatedBy,
        },
      })

      return { successCount, failureCount, errors, reportIds }
    } catch (error) {
      throw new Error(`Failed to generate class report cards: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate Single Student Report Card
   * Creates a ReportCard record with DRAFT status
   */
  async generateStudentReportCard(
    studentId: string,
    termId: string,
    templateId: string,
    schoolId: string,
    generatedBy: string
  ): Promise<{ id: string; status: string }> {
    try {
      // Get student details
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { id: true, classId: true },
      })

      if (!student) {
        throw new Error('Student not found')
      }

      // Check if report card already exists
      const existingReport = await prisma.reportCard.findUnique({
        where: {
          studentId_termId: {
            studentId,
            termId,
          },
        },
      })

      if (existingReport) {
        // Update existing report to DRAFT status
        const updated = await prisma.reportCard.update({
          where: { id: existingReport.id },
          data: {
            status: 'DRAFT',
            generatedAt: new Date(),
            approvedAt: null,
            approvedBy: null,
            publishedAt: null,
            publishedBy: null,
            secureToken: null,
            linkExpiresAt: null,
          },
        })
        return { id: updated.id, status: 'UPDATED' }
      }

      // Create new report card
      const reportCard = await prisma.reportCard.create({
        data: {
          schoolId,
          studentId,
          classId: student.classId,
          termId,
          status: 'DRAFT',
          generatedAt: new Date(),
        },
      })

      return { id: reportCard.id, status: 'CREATED' }
    } catch (error) {
      throw new Error(`Failed to generate student report card: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Regenerate Class Report Cards
   * Updates existing report cards back to DRAFT status
   */
  async regenerateClassReportCards(
    classId: string,
    termId: string,
    schoolId: string,
    regeneratedBy: string
  ): Promise<{
    successCount: number
    failureCount: number
    errors: string[]
  }> {
    const startTime = Date.now()
    const errors: string[] = []
    let successCount = 0
    let failureCount = 0

    try {
      // Get all report cards for the class/term
      const reportCards = await prisma.reportCard.findMany({
        where: { classId, termId },
        select: { id: true, studentId: true },
      })

      // Regenerate each report card
      for (const report of reportCards) {
        try {
          await prisma.reportCard.update({
            where: { id: report.id },
            data: {
              status: 'DRAFT',
              generatedAt: new Date(),
              approvedAt: null,
              approvedBy: null,
              publishedAt: null,
              publishedBy: null,
              secureToken: null,
              linkExpiresAt: null,
            },
          })
          successCount++
        } catch (error) {
          failureCount++
          errors.push(`Report ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Log the regeneration
      const generationTime = (Date.now() - startTime) / 1000
      await prisma.reportGenerationLog.create({
        data: {
          schoolId,
          classId,
          termId,
          action: 'REGENERATED',
          status: failureCount === 0 ? 'SUCCESS' : failureCount === reportCards.length ? 'FAILED' : 'PARTIAL',
          totalStudents: reportCards.length,
          successCount,
          failureCount,
          generationTime,
          errors: errors.length > 0 ? errors : null,
          performedBy: regeneratedBy,
        },
      })

      return { successCount, failureCount, errors }
    } catch (error) {
      throw new Error(`Failed to regenerate class report cards: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const reportGenerationService = new ReportGenerationService()