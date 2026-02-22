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

interface ClassBreakdown {
  className: string
  count: number
  totalOutstanding: number
}

interface SeverityBreakdown {
  level: string
  count: number
  percentage: number
}

interface PrintSummaryReportProps {
  defaulters: Defaulter[]
  schoolName?: string
  termName?: string
  academicYear?: string
  totalOutstanding: number
  highRisk: number
  critical: number
}

export function PrintSummaryReport({
  defaulters,
  schoolName = 'School Name',
  termName = 'Current Term',
  academicYear = 'Academic Year',
  totalOutstanding,
  highRisk,
  critical,
}: PrintSummaryReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  // Calculate class breakdown
  const classBreakdown: ClassBreakdown[] = Object.values(
    defaulters.reduce((acc, d) => {
      if (!acc[d.className]) {
        acc[d.className] = {
          className: d.className,
          count: 0,
          totalOutstanding: 0
        }
      }
      acc[d.className].count++
      acc[d.className].totalOutstanding += d.balance
      return acc
    }, {} as Record<string, ClassBreakdown>)
  ).sort((a, b) => b.totalOutstanding - a.totalOutstanding)

  // Calculate severity breakdown
  const lowRisk = defaulters.filter(d => d.daysOverdue <= 30).length
  const mediumRisk = defaulters.filter(d => d.daysOverdue > 30 && d.daysOverdue <= 60).length
  const highRiskCount = defaulters.filter(d => d.daysOverdue > 60).length

  const severityBreakdown: SeverityBreakdown[] = [
    { level: 'Low Risk (≤30 days)', count: lowRisk, percentage: (lowRisk / defaulters.length) * 100 },
    { level: 'Medium Risk (31-60 days)', count: mediumRisk, percentage: (mediumRisk / defaulters.length) * 100 },
    { level: 'High Risk (>60 days)', count: highRiskCount, percentage: (highRiskCount / defaulters.length) * 100 },
  ]

  // Calculate student type breakdown
  const dayStudents = defaulters.filter(d => d.studentType === 'DAY').length
  const boardingStudents = defaulters.filter(d => d.studentType === 'BOARDING').length

  // Top 10 defaulters
  const topDefaulters = [...defaulters]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 10)

  return (
    <div id="print-summary-report" className="hidden print:block p-8">
      <div className="summary-container">
        <div className="text-center border-b-4 border-black pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2">{schoolName}</h1>
          <h2 className="text-xl font-semibold">FEE DEFAULTERS - EXECUTIVE SUMMARY</h2>
          <p className="text-sm mt-2">{termName} - {academicYear}</p>
          <p className="text-xs mt-1">Report Generated: {currentDate}</p>
        </div>

        {/* Key Metrics */}
        <div className="mb-6 p-4 bg-gray-100 border-2 border-gray-800">
          <h3 className="text-lg font-bold mb-3 text-center">KEY METRICS</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-white border border-gray-300">
              <div className="text-3xl font-bold text-red-600">{defaulters.length}</div>
              <div className="text-xs text-gray-600 mt-1">Total Defaulters</div>
            </div>
            <div className="p-3 bg-white border border-gray-300">
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</div>
              <div className="text-xs text-gray-600 mt-1">Total Outstanding</div>
            </div>
            <div className="p-3 bg-white border border-gray-300">
              <div className="text-3xl font-bold text-orange-600">{highRisk}</div>
              <div className="text-xs text-gray-600 mt-1">High Risk (&gt;30 days)</div>
            </div>
            <div className="p-3 bg-white border border-gray-300">
              <div className="text-3xl font-bold text-red-700">{critical}</div>
              <div className="text-xs text-gray-600 mt-1">Critical (&gt;500k UGX)</div>
            </div>
          </div>
        </div>

        {/* Class Breakdown */}
        <div className="mb-6">
          <h3 className="text-base font-bold mb-3 border-b-2 border-gray-800 pb-1">CLASS-WISE BREAKDOWN</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-black p-2 text-left">Class</th>
                <th className="border border-black p-2 text-center">Number of Defaulters</th>
                <th className="border border-black p-2 text-right">Total Outstanding</th>
                <th className="border border-black p-2 text-center">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {classBreakdown.map((item, index) => (
                <tr key={item.className} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 p-2 font-semibold">{item.className}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.count}</td>
                  <td className="border border-gray-300 p-2 text-right font-mono">{formatCurrency(item.totalOutstanding)}</td>
                  <td className="border border-gray-300 p-2 text-center">
                    {((item.totalOutstanding / totalOutstanding) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-800 text-white font-bold">
                <td className="border border-black p-2">TOTAL</td>
                <td className="border border-black p-2 text-center">{defaulters.length}</td>
                <td className="border border-black p-2 text-right font-mono">{formatCurrency(totalOutstanding)}</td>
                <td className="border border-black p-2 text-center">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Severity Analysis */}
        <div className="mb-6">
          <h3 className="text-base font-bold mb-3 border-b-2 border-gray-800 pb-1">SEVERITY ANALYSIS</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-black p-2 text-left">Risk Level</th>
                <th className="border border-black p-2 text-center">Number of Students</th>
                <th className="border border-black p-2 text-center">Percentage</th>
                <th className="border border-black p-2 text-center">Visual</th>
              </tr>
            </thead>
            <tbody>
              {severityBreakdown.map((item, index) => (
                <tr key={item.level} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 p-2 font-semibold">{item.level}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.count}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.percentage.toFixed(1)}%</td>
                  <td className="border border-gray-300 p-2">
                    <div className="w-full bg-gray-200 h-4">
                      <div 
                        className="bg-red-600 h-4" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Student Type Breakdown */}
        <div className="mb-6">
          <h3 className="text-base font-bold mb-3 border-b-2 border-gray-800 pb-1">STUDENT TYPE BREAKDOWN</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 border-2 border-blue-300">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-700">{dayStudents}</div>
                <div className="text-sm text-gray-700 mt-1">Day Students</div>
                <div className="text-xs text-gray-600 mt-1">
                  {((dayStudents / defaulters.length) * 100).toFixed(1)}% of total
                </div>
              </div>
            </div>
            <div className="p-4 bg-green-50 border-2 border-green-300">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-700">{boardingStudents}</div>
                <div className="text-sm text-gray-700 mt-1">Boarding Students</div>
                <div className="text-xs text-gray-600 mt-1">
                  {((boardingStudents / defaulters.length) * 100).toFixed(1)}% of total
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top 10 Defaulters */}
        <div className="mb-6 page-break">
          <h3 className="text-base font-bold mb-3 border-b-2 border-gray-800 pb-1">TOP 10 DEFAULTERS (BY OUTSTANDING BALANCE)</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border border-black p-2 text-left">Rank</th>
                <th className="border border-black p-2 text-left">Student Name</th>
                <th className="border border-black p-2 text-left">Class</th>
                <th className="border border-black p-2 text-right">Outstanding Balance</th>
                <th className="border border-black p-2 text-center">Days Overdue</th>
                <th className="border border-black p-2 text-left">Parent Contact</th>
              </tr>
            </thead>
            <tbody>
              {topDefaulters.map((defaulter, index) => (
                <tr key={defaulter.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-300 p-2 font-bold">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{defaulter.name}</td>
                  <td className="border border-gray-300 p-2">{defaulter.className}</td>
                  <td className="border border-gray-300 p-2 text-right font-mono font-bold text-red-600">
                    {formatCurrency(defaulter.balance)}
                  </td>
                  <td className="border border-gray-300 p-2 text-center">{defaulter.daysOverdue}</td>
                  <td className="border border-gray-300 p-2 text-xs">
                    {defaulter.contactInfo.parentPhone}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommendations */}
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-400">
          <h3 className="text-base font-bold mb-3">RECOMMENDATIONS</h3>
          <ul className="text-xs space-y-2 list-disc list-inside">
            <li>Immediate follow-up required for {critical} critical cases with balances exceeding 500,000 UGX</li>
            <li>Send reminder letters to all {highRisk} high-risk defaulters (over 30 days overdue)</li>
            <li>Schedule parent meetings for top 10 defaulters to discuss payment plans</li>
            <li>Consider implementing installment payment options for students with large outstanding balances</li>
            <li>Review and update contact information for parents who are unreachable</li>
            <li>Monitor {classBreakdown[0]?.className || 'top class'} closely as it has the highest number of defaulters</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-black text-xs text-gray-600">
          <p className="mb-2">
            <strong>Report Summary:</strong> This executive summary provides an overview of fee defaulters for {termName}. 
            Detailed individual reports and reminder letters can be generated separately.
          </p>
          <p>
            <strong>Confidential:</strong> This report contains sensitive financial information and should be handled accordingly.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <div>
            <div className="mt-10 border-t border-black pt-1">
              <p className="text-xs font-bold">Prepared By</p>
              <p className="text-xs mt-1">Bursar&apos;s Office</p>
              <p className="text-xs mt-1">{currentDate}</p>
            </div>
          </div>
          <div>
            <div className="mt-10 border-t border-black pt-1">
              <p className="text-xs font-bold">Reviewed By</p>
              <p className="text-xs mt-1">School Bursar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
