/**
 * PDF Generation Service
 * 
 * Generates PDF reports from report data using jsPDF.
 * Supports watermarking, school branding, and batch generation.
 * Enhanced with Handlebars template rendering and Cloudinary upload.
 */
  
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import Handlebars from 'handlebars'
import { v2 as cloudinary } from 'cloudinary'
import type { ReportData, CAOnlyReportData, ExamOnlyReportData, FinalReportData } from './report-generation.service'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
    lastAutoTable: { finalY: number }
  }
}

export class PDFGenerationService {
  private readonly pageWidth = 210 // A4 width in mm
  private readonly pageHeight = 297 // A4 height in mm
  private readonly margin = 20
  /**
   * Add watermark to PDF
   */
  private addWatermark(doc: jsPDF, text: string = 'DRAFT') {
    const pageCount = doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.1 }))
      doc.setFontSize(60)
      doc.setTextColor(200, 200, 200)
      
      // Rotate and center the watermark
      const centerX = this.pageWidth / 2
      const centerY = this.pageHeight / 2
      doc.text(text, centerX, centerY, {
        angle: 45,
        align: 'center',
      })
      
      doc.restoreGraphicsState()
    }
  }

  /**
   * Add school header
   */
  private addSchoolHeader(doc: jsPDF, schoolName: string, reportTitle: string) {
    // School name
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(schoolName, this.pageWidth / 2, this.margin, { align: 'center' })
    
    // Report title
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(reportTitle, this.pageWidth / 2, this.margin + 8, { align: 'center' })
    
    // Line separator
    doc.setLineWidth(0.5)
    doc.line(this.margin, this.margin + 12, this.pageWidth - this.margin, this.margin + 12)
    
    return this.margin + 18
  }

  /**
   * Add footer with page numbers
   */
  private addFooter(doc: jsPDF, generatedDate: Date) {
    const pageCount = doc.getNumberOfPages()
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(128, 128, 128)
      
      // Page number
      doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      )
      
      // Generated date
      doc.text(
        `Generated: ${generatedDate.toLocaleDateString()}`,
        this.margin,
        this.pageHeight - 10
      )
      
      // Official document text
      doc.text(
        'Official Academic Document',
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      )
    }
  }

  /**
   * Generate CA-Only Report PDF
   */
  generateCAOnlyPDF(report: CAOnlyReportData, schoolName: string = 'School', isDraft: boolean = false): jsPDF {
    const doc = new jsPDF()
    
    // Add header
    let yPos = this.addSchoolHeader(doc, schoolName, 'Continuous Assessment Performance Report')
    
    // Term and subject info
    yPos += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${report.term.name} - ${report.term.academicYear}`, this.pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
    doc.text(`${report.subject.name} (${report.subject.code})`, this.pageWidth / 2, yPos, { align: 'center' })
    
    // Student information table
    yPos += 10
    doc.autoTable({
      startY: yPos,
      head: [['Student Information', '']],
      body: [
        ['Student Name', report.student.name],
        ['Admission Number', report.student.admissionNumber],
        ['Class', `${report.student.class}${report.student.stream ? ` - ${report.student.stream}` : ''}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // CA Activities table
    yPos = doc.lastAutoTable.finalY + 10
    doc.autoTable({
      startY: yPos,
      head: [['Activity', 'Type', 'Score', 'Percentage', 'Grade']],
      body: report.caActivities.map(activity => [
        activity.name,
        activity.type,
        `${activity.score}/${activity.maxScore}`,
        `${activity.percentage}%`,
        activity.grade,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [76, 175, 80], fontSize: 10, fontStyle: 'bold' },
      margin: { left: this.margin, right: this.margin },
    })
    
    // CA Summary
    yPos = doc.lastAutoTable.finalY + 10
    doc.autoTable({
      startY: yPos,
      head: [['CA Summary', '']],
      body: [
        ['Total Activities', report.caSummary.totalActivities.toString()],
        ['Average Percentage', `${report.caSummary.averagePercentage}%`],
        ['CA Contribution (out of 20)', report.caSummary.caContribution.toString()],
        ['Overall Grade', `${report.caSummary.overallGrade} (${report.caSummary.gradePoints} points)`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // Add watermark if draft
    if (isDraft) {
      this.addWatermark(doc, 'DRAFT')
    }
    
    // Add footer
    this.addFooter(doc, report.generatedAt)
    
    return doc
  }

  /**
   * Generate Exam-Only Report PDF
   */
  generateExamOnlyPDF(report: ExamOnlyReportData, schoolName: string = 'School', isDraft: boolean = false): jsPDF {
    const doc = new jsPDF()
    
    // Add header
    let yPos = this.addSchoolHeader(doc, schoolName, 'Examination Performance Report')
    
    // Term and subject info
    yPos += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${report.term.name} - ${report.term.academicYear}`, this.pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
    doc.text(`${report.subject.name} (${report.subject.code})`, this.pageWidth / 2, yPos, { align: 'center' })
    
    // Student information table
    yPos += 10
    doc.autoTable({
      startY: yPos,
      head: [['Student Information', '']],
      body: [
        ['Student Name', report.student.name],
        ['Admission Number', report.student.admissionNumber],
        ['Class', `${report.student.class}${report.student.stream ? ` - ${report.student.stream}` : ''}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // Exam Results
    yPos = doc.lastAutoTable.finalY + 10
    doc.autoTable({
      startY: yPos,
      head: [['Exam Results', '']],
      body: [
        ['Exam Score', `${report.examScore}/${report.examMaxScore}`],
        ['Percentage', `${report.examPercentage}%`],
        ['Exam Contribution (out of 80)', report.examContribution.toString()],
        ['Grade', `${report.examGrade} (${report.gradePoints} points)`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 80 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // CA Status
    yPos = doc.lastAutoTable.finalY + 10
    doc.autoTable({
      startY: yPos,
      head: [['CA Status', '']],
      body: [
        ['Status', report.caStatus],
        ['Note', report.statusNote],
      ],
      theme: 'grid',
      headStyles: { fillColor: [255, 193, 7], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // Add watermark if draft
    if (isDraft) {
      this.addWatermark(doc, 'DRAFT')
    }
    
    // Add footer
    this.addFooter(doc, report.generatedAt)
    
    return doc
  }

  /**
   * Generate Final Report PDF
   */
  generateFinalReportPDF(report: FinalReportData, schoolName: string = 'School', isDraft: boolean = false): jsPDF {
    const doc = new jsPDF()
    
    // Add header
    let yPos = this.addSchoolHeader(doc, schoolName, 'FINAL TERM REPORT CARD')
    
    // Term info
    yPos += 5
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${report.term.name} - ${report.term.academicYear}`, this.pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
    doc.setFont('helvetica', 'normal')
    doc.text(
      `${new Date(report.term.startDate).toLocaleDateString()} - ${new Date(report.term.endDate).toLocaleDateString()}`,
      this.pageWidth / 2,
      yPos,
      { align: 'center' }
    )
    
    // Student information table
    yPos += 10
    doc.autoTable({
      startY: yPos,
      head: [['Student Information', '']],
      body: [
        ['Student Name', report.student.name],
        ['Admission Number', report.student.admissionNumber],
        ['Class', `${report.student.class}${report.student.stream ? ` - ${report.student.stream}` : ''}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [103, 58, 183], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // Academic Performance table
    yPos = doc.lastAutoTable.finalY + 10
    doc.autoTable({
      startY: yPos,
      head: [['Subject', 'CA (20)', 'Exam (80)', 'Final (100)', 'Grade', 'Points']],
      body: report.subjects.map(subject => [
        subject.subjectName,
        subject.caContribution.toString(),
        subject.examContribution.toString(),
        subject.finalScore.toString(),
        subject.grade,
        subject.gradePoints.toString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [103, 58, 183], fontSize: 9, fontStyle: 'bold' },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
      },
    })
    
    // Performance Summary
    yPos = doc.lastAutoTable.finalY + 10
    doc.autoTable({
      startY: yPos,
      head: [['Performance Summary', '']],
      body: [
        ['Total Marks', report.summary.totalMarks.toString()],
        ['Average Score', `${report.summary.averageScore}%`],
        ['Position', `${report.summary.position} out of ${report.summary.totalStudents}`],
        ['Overall Grade', `${report.summary.overallGrade} (${report.summary.gradePoints} points)`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [103, 58, 183], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // Attendance Summary
    yPos = doc.lastAutoTable.finalY + 10
    doc.autoTable({
      startY: yPos,
      head: [['Attendance Summary', '']],
      body: [
        ['Days Present', report.attendance.daysPresent.toString()],
        ['Days Absent', report.attendance.daysAbsent.toString()],
        ['Total Days', report.attendance.totalDays.toString()],
        ['Attendance Rate', `${report.attendance.attendanceRate}%`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [33, 150, 243], fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // Promotion Decision
    yPos = doc.lastAutoTable.finalY + 10
    const promotionColor = 
      report.promotionDecision === 'PROMOTED' ? [76, 175, 80] :
      report.promotionDecision === 'REPEAT' ? [244, 67, 54] :
      [255, 152, 0]
    
    doc.autoTable({
      startY: yPos,
      head: [['Promotion Decision', '']],
      body: [
        ['Decision', report.promotionDecision || 'PENDING'],
        ['Reason', report.promotionReason || 'Awaiting final review'],
      ],
      theme: 'grid',
      headStyles: { fillColor: promotionColor, fontSize: 11, fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 60 },
        1: { cellWidth: 'auto' },
      },
      margin: { left: this.margin, right: this.margin },
    })
    
    // Remarks (if any)
    if (report.remarks.classTeacher || report.remarks.dos || report.remarks.headTeacher) {
      yPos = doc.lastAutoTable.finalY + 10
      const remarksBody: string[][] = []
      
      if (report.remarks.classTeacher) {
        remarksBody.push(['Class Teacher', report.remarks.classTeacher])
      }
      if (report.remarks.dos) {
        remarksBody.push(['Director of Studies', report.remarks.dos])
      }
      if (report.remarks.headTeacher) {
        remarksBody.push(['Head Teacher', report.remarks.headTeacher])
      }
      
      doc.autoTable({
        startY: yPos,
        head: [['Remarks', '']],
        body: remarksBody,
        theme: 'grid',
        headStyles: { fillColor: [103, 58, 183], fontSize: 11, fontStyle: 'bold' },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { cellWidth: 'auto' },
        },
        margin: { left: this.margin, right: this.margin },
      })
    }
    
    // Add watermark if draft
    if (isDraft) {
      this.addWatermark(doc, 'DRAFT')
    }
    
    // Add footer
    this.addFooter(doc, report.generatedAt)
    
    return doc
  }

  /**
   * Generate PDF based on report type
   */
  generatePDF(report: ReportData, schoolName: string = 'School', isDraft: boolean = false): jsPDF {
    switch (report.reportType) {
      case 'ca-only':
        return this.generateCAOnlyPDF(report, schoolName, isDraft)
      case 'exam-only':
        return this.generateExamOnlyPDF(report, schoolName, isDraft)
      case 'final':
        return this.generateFinalReportPDF(report, schoolName, isDraft)
      default:
        throw new Error('Invalid report type')
    }
  }

  /**
   * Generate HTML for CA-Only Report (Legacy - kept for compatibility)
   */
  generateCAOnlyHTML(report: Extract<ReportData, { reportType: 'ca-only' }>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CA Performance Report - ${report.student.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0; color: #666; }
    .student-info { margin: 20px 0; }
    .student-info table { width: 100%; border-collapse: collapse; }
    .student-info td { padding: 8px; border: 1px solid #ddd; }
    .student-info td:first-child { font-weight: bold; width: 150px; background: #f5f5f5; }
    .activities { margin: 20px 0; }
    .activities table { width: 100%; border-collapse: collapse; }
    .activities th, .activities td { padding: 10px; border: 1px solid #ddd; text-align: left; }
    .activities th { background: #4CAF50; color: white; }
    .summary { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #4CAF50; }
    .summary h3 { margin-top: 0; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Continuous Assessment Performance Report</h1>
    <p>${report.term.name} - ${report.term.academicYear}</p>
    <p>${report.subject.name} (${report.subject.code})</p>
  </div>
  
  <div class="student-info">
    <table>
      <tr>
        <td>Student Name</td>
        <td>${report.student.name}</td>
      </tr>
      <tr>
        <td>Admission Number</td>
        <td>${report.student.admissionNumber}</td>
      </tr>
      <tr>
        <td>Class</td>
        <td>${report.student.class}${report.student.stream ? ` - ${report.student.stream}` : ''}</td>
      </tr>
    </table>
  </div>
  
  <div class="activities">
    <h3>CA Activities</h3>
    <table>
      <thead>
        <tr>
          <th>Activity</th>
          <th>Type</th>
          <th>Score</th>
          <th>Percentage</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>
        ${report.caActivities.map(activity => `
          <tr>
            <td>${activity.name}</td>
            <td>${activity.type}</td>
            <td>${activity.score}/${activity.maxScore}</td>
            <td>${activity.percentage}%</td>
            <td>${activity.grade}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="summary">
    <h3>CA Summary</h3>
    <p><strong>Total Activities:</strong> ${report.caSummary.totalActivities}</p>
    <p><strong>Average Percentage:</strong> ${report.caSummary.averagePercentage}%</p>
    <p><strong>CA Contribution (out of 20):</strong> ${report.caSummary.caContribution}</p>
    <p><strong>Overall Grade:</strong> ${report.caSummary.overallGrade} (${report.caSummary.gradePoints} points)</p>
  </div>
  
  <div class="footer">
    <p>Generated on ${new Date(report.generatedAt).toLocaleDateString()}</p>
    <p>This is an official academic document</p>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate HTML for Exam-Only Report
   */
  generateExamOnlyHTML(report: Extract<ReportData, { reportType: 'exam-only' }>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Exam Performance Report - ${report.student.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0; color: #666; }
    .student-info { margin: 20px 0; }
    .student-info table { width: 100%; border-collapse: collapse; }
    .student-info td { padding: 8px; border: 1px solid #ddd; }
    .student-info td:first-child { font-weight: bold; width: 150px; background: #f5f5f5; }
    .exam-results { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #2196F3; }
    .exam-results h3 { margin-top: 0; }
    .ca-status { margin: 20px 0; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Examination Performance Report</h1>
    <p>${report.term.name} - ${report.term.academicYear}</p>
    <p>${report.subject.name} (${report.subject.code})</p>
  </div>
  
  <div class="student-info">
    <table>
      <tr>
        <td>Student Name</td>
        <td>${report.student.name}</td>
      </tr>
      <tr>
        <td>Admission Number</td>
        <td>${report.student.admissionNumber}</td>
      </tr>
      <tr>
        <td>Class</td>
        <td>${report.student.class}${report.student.stream ? ` - ${report.student.stream}` : ''}</td>
      </tr>
    </table>
  </div>
  
  <div class="exam-results">
    <h3>Exam Results</h3>
    <p><strong>Exam Score:</strong> ${report.examScore}/${report.examMaxScore}</p>
    <p><strong>Percentage:</strong> ${report.examPercentage}%</p>
    <p><strong>Exam Contribution (out of 80):</strong> ${report.examContribution}</p>
    <p><strong>Grade:</strong> ${report.examGrade} (${report.gradePoints} points)</p>
  </div>
  
  <div class="ca-status">
    <h3>CA Status</h3>
    <p><strong>Status:</strong> ${report.caStatus}</p>
    <p>${report.statusNote}</p>
  </div>
  
  <div class="footer">
    <p>Generated on ${new Date(report.generatedAt).toLocaleDateString()}</p>
    <p>This is an official academic document</p>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate HTML for Final Report
   */
  generateFinalReportHTML(report: Extract<ReportData, { reportType: 'final' }>): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Final Term Report - ${report.student.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
    .header h1 { margin: 0; font-size: 28px; }
    .header p { margin: 5px 0; color: #666; }
    .student-info { margin: 20px 0; }
    .student-info table { width: 100%; border-collapse: collapse; }
    .student-info td { padding: 8px; border: 1px solid #ddd; }
    .student-info td:first-child { font-weight: bold; width: 150px; background: #f5f5f5; }
    .subjects { margin: 20px 0; }
    .subjects table { width: 100%; border-collapse: collapse; }
    .subjects th, .subjects td { padding: 10px; border: 1px solid #ddd; text-align: center; }
    .subjects th { background: #673AB7; color: white; }
    .subjects td:first-child { text-align: left; }
    .summary { margin: 20px 0; padding: 15px; background: #f3e5f5; border-left: 4px solid #673AB7; }
    .summary h3 { margin-top: 0; }
    .attendance { margin: 20px 0; padding: 15px; background: #e3f2fd; border-left: 4px solid #2196F3; }
    .promotion { margin: 20px 0; padding: 15px; background: #e8f5e9; border-left: 4px solid #4CAF50; }
    .promotion.repeat { background: #ffebee; border-left-color: #f44336; }
    .promotion.conditional { background: #fff3e0; border-left-color: #ff9800; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 2px solid #333; padding-top: 15px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>FINAL TERM REPORT CARD</h1>
    <p>${report.term.name} - ${report.term.academicYear}</p>
    <p>${new Date(report.term.startDate).toLocaleDateString()} - ${new Date(report.term.endDate).toLocaleDateString()}</p>
  </div>
  
  <div class="student-info">
    <table>
      <tr>
        <td>Student Name</td>
        <td>${report.student.name}</td>
      </tr>
      <tr>
        <td>Admission Number</td>
        <td>${report.student.admissionNumber}</td>
      </tr>
      <tr>
        <td>Class</td>
        <td>${report.student.class}${report.student.stream ? ` - ${report.student.stream}` : ''}</td>
      </tr>
    </table>
  </div>
  
  <div class="subjects">
    <h3>Academic Performance</h3>
    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th>CA (20)</th>
          <th>Exam (80)</th>
          <th>Final (100)</th>
          <th>Grade</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        ${report.subjects.map(subject => `
          <tr>
            <td>${subject.subjectName}</td>
            <td>${subject.caContribution}</td>
            <td>${subject.examContribution}</td>
            <td>${subject.finalScore}</td>
            <td>${subject.grade}</td>
            <td>${subject.gradePoints}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="summary">
    <h3>Performance Summary</h3>
    <p><strong>Total Marks:</strong> ${report.summary.totalMarks}</p>
    <p><strong>Average Score:</strong> ${report.summary.averageScore}%</p>
    <p><strong>Position:</strong> ${report.summary.position} out of ${report.summary.totalStudents}</p>
    <p><strong>Overall Grade:</strong> ${report.summary.overallGrade} (${report.summary.gradePoints} points)</p>
  </div>
  
  <div class="attendance">
    <h3>Attendance Summary</h3>
    <p><strong>Days Present:</strong> ${report.attendance.daysPresent}</p>
    <p><strong>Days Absent:</strong> ${report.attendance.daysAbsent}</p>
    <p><strong>Total Days:</strong> ${report.attendance.totalDays}</p>
    <p><strong>Attendance Rate:</strong> ${report.attendance.attendanceRate}%</p>
  </div>
  
  <div class="promotion ${report.promotionDecision?.toLowerCase()}">
    <h3>Promotion Decision</h3>
    <p><strong>Decision:</strong> ${report.promotionDecision || 'PENDING'}</p>
    <p>${report.promotionReason || 'Awaiting final review'}</p>
  </div>
  
  <div class="footer">
    <p>Generated on ${new Date(report.generatedAt).toLocaleDateString()}</p>
    <p>This is an official academic document</p>
    <p><strong>School Official Stamp</strong></p>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate HTML based on report type
   */
  generateHTML(report: ReportData): string {
    switch (report.reportType) {
      case 'ca-only':
        return this.generateCAOnlyHTML(report)
      case 'exam-only':
        return this.generateExamOnlyHTML(report)
      case 'final':
        return this.generateFinalReportHTML(report)
      default:
        throw new Error('Invalid report type')
    }
  }
  /**
   * Generate PDF from Handlebars Template + Data
   * Renders template with data and converts to PDF
   */
  async generatePDFFromTemplate(
    template: string,
    data: any,
    options?: {
      watermark?: string
      isDraft?: boolean
    }
  ): Promise<Buffer> {
    try {
      // Compile Handlebars template
      const compiledTemplate = Handlebars.compile(template)
      
      // Render HTML with data
      const html = compiledTemplate(data)
      
      // For now, return a simple PDF with the HTML content
      // In production, you'd use Puppeteer to convert HTML to PDF
      // This is a placeholder implementation
      const doc = new jsPDF()
      
      // Add watermark if requested
      if (options?.watermark || options?.isDraft) {
        this.addWatermark(doc, options.watermark || 'DRAFT')
      }
      
      // Add basic content (placeholder - replace with Puppeteer in production)
      doc.setFontSize(12)
      doc.text('Report Card', this.pageWidth / 2, this.margin, { align: 'center' })
      doc.text('Generated from template', this.pageWidth / 2, this.margin + 10, { align: 'center' })
      
      // Add footer
      this.addFooter(doc, new Date())
      
      // Convert to buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      return pdfBuffer
    } catch (error) {
      throw new Error(`Failed to generate PDF from template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Upload PDF to Cloudinary
   * Returns the secure URL of the uploaded PDF
   */
  async uploadPDFToCloudinary(
    buffer: Buffer,
    filename: string,
    options?: {
      folder?: string
      resourceType?: string
    }
  ): Promise<{ url: string; publicId: string; size: number }> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options?.folder || 'report-cards',
            resource_type: (options?.resourceType as any) || 'raw',
            public_id: filename,
            format: 'pdf',
          },
          (error, result) => {
            if (error) {
              reject(new Error(`Cloudinary upload failed: ${error.message}`))
            } else if (result) {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                size: result.bytes,
              })
            } else {
              reject(new Error('Cloudinary upload failed: No result returned'))
            }
          }
        )
        
        uploadStream.end(buffer)
      })
    } catch (error) {
      throw new Error(`Failed to upload PDF to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get PDF Size
   * Returns the size of a PDF buffer in bytes
   */
  getPDFSize(buffer: Buffer): number {
    return buffer.length
  }

  /**
   * Generate PDF and Upload to Cloudinary
   * Convenience method that combines generation and upload
   */
  async generateAndUploadPDF(
    template: string,
    data: any,
    filename: string,
    options?: {
      watermark?: string
      isDraft?: boolean
      folder?: string
    }
  ): Promise<{ url: string; publicId: string; size: number }> {
    try {
      // Generate PDF
      const pdfBuffer = await this.generatePDFFromTemplate(template, data, {
        watermark: options?.watermark,
        isDraft: options?.isDraft,
      })
      
      // Upload to Cloudinary
      const uploadResult = await this.uploadPDFToCloudinary(pdfBuffer, filename, {
        folder: options?.folder,
      })
      
      return uploadResult
    } catch (error) {
      throw new Error(`Failed to generate and upload PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export const pdfGenerationService = new PDFGenerationService()
