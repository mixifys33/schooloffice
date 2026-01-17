/**
 * Report Card PDF Generation API Route
 * POST: Generate PDF report card with grades, teacher remarks, promotion status
 * Requirements: 7.2
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import { ResultsService } from '@/services/results.service'

const resultsService = new ResultsService()

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { studentId, termId } = body

    if (!studentId || !termId) {
      return NextResponse.json(
        { error: 'Student ID and Term ID are required' },
        { status: 400 }
      )
    }

    // Generate report card data
    const reportCardData = await resultsService.generateReportCardData(studentId, termId)

    if (!reportCardData) {
      return NextResponse.json(
        { error: 'Unable to generate report card. Results may not be available.' },
        { status: 404 }
      )
    }

    // Validate completeness
    const validation = resultsService.validateReportCardCompleteness(reportCardData)
    if (!validation.complete) {
      return NextResponse.json(
        { error: `Report card incomplete. Missing: ${validation.missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Generate HTML content
    const htmlContent = resultsService.generateReportCardHTML(reportCardData)

    // For now, return HTML as a downloadable file
    // In production, this would use a PDF generation library like puppeteer or jspdf
    const pdfHtml = generatePrintablePDF(htmlContent, reportCardData)

    return new NextResponse(pdfHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="Report_Card_${reportCardData.student.name.replace(/\s+/g, '_')}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating report card:', error)
    return NextResponse.json(
      { error: 'Failed to generate report card' },
      { status: 500 }
    )
  }
}

/**
 * Generate a printable PDF-ready HTML document
 * This creates a well-formatted HTML that can be printed to PDF
 */
function generatePrintablePDF(htmlContent: string, data: {
  student: { name: string; admissionNumber: string; className: string; streamName?: string }
  school: { name: string; address?: string; phone?: string; logo?: string }
  term: { name: string; academicYear: string }
  subjects: { name: string; code: string; score: number; maxScore: number; percentage: number; grade?: string; remarks?: string }[]
  summary: { totalMarks: number; totalMaxMarks: number; average: number; position: number; totalStudents: number; overallGrade?: string }
  remarks: { teacherRemarks?: string; headTeacherRemarks?: string }
  generatedAt: Date
}): string {
  const subjectRows = data.subjects.map(s => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${s.name}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${s.score}/${s.maxScore}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${s.percentage.toFixed(1)}%</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">${s.grade || '-'}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${s.remarks || '-'}</td>
    </tr>
  `).join('')

  // Determine promotion status based on grade
  const promotionStatus = getPromotionStatus(data.summary.overallGrade)

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Report Card - ${data.student.name}</title>
  <style>
    @media print {
      body { margin: 0; padding: 20px; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 0;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      background: white;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px double #333;
      padding-bottom: 20px;
    }
    .school-logo {
      width: 80px;
      height: 80px;
      margin-bottom: 10px;
    }
    .school-name {
      font-size: 28px;
      font-weight: bold;
      color: #1a365d;
      margin-bottom: 5px;
    }
    .school-address {
      font-size: 12px;
      color: #666;
    }
    .report-title {
      font-size: 20px;
      font-weight: bold;
      margin-top: 15px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .term-info {
      font-size: 14px;
      color: #444;
      margin-top: 5px;
    }
    .student-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 5px;
    }
    .info-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .info-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
    }
    .info-value {
      font-size: 14px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #1a365d;
      color: white;
      padding: 10px 8px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
    }
    .summary-box {
      display: flex;
      justify-content: space-around;
      margin: 20px 0;
      padding: 20px;
      background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
      color: white;
      border-radius: 8px;
    }
    .summary-item {
      text-align: center;
    }
    .summary-label {
      font-size: 11px;
      opacity: 0.9;
      text-transform: uppercase;
    }
    .summary-value {
      font-size: 24px;
      font-weight: bold;
      margin-top: 5px;
    }
    .remarks-section {
      margin: 20px 0;
    }
    .remarks-box {
      border: 1px solid #ddd;
      padding: 15px;
      margin: 10px 0;
      border-radius: 5px;
      min-height: 60px;
    }
    .remarks-title {
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 8px;
    }
    .promotion-status {
      text-align: center;
      padding: 15px;
      margin: 20px 0;
      border-radius: 5px;
      font-weight: bold;
      font-size: 16px;
    }
    .promoted {
      background: #d4edda;
      color: #155724;
      border: 2px solid #28a745;
    }
    .not-promoted {
      background: #f8d7da;
      color: #721c24;
      border: 2px solid #dc3545;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 20px;
    }
    .signature-box {
      text-align: center;
      width: 200px;
    }
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 5px;
      font-size: 12px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 10px;
      color: #999;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background: #1a365d;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-button:hover {
      background: #2c5282;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>

  <div class="header">
    ${data.school.logo ? `<img src="${data.school.logo}" alt="School Logo" class="school-logo">` : ''}
    <div class="school-name">${data.school.name}</div>
    ${data.school.address ? `<div class="school-address">${data.school.address}</div>` : ''}
    ${data.school.phone ? `<div class="school-address">Tel: ${data.school.phone}</div>` : ''}
    <div class="report-title">Student Report Card</div>
    <div class="term-info">${data.term.name} - ${data.term.academicYear}</div>
  </div>

  <div class="student-info">
    <div class="info-group">
      <span class="info-label">Student Name</span>
      <span class="info-value">${data.student.name}</span>
    </div>
    <div class="info-group">
      <span class="info-label">Admission Number</span>
      <span class="info-value">${data.student.admissionNumber}</span>
    </div>
    <div class="info-group">
      <span class="info-label">Class</span>
      <span class="info-value">${data.student.className}${data.student.streamName ? ` (${data.student.streamName})` : ''}</span>
    </div>
    <div class="info-group">
      <span class="info-label">Position</span>
      <span class="info-value">${data.summary.position} of ${data.summary.totalStudents}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th style="text-align: center;">Marks</th>
        <th style="text-align: center;">Percentage</th>
        <th style="text-align: center;">Grade</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows}
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-item">
      <div class="summary-label">Total Marks</div>
      <div class="summary-value">${data.summary.totalMarks}/${data.summary.totalMaxMarks}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Average</div>
      <div class="summary-value">${data.summary.average.toFixed(1)}%</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Overall Grade</div>
      <div class="summary-value">${data.summary.overallGrade || '-'}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Position</div>
      <div class="summary-value">${data.summary.position}/${data.summary.totalStudents}</div>
    </div>
  </div>

  <div class="promotion-status ${promotionStatus.promoted ? 'promoted' : 'not-promoted'}">
    ${promotionStatus.message}
  </div>

  <div class="remarks-section">
    <div class="remarks-box">
      <div class="remarks-title">Class Teacher's Remarks</div>
      <p>${data.remarks.teacherRemarks || 'No remarks provided.'}</p>
    </div>
    <div class="remarks-box">
      <div class="remarks-title">Head Teacher's Remarks</div>
      <p>${data.remarks.headTeacherRemarks || 'No remarks provided.'}</p>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-line">Class Teacher</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Head Teacher</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">Parent/Guardian</div>
    </div>
  </div>

  <div class="footer">
    <p>Generated on: ${new Date(data.generatedAt).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}</p>
    <p>This is a computer-generated report card.</p>
  </div>
</body>
</html>
  `
}

/**
 * Determine promotion status based on overall grade
 */
function getPromotionStatus(grade?: string): { promoted: boolean; message: string } {
  if (!grade) {
    return { promoted: true, message: 'PROMOTION STATUS: Pending Review' }
  }

  const passingGrades = ['A', 'B', 'C', 'D']
  const promoted = passingGrades.includes(grade.toUpperCase())

  if (promoted) {
    return { promoted: true, message: `PROMOTED TO NEXT CLASS - Grade: ${grade}` }
  } else {
    return { promoted: false, message: `REQUIRES IMPROVEMENT - Grade: ${grade}` }
  }
}
