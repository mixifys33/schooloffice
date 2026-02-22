
/**
 * Print and Export Utilities
 * Handles printing and exporting data to various formats (PDF, Excel)
 * with proper formatting and school branding
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export interface SchoolInfo {
  name: string
  code?: string
  address?: string
  phone?: string
  email?: string
  logo?: string
}

export interface ExportOptions {
  schoolInfo: SchoolInfo
  title: string
  subtitle?: string
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'a4' | 'letter'
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'UGX'): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date | null): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB')
}

/**
 * Add school header to PDF
 */
function addPDFHeader(doc: jsPDF, schoolInfo: SchoolInfo, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth()
  
  // SchoolOffice branding (top right, subtle)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text('Powered by SchoolOffice', pageWidth - 15, 10, { align: 'right' })
  
  // School name
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text(schoolInfo.name, pageWidth / 2, 20, { align: 'center' })
  
  // School details
  let yPos = 28
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  if (schoolInfo.code) {
    doc.text(`School Code: ${schoolInfo.code}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }
  
  if (schoolInfo.address) {
    doc.text(schoolInfo.address, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }
  
  if (schoolInfo.phone || schoolInfo.email) {
    const contact = [schoolInfo.phone, schoolInfo.email].filter(Boolean).join(' | ')
    doc.text(contact, pageWidth / 2, yPos, { align: 'center' })
    yPos += 5
  }
  
  // Title
  yPos += 5
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageWidth / 2, yPos, { align: 'center' })
  
  // Subtitle
  if (subtitle) {
    yPos += 6
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' })
  }
  
  // Line separator
  yPos += 5
  doc.setLineWidth(0.5)
  doc.line(15, yPos, pageWidth - 15, yPos)
  
  return yPos + 5
}

/**
 * Add footer to PDF
 */
function addPDFFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    
    // Generation timestamp and page number (center)
    doc.setTextColor(100, 100, 100)
    const footerText = `Generated on ${new Date().toLocaleString('en-GB')} | Page ${i} of ${pageCount}`
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' })
    
    // SchoolOffice branding (bottom right, very subtle)
    doc.setTextColor(180, 180, 180)
    doc.setFontSize(7)
    doc.text('SchoolOffice', pageWidth - 15, pageHeight - 10, { align: 'right' })
  }
}

/**
 * Export financial overview to PDF
 */
export function exportFinancialOverviewToPDF(
  data: {
    totalExpected: number
    totalCollected: number
    totalOutstanding: number
    collectionRate: number
    unpaidStudents: Array<{
      name: string
      class: string
      totalDue: number
      totalPaid: number
      balance: number
      lastPaymentDate: string | null
      phone?: string
      email?: string
    }>
    currentTerm: {
      name: string
      academicYear: string
    } | null
  },
  options: ExportOptions
) {
  const doc = new jsPDF({
    orientation: options.orientation || 'landscape',
    unit: 'mm',
    format: options.pageSize || 'a4',
  })

  const subtitle = options.subtitle || (data.currentTerm 
    ? `${data.currentTerm.name} - ${data.currentTerm.academicYear}` 
    : 'No Active Term')
  
  const startY = addPDFHeader(doc, options.schoolInfo, options.title, subtitle)
  
  // Summary section
  let currentY = startY + 5
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Financial Summary', 15, currentY)
  
  currentY += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  const summaryData = [
    ['Total Expected', formatCurrency(data.totalExpected)],
    ['Total Collected', formatCurrency(data.totalCollected)],
    ['Total Outstanding', formatCurrency(data.totalOutstanding)],
    ['Collection Rate', `${data.collectionRate.toFixed(1)}%`],
  ]
  
  autoTable(doc, {
    startY: currentY,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 60, halign: 'right' },
    },
    margin: { left: 15 },
  })
  
  // Get the Y position after the table
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || currentY
  currentY = finalY + 10
  
  // Students with outstanding fees
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Students with Outstanding Fees (${data.unpaidStudents.length})`, 15, currentY)
  
  currentY += 5
  
  if (data.unpaidStudents.length === 0) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text('All fees collected! No outstanding balances.', 15, currentY + 5)
  } else {
    const tableData = data.unpaidStudents.map(student => [
      student.name,
      student.class,
      formatCurrency(student.totalDue),
      formatCurrency(student.totalPaid),
      formatCurrency(student.balance),
      formatDate(student.lastPaymentDate),
      [student.phone, student.email].filter(Boolean).join('\n') || 'N/A',
    ])
    
    autoTable(doc, {
      startY: currentY,
      head: [['Student', 'Class', 'Total Due', 'Paid', 'Outstanding', 'Last Payment', 'Contact']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', textColor: [231, 76, 60], fontStyle: 'bold' },
        5: { fontSize: 8 },
        6: { fontSize: 8 },
      },
      styles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    })
  }
  
  addPDFFooter(doc)
  
  const fileName = `Financial_Overview_${data.currentTerm?.name || 'Report'}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

/**
 * Export financial overview to Excel
 */
export function exportFinancialOverviewToExcel(
  data: {
    totalExpected: number
    totalCollected: number
    totalOutstanding: number
    collectionRate: number
    unpaidStudents: Array<{
      name: string
      class: string
      totalDue: number
      totalPaid: number
      balance: number
      lastPaymentDate: string | null
      phone?: string
      email?: string
    }>
    currentTerm: {
      name: string
      academicYear: string
    } | null
  },
  options: ExportOptions
) {
  const workbook = XLSX.utils.book_new()
  
  // Create summary sheet
  const summaryData = [
    [options.schoolInfo.name],
    [options.title],
    [options.subtitle || ''],
    [],
    ['Financial Summary'],
    ['Metric', 'Value'],
    ['Total Expected', data.totalExpected],
    ['Total Collected', data.totalCollected],
    ['Total Outstanding', data.totalOutstanding],
    ['Collection Rate', `${data.collectionRate.toFixed(1)}%`],
    [],
    [`Students with Outstanding Fees (${data.unpaidStudents.length})`],
    [],
    [],
    ['Generated by SchoolOffice'],
  ]
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
  
  // Style the header
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }]
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
  
  // Create detailed students sheet
  if (data.unpaidStudents.length > 0) {
    const studentsData = [
      ['Student', 'Class', 'Total Due', 'Paid', 'Outstanding', 'Last Payment', 'Phone', 'Email'],
      ...data.unpaidStudents.map(student => [
        student.name,
        student.class,
        student.totalDue,
        student.totalPaid,
        student.balance,
        formatDate(student.lastPaymentDate),
        student.phone || '',
        student.email || '',
      ]),
    ]
    
    const studentsSheet = XLSX.utils.aoa_to_sheet(studentsData)
    
    // Set column widths
    studentsSheet['!cols'] = [
      { wch: 25 }, // Student
      { wch: 15 }, // Class
      { wch: 15 }, // Total Due
      { wch: 15 }, // Paid
      { wch: 15 }, // Outstanding
      { wch: 15 }, // Last Payment
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
    ]
    
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Outstanding Fees')
  }
  
  // Add metadata sheet
  const metadataData = [
    ['Report Information'],
    ['Generated On', new Date().toLocaleString('en-GB')],
    ['School', options.schoolInfo.name],
    ['School Code', options.schoolInfo.code || 'N/A'],
    ['Term', data.currentTerm ? `${data.currentTerm.name} - ${data.currentTerm.academicYear}` : 'No Active Term'],
    [],
    ['Generated by SchoolOffice'],
  ]
  
  const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData)
  metadataSheet['!cols'] = [{ wch: 20 }, { wch: 40 }]
  
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Report Info')
  
  const fileName = `Financial_Overview_${data.currentTerm?.name || 'Report'}_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

/**
 * Print financial overview
 */
export function printFinancialOverview(
  elementId: string,
  schoolInfo: SchoolInfo,
  title: string,
  subtitle?: string
) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to print')
    return
  }
  
  const element = document.getElementById(elementId)
  if (!element) {
    console.error('Element not found for printing')
    return
  }
  
  const content = element.innerHTML
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @media print {
            @page {
              size: landscape;
              margin: 15mm;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #000;
              background: white;
            }
            .no-print, button, .no-print * {
              display: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
            color: #000;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          
          .print-header h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
            color: #000;
            font-weight: bold;
          }
          
          .print-header .school-details {
            font-size: 11px;
            color: #333;
            margin: 5px 0;
          }
          
          .print-header .report-title {
            font-size: 16px;
            font-weight: bold;
            margin: 10px 0 5px 0;
            color: #000;
          }
          
          .print-header .report-subtitle {
            font-size: 12px;
            color: #555;
          }
          
          .print-content {
            margin-top: 20px;
          }
          
          /* Grid layout for stats */
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin: 20px 0;
          }
          
          /* Card styling */
          [class*="card"], [class*="Card"] {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            background: white;
            page-break-inside: avoid;
            margin-bottom: 15px;
          }
          
          /* Stat cards */
          [class*="stat"] {
            text-align: center;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: #f8f9fa;
          }
          
          /* Table styling */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            page-break-inside: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 10px 8px;
            text-align: left;
            font-size: 11px;
          }
          
          th {
            background-color: #2980b9 !important;
            color: white !important;
            font-weight: bold;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          tbody tr:nth-child(even) {
            background-color: #f9f9f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Text colors */
          [class*="text-green"], .text-green-600 {
            color: #16a34a !important;
          }
          
          [class*="text-red"], .text-red-600 {
            color: #dc2626 !important;
          }
          
          [class*="text-yellow"] {
            color: #ca8a04 !important;
          }
          
          [class*="text-blue"] {
            color: #2563eb !important;
          }
          
          /* Font weights */
          [class*="font-medium"], [class*="font-semibold"], [class*="font-bold"] {
            font-weight: bold;
          }
          
          /* Hide badges and icons in print */
          [class*="badge"], [class*="Badge"], svg, [class*="icon"] {
            display: none !important;
          }
          
          .print-footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 9px;
            color: #666;
            page-break-inside: avoid;
          }
          
          /* Ensure proper spacing */
          h1, h2, h3, h4, h5, h6 {
            color: #000;
            margin: 10px 0;
          }
          
          p {
            margin: 5px 0;
          }
          
          /* Remove dark mode styles */
          [class*="dark:"] {
            background: white !important;
            color: #000 !important;
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div style="text-align: right; color: #999; font-size: 9px; margin-bottom: 10px;">
            Powered by SchoolOffice
          </div>
          <h1>${schoolInfo.name}</h1>
          ${schoolInfo.code ? `<div class="school-details">School Code: ${schoolInfo.code}</div>` : ''}
          ${schoolInfo.address ? `<div class="school-details">${schoolInfo.address}</div>` : ''}
          ${schoolInfo.phone || schoolInfo.email ? `<div class="school-details">${[schoolInfo.phone, schoolInfo.email].filter(Boolean).join(' | ')}</div>` : ''}
          <div class="report-title">${title}</div>
          ${subtitle ? `<div class="report-subtitle">${subtitle}</div>` : ''}
        </div>
        
        <div class="print-content">
          ${content}
        </div>
        
        <div class="print-footer">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>Generated on ${new Date().toLocaleString('en-GB', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}</span>
            <span style="color: #bbb; font-size: 8px;">SchoolOffice</span>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
    </html>
  `)
  
  printWindow.document.close()
}
