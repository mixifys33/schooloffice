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

interface PrintReminderLettersProps {
  defaulters: Defaulter[]
  schoolName?: string
  schoolAddress?: string
  schoolPhone?: string
  schoolEmail?: string
  termName?: string
  paymentDeadline?: string
}

export function PrintReminderLetters({
  defaulters,
  schoolName = 'School Name',
  schoolAddress = 'School Address',
  schoolPhone = 'School Phone',
  schoolEmail = 'School Email',
  termName = 'Current Term',
  paymentDeadline = 'End of Term',
}: PrintReminderLettersProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
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
    <div id="print-reminder-letters" className="hidden print:block">
      <style jsx>{`
        @media print {
          @page {
            margin: 2cm;
            size: A4 portrait;
          }
          
          .letter-container {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
          }
          
          .letterhead {
            text-align: center;
            border-bottom: 3px double #000;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          
          .letterhead h1 {
            font-size: 20pt;
            margin: 0 0 5px 0;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .letterhead p {
            margin: 2px 0;
            font-size: 10pt;
          }
          
          .letter-date {
            text-align: right;
            margin-bottom: 20px;
            font-size: 11pt;
          }
          
          .recipient-address {
            margin-bottom: 20px;
          }
          
          .recipient-address p {
            margin: 2px 0;
          }
          
          .subject-line {
            font-weight: bold;
            text-decoration: underline;
            margin: 20px 0;
            text-align: center;
          }
          
          .letter-body {
            text-align: justify;
            margin-bottom: 20px;
          }
          
          .letter-body p {
            margin: 15px 0;
          }
          
          .payment-details {
            margin: 20px 0;
            padding: 15px;
            border: 2px solid #000;
            background: #f9f9f9;
          }
          
          .payment-details table {
            width: 100%;
            border-collapse: collapse;
          }
          
          .payment-details td {
            padding: 5px;
            border-bottom: 1px solid #ddd;
          }
          
          .payment-details td:first-child {
            font-weight: bold;
            width: 40%;
          }
          
          .payment-details .total-row {
            font-weight: bold;
            font-size: 13pt;
            color: #d32f2f;
            border-top: 2px solid #000;
          }
          
          .signature-section {
            margin-top: 40px;
          }
          
          .signature-line {
            margin-top: 50px;
            border-top: 1px solid #000;
            width: 200px;
          }
          
          .signature-label {
            font-size: 10pt;
            margin-top: 5px;
          }
          
          .footer-note {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            font-size: 9pt;
            font-style: italic;
            color: #666;
          }
          
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {defaulters.map((defaulter, index) => (
        <div key={defaulter.id} className={`letter-container ${index < defaulters.length - 1 ? 'page-break' : ''}`}>
          {/* Letterhead */}
          <div className="letterhead">
            <h1>{schoolName}</h1>
            <p>{schoolAddress}</p>
            <p>Tel: {schoolPhone} | Email: {schoolEmail}</p>
          </div>

          {/* Date */}
          <div className="letter-date">
            <p>Date: {currentDate}</p>
          </div>

          {/* Recipient Address */}
          <div className="recipient-address">
            <p><strong>{defaulter.contactInfo.parentName}</strong></p>
            <p>Parent/Guardian of <strong>{defaulter.name}</strong></p>
            <p>Class: {defaulter.className}{defaulter.stream ? ` (${defaulter.stream})` : ''}</p>
            {defaulter.contactInfo.parentPhone !== 'N/A' && (
              <p>Tel: {defaulter.contactInfo.parentPhone}</p>
            )}
          </div>

          {/* Subject */}
          <div className="subject-line">
            <p>RE: OUTSTANDING SCHOOL FEES - {termName.toUpperCase()}</p>
          </div>

          {/* Letter Body */}
          <div className="letter-body">
            <p>Dear {defaulter.contactInfo.parentName},</p>

            <p>
              We hope this letter finds you well. We are writing to bring to your attention the outstanding 
              school fees for your child, <strong>{defaulter.name}</strong>, who is currently enrolled in 
              <strong> {defaulter.className}</strong>.
            </p>

            <p>
              According to our records, there is an outstanding balance on your child&apos;s account for the 
              current term. We understand that circumstances may arise that affect timely payment, and we 
              are committed to working with you to resolve this matter.
            </p>

            {/* Payment Details */}
            <div className="payment-details">
              <table>
                <tbody>
                  <tr>
                    <td>Student Name:</td>
                    <td>{defaulter.name}</td>
                  </tr>
                  <tr>
                    <td>Class:</td>
                    <td>{defaulter.className}{defaulter.stream ? ` (${defaulter.stream})` : ''}</td>
                  </tr>
                  <tr>
                    <td>Student Type:</td>
                    <td>{defaulter.studentType}</td>
                  </tr>
                  <tr>
                    <td>Term:</td>
                    <td>{termName}</td>
                  </tr>
                  <tr>
                    <td>Total Fees Due:</td>
                    <td>{formatCurrency(defaulter.totalDue)}</td>
                  </tr>
                  <tr>
                    <td>Amount Paid:</td>
                    <td>{formatCurrency(defaulter.totalPaid)}</td>
                  </tr>
                  <tr className="total-row">
                    <td>Outstanding Balance:</td>
                    <td>{formatCurrency(defaulter.balance)}</td>
                  </tr>
                  <tr>
                    <td>Days Overdue:</td>
                    <td>{defaulter.daysOverdue} days</td>
                  </tr>
                  {defaulter.lastPaymentDate && (
                    <tr>
                      <td>Last Payment Date:</td>
                      <td>{formatDate(defaulter.lastPaymentDate)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p>
              We kindly request that you settle this outstanding balance by <strong>{paymentDeadline}</strong>. 
              Prompt payment will ensure that your child continues to receive uninterrupted education and 
              access to all school facilities and activities.
            </p>

            <p>
              If you are experiencing financial difficulties or would like to discuss a payment plan, 
              please do not hesitate to contact the Bursar&apos;s Office. We are here to assist you and 
              find a mutually agreeable solution.
            </p>

            <p>
              Payment can be made at the school Bursar&apos;s Office during working hours (Monday to Friday, 
              8:00 AM - 5:00 PM) or through the designated school bank account. Please ensure you quote 
              your child&apos;s name and class when making the payment.
            </p>

            <p>
              Thank you for your attention to this matter. We appreciate your cooperation and continued 
              support of our school.
            </p>

            <p>Yours sincerely,</p>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-line"></div>
            <div className="signature-label">
              <p><strong>School Bursar</strong></p>
              <p>{schoolName}</p>
            </div>
          </div>

          {/* Footer Note */}
          <div className="footer-note">
            <p>
              This is an official communication from {schoolName}. For any queries regarding this letter, 
              please contact the Bursar&apos;s Office at {schoolPhone} or {schoolEmail}.
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
