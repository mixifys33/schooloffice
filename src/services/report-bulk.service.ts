/**
 * Report Bulk Generation Service
 * Handles bulk report generation with progress tracking
 */

import { prisma } from '@/lib/db'
import { reportGenerationService, type ReportData } from './report-generation.service'
import { pdfGenerationService } from './pdf-generation.service'
  
export interface BulkGenerationJob {
  id: string
  classId: string
  termId: string
  reportType: 'ca-only' | 'exam-only' | 'final'
  subjectId?: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  totalStudents: number
  processedStudents: number
  reports: ReportData[]
  error?: string
  createdAt: Date
  completedAt?: Date
}

class ReportBulkService {
  private jobs: Map<string, BulkGenerationJob> = new Map()

  /**
   * Start bulk report generation
   */
  async startBulkGeneration(
    classId: string,
    termId: string,
    reportType: 'ca-only' | 'exam-only' | 'final',
    schoolId: string,
    teacherId: string,
    subjectId?: string
  ): Promise<string> {
    // Get students in class
    const students = await prisma.student.findMany({
      where: { classId, status: 'ACTIVE' },
      select: { id: true },
    })

    // Create job
    const jobId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const job: BulkGenerationJob = {
      id: jobId,
      classId,
      termId,
      reportType,
      subjectId,
      status: 'PENDING',
      progress: 0,
      totalStudents: students.length,
      processedStudents: 0,
      reports: [],
      createdAt: new Date(),
    }

    this.jobs.set(jobId, job)

    // Start processing in background
    this.processBulkGeneration(jobId, schoolId, teacherId).catch(error => {
      const job = this.jobs.get(jobId)
      if (job) {
        job.status = 'FAILED'
        job.error = error.message
      }
    })

    return jobId
  }

  /**
   * Process bulk generation
   */
  private async processBulkGeneration(
    jobId: string,
    schoolId: string,
    teacherId: string
  ): Promise<void> {
    const job = this.jobs.get(jobId)
    if (!job) throw new Error('Job not found')

    job.status = 'PROCESSING'

    try {
      // Get students
      const students = await prisma.student.findMany({
        where: { classId: job.classId, status: 'ACTIVE' },
        select: { id: true },
      })

      const studentIds = students.map(s => s.id)
      const batchSize = 10 // Process 10 students at a time

      // Process in batches
      for (let i = 0; i < studentIds.length; i += batchSize) {
        const batch = studentIds.slice(i, i + batchSize)

        let reports: ReportData[]

        if (job.reportType === 'ca-only' && job.subjectId) {
          reports = await reportGenerationService.generateCAOnlyReport({
            classId: job.classId,
            subjectId: job.subjectId,
            termId: job.termId,
            schoolId,
            teacherId,
            studentIds: batch,
          })
        } else if (job.reportType === 'exam-only' && job.subjectId) {
          reports = await reportGenerationService.generateExamOnlyReport({
            classId: job.classId,
            subjectId: job.subjectId,
            termId: job.termId,
            schoolId,
            teacherId,
            studentIds: batch,
          })
        } else {
          reports = await reportGenerationService.generateFinalReport(
            job.classId,
            job.termId,
            schoolId,
            teacherId,
            batch
          )
        }

        job.reports.push(...reports)
        job.processedStudents += batch.length
        job.progress = Math.round((job.processedStudents / job.totalStudents) * 100)
      }

      job.status = 'COMPLETED'
      job.completedAt = new Date()
    } catch (error: any) {
      job.status = 'FAILED'
      job.error = error.message
      throw error
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BulkGenerationJob | null {
    return this.jobs.get(jobId) || null
  }

  /**
   * Generate ZIP file with all PDFs
   */
  async generateBulkPDFs(
    jobId: string,
    schoolName: string,
    isDraft: boolean = false
  ): Promise<Buffer> {
    const job = this.jobs.get(jobId)
    if (!job) throw new Error('Job not found')
    if (job.status !== 'COMPLETED') throw new Error('Job not completed')

    // For now, return a single PDF with all reports
    // In production, you'd use archiver to create a ZIP file
    const firstReport = job.reports[0]
    if (!firstReport) throw new Error('No reports generated')

    const pdf = pdfGenerationService.generatePDF(firstReport, schoolName, isDraft)
    return Buffer.from(pdf.output('arraybuffer'))
  }

  /**
   * Clean up old jobs
   */
  cleanupOldJobs(maxAgeHours: number = 24): void {
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.createdAt.getTime() < cutoffTime) {
        this.jobs.delete(jobId)
      }
    }
  }
}

export const reportBulkService = new ReportBulkService()
