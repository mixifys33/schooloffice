'use client'

import React, { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

interface Refund {
  id: string
  studentId: string
  studentName: string
  className: string
  admissionNumber: string
  amount: number
  reason: string
  status: string
  requestedAt: string
  reviewedAt?: string
  processedAt?: string
  paymentMethod?: string
  reference?: string
}

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<Refund[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRefunds()
  }, [statusFilter])

  const fetchRefunds = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/bursar/refunds?status=${statusFilter}`)
      
      if (!response.ok) throw new Error('Failed to fetch refunds')

      const data = await response.json()
      setRefunds(data.refunds)
    } catch (err) {
      console.error('Error fetching refunds:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async (action: 'approve' | 'reject') => {
    if (!selectedRefund) return

    try {
      setProcessing(true)
      
      const response = await fetch(`/api/bursar/refunds/${selectedRefund.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          paymentMethod: action === 'approve' ? paymentMethod : undefined,
          reference: action === 'approve' ? reference : undefined,
          notes
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process refund')
      }

      alert(`Refund ${action === 'approve' ? 'approved and processed' : 'rejected'} successfully`)
      setShowProcessModal(false)
      setSelectedRefund(null)
      setPaymentMethod('')
      setReference('')
      setNotes('')
      fetchRefunds()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to process refund')
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'default', icon: Clock },
      APPROVED: { variant: 'success', icon: CheckCircle },
      REJECTED: { variant: 'destructive', icon: XCircle },
      PROCESSED: { variant: 'success', icon: CheckCircle }
    }
    const config = variants[status] || { variant: 'outline', icon: Clock }
    const Icon = config.icon
    
    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Refund Requests</h1>
          <p className="text-sm text-gray-600">Manage student refund requests</p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSED">Processed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchRefunds}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Refund Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="py-2 px-4 text-left text-sm font-medium">Student</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Class</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Amount</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Reason</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Status</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Requested</th>
                  <th className="py-2 px-4 text-left text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund) => (
                  <tr key={refund.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{refund.studentName}</div>
                      <div className="text-sm text-gray-500">{refund.admissionNumber}</div>
                    </td>
                    <td className="py-3 px-4">{refund.className}</td>
                    <td className="py-3 px-4 font-medium text-green-600">
                      {formatCurrency(refund.amount)}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">{refund.reason}</td>
                    <td className="py-3 px-4">{getStatusBadge(refund.status)}</td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(refund.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      {refund.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedRefund(refund)
                            setShowProcessModal(true)
                          }}
                        >
                          Process
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Process Modal */}
      {showProcessModal && selectedRefund && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Process Refund Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p><strong>Student:</strong> {selectedRefund.studentName}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedRefund.amount)}</p>
                <p><strong>Reason:</strong> {selectedRefund.reason}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="">Select method</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reference Number</label>
                <Input
                  placeholder="Transaction reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProcessModal(false)
                    setSelectedRefund(null)
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleProcess('reject')}
                  disabled={processing}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => handleProcess('approve')}
                  disabled={processing || !paymentMethod || !reference}
                >
                  {processing ? 'Processing...' : 'Approve & Process'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
