'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Parent Portal - Fees View
 * Requirement 23.2: Show total fees, payments made, and outstanding balance per child
 */

interface FeeItem {
  name: string
  amount: number
  isOptional: boolean
}

interface PaymentRecord {
  id: string
  date: string
  amount: number
  method: string
  reference: string
  receiptNumber: string
}

interface PreviousTerm {
  name: string
  totalFees: number
  totalPaid: number
  balance: number
}

interface ChildFeeData {
  id: string
  name: string
  admissionNumber: string
  className: string
  currentTerm: {
    name: string
    feeStructure: FeeItem[]
    totalFees: number
    totalPaid: number
    balance: number
    hasArrears: boolean
    payments: PaymentRecord[]
  }
  previousTerms: PreviousTerm[]
}

interface ParentFeesResponse {
  children: ChildFeeData[]
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
    BANK_TRANSFER: 'Bank Transfer',
    MOBILE_MONEY: 'Mobile Money',
    CHEQUE: 'Cheque',
  }
  return labels[method] || method
}

export default function ParentFeesPage() {
  const [feesData, setFeesData] = useState<ParentFeesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFeesData() {
      try {
        setLoading(true)
        const response = await fetch('/api/parent/fees')
        
        if (!response.ok) {
          throw new Error('Failed to fetch fees data')
        }

        const data: ParentFeesResponse = await response.json()
        setFeesData(data)
        
        // Set first child as selected by default
        if (data.children.length > 0) {
          setSelectedChildId(data.children[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchFeesData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <SkeletonLoader variant="text" count={2} />
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <SkeletonLoader variant="card" count={1} />
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <SkeletonLoader variant="table" count={3} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800">Error Loading Fees</h2>
        <p className="text-red-600 mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!feesData || feesData.children.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Fees and Payments</h1>
          <p className="text-gray-600 mt-1">View fee structures, payments, and balances.</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500">No children linked to your account.</p>
        </div>
      </div>
    )
  }

  const selectedChild = feesData.children.find(c => c.id === selectedChildId) || feesData.children[0]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Fees and Payments</h1>
        <p className="text-gray-600 mt-1">View fee structures, payments, and balances for your children.</p>
      </div>

      {/* Child Selector */}
      {feesData.children.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
          <div className="flex gap-2 flex-wrap">
            {feesData.children.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedChildId === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Balance Summary Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">{selectedChild.name} - {selectedChild.className}</p>
            <p 
              className="text-3xl font-bold mt-1"
              style={{ color: selectedChild.currentTerm.hasArrears ? '#dc2626' : '#16a34a' }}
            >
              {formatCurrency(selectedChild.currentTerm.balance)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {selectedChild.currentTerm.hasArrears ? 'Outstanding Balance' : 'Fully Paid'}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm text-gray-600">Total Fees: {formatCurrency(selectedChild.currentTerm.totalFees)}</p>
            <p className="text-sm text-gray-600">Total Paid: {formatCurrency(selectedChild.currentTerm.totalPaid)}</p>
          </div>
        </div>
      </div>

      {/* Tabs for Fee Details */}
      <Tabs defaultValue="structure" className="bg-white rounded-lg shadow-sm">
        <TabsList className="w-full justify-start border-b rounded-none px-4">
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="previous">Previous Terms</TabsTrigger>
        </TabsList>

        {/* Fee Structure Tab */}
        <TabsContent value="structure" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {selectedChild.currentTerm.name} Fee Structure
          </h3>
          {selectedChild.currentTerm.feeStructure.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No fee structure available for this term.</p>
          ) : (
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
                  {selectedChild.currentTerm.feeStructure.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{item.name}</td>
                      <td className="py-3 px-4 text-sm text-right text-gray-900">{formatCurrency(item.amount)}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={item.isOptional ? 'secondary' : 'default'}>
                          {item.isOptional ? 'Optional' : 'Required'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4 text-sm text-gray-900">Total</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {formatCurrency(selectedChild.currentTerm.totalFees)}
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
          {selectedChild.currentTerm.payments.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Receipt #</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Method</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Reference</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedChild.currentTerm.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{formatDate(payment.date)}</td>
                      <td className="py-3 px-4 text-sm text-blue-600">{payment.receiptNumber}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{getPaymentMethodLabel(payment.method)}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{payment.reference}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Previous Terms Tab */}
        <TabsContent value="previous" className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Previous Terms</h3>
          {selectedChild.previousTerms.length === 0 ? (
            <p className="text-gray-500 py-8 text-center">No previous term records.</p>
          ) : (
            <div className="space-y-3">
              {selectedChild.previousTerms.map((term, index) => (
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
                  <div className="text-right">
                    <Badge variant={term.balance === 0 ? 'default' : 'destructive'}>
                      {term.balance === 0 ? 'Cleared' : formatCurrency(term.balance)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
