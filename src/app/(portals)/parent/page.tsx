'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'

/**
 * Parent Portal Dashboard
 * Requirements: 15.1, 15.2, 15.3, 15.4
 * - Child selector at top for multi-child parents
 * - Fees status displayed prominently
 * - Latest results, attendance summary, and messages sections
 * - Plain language without admin menus or system jargon
 */

interface ChildData {
  id: string
  name: string
  admissionNumber: string
  className: string
  streamName: string | null
  status: string
  photo: string | null
  feeSummary: {
    totalFees: number
    totalPaid: number
    balance: number
    hasArrears: boolean
  }
  academicSummary: {
    lastTermAverage: number | null
    lastTermPosition: number | null
    totalStudents: number | null
    lastTermGrade: string | null
  }
  attendanceSummary: {
    presentDays: number
    totalDays: number
    percentage: number
  }
}

interface ParentChildrenResponse {
  parentName: string
  children: ChildData[]
}

function formatCurrency(amount: number): string {
  return `UGX ${amount.toLocaleString()}`
}

export default function ParentDashboard() {
  const [data, setData] = useState<ParentChildrenResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchChildrenData() {
      try {
        setLoading(true)
        const response = await fetch('/api/parent/children')
        
        if (!response.ok) {
          throw new Error('Failed to fetch children data')
        }

        const result: ParentChildrenResponse = await response.json()
        setData(result)
        // Select first child by default
        if (result.children.length > 0 && !selectedChildId) {
          setSelectedChildId(result.children[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchChildrenData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
          <SkeletonLoader variant="text" count={2} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
            <SkeletonLoader variant="card" count={1} />
          </div>
          <div className="bg-[var(--bg-main)] rounded-lg shadow-sm p-6">
            <SkeletonLoader variant="card" count={1} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-lg p-6">
        <h2 className="text-lg font-semibold text-[var(--danger-dark)]">Error Loading Dashboard</h2>
        <p className="text-[var(--chart-red)] mt-1">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-[var(--chart-red)] text-[var(--white-pure)] rounded-lg hover:bg-[var(--chart-red)]"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg p-8 text-center">
        <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">Unable to load dashboard data.</p>
      </div>
    )
  }

  const { parentName, children } = data
  const selectedChild = children.find(c => c.id === selectedChildId) || children[0]

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Welcome Section */}
      <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">Welcome, {parentName}</h1>
        <p className="text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-1 text-sm">
          You have {children.length} {children.length === 1 ? 'child' : 'children'} linked to your account.
        </p>
      </div>

      {children.length === 0 ? (
        <div className="bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg p-8 text-center">
          <p className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">No children linked to your account yet.</p>
          <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-2">
            Please contact the school administration to link your children.
          </p>
        </div>
      ) : (
        <>
          {/* Child Selector - Requirements: 15.1 - Child selector at top for multi-child parents */}
          {children.length > 1 && (
            <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
              <label className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                Select Child
              </label>
              <div className="flex flex-wrap gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedChildId === child.id
                        ? 'bg-[var(--text-primary)] dark:bg-[var(--bg-main)] text-[var(--white-pure)] dark:text-[var(--text-primary)]'
                        : 'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]'
                    }`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedChild && (
            <>
              {/* Child Info Header */}
              <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">{selectedChild.name}</h2>
                    <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                      {selectedChild.className} {selectedChild.streamName && `(${selectedChild.streamName})`} • {selectedChild.admissionNumber}
                    </p>
                  </div>
                  <Badge variant={selectedChild.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {selectedChild.status === 'ACTIVE' ? 'Active' : selectedChild.status}
                  </Badge>
                </div>
              </div>

              {/* Fees Status - Requirements: 15.2 - Fees status displayed prominently */}
              <div className={`rounded-lg border p-5 ${
                selectedChild.feeSummary.hasArrears 
                  ? 'bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/30 border-[var(--danger-light)] dark:border-[var(--danger-dark)]' 
                  : 'bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Fee Balance</p>
                    <p className={`text-2xl font-semibold mt-1 ${
                      selectedChild.feeSummary.hasArrears 
                        ? 'text-[var(--chart-red)] dark:text-[var(--danger)]' 
                        : 'text-[var(--success-dark)] dark:text-[var(--success)]'
                    }`}>
                      {formatCurrency(selectedChild.feeSummary.balance)}
                    </p>
                    <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                      {selectedChild.feeSummary.hasArrears ? 'Outstanding balance' : 'All fees paid'}
                    </p>
                  </div>
                  <Link
                    href={`/portals/parent/fees?child=${selectedChild.id}`}
                    className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)]"
                  >
                    View Details →
                  </Link>
                </div>
              </div>

              {/* Summary Cards - Requirements: 15.3 - Latest results, attendance summary */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Academic Summary */}
                <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Latest Results</h3>
                    <Link
                      href={`/portals/parent/academics?child=${selectedChild.id}`}
                      className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-secondary)]"
                    >
                      View →
                    </Link>
                  </div>
                  {selectedChild.academicSummary.lastTermAverage !== null ? (
                    <div>
                      <p className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                        {selectedChild.academicSummary.lastTermAverage.toFixed(1)}%
                      </p>
                      <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                        Position {selectedChild.academicSummary.lastTermPosition} of {selectedChild.academicSummary.totalStudents}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">No results available yet</p>
                  )}
                </div>

                {/* Attendance Summary */}
                <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
                  <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-3">Attendance</h3>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                      {selectedChild.attendanceSummary.percentage}%
                    </p>
                    <div className={`w-3 h-3 rounded-full ${
                      selectedChild.attendanceSummary.percentage >= 90 ? 'bg-[var(--success)]' :
                      selectedChild.attendanceSummary.percentage >= 80 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'
                    }`} />
                  </div>
                  <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-1">
                    {selectedChild.attendanceSummary.presentDays} of {selectedChild.attendanceSummary.totalDays} days present
                  </p>
                </div>
              </div>

              {/* Quick Actions - Requirements: 15.4 - Plain language */}
              <div className="bg-[var(--bg-main)] dark:bg-[var(--text-primary)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-5">
                <h3 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-4">Quick Actions</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link
                    href="/portals/parent/fees"
                    className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
                  >
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">View Fees</p>
                      <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Check balance</p>
                    </div>
                  </Link>
                  <Link
                    href="/portals/parent/academics"
                    className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
                  >
                    <span className="text-2xl">📚</span>
                    <div>
                      <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Report Cards</p>
                      <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">View results</p>
                    </div>
                  </Link>
                  <Link
                    href="/portals/parent/messages"
                    className="flex items-center gap-3 p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors"
                  >
                    <span className="text-2xl">✉️</span>
                    <div>
                      <p className="font-medium text-[var(--text-primary)] dark:text-[var(--white-pure)]">Messages</p>
                      <p className="text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">Contact school</p>
                    </div>
                  </Link>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
