'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  DollarSign,
  User,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface Student {
  id: string
  name: string
  admissionNumber: string
  className: string
  creditBalance: number
}

function NewRefundRequestForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = searchParams.get('studentId')

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [student, setStudent] = useState<Student | null>(null)

  // Form state
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH' | 'MOBILE_MONEY'>('BANK_TRANSFER')
  const [bankDetails, setBankDetails] = useState('')
  const [mobileNumber, setMobileNumber] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (studentId) {
      fetchStudentData()
    } else {
      setError('No student ID provided')
      setLoading(false)
    }
  }, [studentId])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/bursar/credits?studentId=${studentId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch student data')
      }

      const data = await response.json()
      
      if (data.students && data.students.length > 0) {
        const studentData = data.students[0]
        setStudent({
          id: studentData.id,
          name: studentData.name,
          admissionNumber: studentData.admissionNumber,
          className: studentData.className,
          creditBalance: studentData.creditBalance
        })
        // Pre-fill amount with credit balance
        setAmount(studentData.creditBalance.toString())
      } else {
        throw new Error('Student not found')
      }
    } catch (err) {
      console.error('Error fetching student:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch student data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!student) {
      alert('Student data not loaded')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (parseFloat(amount) > student.creditBalance) {
      alert(`Amount cannot exceed credit balance of ${formatCurrency(student.creditBalance)}`)
      return
    }

    if (!reason.trim()) {
      alert('Please provide a reason for the refund')
      return
    }

    if (paymentMethod === 'BANK_TRANSFER' && !bankDetails.trim()) {
      alert('Please provide bank details for bank transfer')
      return
    }

    if (paymentMethod === 'MOBILE_MONEY' && !mobileNumber.trim()) {
      alert('Please provide mobile number for mobile money transfer')
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch('/api/bursar/refunds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: student.id,
          amount: parseFloat(amount),
          reason,
          paymentMethod,
          bankDetails: paymentMethod === 'BANK_TRANSFER' ? bankDetails : undefined,
          mobileNumber: paymentMethod === 'MOBILE_MONEY' ? mobileNumber : undefined,
          notes: notes || undefined
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create refund request')
      }

      const result = await response.json()

      alert(`Refund request created successfully! Request ID: ${result.refund.id}`)
      router.push('/dashboard/bursar/refunds')
    } catch (err) {
      console.error('Error creating refund request:', err)
      alert(err instanceof Error ? err.message : 'Failed to create refund request')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[var(--primary)]" />
          <p className="text-[var(--text-secondary)]">Loading student data...</p>
        </div>
      </div>
    )
  }

  if (error || !student) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Student</h3>
              <p className="text-[var(--text-secondary)] mb-4">{error || 'Student not found'}</p>
              <Button onClick={() => router.push('/dashboard/bursar/credits')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Credits
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/bursar/credits')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Credits
        </Button>
        <h1 className="text-2xl font-bold">Create Refund Request</h1>
        <p className="text-[var(--text-secondary)]">
          Process a refund for student credit balance
        </p>
      </div>

      {/* Student Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-[var(--text-secondary)]">Student Name</Label>
              <p className="font-semibold">{student.name}</p>
            </div>
            <div>
              <Label className="text-sm text-[var(--text-secondary)]">Admission Number</Label>
              <p className="font-semibold">{student.admissionNumber}</p>
            </div>
            <div>
              <Label className="text-sm text-[var(--text-secondary)]">Class</Label>
              <p className="font-semibold">{student.className}</p>
            </div>
            <div>
              <Label className="text-sm text-[var(--text-secondary)]">Available Credit Balance</Label>
              <p className="font-semibold text-green-600 text-lg">
                {formatCurrency(student.creditBalance)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refund Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Refund Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div>
              <Label htmlFor="amount">
                Refund Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={student.creditBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-10"
                  placeholder="Enter refund amount"
                  required
                />
              </div>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Maximum: {formatCurrency(student.creditBalance)}
              </p>
            </div>

            {/* Reason */}
            <div>
              <Label htmlFor="reason">
                Reason for Refund <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Student transferred to another school, Overpayment correction, etc."
                rows={3}
                required
                className="mt-1"
              />
            </div>

            {/* Payment Method */}
            <div>
              <Label htmlFor="paymentMethod">
                Payment Method <span className="text-red-500">*</span>
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={(value: any) => setPaymentMethod(value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank Details (conditional) */}
            {paymentMethod === 'BANK_TRANSFER' && (
              <div>
                <Label htmlFor="bankDetails">
                  Bank Account Details <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="bankDetails"
                  value={bankDetails}
                  onChange={(e) => setBankDetails(e.target.value)}
                  placeholder="Bank name, Account number, Account name"
                  rows={3}
                  required
                  className="mt-1"
                />
              </div>
            )}

            {/* Mobile Number (conditional) */}
            {paymentMethod === 'MOBILE_MONEY' && (
              <div>
                <Label htmlFor="mobileNumber">
                  Mobile Money Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g., 0700123456"
                  required
                  className="mt-1"
                />
              </div>
            )}

            {/* Additional Notes */}
            <div>
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information..."
                rows={2}
                className="mt-1"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/bursar/credits')}
                disabled={submitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Request...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Create Refund Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">Refund Request Process</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>The request will be submitted for approval</li>
                <li>Once approved, the refund can be processed</li>
                <li>The credit balance will be deducted after processing</li>
                <li>A transaction record will be created for audit purposes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function NewRefundRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    }>
      <NewRefundRequestForm />
    </Suspense>
  )
}
