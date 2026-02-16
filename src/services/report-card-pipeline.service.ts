/**
 * Report Card Pipeline Service
 * 
 * Complete pipeline for:
 * 1. Calculating final marks (CA + Exam)
 * 2. Generating report card PDFs
 * 3. Deploying PDFs to accessible URLs
 * 4. Shortening URLs
 * 5. Storing in database
 *    
 * Every step is console logged for transparency
 */

import { prisma } from '@/lib/db'
import { urlShortenerService } from './url-shortener.service'
import { resultsService } from './results.service'
import { pdfGenerationService } from './pdf-generation.service'

export interface StudentMarks {
  studentId: string
  studentName: string
  admissionNumber: string
  caTotal: number // Out of 20
  examTotal: number // Out of 80
  finalTotal: number // Out of 100
  grade: string
  position: number
}

export interface ApprovalPipelineInput {
  classId: string
  subjectId: string
  termId: string
  schoolId: string
  approvedBy: string
}

export interface ApprovalPipelineResult {
  success: boolean
  studentsProcessed: number
  reportCardsGenerated: number
  urlsCreated: number
  errors: Array<{ studentId: string; error: string }>
  reportCards: Array<{
    studentId: string
    studentName: string
    pdfUrl: string
    shortUrl: string
    reportCardId: string
  }>
}

class ReportCardPipelineService {
  /**
   * Main pipeline: Approve marks → Generate PDFs → Deploy URLs → Shorten → Store
   */
  async processApprovalPipeline(
    input: ApprovalPipelineInput
  ): Promise<ApprovalPipelineResult> {
    console.log('🚀 [PIPELINE] Starting Report Card Pipeline')
    console.log('📋 [PIPELINE] Input:', {
      classId: input.classId,
      subjectId: input.subjectId,
      termId: input.termId,
      schoolId: input.schoolId,
      approvedBy: input.approvedBy,
    })

    const result: ApprovalPipelineResult = {
      success: false,
      studentsProcessed: 0,
      reportCardsGenerated: 0,
      urlsCreated: 0,
      errors: [],
      reportCards: [],
    }

    try {
      // Step 1: Get all students in the class
      console.log('📚 [STEP 1] Fetching students...')
      const students = await this.getStudentsInClass(input.classId, input.schoolId)
      console.log(`✅ [STEP 1] Found ${students.length} students`)
      result.studentsProcessed = students.length

      // Step 2: Calculate marks for each student (CA + Exam)
      console.log('🧮 [STEP 2] Calculating marks (CA + Exam)...')
      const studentMarks = await this.calculateStudentMarks(
        students,
        input.subjectId,
        input.termId,
        input.schoolId
      )
      console.log(`✅ [STEP 2] Calculated marks for ${studentMarks.length} students`)

      // Step 3: Mark as approved in DosApproval
      console.log('✔️ [STEP 3] Marking as approved...')
      await this.markAsApproved(input.classId, input.subjectId, input.approvedBy)
      console.log('✅ [STEP 3] Marks approved successfully')

      // Step 4: Generate report cards for each student
      console.log('📄 [STEP 4] Generating report card PDFs...')
      for (const student of students) {
        try {
          console.log(`  📝 [STEP 4.${students.indexOf(student) + 1}] Processing ${student.firstName} ${student.lastName}...`)
          
          // Generate report card data
          const reportCardData = await resultsService.generateReportCardData(
            student.id,
            input.termId
          )

          if (!reportCardData) {
            console.log(`  ⚠️ [STEP 4.${students.indexOf(student) + 1}] No data available for ${student.firstName}`)
            result.errors.push({
              studentId: student.id,
              error: 'No report card data available',
            })
            continue
          }

          // Generate HTML
          const htmlContent = resultsService.generateReportCardHTML(reportCardData)
          console.log(`  ✅ [STEP 4.${students.indexOf(student) + 1}] HTML generated`)

          // Generate PDF
          const pdfBuffer = await this.generatePDF(htmlContent, student.id)
          console.log(`  ✅ [STEP 4.${students.indexOf(student) + 1}] PDF generated (${pdfBuffer.length} bytes)`)

          // Step 5: Deploy PDF to accessible URL
          console.log(`  🌐 [STEP 5.${students.indexOf(student) + 1}] Deploying PDF...`)
          const pdfUrl = await this.deployPDF(pdfBuffer, student.id, input.termId, input.schoolId)
          console.log(`  ✅ [STEP 5.${students.indexOf(student) + 1}] PDF deployed: ${pdfUrl}`)
          result.urlsCreated++

          // Step 6: Create short URL
          console.log(`  🔗 [STEP 6.${students.indexOf(student) + 1}] Creating short URL...`)
          const shortUrlData = await urlShortenerService.createShortUrl({
            originalUrl: pdfUrl,
            schoolId: input.schoolId,
            studentId: student.id,
            channel: 'SMS',
          })
          const shortUrl = urlShortenerService.getBaseUrl() + '/' + shortUrlData.code
          console.log(`  ✅ [STEP 6.${students.indexOf(student) + 1}] Short URL created: ${shortUrl}`)

          // Step 7: Store in database
          console.log(`  💾 [STEP 7.${students.indexOf(student) + 1}] Storing in database...`)
          const reportCard = await this.storeReportCard({
            studentId: student.id,
            termId: input.termId,
            schoolId: input.schoolId,
            pdfUrl,
            shortUrl,
            htmlContent,
            approvedBy: input.approvedBy,
          })
          console.log(`  ✅ [STEP 7.${students.indexOf(student) + 1}] Stored with ID: ${reportCard.id}`)

          result.reportCardsGenerated++
          result.reportCards.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            pdfUrl,
            shortUrl,
            reportCardId: reportCard.id,
          })

          console.log(`  ✅ [COMPLETE] ${student.firstName} ${student.lastName} - Report card ready!`)
        } catch (error: any) {
          console.error(`  ❌ [ERROR] Failed for ${student.firstName}:`, error.message)
          result.errors.push({
            studentId: student.id,
            error: error.message,
          })
        }
      }

      console.log('🎉 [PIPELINE] Pipeline completed successfully!')
      console.log('📊 [PIPELINE] Summary:', {
        studentsProcessed: result.studentsProcessed,
        reportCardsGenerated: result.reportCardsGenerated,
        urlsCreated: result.urlsCreated,
        errors: result.errors.length,
      })

      result.success = result.errors.length === 0
      return result
    } catch (error: any) {
      console.error('❌ [PIPELINE] Fatal error:', error)
      throw error
    }
  }

  /**
   * Get all students in a class
   */
  private async getStudentsInClass(classId: string, schoolId: string) {
    return await prisma.student.findMany({
      where: {
        classId,
        schoolId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    })
  }

  /**
   * Calculate marks for each student (CA + Exam = Final)
   */
  private async calculateStudentMarks(
    students: any[],
    subjectId: string,
    termId: string,
    schoolId: string
  ): Promise<StudentMarks[]> {
    const studentMarks: StudentMarks[] = []

    for (const student of students) {
      // Get CA entries (all CA for this term/subject)
      const caEntries = await prisma.cAEntry.findMany({
        where: {
          studentId: student.id,
          subjectId,
          termId,
          status: 'SUBMITTED', // Only count submitted CA
        },
        select: {
          rawScore: true,
          maxScore: true,
        },
      })

      // Calculate CA total (sum all CA, then scale to /20)
      let caRawTotal = 0
      let caMaxTotal = 0
      caEntries.forEach((entry) => {
        caRawTotal += entry.rawScore
        caMaxTotal += entry.maxScore
      })
      const caPercentage = caMaxTotal > 0 ? (caRawTotal / caMaxTotal) * 100 : 0
      const caTotal = (caPercentage / 100) * 20 // Scale to /20

      // Get Exam entry
      const examEntry = await prisma.examEntry.findFirst({
        where: {
          studentId: student.id,
          subjectId,
          termId,
          status: 'SUBMITTED',
        },
        select: {
          examScore: true,
          maxScore: true,
        },
      })

      // Calculate Exam total (scale to /80)
      let examTotal = 0
      if (examEntry) {
        const examPercentage = (examEntry.examScore / examEntry.maxScore) * 100
        examTotal = (examPercentage / 100) * 80 // Scale to /80
      }

      // Final total = CA + Exam
      const finalTotal = caTotal + examTotal

      // Get grade (you'll need to implement grading logic)
      const grade = this.calculateGrade(finalTotal)

      studentMarks.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        admissionNumber: student.admissionNumber,
        caTotal: Math.round(caTotal * 100) / 100,
        examTotal: Math.round(examTotal * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
        grade,
        position: 0, // Will be calculated after sorting
      })
    }

    // Calculate positions
    studentMarks.sort((a, b) => b.finalTotal - a.finalTotal)
    studentMarks.forEach((mark, index) => {
      mark.position = index + 1
    })

    return studentMarks
  }

  /**
   * Calculate grade from final total
   */
  private calculateGrade(finalTotal: number): string {
    if (finalTotal >= 80) return 'A'
    if (finalTotal >= 70) return 'B'
    if (finalTotal >= 60) return 'C'
    if (finalTotal >= 50) return 'D'
    return 'F'
  }

  /**
   * Mark as approved in DosApproval
   */
  private async markAsApproved(classId: string, subjectId: string, approvedBy: string) {
    await prisma.dosApproval.upsert({
      where: {
        classId_subjectId: {
          classId,
          subjectId,
        },
      },
      update: {
        caApproved: true,
        examApproved: true,
        locked: false, // Will be locked after report cards are sent
      },
      create: {
        classId,
        subjectId,
        caApproved: true,
        examApproved: true,
        locked: false,
      },
    })
  }

  /**
   * Generate PDF from HTML
   */
  private async generatePDF(htmlContent: string, studentId: string): Promise<Buffer> {
    // For now, return a mock PDF buffer
    // In production, use puppeteer or similar
    const mockPDF = Buffer.from(`PDF for student ${studentId}\n${htmlContent}`)
    return mockPDF
  }

  /**
   * Deploy PDF to accessible URL
   * 
   * Options:
   * 1. Upload to cloud storage (AWS S3, Google Cloud Storage, Azure Blob)
   * 2. Store in database as base64 and serve via API
   * 3. Store in local filesystem and serve via static route
   * 
   * For now, we'll use option 2 (database + API)
   */
  private async deployPDF(
    pdfBuffer: Buffer,
    studentId: string,
    termId: string,
    schoolId: string
  ): Promise<string> {
    // Convert PDF to base64 for database storage
    const pdfBase64 = pdfBuffer.toString('base64')

    // Create a unique identifier
    const pdfId = `${schoolId}-${termId}-${studentId}-${Date.now()}`

    // Store in database (we'll create a PDFStorage model)
    await prisma.pDFStorage.create({
      data: {
        id: pdfId,
        studentId,
        termId,
        schoolId,
        pdfData: pdfBase64,
        fileSize: pdfBuffer.length,
        createdAt: new Date(),
      },
    })

    // Return the URL to access this PDF
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return `${baseUrl}/api/reports/pdf/${pdfId}`
  }

  /**
   * Store report card in database
   */
  private async storeReportCard(data: {
    studentId: string
    termId: string
    schoolId: string
    pdfUrl: string
    shortUrl: string
    htmlContent: string
    approvedBy: string
  }) {
    return await prisma.publishedReport.create({
      data: {
        studentId: data.studentId,
        termId: data.termId,
        schoolId: data.schoolId,
        publishedBy: data.approvedBy,
        htmlContent: data.htmlContent,
        pdfUrl: data.pdfUrl,
        shortUrl: data.shortUrl,
        publishedAt: new Date(),
      },
    })
  }
}

export const reportCardPipelineService = new ReportCardPipelineService()
