'use client'

import React from 'react'

interface Defaulter {
  id: string
  studentId: string
  name: string
  className: string
  stream: string | null
  studentType: 'DAY' | 'BOARDING'
  totalDue: number
  totalPaid: number
  balance: number
  daysOverdue: number
  lastPaymentDate: string | null
  contactInfo: {
    parentName: string
    parentPhone: string
    parentEmail: string
  }
}

interface PrintDefaulterListProps {
  defaulters: Defaulter[]
  schoolName?: string
  termName?: string
  academicYear?: string
  totalOutstanding: number
  highRisk: number
  critical: number
}

export function PrintDefaulterList({
  defaulters,
  schoolName = 'School Name',
  termName = 'Current Term',
  academicYear = 'Academic Year',
  totalOutstanding,
  highRisk,
  critical,
}: PrintDefaulterListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-GB')
  }

  return (
    <div id="print-defaulter-list" className="hidden print:block">
      <style jsx>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: A4 landscape;
          }
          
          .print-container {
            font-family: Arial, sans-serif;
            font-size: 10pt;
            color: #000;
          }
          
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          
          .print-header h1 {
            font-size: 18pt;
            margin: 0 0 5px 0;
            font-weight: bold;
          }
          
          .print-header h2 {
            font-size: 14pt;
            margin: 0 0 5px 0;
            font-weight: normal;
          }
          
          .print-header p {
            margin: 2px 0;
            font-size: 10pt;
          }
          
          .summary-stats {
            display: flex;
            justify-content: space-around;
            margin: 15px 0;
            padding: 10px;
            background: #f5f5f5;
            border: 1px solid #ddd;
          }
          
          .stat-item {
            text-align: center;
          }
          
          .stat-value {
            font-size: 16pt;
            font-weight: bold;
            color: #d32f2f;
          }
          
          .stat-label {
            font-size: 9pt;
            color: #666;
          }
          
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          
          .print-table th {
            background: #333;
            color: #fff;
            padding: 8px 5px;
            text-align: left;
            font-size: 9pt;
            font-weight: bold;
            border: 1px solid #000;
          }
          
          .print-table td {
            padding: 6px 5px;
            border: 1px solid #ddd;
            font-size: 9pt;
          }
          
          .print-table tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .balance-cell {
            font-weight: bold;
            color: #d32f2f;
          }
          
          .print-footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
            font-size: 8pt;
            text-align: center;
            color: #666;
          }
          
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="print-container">
        {/* Header */}
        <div className="print-header">
          <h1>{schoolName}</h1>
          <h2>Fee Defaulters Report</h2>
          <p>{termName} - {academicYear}</p>
          <p>Generated on: {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB')}</p>
        </div>

        {/* Summary Statistics */}
        <div className="summary-stats">
          <div className="stat-item">
            <div className="stat-value">{defaulters.length}</div>
            <div className="stat-label">Total Defaulters</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{formatCurrency(totalOutstanding)}</div>
            <div className="stat-label">Total Outstanding</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{highRisk}</div>
            <div className="stat-label">High Risk (&gt;30 days)</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{critical}</div>
            <div className="stat-label">Critical (&gt;500k UGX)</div>
          </div>
        </div>

        {/* Defaulters Table */}
        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: '3%' }}>#</th>
              <th style={{ width: '15%' }}>Student Name</th>
              <th style={{ width: '8%' }}>Class</th>
              <th style={{ width: '6%' }}>Type</th>
              <th style={{ width: '10%' }}>Total Due</th>
              <th style={{ width: '10%' }}>Paid</th>
              <th style={{ width: '10%' }}>Balance</th>
              <th style={{ width: '7%' }}>Days Overdue</th>
              <th style={{ width: '10%' }}>Last Payment</th>
              <th style={{ width: '12%' }}>Parent Name</th>
              <th style={{ width: '9%' }}>Phone</th>
            </tr>
          </thead>
          <tbody>
            {defaulters.map((defaulter, index) => (
              <tr key={defaulter.id}>
                <td>{index + 1}</td>
                <td>{defaulter.name}</td>
                <td>{defaulter.className}{defaulter.stream ? ` (${defaulter.stream})` : ''}</td>
                <td>{defaulter.studentType}</td>
                <td>{formatCurrency(defaulter.totalDue)}</td>
                <td>{formatCurrency(defaulter.totalPaid)}</td>
                <td className="balance-cell">{formatCurrency(defaulter.balance)}</td>
                <td>{defaulter.daysOverdue}</td>
                <td>{formatDate(defaulter.lastPaymentDate)}</td>
                <td>{defaulter.contactInfo.parentName}</td>
                <td>{defaulter.contactInfo.parentPhone}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="print-footer">
          <p>This is a computer-generated report. For any queries, please contact the Bursar&apos;s Office.</p>
          <p>Confidential - For Internal Use Only</p>
        </div>
      </div>
    </div>
  )
}
