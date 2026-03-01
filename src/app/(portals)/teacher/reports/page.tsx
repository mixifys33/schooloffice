'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  BarChart3,
  Download,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  FileSpreadsheet,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

import { cn } from '@/lib/utils'
import {
  cardStyles
} from '@/lib/teacher-ui-standards'

/**
 * Reports Page for Teacher Portal - Fully Responsive Mobile-First Design
 * Requirements: 7.1, 7.2, 7.3, 7.4
 */

interface ClassReport {
  classId: string
  className: string
  subjectName: string
  subjectId: string
  studentCount: number
  averageCA: number | null
  averageExam: number | null
  averageFinal: number | null
  caCompletion: number
  examCompletion: number
  finalCompletion: number
}

interface StudentPerformance {
  id: string
  name: string
  admissionNumber: string
  caScore: number | null
  caMaxScore: number | null
  examScore: number | null
  examMaxScore: number | null
  finalScore: number | null
  finalMaxScore: number | null
  grade: string | null
}

interface ReportData {
  classes: ClassReport[]
  studentPerformance: Record<string, StudentPerformance[]>
  schoolName: string
}

// Commented out for now - Report types section is hidden
/* const REPORT_TYPES = [
  { 
    id: 'ca-only', 
    name: 'CA-Only Report', 
    description: 'Shows CA activities and contributions '
  },
  { 
    id: 'exam-only', 
    name: 'Exam-Only Report', 
    description: 'Shows exam scores and contributions '
  },
  { 
    id: 'final', 
    name: 'Final Term Report preveiw', 
    description: 'shows complete report with CA and Exam combined '
  }
] as const */

type SortField = 'name' | 'admissionNumber' | 'caScore' | 'examScore' | 'finalScore' | 'grade'
type SortDirection = 'asc' | 'desc' | null

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClass, setSelectedClass] = useState<string>('') // Format: "classId-subjectId"
  
  // Sorting and filtering state
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [searchQuery, setSearchQuery] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('')
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/teacher/reports')
        if (!response.ok) {
          throw new Error('Failed to fetch report data')
        }
        const reportData = await response.json()
        setData(reportData)
        
        // Set first class as default if available
        if (reportData.classes && reportData.classes.length > 0 && !selectedClass) {
          const firstClass = reportData.classes[0]
          setSelectedClass(`${firstClass.classId}-${firstClass.subjectId}`)
        }
      } catch (err) {
        setError('Unable to load report data')
        console.error('Error fetching report data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedClass])

  // Get selected class data
  const selectedClassData = data?.classes.find(cls => `${cls.classId}-${cls.subjectId}` === selectedClass)
  const selectedClassKey = selectedClass // Already in format "classId-subjectId"
  
  const selectedStudentPerformance = useMemo(() => {
    return selectedClassKey && data?.studentPerformance ? data.studentPerformance[selectedClassKey] || [] : []
  }, [selectedClassKey, data?.studentPerformance])

  // Sorting and filtering logic
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...selectedStudentPerformance]

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(student => 
        student.name.toLowerCase().includes(query) ||
        student.admissionNumber.toLowerCase().includes(query)
      )
    }

    // Apply grade filter
    if (gradeFilter) {
      result = result.filter(student => student.grade === gradeFilter)
    }

    // Apply sorting
    if (sortDirection) {
      result.sort((a, b) => {
        let aValue: string | number
        let bValue: string | number

        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase()
            bValue = b.name.toLowerCase()
            break
          case 'admissionNumber':
            aValue = a.admissionNumber.toLowerCase()
            bValue = b.admissionNumber.toLowerCase()
            break
          case 'caScore':
            aValue = a.caScore ?? -1
            bValue = b.caScore ?? -1
            break
          case 'examScore':
            aValue = a.examScore ?? -1
            bValue = b.examScore ?? -1
            break
          case 'finalScore':
            aValue = a.finalScore ?? -1
            bValue = b.finalScore ?? -1
            break
          case 'grade':
            aValue = a.grade ?? 'ZZZ'
            bValue = b.grade ?? 'ZZZ'
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [selectedStudentPerformance, searchQuery, gradeFilter, sortField, sortDirection])

  // Get unique grades for filter
  const availableGrades = useMemo(() => {
    const grades = new Set(selectedStudentPerformance.map(s => s.grade).filter(Boolean))
    return Array.from(grades).sort()
  }, [selectedStudentPerformance])

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction or reset
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortDirection(null)
        setSortField('name')
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Download as PDF (colorful version)
  const downloadPDF = () => {
    if (!selectedClassData || filteredAndSortedStudents.length === 0 || !data) return

    const currentDate = new Date().toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    // Generate table rows HTML
    const tableRows = filteredAndSortedStudents.map((student, index) => `
      <tr style="${index % 2 === 0 ? 'background-color: #f9fafb;' : 'background-color: white;'}">
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center; font-weight: 500; color: #374151;">${index + 1}</td>
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; font-weight: 600; color: #111827;">${student.name}</td>
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${student.admissionNumber}</td>
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center; color: #059669; font-weight: 600;">
          ${student.caScore !== null && student.caMaxScore !== null ? `${student.caScore}/${student.caMaxScore}` : '-'}
        </td>
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center; color: #2563eb; font-weight: 600;">
          ${student.examScore !== null && student.examMaxScore !== null ? `${student.examScore}/${student.examMaxScore}` : '-'}
        </td>
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center; color: #7c3aed; font-weight: 700; font-size: 16px;">
          ${student.finalScore !== null && student.finalMaxScore !== null ? `${student.finalScore}/${student.finalMaxScore}` : '-'}
        </td>
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; padding: 6px 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 6px; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">
            ${student.grade || '-'}
          </span>
        </td>
        <td style="padding: 14px 16px; border: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; padding: 6px 12px; background-color: ${student.grade && ['A', 'B', 'C'].includes(student.grade) ? '#d1fae5' : '#fee2e2'}; color: ${student.grade && ['A', 'B', 'C'].includes(student.grade) ? '#065f46' : '#991b1b'}; border-radius: 6px; font-weight: 600; font-size: 13px;">
            ${student.grade && ['A', 'B', 'C'].includes(student.grade) ? '✓ Achieved' : '✗ Not Achieved'}
          </span>
        </td>
      </tr>
    `).join('')

    const pdfWindow = window.open('', '', 'height=800,width=1200')
    if (!pdfWindow) return

    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Performance Report - ${selectedClassData.className}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
            }
            
            .container {
              background: white;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              overflow: hidden;
            }
            
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              position: relative;
              overflow: hidden;
            }
            
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -10%;
              width: 400px;
              height: 400px;
              background: rgba(255,255,255,0.1);
              border-radius: 50%;
            }
            
            .header::after {
              content: '';
              position: absolute;
              bottom: -30%;
              left: -5%;
              width: 300px;
              height: 300px;
              background: rgba(255,255,255,0.08);
              border-radius: 50%;
            }
            
            .branding {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 30px;
              position: relative;
              z-index: 1;
            }
            
            .logo-section {
              display: flex;
              align-items: center;
              gap: 15px;
            }
            
            .logo {
              width: 60px;
              height: 60px;
              background: white;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 28px;
              color: #667eea;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            }
            
            .brand-text {
              display: flex;
              flex-direction: column;
            }
            
            .brand-name {
              font-size: 32px;
              font-weight: 800;
              letter-spacing: -0.5px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .brand-tagline {
              font-size: 13px;
              opacity: 0.95;
              font-weight: 500;
              letter-spacing: 0.5px;
            }
            
            .report-date {
              text-align: right;
              font-size: 14px;
              opacity: 0.95;
              font-weight: 500;
            }
            
            .report-title {
              position: relative;
              z-index: 1;
            }
            
            .report-title h1 {
              font-size: 36px;
              font-weight: 800;
              margin-bottom: 8px;
              text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .report-title h2 {
              font-size: 24px;
              font-weight: 600;
              opacity: 0.95;
            }
            
            .stats-section {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              padding: 40px;
              background: #f9fafb;
              border-bottom: 3px solid #e5e7eb;
            }
            
            .stat-card {
              background: white;
              padding: 24px;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              border-left: 4px solid;
              transition: transform 0.2s;
            }
            
            .stat-card:nth-child(1) { border-left-color: #10b981; }
            .stat-card:nth-child(2) { border-left-color: #3b82f6; }
            .stat-card:nth-child(3) { border-left-color: #8b5cf6; }
            
            .stat-label {
              font-size: 13px;
              color: #6b7280;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            
            .stat-value {
              font-size: 42px;
              font-weight: 800;
              color: #111827;
              line-height: 1;
            }
            
            .stat-progress {
              margin-top: 12px;
              font-size: 12px;
              color: #6b7280;
              font-weight: 600;
            }
            
            .stat-progress-bar {
              width: 100%;
              height: 6px;
              background: #e5e7eb;
              border-radius: 3px;
              margin-top: 6px;
              overflow: hidden;
            }
            
            .stat-progress-fill {
              height: 100%;
              border-radius: 3px;
              transition: width 0.3s;
            }
            
            .stat-card:nth-child(1) .stat-progress-fill { background: #10b981; }
            .stat-card:nth-child(2) .stat-progress-fill { background: #3b82f6; }
            .stat-card:nth-child(3) .stat-progress-fill { background: #8b5cf6; }
            
            .content-section {
              padding: 40px;
            }
            
            .section-title {
              font-size: 22px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 24px;
              padding-bottom: 12px;
              border-bottom: 3px solid #667eea;
              display: inline-block;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              border-radius: 8px;
              overflow: hidden;
            }
            
            th {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 16px;
              text-align: center;
              font-weight: 700;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border: 1px solid rgba(255,255,255,0.2);
            }
            
            td {
              font-size: 14px;
            }
            
            .footer {
              background: #f9fafb;
              padding: 30px 40px;
              border-top: 3px solid #e5e7eb;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            
            .footer-branding {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            
            .footer-logo {
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 20px;
              color: white;
            }
            
            .footer-text {
              font-size: 14px;
              color: #6b7280;
              font-weight: 600;
            }
            
            .footer-info {
              text-align: right;
              font-size: 13px;
              color: #9ca3af;
            }
            
            .download-btn {
              position: fixed;
              top: 20px;
              right: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              z-index: 1000;
              font-size: 15px;
            }
            
            .download-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
            }
            
            .instructions {
              position: fixed;
              top: 80px;
              right: 20px;
              background: white;
              color: #333;
              padding: 16px 20px;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.15);
              z-index: 1000;
              max-width: 300px;
              border-left: 4px solid #667eea;
            }
            
            .instructions h3 {
              font-size: 14px;
              font-weight: 700;
              margin-bottom: 8px;
              color: #667eea;
            }
            
            .instructions ol {
              margin: 0;
              padding-left: 20px;
              font-size: 13px;
              line-height: 1.6;
            }
            
            .instructions li {
              margin-bottom: 4px;
            }
            
            @media print {
              body {
                background: white;
                padding: 0;
              }
              
              .container {
                box-shadow: none;
              }
              
              .download-btn { display: none; }
              
              @page {
                margin: 0.5cm;
              }
            }
          </style>
        </head>
        <body>
          <button class="download-btn" onclick="window.print()">� Save as PDF (Ctrl+P)</button>
          
         
          
          <div class="container">
            <!-- Header Section -->
            <div class="header">
              <div class="branding">
                <div class="logo-section">
                  <div class="logo">SO</div>
                  <div class="brand-text">
                    <div class="brand-name">SchoolOffice</div>
                    <div class="brand-tagline">Modern School Management System</div>
                  </div>
                </div>
                <div class="report-date">
                  <div>${currentDate}</div>
                  <div style="margin-top: 4px; font-size: 12px;">Generated at ${new Date().toLocaleTimeString()}</div>
                </div>
              </div>
              <div class="report-title">
                <h1>${data.schoolName || 'School Name'}</h1>
                <h2>Student Performance Report</h2>
                <h2>${selectedClassData.className} - ${selectedClassData.subjectName}</h2>
              </div>
            </div>

            <!-- Statistics Section -->
            <div class="stats-section">
              <div class="stat-card">
                <div class="stat-label">CA Average</div>
                <div class="stat-value">${selectedClassData.averageCA !== null ? selectedClassData.averageCA : 0}%</div>
                <div class="stat-progress">
                  Completion: ${selectedClassData.caCompletion || 0}%
                  <div class="stat-progress-bar">
                    <div class="stat-progress-fill" style="width: ${selectedClassData.caCompletion || 0}%"></div>
                  </div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Exam Average</div>
                <div class="stat-value">${selectedClassData.averageExam !== null ? selectedClassData.averageExam : 0}%</div>
                <div class="stat-progress">
                  Completion: ${selectedClassData.examCompletion || 0}%
                  <div class="stat-progress-bar">
                    <div class="stat-progress-fill" style="width: ${selectedClassData.examCompletion || 0}%"></div>
                  </div>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Final Average</div>
                <div class="stat-value">${selectedClassData.averageFinal !== null ? selectedClassData.averageFinal : 0}%</div>
                <div class="stat-progress">
                  Total Students: ${selectedClassData.studentCount}
                  <div class="stat-progress-bar">
                    <div class="stat-progress-fill" style="width: ${selectedClassData.finalCompletion || 0}%"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Content Section -->
            <div class="content-section">
              <div class="section-title">Student Performance Details</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 50px;">#</th>
                    <th>Student Name</th>
                    <th>Admission No.</th>
                    <th>CA Score</th>
                    <th>Exam Score</th>
                    <th>Final Score</th>
                    <th>Grade</th>
                    <th>Competency</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>

            <!-- Footer Section -->
            <div class="footer">
              <div class="footer-branding">
                <div class="footer-logo">SO</div>
                <div class="footer-text">
                  Powered by SchoolOffice<br>
                  <span style="font-size: 12px; font-weight: 500;">www.schooloffice.com</span>
                </div>
              </div>
              <div class="footer-info">
                <div>Report ID: RPT-${Date.now()}</div>
                <div style="margin-top: 4px;">© ${new Date().getFullYear()} SchoolOffice. All rights reserved.</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `)
    pdfWindow.document.close()
  }
  const downloadCSV = () => {
    if (!selectedClassData || filteredAndSortedStudents.length === 0 || !data) return

    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const csvRows = [
      ['SchoolOffice - Student Performance Report'],
      [''],
      [`School: ${data.schoolName || 'School Name'}`],
      [`Class: ${selectedClassData.className}`],
      [`Subject: ${selectedClassData.subjectName}`],
      [`Total Students: ${selectedClassData.studentCount}`],
      [`Report Generated: ${currentDate}`],
      [''],
      ['CLASS STATISTICS'],
      [`CA Average: ${selectedClassData.averageCA !== null ? selectedClassData.averageCA : 0}%`],
      [`Exam Average: ${selectedClassData.averageExam !== null ? selectedClassData.averageExam : 0}%`],
      [`Final Average: ${selectedClassData.averageFinal !== null ? selectedClassData.averageFinal : 0}%`],
      [`CA Completion: ${selectedClassData.caCompletion || 0}%`],
      [`Exam Completion: ${selectedClassData.examCompletion || 0}%`],
      [''],
      ['STUDENT PERFORMANCE'],
      ['Student Name', 'Admission Number', 'CA Score', 'CA Max', 'Exam Score', 'Exam Max', 'Final Score', 'Final Max', 'Grade', 'Competency Status'],
      ...filteredAndSortedStudents.map(student => [
        student.name,
        student.admissionNumber,
        student.caScore !== null ? student.caScore : '-',
        student.caMaxScore !== null ? student.caMaxScore : '-',
        student.examScore !== null ? student.examScore : '-',
        student.examMaxScore !== null ? student.examMaxScore : '-',
        student.finalScore !== null ? student.finalScore : '-',
        student.finalMaxScore !== null ? student.finalMaxScore : '-',
        student.grade || '-',
        student.grade && ['A', 'B', 'C'].includes(student.grade) ? 'Achieved' : 'Not Achieved'
      ]),
      [''],
      [''],
      ['Report powered by SchoolOffice - Modern School Management System'],
      ['For support, visit: www.schooloffice.com']
    ]

    const csvContent = csvRows.map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `SchoolOffice_${selectedClassData.className}_${selectedClassData.subjectName}_Report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print table (black and white friendly - minimal design)
  const handlePrint = () => {
    if (!tableRef.current || !selectedClassData || !data) return

    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })

    const printWindow = window.open('', '', 'height=800,width=1200')
    if (!printWindow) return

    // Generate table rows HTML (B&W friendly)
    const tableRows = filteredAndSortedStudents.map((student, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${student.name}</td>
        <td>${student.admissionNumber}</td>
        <td>${student.caScore !== null && student.caMaxScore !== null ? `${student.caScore}/${student.caMaxScore}` : '-'}</td>
        <td>${student.examScore !== null && student.examMaxScore !== null ? `${student.examScore}/${student.examMaxScore}` : '-'}</td>
        <td><strong>${student.finalScore !== null && student.finalMaxScore !== null ? `${student.finalScore}/${student.finalMaxScore}` : '-'}</strong></td>
        <td><strong>${student.grade || '-'}</strong></td>
        <td>${student.grade && ['A', 'B', 'C'].includes(student.grade) ? '✓ Achieved' : '✗ Not Achieved'}</td>
      </tr>
    `).join('')
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Performance Report - ${selectedClassData.className}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body { 
              font-family: 'Arial', 'Helvetica', sans-serif;
              padding: 40px;
              background: white;
              color: #000;
              line-height: 1.4;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #000;
            }
            
            .school-name {
              font-size: 28px;
              font-weight: 700;
              margin-bottom: 5px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            
            .report-title {
              font-size: 20px;
              font-weight: 600;
              margin: 15px 0 5px 0;
            }
            
            .report-subtitle {
              font-size: 16px;
              color: #333;
              margin-bottom: 10px;
            }
            
            .report-date {
              font-size: 12px;
              color: #666;
            }
            
            .stats-section {
              display: flex;
              justify-content: space-around;
              margin: 25px 0;
              padding: 20px;
              background: #f5f5f5;
              border: 1px solid #ddd;
            }
            
            .stat-item {
              text-align: center;
            }
            
            .stat-label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            
            .stat-value {
              font-size: 32px;
              font-weight: 700;
              color: #000;
            }
            
            .stat-detail {
              font-size: 10px;
              color: #666;
              margin-top: 3px;
            }
            
            .content-section {
              margin: 25px 0;
            }
            
            .section-title {
              font-size: 16px;
              font-weight: 700;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              border: 2px solid #000;
            }
            
            th {
              background: #000;
              color: #fff;
              padding: 10px 8px;
              text-align: center;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border: 1px solid #000;
            }
            
            td {
              padding: 8px;
              border: 1px solid #333;
              font-size: 12px;
              text-align: center;
            }
            
            td:nth-child(2) {
              text-align: left;
              font-weight: 600;
            }
            
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 15px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            
            .footer-brand {
              font-weight: 600;
              color: #000;
              margin-bottom: 3px;
            }
            
            @media print {
              @page {
                margin: 1.5cm;
              }
              
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <!-- Header Section -->
          <div class="header">
            <div class="school-name">${data.schoolName || 'School Name'}</div>
            <div class="report-title">Student Performance Report</div>
            <div class="report-subtitle">${selectedClassData.className} - ${selectedClassData.subjectName}</div>
            <div class="report-date">${currentDate}</div>
          </div>

          <!-- Statistics Section -->
          <div class="stats-section">
            <div class="stat-item">
              <div class="stat-label">CA Average</div>
              <div class="stat-value">${selectedClassData.averageCA !== null ? selectedClassData.averageCA : 0}%</div>
              <div class="stat-detail">${selectedClassData.caCompletion || 0}% completion</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Exam Average</div>
              <div class="stat-value">${selectedClassData.averageExam !== null ? selectedClassData.averageExam : 0}%</div>
              <div class="stat-detail">${selectedClassData.examCompletion || 0}% completion</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Final Average</div>
              <div class="stat-value">${selectedClassData.averageFinal !== null ? selectedClassData.averageFinal : 0}%</div>
              <div class="stat-detail">${selectedClassData.studentCount} students</div>
            </div>
          </div>

          <!-- Content Section -->
          <div class="content-section">
            <div class="section-title">Student Performance Details</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;">#</th>
                  <th style="width: 180px;">Student Name</th>
                  <th style="width: 100px;">Admission No.</th>
                  <th>CA Score</th>
                  <th>Exam Score</th>
                  <th>Final Score</th>
                  <th>Grade</th>
                  <th>Competency</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>

          <!-- Footer Section -->
          <div class="footer">
            <div class="footer-brand">Powered by SchoolOffice</div>
            <div>Modern School Management System | www.schooloffice.com</div>
            <div style="margin-top: 5px;">Report ID: RPT-${Date.now()} | © ${new Date().getFullYear()} SchoolOffice</div>
          </div>
          
          <script>
            window.onload = function() { 
              setTimeout(function() {
                window.print(); 
              }, 250);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        <SkeletonLoader variant="text" count={2} />
        <div className="mt-4 sm:mt-6">
          <SkeletonLoader variant="card" count={4} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
        <div className="bg-[var(--danger-light)] dark:bg-[var(--danger-dark)] border border-[var(--danger-light)] dark:border-[var(--danger-dark)] rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="text-xs sm:text-sm">{error || 'Unable to load report data'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-main)] dark:bg-[var(--bg-main)]">
      {/* Mobile-First Container with proper padding */}
      <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 max-w-[1920px] mx-auto">
        <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 grid-cols-1 xl:grid-cols-12">
          {/* Report Generation Panel - Mobile First */}
          <div className="xl:col-span-4 space-y-3 sm:space-y-4">
            <Card className={cn(cardStyles.base, cardStyles.normal)}>
              <CardHeader className="p-3 sm:p-4 md:p-5">
                <CardTitle className="text-base sm:text-lg md:text-xl font-bold">Generate Report</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
              <div className="space-y-3 sm:space-y-4">
                {/* Class Selection - Mobile Optimized */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Select Class
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border-2 border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] transition-all shadow-sm"
                  >
                    <option value="">Select a class</option>
                    {data.classes && data.classes.map((cls) => {
                      const classKey = `${cls.classId}-${cls.subjectId}`
                      return (
                        <option key={classKey} value={classKey}>
                          {cls.className} - {cls.subjectName}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Types Info - Mobile Optimized - Commented out for now */}
          {/* <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
              <CardTitle className="text-base sm:text-lg md:text-xl font-bold">Report Types</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
              <div className="space-y-2.5 sm:space-y-3">
                {REPORT_TYPES.map((type) => (
                  <div 
                    key={`report-info-${type.id}`}
                    className="p-3 sm:p-4 border-2 border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/30 hover:border-[var(--accent-primary)] transition-all shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg flex-shrink-0', 
                        type.id === 'ca-only' ? teacherColors.success.bg :
                        type.id === 'exam-only' ? teacherColors.info.bg :
                        teacherColors.info.bg
                      )}>
                        {type.id === 'ca-only' ? (
                          <FileText className="h-5 w-5 text-[var(--chart-green)]" />
                        ) : type.id === 'exam-only' ? (
                          <TrendingUp className="h-5 w-5 text-[var(--chart-blue)]" />
                        ) : (
                          <Award className="h-5 w-5 text-[var(--chart-blue)]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] break-words mb-1">
                          {type.name}
                        </h3>
                        <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] break-words leading-relaxed">
                          {type.description}
                        </p>
                      </div>


                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card> */}
        </div>
        </div>

        {/* Class Performance Overview - Mobile First */}
        <div className="mt-3 sm:mt-4 md:mt-5 lg:mt-6">
          <Card className={cn(cardStyles.base, cardStyles.normal)}>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 md:p-5">
              <CardTitle className="text-base sm:text-lg md:text-xl lg:text-2xl break-words font-bold leading-tight">
                {selectedClassData ? (
                  <span className="block">
                    <span className="font-bold">{selectedClassData.className}</span>
                    <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mx-1 sm:mx-2">-</span>
                    <span className="break-words">{selectedClassData.subjectName}</span>
                  </span>
                ) : (
                  'Class Performance'
                )}
              </CardTitle>
              {selectedClassData && (
                <Badge variant="outline" className="self-start sm:self-auto text-xs sm:text-sm whitespace-nowrap flex-shrink-0 px-2 sm:px-3 py-1">
                  {selectedClassData.studentCount} students
                </Badge>
              )}
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-5 pt-0">
              {selectedClassData ? (
                <div className="space-y-4 sm:space-y-5 md:space-y-6">
                  {/* Class Stats - Mobile First Grid */}
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {/* CA Average Card - Mobile Optimized */}
                    <Card className={cn(cardStyles.base, cardStyles.compact, "hover:shadow-lg transition-shadow")}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">CA Average</p>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {selectedClassData.averageCA !== null && selectedClassData.averageCA !== undefined ? `${selectedClassData.averageCA}%` : '0%'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                            <span className="font-medium">Progress</span>
                            <span className="font-bold">{selectedClassData.caCompletion || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--chart-green)] transition-all duration-500 ease-out"
                              style={{ width: `${selectedClassData.caCompletion || 0}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Exam Average Card - Mobile Optimized */}
                    <Card className={cn(cardStyles.base, cardStyles.compact, "hover:shadow-lg transition-shadow")}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">Exam Average</p>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {selectedClassData.averageExam !== null && selectedClassData.averageExam !== undefined ? `${selectedClassData.averageExam}%` : '0%'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                            <span className="font-medium">Progress</span>
                            <span className="font-bold">{selectedClassData.examCompletion || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--chart-blue)] transition-all duration-500 ease-out"
                              style={{ width: `${selectedClassData.examCompletion || 0}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Final Average Card - Mobile Optimized */}
                    <Card className={cn(cardStyles.base, cardStyles.compact, 'sm:col-span-2 lg:col-span-1 hover:shadow-lg transition-shadow')}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">Final Average</p>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                              {selectedClassData.averageFinal !== null && selectedClassData.averageFinal !== undefined ? `${selectedClassData.averageFinal}%` : '0%'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                            <span className="font-medium">Progress</span>
                            <span className="font-bold">{selectedClassData.finalCompletion || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--chart-blue)] transition-all duration-500 ease-out"
                              style={{ width: `${selectedClassData.finalCompletion || 0}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Student Performance Table */}
                  <div>
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                          Student Performance
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadPDF}
                            disabled={filteredAndSortedStudents.length === 0}
                            className="gap-1.5 text-xs h-8 flex-1 sm:flex-initial"
                            title="Open colorful PDF preview (use browser's Save as PDF)"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Coloured Print</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadCSV}
                            disabled={filteredAndSortedStudents.length === 0}
                            className="gap-1.5 text-xs h-8 flex-1 sm:flex-initial"
                            title="Download Excel-compatible CSV file"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>CSV</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            disabled={filteredAndSortedStudents.length === 0}
                            className="gap-1.5 text-xs h-8 flex-1 sm:flex-initial"
                            title="Print black & white version"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Print</span>
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col gap-2 mb-4">
                      {/* Search */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search by name or admission..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors pr-8"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Grade Filter and Clear */}
                      <div className="flex gap-2">
                        <select
                          value={gradeFilter}
                          onChange={(e) => setGradeFilter(e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-colors"
                        >
                          <option value="">All Grades</option>
                          {availableGrades.map(grade => (
                            <option key={`grade-filter-${grade}`} value={grade}>{grade}</option>
                          ))}
                        </select>

                        {/* Clear Filters */}
                        {(searchQuery || gradeFilter) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSearchQuery('')
                              setGradeFilter('')
                            }}
                            className="gap-1.5 text-xs h-9 px-3"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Clear</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Results count */}
                    {(searchQuery || gradeFilter) && (
                      <div className="mb-3 text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                        Showing {filteredAndSortedStudents.length} of {selectedStudentPerformance.length} students
                      </div>
                    )}

                    <div className="overflow-x-auto -mx-2 sm:mx-0" ref={tableRef}>
                      <div className="inline-block min-w-full align-middle px-2 sm:px-0">
                        <div className="overflow-hidden border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg shadow-sm">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                            <thead className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                              <tr>
                                {[
                                  { label: 'Student', field: 'name' as SortField },
                                  { label: 'Adm.', field: 'admissionNumber' as SortField },
                                  { label: 'CA', field: 'caScore' as SortField },
                                  { label: 'Exam', field: 'examScore' as SortField },
                                  { label: 'Final', field: 'finalScore' as SortField },
                                  { label: 'Grade', field: 'grade' as SortField },
                                  { label: 'Status', field: null }
                                ].map((header, idx) => (
                                  <th 
                                    key={`header-${header.label}`}
                                    className={cn(
                                      "px-2 sm:px-3 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider",
                                      idx === 6 && "hidden lg:table-cell",
                                      idx === 1 && "hidden sm:table-cell",
                                      header.field && "cursor-pointer hover:bg-[var(--bg-main)] dark:hover:bg-[var(--bg-main)]/50 transition-colors select-none"
                                    )}
                                    onClick={() => header.field && handleSort(header.field)}
                                  >
                                    <div className="flex items-center gap-1 whitespace-nowrap">
                                      <span>{header.label}</span>
                                      {header.field && (
                                        <span className="inline-flex">
                                          {sortField === header.field && sortDirection === 'asc' && (
                                            <ArrowUp className="h-3 w-3 text-[var(--accent-primary)]" />
                                          )}
                                          {sortField === header.field && sortDirection === 'desc' && (
                                            <ArrowDown className="h-3 w-3 text-[var(--accent-primary)]" />
                                          )}
                                          {sortField !== header.field && (
                                            <ArrowUpDown className="h-3 w-3 text-[var(--text-muted)] opacity-50" />
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-[var(--bg-main)] divide-y divide-gray-100 dark:divide-gray-800">
                              {filteredAndSortedStudents.length > 0 ? (
                                filteredAndSortedStudents.map((student) => (
                                  <tr 
                                    key={`student-row-${student.id}`}
                                    className="hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 transition-colors"
                                  >
                                    <td className="px-2 sm:px-3 py-2 sm:py-3">
                                      <span className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)] text-xs sm:text-sm block truncate max-w-[120px] sm:max-w-none">
                                        {student.name}
                                      </span>
                                    </td>
                                    <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] whitespace-nowrap">
                                      {student.admissionNumber}
                                    </td>
                                    <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                                      <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)] text-xs sm:text-sm">
                                        {student.caScore !== null && student.caMaxScore !== null 
                                          ? `${student.caScore}/${student.caMaxScore}` 
                                          : '-'}
                                      </span>
                                    </td>
                                    <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                                      <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)] text-xs sm:text-sm">
                                        {student.examScore !== null && student.examMaxScore !== null 
                                          ? `${student.examScore}/${student.examMaxScore}` 
                                          : '-'}
                                      </span>
                                    </td>
                                    <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                                      <span className="text-[var(--text-primary)] dark:text-[var(--white-pure)] font-medium text-xs sm:text-sm">
                                        {student.finalScore !== null && student.finalMaxScore !== null 
                                          ? `${student.finalScore}/${student.finalMaxScore}` 
                                          : '-'}
                                      </span>
                                    </td>
                                    <td className="px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                                      <Badge variant="outline" className="text-xs">
                                        {student.grade || '-'}
                                      </Badge>
                                    </td>
                                    <td className="hidden lg:table-cell px-2 sm:px-3 py-2 sm:py-3 whitespace-nowrap">
                                      <Badge 
                                        variant={student.grade && ['A', 'B', 'C'].includes(student.grade) ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {student.grade && ['A', 'B', 'C'].includes(student.grade) ? 'Achieved' : 'Not Achieved'}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="px-3 py-8 text-center">
                                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                                      No student performance data available for this class
                                    </p>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 sm:py-16 px-4">
                  <BarChart3 className="h-12 w-12 sm:h-14 sm:w-14 text-[var(--text-muted)] mx-auto mb-4" />
                  <h3 className="text-base sm:text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                    Select a Class
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] max-w-md mx-auto">
                    Choose a class from the dropdown to view its performance reports
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}