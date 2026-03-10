'use client'

import React from 'react'

interface Student {
  id: string
  name: string
  admissionNumber: string 
  className: string
  stream: string | null
  totalDue: number
  totalPaid: number
  balance: number
  paymentStatus: string
  lastPaymentDate: string | null
}

interface PrintStudentFeesProps {
  students: Student[]
  schoolName: string
  currentTerm: string
  printType: 'colored' | 'standard'
}

export function PrintStudentFees({ students, schoolName, currentTerm, printType }: PrintStudentFeesProps) {
  const formatCurrency = (amount: number) => {
    return `UGX ${amount.toLocaleString()}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-GB')
  }

  const getStatusColor = (status: string) => {
    if (printType === 'standard') {
      return status === 'fully_paid' ? '#000' : '#666'
    }
    switch (status) {
      case 'fully_paid':
        return '#10b981'
      case 'partially_paid':
        return '#f59e0b'
      case 'not_paid':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const isColored = printType === 'colored'

  // Calculate summary
  const totalStudents = students.length
  const fullyPaid = students.filter(s => s.paymentStatus === 'fully_paid').length
  const partiallyPaid = students.filter(s => s.paymentStatus === 'partially_paid').length
  const notPaid = students.filter(s => s.paymentStatus === 'not_paid').length
  const totalExpected = students.reduce((sum, s) => sum + s.totalDue, 0)
  const totalPaid = students.reduce((sum, s) => sum + s.totalPaid, 0)
  const totalOutstanding = students.reduce((sum, s) => sum + Math.max(0, s.balance), 0)

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: '#fff',
      color: '#000'
    }}>
      {/* Header */}
      <div style={{
        borderBottom: isColored ? '4px solid #10b981' : '2px solid #000',
        paddingBottom: '20px',
        marginBottom: '30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            margin: '0 0 8px 0',
            color: isColored ? '#059669' : '#000'
          }}>
            {schoolName}
          </h1>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            margin: '0 0 8px 0',
            color: isColored ? '#10b981' : '#333'
          }}>
            Student Fees Report - {currentTerm}
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#666',
            margin: 0
          }}>
            Generated on {new Date().toLocaleDateString('en-GB')} at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        
        {/* SchoolOffice Branding */}
        <div style={{
          textAlign: 'right',
          opacity: 0.7
        }}>
          <div style={{
            fontSize: '18px',
            fontWeight: 'bold',
            color: isColored ? '#10b981' : '#333',
            marginBottom: '4px'
          }}>
            SchoolOffice
          </div>
          <div style={{
            fontSize: '11px',
            color: '#666',
            fontStyle: 'italic'
          }}>
            School Management System
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '30px'
      }}>
        <div style={{
          padding: '16px',
          border: isColored ? '2px solid #10b981' : '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: isColored ? '#d1fae5' : '#f9fafb'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Students</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: isColored ? '#059669' : '#000' }}>
            {totalStudents}
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          border: isColored ? '2px solid #10b981' : '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: isColored ? '#d1fae5' : '#f9fafb'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Fully Paid</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: isColored ? '#059669' : '#000' }}>
            {fullyPaid}
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          border: isColored ? '2px solid #10b981' : '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: isColored ? '#d1fae5' : '#f9fafb'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Collected</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: isColored ? '#059669' : '#000' }}>
            {formatCurrency(totalPaid)}
          </div>
        </div>
        
        <div style={{
          padding: '16px',
          border: isColored ? '2px solid #ef4444' : '1px solid #ddd',
          borderRadius: '8px',
          backgroundColor: isColored ? '#fee2e2' : '#f9fafb'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Outstanding</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: isColored ? '#dc2626' : '#000' }}>
            {formatCurrency(totalOutstanding)}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '16px',
          color: isColored ? '#059669' : '#000'
        }}>
          Student Payment Details
        </h3>
        
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px'
        }}>
          <thead>
            <tr style={{
              backgroundColor: isColored ? '#10b981' : '#f3f4f6',
              color: isColored ? '#fff' : '#000'
            }}>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                Admission No.
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                Student Name
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                Class
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
                Total Due
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
                Paid
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'right', borderBottom: '2px solid #ddd' }}>
                Balance
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                Status
              </th>
              <th style={{ padding: '12px 8px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                Last Payment
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map((student, index) => (
              <tr key={student.id} style={{
                backgroundColor: index % 2 === 0 ? '#fff' : (isColored ? '#f8fafc' : '#fafafa')
              }}>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>
                  {student.admissionNumber}
                </td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb', fontWeight: '500' }}>
                  {student.name}
                </td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>
                  {student.className} {student.stream ? `(${student.stream})` : ''}
                </td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right' }}>
                  {formatCurrency(student.totalDue)}
                </td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'right', color: isColored ? '#059669' : '#000' }}>
                  {formatCurrency(student.totalPaid)}
                </td>
                <td style={{
                  padding: '10px 8px',
                  borderBottom: '1px solid #e5e7eb',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: student.balance > 0 ? (isColored ? '#dc2626' : '#000') : (isColored ? '#059669' : '#000')
                }}>
                  {formatCurrency(student.balance)}
                </td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: isColored ? (
                      student.paymentStatus === 'fully_paid' ? '#d1fae5' :
                      student.paymentStatus === 'partially_paid' ? '#fef3c7' : '#fee2e2'
                    ) : '#f3f4f6',
                    color: getStatusColor(student.paymentStatus)
                  }}>
                    {student.paymentStatus === 'fully_paid' ? 'Cleared' :
                     student.paymentStatus === 'partially_paid' ? 'Partial' : 'Not Paid'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center', fontSize: '11px' }}>
                  {formatDate(student.lastPaymentDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: isColored ? '2px solid #10b981' : '1px solid #ddd',
        paddingTop: '20px',
        marginTop: '40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        color: '#666'
      }}>
        <div>
          <strong>Summary:</strong> {fullyPaid} fully paid, {partiallyPaid} partial, {notPaid} not paid
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Powered by <strong style={{ color: isColored ? '#10b981' : '#000' }}>SchoolOffice.academy</strong></div>
          <div style={{ fontSize: '10px', marginTop: '2px' }}>School Management Made Simple</div>
        </div>
      </div>
    </div>
  )
}
