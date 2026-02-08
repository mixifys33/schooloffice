'use client'

import React from 'react'
import { FileText, CheckCircle, XCircle } from 'lucide-react'

/**
 * School Audit Log Component
 * Requirement 6.8: Display audit log display
 * Requirement 9.3: Display audit logs in the school profile showing recent actions taken on that school
 */

interface AuditLogEntry {
  id: string
  timestamp: Date
  adminEmail: string
  actionType: string
  reason: string
  result: string
}

interface SchoolAuditLogProps {
  recentAuditLogs: AuditLogEntry[]
}

function formatTimestamp(date: Date): string {
  return new Date(date).toLocaleDateString('en-UG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatActionType(actionType: string): string {
  return actionType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

export function SchoolAuditLog({ recentAuditLogs }: SchoolAuditLogProps) {
  if (recentAuditLogs.length === 0) {
    return (
      <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">
          Audit Log
        </h2>
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          No audit log entries
        </p>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-4">
        Audit Log
      </h2>
      
      <div className="space-y-3">
        {recentAuditLogs.map((log) => (
          <div
            key={log.id}
            className="p-4 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)]/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                    {formatActionType(log.actionType)}
                  </span>
                  {log.result === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-[var(--chart-green)] flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-[var(--chart-red)] flex-shrink-0" />
                  )}
                </div>
                
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-2">
                  {log.reason}
                </p>
                
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)]">
                  <span>By: {log.adminEmail}</span>
                  <span>•</span>
                  <span>{formatTimestamp(log.timestamp)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
