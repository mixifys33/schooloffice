'use client'

import React from 'react'

interface Payment {
  id: string
  amount: number
  receivedAt: string
  paymentMethod: string
  referenceNumber: string | null
}

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

interface PrintStudentStatementProps {
  student: Defaulter
  payments?: Payment[]
  schoolName?: string
  schoolAddress?: string
  schoolPhone?: string
  schoolEmail?: string
  termName?: string
  academicYear?: string
}

export function PrintStudentStatement({
  student,
  payments = [],
  schoolName = 'School Name',
  schoolAddress = 'School Address',
  schoolPhone = 'School Phone',
  schoolEmail = 'School Email',
  termName = 'Current Term',
  academicYear = 'Academic Year',
}: PrintStudentStatementProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div id="print-student-statement" className="hidden print:block p-8">
      <div className="statement-container">
        <div className="text-center border-b-2 border-black pb-4 mb-5">
          <h1 className="text-2xl font-bold mb-1">{schoolName}</h1>
          <p className="text-xs">{schoolAddress}</p>
          <p className="text-xs">Tel: {schoolPhone} | Email: {schoolEmail}</p>
          <h2 className="text-lg mt-2">STUDENT FEE STATEMENT</h2>
          <p className="text-xs">{termName} - {academicYear}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <h3 className="text-sm font-bold mb-2 border-b pb-1">Student Information</h3>
            <div className="text-xs space-y-1">
              <div><span className="font-bold">Student Name:</span> {student.name}</div>
              <div><span className="font-bold">Class:</span> {student.className}{student.stream ? ` (${student.stream})` : ''}</div>
              <div><span className="font-bold">Student Type:</span> {student.studentType}</div>
              <div><span className="font-bold">Student ID:</span> {student.studentId}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold mb-2 border-b pb-1">Parent/Guardian Information</h3>
            <div className="text-xs space-y-1">
              <div><span className="font-bold">Name:</span> {student.contactInfo.parentName}</div>
              <div><span className="font-bold">Phone:</span> {student.contactInfo.parentPhone}</div>
              <div><span className="font-bold">Email:</span> {student.contactInfo.parentEmail}</div>
              <div><span className="font-bold">Statement Date:</span> {currentDate}</div>
            </div>
          </div>
        </div>

        <div className="my-5 p-4 bg-gray-100 border-2 border-gray-800">
          <h3 className="text-sm font-bold text-center mb-3">FEE SUMMARY</h3>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-bold">Total Fees Due for {termName}:</td>
                <td className="py-2 text-right font-mono">{formatCurrency(student.totalDue)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-bold">Total Amount Paid:</td>
                <td className="py-2 text-right font-mono">{formatCurrency(student.totalPaid)}</td>
              </tr>
              <tr className="border-t-2 border-b-2 border-black font-bold">
                <td className="py-2">Outstanding Balance:</td>
                <td className="py-2 text-right font-mono">{formatCurrency(student.balance)}</td>
              </tr>
              <tr className="font-bold text-red-600 bg-white">
                <td className="py-2">Days Overdue:</td>
                <td className="py-2 text-right">{student.daysOverdue} days</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="my-5">
          <h3 className="text-sm font-bold mb-2 border-b-2 border-gray-800 pb-1">PAYMENT HISTORY</h3>
          {payments.length > 0 ? (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="border border-black p-2 text-left">#</th>
                  <th className="border border-black p-2 text-left">Date</th>
                  <th className="border border-black p-2 text-left">Amount</th>
                  <th className="border border-black p-2 text-left">Method</th>
                  <th className="border border-black p-2 text-left">Reference</th>
                  <th className="border border-black p-2 text-left">Balance</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => {
                  const runningBalance = student.totalDue - payments
                    .slice(0, index + 1)
                    .reduce((sum, p) => sum + p.amount, 0)
                  
                  return (
                    <tr key={payment.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="border border-gray-300 p-2">{index + 1}</td>
                      <td className="border border-gray-300 p-2">{formatDate(payment.receivedAt)}</td>
                      <td className="border border-gray-300 p-2 text-right font-mono font-bold">{formatCurrency(payment.amount)}</td>
                      <td className="border border-gray-300 p-2">{payment.paymentMethod}</td>
                      <td className="border border-gray-300 p-2">{payment.referenceNumber || '-'}</td>
                      <td className="border border-gray-300 p-2 text-right font-mono font-bold">{formatCurrency(runningBalance)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-5 text-center text-gray-600 italic bg-gray-50 border border-dashed border-gray-300">
              No payments recorded for this term
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t-2 border-black text-xs text-gray-600 space-y-2">
          <p>
            <strong>Note:</strong> This statement is accurate as of {currentDate}. 
            For any discrepancies or queries, please contact the Bursar&apos;s Office immediately.
          </p>
          <p>
            Payment can be made at the school Bursar&apos;s Office or through the designated school bank account. 
            Please quote the student&apos;s name and class when making payments.
          </p>
          <p>
            <strong>Confidential:</strong> This statement is intended solely for the addressee.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8">
          <div>
            <div className="mt-10 border-t border-black pt-1">
              <p className="text-xs font-bold">Prepared By</p>
              <p className="text-xs mt-1">Bursar&apos;s Office</p>
            </div>
          </div>
          <div>
            <div className="mt-10 border-t border-black pt-1">
              <p className="text-xs font-bold">Authorized Signature</p>
              <p className="text-xs mt-1">School Bursar</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
