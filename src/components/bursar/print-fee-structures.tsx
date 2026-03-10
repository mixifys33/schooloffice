'use client'

import React from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FeeStructure {
  id: string
  classId: string
  className: string
  stream: string | null
  term: string
  academicYear: string
  totalAmount: number
  breakdown: {
    tuition: number
    development: number
    meals: number
    boarding: number
    optional: Array<{ name: string; amount: number }>
  }
  createdAt: string
  updatedAt: string
}

interface PrintFeeStructuresProps {
  structures: FeeStructure[]
  schoolName?: string
  onClose: () => void
}

export function PrintFeeStructures({ structures, schoolName = 'School Name', onClose }: PrintFeeStructuresProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const handlePrint = () => {
    window.print()
  }

  React.useEffect(() => {
    // Add print-specific styles
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-content, #print-content * {
          visibility: visible;
        }
        #print-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
        @page {
          margin: 1cm;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        {/* Header with close button */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center no-print">
          <h2 className="text-xl font-semibold">Print Preview</h2>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>Print</Button>
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Print content */}
        <div id="print-content" className="p-8">
          {/* Simple header */}
          <div className="border-b-2 border-gray-800 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{schoolName}</h1>
                <p className="text-gray-600">Fee Structure Report</p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
                <p>Time: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          </div>

          {/* Fee structures table */}
          <div className="space-y-8">
            {structures.map((structure) => (
              <div key={structure.id} className="border border-gray-300">
                {/* Structure header */}
                <div className="bg-gray-100 p-3 border-b border-gray-300">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">
                        {structure.className} {structure.stream ? `(${structure.stream})` : ''}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {structure.term} • {structure.academicYear}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Total</p>
                      <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(structure.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Breakdown table */}
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300">
                      <th className="text-left p-3 text-sm font-semibold text-gray-700">Fee Item</th>
                      <th className="text-right p-3 text-sm font-semibold text-gray-700">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structure.breakdown.tuition > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="p-3 text-gray-800">Tuition</td>
                        <td className="p-3 text-right font-medium text-gray-900">
                          {formatCurrency(structure.breakdown.tuition)}
                        </td>
                      </tr>
                    )}
                    {structure.breakdown.development > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="p-3 text-gray-800">Development</td>
                        <td className="p-3 text-right font-medium text-gray-900">
                          {formatCurrency(structure.breakdown.development)}
                        </td>
                      </tr>
                    )}
                    {structure.breakdown.meals > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="p-3 text-gray-800">Meals</td>
                        <td className="p-3 text-right font-medium text-gray-900">
                          {formatCurrency(structure.breakdown.meals)}
                        </td>
                      </tr>
                    )}
                    {structure.breakdown.boarding > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="p-3 text-gray-800">Boarding</td>
                        <td className="p-3 text-right font-medium text-gray-900">
                          {formatCurrency(structure.breakdown.boarding)}
                        </td>
                      </tr>
                    )}
                    {structure.breakdown.optional.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="p-3 text-gray-800">{item.name}</td>
                        <td className="p-3 text-right font-medium text-gray-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-center text-xs text-gray-500">
            <div>
              <p>Generated: {new Date().toLocaleString('en-GB')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span>Powered by</span>
              <span className="font-semibold text-gray-700">SchoolOffice.academy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
