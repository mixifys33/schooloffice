/**
 * Results Processing Service
 * Handles results calculation, grade determination, and report card generation
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
import { prisma } from '@/lib/db'
import { Result, Mark, GradeRange, PublishedReportCard, PublishReportCardInput, ReportCardAccessResult } from '@/types'

/**
 * Map Prisma Result to domain Result type
 */
function mapPrismaResultToDomain(prismaResult: {
  id: string
  studentId: string
  termId: string
  totalMarks: number
  average: number
  position: number
  totalStudents: number | null
  grade: string | null
  teacherRemarks: string | null
  headTeacherRemarks: string | null
  createdAt: Date
  updatedAt: Date
}): Result {
  return {
    id: prismaResult.id,
    studentId: prismaResult.studentId,
    termId: prismaResult.termId,
    totalMarks: prismaResult.totalMarks,
    average: prismaResult.average,
    position: prismaResult.position,
    totalStudents: prismaResult.totalStudents ?? undefined,
    grade: prismaResult.grade ?? undefined,
    teacherRemarks: prismaResult.teacherRemarks ?? undefined,
    headTeacherRemarks: prismaResult.headTeacherRemarks ?? undefined,
    createdAt: prismaResult.createdAt,
    updatedAt: prismaResult.updatedAt,
  }
}

/**
 * Student marks summary for results processing
 */
export interface StudentMarksSummary {
  studentId: string
  studentName: string
  classId: string
  marks: {
    subjectId: string
    subjectName: string
    score: number
    maxScore: number
    percentage: number
    grade?: string
  }[]
  totalMarks: number
  totalMaxMarks: number
  average: number
  overallGrade?: string
}

/**
 * Class results summary
 */
export interface ClassResultsSummary {
  classId: string
  className: string
  termId: string
  totalStudents: number
  results: {
    studentId: string
    studentName: string
    totalMarks: number
    average: number
    position: number
    grade?: string
  }[]
}

/**
 * Report card data structure
 */
export interface ReportCardData {
  student: {
    id: string
    name: string
    admissionNumber: string
    className: string
    streamName?: string
  }
  school: {
    name: string
    address?: string
    phone?: string
    logo?: string
  }
  term: {
    name: string
    academicYear: string
  }
  subjects: {
    name: string
    code: string
    score: number
    maxScore: number
    percentage: number
    grade?: string
    remarks?: string
  }[]
  summary: {
    totalMarks: number
    totalMaxMarks: number
    average: number
    position: number
    totalStudents: number
    overallGrade?: string
  }
  remarks: {
    teacherRemarks?: string
    headTeacherRemarks?: string
  }
  generatedAt: Date
}


export class ResultsService {
  // ============================================
  // RESULTS CALCULATION
  // ============================================

  /**
   * Calculate total marks for a student in a term
   * Requirement 8.1: Calculate totals from subject marks
   */
  calculateTotalMarks(marks: { score: number }[]): number {
    return marks.reduce((sum, mark) => sum + mark.score, 0)
  }

  /**
   * Calculate average marks for a student
   * Requirement 8.1: Calculate averages from subject marks
   */
  calculateAverage(totalMarks: number, subjectCount: number): number {
    if (subjectCount === 0) return 0
    return Math.round((totalMarks / subjectCount) * 100) / 100
  }

  /**
   * Calculate percentage for a score
   */
  calculatePercentage(score: number, maxScore: number): number {
    if (maxScore === 0) return 0
    return Math.round((score / maxScore) * 10000) / 100
  }

  /**
   * Determine grade based on percentage and grade ranges
   * Requirement 8.2: Apply grading system to determine grades
   */
  determineGrade(percentage: number, gradeRanges: GradeRange[]): string | undefined {
    for (const range of gradeRanges) {
      if (percentage >= range.minScore && percentage <= range.maxScore) {
        return range.grade
      }
    }
    return undefined
  }

  /**
   * Calculate class positions based on averages
   * Requirement 8.1: Calculate positions
   */
  calculatePositions(
    students: { studentId: string; average: number }[]
  ): { studentId: string; average: number; position: number }[] {
    // Sort by average descending
    const sorted = [...students].sort((a, b) => b.average - a.average)

    // Assign positions (handle ties)
    const withPositions: { studentId: string; average: number; position: number }[] = []
    let currentPosition = 1

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].average < sorted[i - 1].average) {
        currentPosition = i + 1
      }
      withPositions.push({
        ...sorted[i],
        position: currentPosition,
      })
    }

    return withPositions
  }

  /**
   * Get student marks summary for a term
   */
  async getStudentMarksSummary(
    studentId: string,
    termId: string
  ): Promise<StudentMarksSummary | null> {
    // Get student info
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        stream: true,
      },
    })

    if (!student) return null

    // Get all exams for the term
    const exams = await prisma.exam.findMany({
      where: { termId },
      select: { id: true },
    })

    const examIds = exams.map((e) => e.id)

    // Get all marks for the student in these exams
    const marks = await prisma.mark.findMany({
      where: {
        studentId,
        examId: { in: examIds },
      },
      include: {
        subject: {
          include: {
            gradingSystem: {
              include: { grades: true },
            },
          },
        },
      },
    })

    // Aggregate marks by subject (sum scores across exams)
    const subjectMarks = new Map<
      string,
      { subjectId: string; subjectName: string; totalScore: number; totalMaxScore: number; gradeRanges: GradeRange[] }
    >()

    for (const mark of marks) {
      const existing = subjectMarks.get(mark.subjectId)
      const gradeRanges: GradeRange[] = mark.subject.gradingSystem?.grades.map((g) => ({
        id: g.id,
        gradingSystemId: g.gradingSystemId,
        grade: g.grade,
        minScore: g.minScore,
        maxScore: g.maxScore,
        points: g.points,
        remarks: g.remarks ?? undefined,
        createdAt: g.createdAt,
      })) ?? []

      if (existing) {
        existing.totalScore += mark.score
        existing.totalMaxScore += mark.maxScore
      } else {
        subjectMarks.set(mark.subjectId, {
          subjectId: mark.subjectId,
          subjectName: mark.subject.name,
          totalScore: mark.score,
          totalMaxScore: mark.maxScore,
          gradeRanges,
        })
      }
    }

    // Calculate percentages and grades
    const subjectResults = Array.from(subjectMarks.values()).map((sm) => {
      const percentage = this.calculatePercentage(sm.totalScore, sm.totalMaxScore)
      const grade = this.determineGrade(percentage, sm.gradeRanges)
      return {
        subjectId: sm.subjectId,
        subjectName: sm.subjectName,
        score: sm.totalScore,
        maxScore: sm.totalMaxScore,
        percentage,
        grade,
      }
    })

    const totalMarks = this.calculateTotalMarks(subjectResults)
    const totalMaxMarks = subjectResults.reduce((sum, s) => sum + s.maxScore, 0)
    const average = this.calculateAverage(totalMarks, subjectResults.length)

    // Get overall grade based on average percentage
    const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0
    const defaultGradeRanges = subjectResults[0]?.grade ? subjectMarks.values().next().value?.gradeRanges : []
    const overallGrade = this.determineGrade(overallPercentage, defaultGradeRanges || [])

    return {
      studentId,
      studentName: `${student.firstName} ${student.lastName}`,
      classId: student.classId,
      marks: subjectResults,
      totalMarks,
      totalMaxMarks,
      average,
      overallGrade,
    }
  }


  /**
   * Process results for all students in a class for a term
   * Requirement 8.1, 8.2: Calculate totals, averages, grades, and positions
   */
  async processClassResults(classId: string, termId: string): Promise<ClassResultsSummary> {
    // Get class info
    const classInfo = await prisma.class.findUnique({
      where: { id: classId },
    })

    if (!classInfo) {
      throw new Error(`Class with id ${classId} not found`)
    }

    // Get all active students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
      },
    })

    // Get marks summary for each student
    const studentSummaries: { studentId: string; studentName: string; totalMarks: number; average: number }[] = []

    for (const student of students) {
      const summary = await this.getStudentMarksSummary(student.id, termId)
      if (summary) {
        studentSummaries.push({
          studentId: student.id,
          studentName: summary.studentName,
          totalMarks: summary.totalMarks,
          average: summary.average,
        })
      }
    }

    // Calculate positions
    const withPositions = this.calculatePositions(studentSummaries)

    // Get grade for each student
    const resultsWithGrades = await Promise.all(
      withPositions.map(async (r) => {
        const summary = await this.getStudentMarksSummary(r.studentId, termId)
        return {
          ...r,
          grade: summary?.overallGrade,
        }
      })
    )

    return {
      classId,
      className: classInfo.name,
      termId,
      totalStudents: students.length,
      results: resultsWithGrades,
    }
  }

  /**
   * Save processed results to database
   */
  async saveResults(
    termId: string,
    results: { studentId: string; totalMarks: number; average: number; position: number; totalStudents: number; grade?: string }[]
  ): Promise<Result[]> {
    const savedResults: Result[] = []

    for (const result of results) {
      const saved = await prisma.result.upsert({
        where: {
          studentId_termId: {
            studentId: result.studentId,
            termId,
          },
        },
        update: {
          totalMarks: result.totalMarks,
          average: result.average,
          position: result.position,
          totalStudents: result.totalStudents,
          grade: result.grade,
        },
        create: {
          studentId: result.studentId,
          termId,
          totalMarks: result.totalMarks,
          average: result.average,
          position: result.position,
          totalStudents: result.totalStudents,
          grade: result.grade,
        },
      })

      savedResults.push(mapPrismaResultToDomain(saved))
    }

    return savedResults
  }

  /**
   * Process and save results for a class
   */
  async processAndSaveClassResults(classId: string, termId: string): Promise<Result[]> {
    const summary = await this.processClassResults(classId, termId)

    const resultsToSave = summary.results.map((r) => ({
      studentId: r.studentId,
      totalMarks: r.totalMarks,
      average: r.average,
      position: r.position,
      totalStudents: summary.totalStudents,
      grade: r.grade,
    }))

    return this.saveResults(termId, resultsToSave)
  }

  /**
   * Get result for a student in a term
   */
  async getStudentResult(studentId: string, termId: string): Promise<Result | null> {
    const result = await prisma.result.findUnique({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
    })

    if (!result) return null
    return mapPrismaResultToDomain(result)
  }

  /**
   * Update teacher remarks for a result
   */
  async updateTeacherRemarks(studentId: string, termId: string, remarks: string): Promise<Result> {
    const result = await prisma.result.update({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
      data: { teacherRemarks: remarks },
    })

    return mapPrismaResultToDomain(result)
  }

  /**
   * Update head teacher remarks for a result
   */
  async updateHeadTeacherRemarks(studentId: string, termId: string, remarks: string): Promise<Result> {
    const result = await prisma.result.update({
      where: {
        studentId_termId: {
          studentId,
          termId,
        },
      },
      data: { headTeacherRemarks: remarks },
    })

    return mapPrismaResultToDomain(result)
  }


  // ============================================
  // REPORT CARD GENERATION
  // ============================================

  /**
   * Generate report card data for a student
   * Requirement 8.3: Generate report card with student details, marks, grades, positions
   */
  async generateReportCardData(studentId: string, termId: string): Promise<ReportCardData | null> {
    // Get student with class and stream
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        class: true,
        stream: true,
        school: true,
      },
    })

    if (!student) return null

    // Get term with academic year
    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { academicYear: true },
    })

    if (!term) return null

    // Get marks summary
    const marksSummary = await this.getStudentMarksSummary(studentId, termId)
    if (!marksSummary) return null

    // Get result (for position and remarks)
    const result = await this.getStudentResult(studentId, termId)

    // Get subject details with grades
    const subjects = marksSummary.marks.map((m) => ({
      name: m.subjectName,
      code: m.subjectId.substring(0, 6).toUpperCase(), // Simplified code
      score: m.score,
      maxScore: m.maxScore,
      percentage: m.percentage,
      grade: m.grade,
      remarks: this.getGradeRemarks(m.grade),
    }))

    return {
      student: {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        className: student.class.name,
        streamName: student.stream?.name,
      },
      school: {
        name: student.school.name,
        address: student.school.address ?? undefined,
        phone: student.school.phone ?? undefined,
        logo: student.school.logo ?? undefined,
      },
      term: {
        name: term.name,
        academicYear: term.academicYear.name,
      },
      subjects,
      summary: {
        totalMarks: marksSummary.totalMarks,
        totalMaxMarks: marksSummary.totalMaxMarks,
        average: marksSummary.average,
        position: result?.position ?? 0,
        totalStudents: result?.totalStudents ?? 0,
        overallGrade: marksSummary.overallGrade,
      },
      remarks: {
        teacherRemarks: result?.teacherRemarks,
        headTeacherRemarks: result?.headTeacherRemarks,
      },
      generatedAt: new Date(),
    }
  }

  /**
   * Get remarks for a grade
   */
  private getGradeRemarks(grade?: string): string | undefined {
    const remarksMap: Record<string, string> = {
      A: 'Excellent',
      B: 'Very Good',
      C: 'Good',
      D: 'Fair',
      E: 'Needs Improvement',
      F: 'Fail',
    }
    return grade ? remarksMap[grade] : undefined
  }

  /**
   * Generate report card HTML content
   * Requirement 8.5: Produce printable format
   */
  generateReportCardHTML(data: ReportCardData): string {
    const subjectRows = data.subjects
      .map(
        (s) => `
        <tr>
          <td>${s.name}</td>
          <td>${s.score}/${s.maxScore}</td>
          <td>${s.percentage.toFixed(1)}%</td>
          <td>${s.grade || '-'}</td>
          <td>${s.remarks || '-'}</td>
        </tr>
      `
      )
      .join('')

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Report Card - ${data.student.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 20px; }
    .school-name { font-size: 24px; font-weight: bold; }
    .student-info { margin-bottom: 20px; }
    .info-row { display: flex; justify-content: space-between; margin: 5px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    .summary { margin: 20px 0; padding: 15px; background-color: #f9f9f9; }
    .remarks { margin: 20px 0; }
    .remarks-section { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">${data.school.name}</div>
    ${data.school.address ? `<div>${data.school.address}</div>` : ''}
    ${data.school.phone ? `<div>Tel: ${data.school.phone}</div>` : ''}
    <h2>STUDENT REPORT CARD</h2>
    <div>${data.term.name} - ${data.term.academicYear}</div>
  </div>

  <div class="student-info">
    <div class="info-row">
      <span><strong>Name:</strong> ${data.student.name}</span>
      <span><strong>Admission No:</strong> ${data.student.admissionNumber}</span>
    </div>
    <div class="info-row">
      <span><strong>Class:</strong> ${data.student.className}${data.student.streamName ? ` (${data.student.streamName})` : ''}</span>
      <span><strong>Position:</strong> ${data.summary.position} of ${data.summary.totalStudents}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th>Marks</th>
        <th>Percentage</th>
        <th>Grade</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>

  <div class="summary">
    <div class="info-row">
      <span><strong>Total Marks:</strong> ${data.summary.totalMarks}/${data.summary.totalMaxMarks}</span>
      <span><strong>Average:</strong> ${data.summary.average.toFixed(2)}</span>
    </div>
    <div class="info-row">
      <span><strong>Overall Grade:</strong> ${data.summary.overallGrade || '-'}</span>
      <span><strong>Position:</strong> ${data.summary.position} out of ${data.summary.totalStudents}</span>
    </div>
  </div>

  <div class="remarks">
    <div class="remarks-section">
      <strong>Class Teacher's Remarks:</strong>
      <p>${data.remarks.teacherRemarks || 'No remarks'}</p>
    </div>
    <div class="remarks-section">
      <strong>Head Teacher's Remarks:</strong>
      <p>${data.remarks.headTeacherRemarks || 'No remarks'}</p>
    </div>
  </div>

  <div class="footer">
    <p>Generated on: ${data.generatedAt.toLocaleDateString()}</p>
  </div>
</body>
</html>
    `
  }

  /**
   * Validate report card content completeness
   * Requirement 8.3: Include student details, subject marks, grades, positions, and teacher remarks
   */
  validateReportCardCompleteness(data: ReportCardData): { complete: boolean; missing: string[] } {
    const missing: string[] = []

    // Check student details
    if (!data.student.name) missing.push('student name')
    if (!data.student.admissionNumber) missing.push('admission number')
    if (!data.student.className) missing.push('class name')

    // Check school details
    if (!data.school.name) missing.push('school name')

    // Check term details
    if (!data.term.name) missing.push('term name')
    if (!data.term.academicYear) missing.push('academic year')

    // Check subjects
    if (data.subjects.length === 0) missing.push('subject marks')

    // Check summary
    if (data.summary.position === 0) missing.push('position')
    if (data.summary.totalStudents === 0) missing.push('total students')

    return {
      complete: missing.length === 0,
      missing,
    }
  }

  // ============================================
  // REPORT CARD PUBLISHING
  // ============================================

  /**
   * Map Prisma PublishedReportCard to domain type
   */
  private mapPrismaPublishedReportCardToDomain(prismaRecord: {
    id: string
    resultId: string
    studentId: string
    termId: string
    schoolId: string
    publishedBy: string
    publishedAt: Date
    htmlContent: string | null
    isAccessible: boolean
  }): PublishedReportCard {
    return {
      id: prismaRecord.id,
      resultId: prismaRecord.resultId,
      studentId: prismaRecord.studentId,
      termId: prismaRecord.termId,
      schoolId: prismaRecord.schoolId,
      publishedBy: prismaRecord.publishedBy,
      publishedAt: prismaRecord.publishedAt,
      htmlContent: prismaRecord.htmlContent ?? undefined,
      isAccessible: prismaRecord.isAccessible,
    }
  }

  /**
   * Publish a report card for a student
   * Requirement 8.4: Make reports accessible to students and guardians
   */
  async publishReportCard(input: PublishReportCardInput): Promise<PublishedReportCard> {
    // Verify result exists
    const result = await prisma.result.findUnique({
      where: {
        studentId_termId: {
          studentId: input.studentId,
          termId: input.termId,
        },
      },
    })

    if (!result) {
      throw new Error(`Result not found for student ${input.studentId} in term ${input.termId}`)
    }

    // Generate HTML content if not provided
    let htmlContent = input.htmlContent
    if (!htmlContent) {
      const reportCardData = await this.generateReportCardData(input.studentId, input.termId)
      if (reportCardData) {
        htmlContent = this.generateReportCardHTML(reportCardData)
      }
    }

    // Create or update published report card
    const published = await prisma.publishedReportCard.upsert({
      where: { resultId: result.id },
      update: {
        publishedBy: input.publishedBy,
        publishedAt: new Date(),
        htmlContent,
        isAccessible: true,
      },
      create: {
        resultId: result.id,
        studentId: input.studentId,
        termId: input.termId,
        schoolId: input.schoolId,
        publishedBy: input.publishedBy,
        htmlContent,
        isAccessible: true,
      },
    })

    return this.mapPrismaPublishedReportCardToDomain(published)
  }

  /**
   * Publish report cards for all students in a class
   * Requirement 8.4: Make reports accessible to students and guardians
   */
  async publishClassReportCards(
    classId: string,
    termId: string,
    schoolId: string,
    publishedBy: string
  ): Promise<{ successful: PublishedReportCard[]; failed: { studentId: string; error: string }[] }> {
    // Get all active students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
      },
      select: { id: true },
    })

    const successful: PublishedReportCard[] = []
    const failed: { studentId: string; error: string }[] = []

    for (const student of students) {
      try {
        const published = await this.publishReportCard({
          studentId: student.id,
          termId,
          schoolId,
          publishedBy,
        })
        successful.push(published)
      } catch (error) {
        failed.push({
          studentId: student.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return { successful, failed }
  }

  /**
   * Check if a student can access a report card
   * Requirement 8.4: Make reports accessible to students
   */
  async canStudentAccessReportCard(studentId: string, termId: string): Promise<ReportCardAccessResult> {
    const published = await prisma.publishedReportCard.findFirst({
      where: {
        studentId,
        termId,
      },
    })

    if (!published) {
      return {
        hasAccess: false,
        reason: 'Report card has not been published yet',
      }
    }

    if (!published.isAccessible) {
      return {
        hasAccess: false,
        reason: 'Report card access has been revoked',
      }
    }

    return {
      hasAccess: true,
      reportCard: this.mapPrismaPublishedReportCardToDomain(published),
    }
  }

  /**
   * Check if a guardian can access a student's report card
   * Requirement 8.4: Make reports accessible to guardians
   */
  async canGuardianAccessReportCard(
    guardianId: string,
    studentId: string,
    termId: string
  ): Promise<ReportCardAccessResult> {
    // Verify guardian is linked to the student
    const studentGuardian = await prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId,
          guardianId,
        },
      },
    })

    if (!studentGuardian) {
      return {
        hasAccess: false,
        reason: 'Guardian is not linked to this student',
      }
    }

    // Check if report card is published and accessible
    return this.canStudentAccessReportCard(studentId, termId)
  }

  /**
   * Get published report card for a student
   * Requirement 8.4: Make reports accessible to students and guardians
   */
  async getPublishedReportCard(studentId: string, termId: string): Promise<PublishedReportCard | null> {
    const published = await prisma.publishedReportCard.findFirst({
      where: {
        studentId,
        termId,
        isAccessible: true,
      },
    })

    if (!published) return null
    return this.mapPrismaPublishedReportCardToDomain(published)
  }

  /**
   * Get all published report cards for a student
   */
  async getStudentPublishedReportCards(studentId: string): Promise<PublishedReportCard[]> {
    const published = await prisma.publishedReportCard.findMany({
      where: {
        studentId,
        isAccessible: true,
      },
      orderBy: { publishedAt: 'desc' },
    })

    return published.map((p) => this.mapPrismaPublishedReportCardToDomain(p))
  }

  /**
   * Get all published report cards for a guardian's linked students
   */
  async getGuardianPublishedReportCards(guardianId: string): Promise<PublishedReportCard[]> {
    // Get all students linked to this guardian
    const studentGuardians = await prisma.studentGuardian.findMany({
      where: { guardianId },
      select: { studentId: true },
    })

    const studentIds = studentGuardians.map((sg) => sg.studentId)

    const published = await prisma.publishedReportCard.findMany({
      where: {
        studentId: { in: studentIds },
        isAccessible: true,
      },
      orderBy: { publishedAt: 'desc' },
    })

    return published.map((p) => this.mapPrismaPublishedReportCardToDomain(p))
  }

  /**
   * Revoke access to a published report card
   */
  async revokeReportCardAccess(studentId: string, termId: string): Promise<PublishedReportCard | null> {
    const published = await prisma.publishedReportCard.findFirst({
      where: {
        studentId,
        termId,
      },
    })

    if (!published) return null

    const updated = await prisma.publishedReportCard.update({
      where: { id: published.id },
      data: { isAccessible: false },
    })

    return this.mapPrismaPublishedReportCardToDomain(updated)
  }

  /**
   * Restore access to a published report card
   */
  async restoreReportCardAccess(studentId: string, termId: string): Promise<PublishedReportCard | null> {
    const published = await prisma.publishedReportCard.findFirst({
      where: {
        studentId,
        termId,
      },
    })

    if (!published) return null

    const updated = await prisma.publishedReportCard.update({
      where: { id: published.id },
      data: { isAccessible: true },
    })

    return this.mapPrismaPublishedReportCardToDomain(updated)
  }

  /**
   * Check if a report card is published for a student
   */
  async isReportCardPublished(studentId: string, termId: string): Promise<boolean> {
    const count = await prisma.publishedReportCard.count({
      where: {
        studentId,
        termId,
      },
    })

    return count > 0
  }

  /**
   * Get publishing status for all students in a class
   */
  async getClassPublishingStatus(
    classId: string,
    termId: string
  ): Promise<{ studentId: string; studentName: string; isPublished: boolean; isAccessible: boolean }[]> {
    // Get all active students in the class
    const students = await prisma.student.findMany({
      where: {
        classId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    })

    // Get all published report cards for this class and term
    const published = await prisma.publishedReportCard.findMany({
      where: {
        studentId: { in: students.map((s) => s.id) },
        termId,
      },
    })

    const publishedMap = new Map(published.map((p) => [p.studentId, p]))

    return students.map((student) => {
      const pub = publishedMap.get(student.id)
      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        isPublished: !!pub,
        isAccessible: pub?.isAccessible ?? false,
      }
    })
  }
}

// Export singleton instance
export const resultsService = new ResultsService()
