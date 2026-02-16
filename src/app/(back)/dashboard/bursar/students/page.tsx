'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Users,
  AlertTriangle,
  Search,
  Plus,
  Eye,
  X,
  Check,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'
import { cn } from '@/lib/utils'
import {
  getResponsiveGridClasses,
  getResponsiveSpacingClasses,
  getResponsiveTypographyClasses,
} from '@/lib/responsive'

// ============================================
// TYPES & INTERFACES
// ============================================

interface Student {
  id: string
  name: string
  admissionNumber: string
  classId: string
  className: string
  stream: string | null
  totalDue: number
  totalPaid: number
  balance: number
  lastPaymentDate: string | null
  paymentStatus: 'not_paid' | 'partially_paid' | 'fully_paid'
}

interface PaymentFormData {
  amount: string
  method: 'CASH' | 'BANK' | 'MOBILE_MONEY' | 'CHEQUE'
  reference: string
  bankName: string
  chequeNumber: string
  mobileNumber: string
  notes: string
  receivedAt: string
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function BursarStudentsPage() {
  const router = useRouter()
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    amount: '',
    method: 'CASH',
    reference: '',
    bankName: '',
    chequeNumber: '',
    mobileNumber: '',
    notes: '',
    receivedAt: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchStudents()
  }, [])

  useEffect(() => {
    filterStudents()
  }, [students, searchTerm, selectedClass, selectedStatus])

  const fetchStudents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/bursar/students')
      
      if (!response.ok) {
        throw new Error('Failed to fetch students')
      }

      const data = await response.json()
      setStudents(data.students || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  const filterStudents = () => {
    let filtered = [...students]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(s => s.classId === selectedClass)
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(s => s.paymentStatus === selectedStatus)
    }

    setFilteredStudents(filtered)
  }

  const handleRecordPayment = (student: Student) => {
    setSelectedStudent(student)
    setPaymentForm({
      amount: student.balance > 0 ? student.balance.toString() : '',
      method: 'CASH',
      reference: `PAY-${Date.now()}`,
      bankName: '',
      chequeNumber: '',
      mobileNumber: '',
      notes: '',
      receivedAt: new Date().toISOString().split('T')[0]
    })
    setShowPaymentModal(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedStudent) return

    try {
      setSubmitting(true)

      const response = await fetch('/api/bursar/payments/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          reference: paymentForm.reference,
          bankName: paymentForm.bankName || null,
          chequeNumber: paymentForm.chequeNumber || null,
          mobileNumber: paymentForm.mobileNumber || null,
          notes: paymentForm.notes || null,
          receivedAt: new Date(paymentForm.receivedAt).toISOString()
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to record payment')
      }

      // Refresh students list
      await fetchStudents()
      
      // Close modal
      setShowPaymentModal(false)
      setSelectedStudent(null)
      
      alert('Payment recorded successfully!')
    } catch (err) {
      console.error('Error recording payment:', err)
      alert(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: Student['paymentStatus']) => {
    switch (status) {
      case 'not_paid':
        return <Badge variant="destructive">Not Paid</Badge>
      case 'partially_paid':
        return <Badge variant="default">Partial</Badge>
      case 'fully_paid':
        return <Badge className="bg-green-500">Cleared</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <SkeletonLoader variant="table" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
        <ErrorMessage
          title="Failed to load students"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page']}
        />
      </div>
    )
  }

  // Calculate summary stats
  const totalStudents = students.length
  const totalExpected = students.reduce((sum, s) => sum + s.totalDue, 0)
  const totalPaid = students.reduce((sum, s) => sum + s.totalPaid, 0)
  const totalOutstanding = totalExpected - totalPaid

  return (
    <div className={getResponsiveSpacingClasses('containerPadding', 'space-y-3 sm:space-y-4 md:space-y-6')}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={getResponsiveTypographyClasses('h1', 'text-[var(--text-primary)]')}>
            Record Student Payments
          </h1>
          <p className={getResponsiveTypographyClasses('body', 'text-[var(--text-secondary)]')}>
            Select a student to record their fee payment
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Students"
          value={String(totalStudents)}
          subtitle="Enrolled"
          color="blue"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Expected"
          value={formatCurrency(totalExpected)}
          subtitle="Total fees"
          color="blue"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Collected"
          value={formatCurrency(totalPaid)}
          subtitle="Paid"
          color="green"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(totalOutstanding)}
          subtitle="Balance"
          color="red"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
              <Input
                placeholder="Search by name or admission number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {/* Classes will be populated dynamically */}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="not_paid">Not Paid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
                <SelectItem value="fully_paid">Fully Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left text-sm font-medium">Admission No.</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Student Name</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Class</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Total Due</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Paid</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Balance</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Status</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b hover:bg-[var(--bg-surface)]">
                    <td className="py-3 px-4 text-sm">{student.admissionNumber}</td>
                    <td className="py-3 px-4 font-medium">{student.name}</td>
                    <td className="py-3 px-4 text-sm">
                      {student.className} {student.stream ? `(${student.stream})` : ''}
                    </td>
                    <td className="py-3 px-4">{formatCurrency(student.totalDue)}</td>
                    <td className="py-3 px-4 text-green-600">{formatCurrency(student.totalPaid)}</td>
                    <td className="py-3 px-4">
                      <span className={student.balance > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
                        {formatCurrency(student.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(student.paymentStatus)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleRecordPayment(student)}
                          disabled={student.balance <= 0}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Record Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/dashboard/bursar/student-fees/${student.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Modal */}
      {showPaymentModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-main)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Record Payment</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Student Info */}
              <div className="bg-[var(--bg-surface)] p-4 rounded-lg mb-6">
                <h3 className="font-medium mb-2">{selectedStudent.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-[var(--text-secondary)]">Admission No:</span>
                    <span className="ml-2">{selectedStudent.admissionNumber}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Class:</span>
                    <span className="ml-2">{selectedStudent.className}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Total Due:</span>
                    <span className="ml-2">{formatCurrency(selectedStudent.totalDue)}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-secondary)]">Balance:</span>
                    <span className="ml-2 text-red-600 font-medium">{formatCurrency(selectedStudent.balance)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Amount *</label>
                    <Input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Payment Date *</label>
                    <Input
                      type="date"
                      value={paymentForm.receivedAt}
                      onChange={(e) => setPaymentForm({...paymentForm, receivedAt: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Payment Method *</label>
                  <Select
                    value={paymentForm.method}
                    onValueChange={(value: any) => setPaymentForm({...paymentForm, method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK">Bank Transfer</SelectItem>
                      <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Reference Number *</label>
                  <Input
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({...paymentForm, reference: e.target.value})}
                    placeholder="Transaction reference"
                  />
                </div>

                {paymentForm.method === 'BANK' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Bank Name</label>
                    <Input
                      value={paymentForm.bankName}
                      onChange={(e) => setPaymentForm({...paymentForm, bankName: e.target.value})}
                      placeholder="Enter bank name"
                    />
                  </div>
                )}

                {paymentForm.method === 'CHEQUE' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Cheque Number</label>
                    <Input
                      value={paymentForm.chequeNumber}
                      onChange={(e) => setPaymentForm({...paymentForm, chequeNumber: e.target.value})}
                      placeholder="Enter cheque number"
                    />
                  </div>
                )}

                {paymentForm.method === 'MOBILE_MONEY' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Mobile Number</label>
                    <Input
                      value={paymentForm.mobileNumber}
                      onChange={(e) => setPaymentForm({...paymentForm, mobileNumber: e.target.value})}
                      placeholder="Enter mobile number"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                  <textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                    placeholder="Add any additional notes"
                    className="w-full p-2 border rounded-md"
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitPayment}
                  className="flex-1"
                  disabled={submitting || !paymentForm.amount || !paymentForm.reference}
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
