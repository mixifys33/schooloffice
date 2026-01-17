'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

/**
 * Student Portal - Fees Status View
 * Requirement 16.4: Display fees status for students
 */

// Mock data - in production, this would come from API/session
const mockFeesData = {
  student: {
    id: 'student-1',
    name: 'Alice Doe',
    admissionNumber: 'ADM001',
    className: 'Primary 5',
    streamName: 'A',
  },
  currentTerm: {
    name: 'Term 1 2026',
    feeStructure: [
      { name: 'Tuition Fee', amount: 300000, isOptional: false },
      { name: 'Development Fee', amount: 100000, isOptional: false },
      { name: 'Examination Fee', amount: 50000, isOptional: false },
      { name: 'Computer Lab Fee', amount: 30000, isOptional: true },
      { name: 'Sports Fee', amount: 20000, isOptional: true },
    ],
    totalFees: 500000,
    totalPaid: 350000,
    balance: 150000,
    hasArrears: true,
    dueDate: '2026-02-15',
    payments: [
      {
        id: 'pay-1',
        date: '2025-12-15',
        amount: 200000,
        method: 'MOBILE_MONEY',
        reference: 'MM123456',
        receiptNumber: 'RCP-001',
      },
      {
        id: 'pay-2',
        date: '2026-01-05',
        amount: 150000,
        method: 'CASH',
        reference: 'CASH-001',
        receiptNumber: 'RCP-002',
      },
    ],
  },
  previousTerms: [
    { name: 'Term 3 2025', totalFees: 480000, totalPaid: 480000, balance: 0 },
    { name: 'Term 2 2025', totalFees: 480000, totalPaid: 480000, balance: 0 },
    { name: 'Term 1 2025', totalFees: 480000, totalPaid: 480000, balance: 0 },
  ],
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    CASH: 'Cash',
    MOBILE_MONEY: 'Mobile Money',
    BANK: 'Bank Transfer',
  }
  return labels[method] || method
}

function getPaymentMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    CASH: '💵',
    MOBILE_MONEY: '📱',
    BANK: '🏦',
  }
  return icons[method] || '💳'
}

export default function StudentFeesPage() {
  const { student, currentTerm, previousTerms } = mockFeesData
  const paymentPercentage = (currentTerm.totalPaid / currentTerm.totalFees) * 100

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">My Fees Status</h1>
        <p className="text-gray-600 mt-1">
          {student.className} {student.streamName && `(${student.streamName})`} • {student.admissionNumber}
        </p>
      </div>

      {/* Balance Summary Card */}
      <div
        className={`rounded-lg shadow-sm p-6 ${
          currentTerm.hasArrears
            ? 'bg-red-50 border border-red-200'
            : 'bg-green-50 border border-green-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">{currentTerm.name}</p>
            <p
              className="text-4xl font-bold mt-1"
              style={{ color: currentTerm.hasArrears ? '#dc2626' : '#16a34a' }}
            >
              {formatCurrency(currentTerm.balance)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {currentTerm.hasArrears ? 'Outstanding Balance' : 'Fully Paid'}
            </p>
            {currentTerm.hasArrears && currentTerm.dueDate && (
              <p className="text-sm text-red-600 mt-2">
                ⚠️ Due by: {formatDate(currentTerm.dueDate)}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Total Fees: <span className="font-semibold">{formatCurrency(currentTerm.totalFees)}</span>
              </p>
              <p className="text-sm text-gray-600">
                Total Paid: <span className="font-semibold text-green-600">{formatCurrency(currentTerm.totalPaid)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Payment Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Payment Progress</span>
            <span>{paymentPercentage.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                paymentPercentage >= 100 ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs for Fee Structure and Payments */}
      <Tabs defaultValue="structure" className="bg-white rounded-lg shadow-sm">
        <TabsList className="w-full justify-start border-b rounded-none px-4">
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="previous">Previous Terms</TabsTrigger>
        </TabsList>

        {/* Fee Structure Tab */}
        <TabsContent value="structure" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentTerm.name} Fee Structure
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Fee Item</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Type</th>
                </tr>
              </thead>
              <tbody>
                {currentTerm.feeStructure.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-3 px-4 text-sm text-gray-900">{item.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={item.isOptional ? 'secondary' : 'default'}>
                        {item.isOptional ? 'Optional' : 'Required'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-3 px-4 text-sm text-gray-900">Total</td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">
                    {formatCurrency(currentTerm.totalFees)}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
          {currentTerm.payments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payments recorded yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Contact your parent/guardian to make a payment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentTerm.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-xl">
                      {getPaymentMethodIcon(payment.method)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getPaymentMethodLabel(payment.method)} • {payment.reference}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-blue-600">{payment.receiptNumber}</p>
                    <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                  </div>
                </div>
              ))}

              {/* Total Paid Summary */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 mt-4">
                <span className="font-medium text-gray-900">Total Paid This Term</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(currentTerm.totalPaid)}
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Previous Terms Tab */}
        <TabsContent value="previous" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Terms</h3>
          {previousTerms.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No previous term records.</p>
          ) : (
            <div className="space-y-3">
              {previousTerms.map((term, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{term.name}</p>
                    <p className="text-sm text-gray-500">
                      Paid: {formatCurrency(term.totalPaid)} / {formatCurrency(term.totalFees)}
                    </p>
                  </div>
                  <Badge variant={term.balance === 0 ? 'default' : 'destructive'}>
                    {term.balance === 0 ? '✓ Cleared' : formatCurrency(term.balance)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Instructions */}
      {currentTerm.hasArrears && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Payment Information</h3>
          <p className="text-gray-700 mb-4">
            Please contact your parent or guardian to clear the outstanding balance. Payments can be
            made through:
          </p>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-center gap-2">
              <span>💵</span>
              <span>Cash payment at the school bursar&apos;s office</span>
            </li>
            <li className="flex items-center gap-2">
              <span>📱</span>
              <span>Mobile Money (MTN, Airtel)</span>
            </li>
            <li className="flex items-center gap-2">
              <span>🏦</span>
              <span>Bank transfer to the school account</span>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
