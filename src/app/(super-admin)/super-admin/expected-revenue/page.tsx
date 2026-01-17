'use client'

import React, { useEffect, useState } from 'react'
import { DollarSign, Building2, Users, RefreshCw, AlertTriangle, TrendingUp, GraduationCap, School } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SchoolRevenueBreakdown {
  schoolId: string
  schoolName: string
  type: 'PRIMARY' | 'SECONDARY' | 'BOTH'
  students: number
  revenue: number
}

interface ExpectedRevenueData {
  totalRevenue: number
  breakdown: SchoolRevenueBreakdown[]
  summary: {
    primarySchools: number
    secondarySchools: number
    bothSchools: number
    totalStudents: number
  }
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

function getSchoolTypeBadge(type: string) {
  const styles = {
    PRIMARY: 'bg-blue-900/50 text-blue-300 border-blue-700',
    SECONDARY: 'bg-purple-900/50 text-purple-300 border-purple-700',
    BOTH: 'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  }
  return styles[type as keyof typeof styles] || styles.PRIMARY
}

function getSchoolTypeIcon(type: string) {
  switch (type) {
    case 'PRIMARY':
      return <School className="h-4 w-4" />
    case 'SECONDARY':
      return <GraduationCap className="h-4 w-4" />
    default:
      return <Building2 className="h-4 w-4" />
  }
}

export default function ExpectedRevenuePage() {
  const [data, setData] = useState<ExpectedRevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/expected-revenue')
      if (!response.ok) {
        if (response.status === 403) throw new Error('Access denied. Super Admin privileges required.')
        throw new Error('Failed to fetch expected revenue data')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-800 rounded w-64" />
          <div className="h-32 bg-slate-800 rounded-xl" />
          <div className="h-64 bg-slate-800 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-6 text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Expected Revenue</h1>
          <p className="text-slate-400 text-sm">Revenue projections based on school type and student enrollment</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" className="text-slate-300">
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Total Revenue Card */}
      <div className="bg-gradient-to-r from-emerald-900/50 to-emerald-800/30 rounded-xl border border-emerald-700 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-emerald-600/30 rounded-lg">
            <DollarSign className="h-8 w-8 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-emerald-300">Total Expected Revenue</p>
            <p className="text-4xl font-bold text-white">{formatCurrency(data.totalRevenue)}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-emerald-700/50">
          <p className="text-xs text-emerald-300/70">
            Based on: Primary @ UGX 3,000/student • Secondary @ UGX 5,000/student • Both @ UGX 4,000/student
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/50 rounded-lg">
              <School className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Primary Schools</p>
              <p className="text-2xl font-bold text-white">{data.summary.primarySchools}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/50 rounded-lg">
              <GraduationCap className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Secondary Schools</p>
              <p className="text-2xl font-bold text-white">{data.summary.secondarySchools}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-900/50 rounded-lg">
              <Building2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Both Levels</p>
              <p className="text-2xl font-bold text-white">{data.summary.bothSchools}</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-900/50 rounded-lg">
              <Users className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Students</p>
              <p className="text-2xl font-bold text-white">{data.summary.totalStudents.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-white">Revenue Breakdown by School</h2>
        </div>
        
        {data.breakdown.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No active schools found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">School Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">Type</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Students</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">Expected Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {data.breakdown.map((school) => (
                  <tr key={school.schoolId} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-white font-medium">{school.schoolName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getSchoolTypeBadge(school.type)}`}>
                        {getSchoolTypeIcon(school.type)}
                        {school.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-slate-300">{school.students.toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-400 font-medium">{formatCurrency(school.revenue)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900/70 border-t-2 border-slate-600">
                  <td className="px-4 py-3 font-semibold text-white" colSpan={2}>Total</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">{data.summary.totalStudents.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{formatCurrency(data.totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
