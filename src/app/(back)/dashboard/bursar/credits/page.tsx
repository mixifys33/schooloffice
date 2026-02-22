'use client'

import React, { useState, useEffect } from 'react'
import { DollarSign, Users, RefreshCw, FileText, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { ErrorMessage } from '@/components/ui/error-message'

interface Student {
  id: string
  name: string
  admissionNumber: string
  className: string
  stream: string | null
  creditBalance: number
  status: string
  recentTransactions: Array<{
    id: string
    amount: number
    type: string
    description: string
    createdAt: string
  }>
}

export default function CreditBalancesPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState({ totalStudentsWithCredits: 0, totalCreditAmount: 0 })

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/bursar/credits')
      
      if (!response.ok) {
        throw new Error('Failed to fetch credit balances')
      }

      const data = await response.json()
      setStudents(data.students)
      setSummary(data.summary)
    } catch (err) {
      console.error('Error fetching credits:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch credit balances')
    } finally {
      setLoading(false)
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
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Credit Balances</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonLoader variant="stat" />
          <SkeletonLoader variant="stat" />
        </div>
        <SkeletonLoader variant="table" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Credit Balances</h1>
        <ErrorMessage
          title="Failed to load credit balances"
          message={error}
          suggestedActions={['Check your internet connection', 'Try refreshing the page']}
        />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Credit Balances</h1>
          <p className="text-sm text-gray-600">Students with overpayment credits</p>
        </div>
        <Button onClick={fetchCredits}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          title="Students with Credits"
          value={String(summary.totalStudentsWithCredits)}
          subtitle="Active credit balances"
          color="blue"
          icon={<Users className="h-6 w-6" />}
        />
        <StatCard
          title="Total Credit Amount"
          value={formatCurrency(summary.totalCreditAmount)}
          subtitle="Total owed to students"
          color="green"
          icon={<DollarSign className="h-6 w-6" />}
        />
      </div>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students with Credit Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No students with credit balances</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-4 text-left text-sm font-medium">Student</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Admission No.</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Class</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Credit Balance</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Status</th>
                    <th className="py-2 px-4 text-left text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{student.name}</div>
                      </td>
                      <td className="py-3 px-4">{student.admissionNumber}</td>
                      <td className="py-3 px-4">
                        {student.className} {student.stream ? `(${student.stream})` : ''}
                      </td>
                      <td className="py-3 px-4 font-medium text-green-600">
                        {formatCurrency(student.creditBalance)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={student.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {student.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.location.href = `/dashboard/bursar/refunds/new?studentId=${student.id}`}
                        >
                          Request Refund
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
