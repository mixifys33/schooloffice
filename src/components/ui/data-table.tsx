'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Responsive Data Table Component
 * Requirements: 34.1, 34.2, 34.3 - Responsive layouts for all screen sizes
 * 
 * On mobile: Displays as cards
 * On tablet/desktop: Displays as traditional table
 */

export interface Column<T> {
  /** Column key */
  key: keyof T | string
  /** Column header */
  header: string
  /** Whether to hide on mobile */
  hideOnMobile?: boolean
  /** Whether to hide on tablet */
  hideOnTablet?: boolean
  /** Custom render function */
  render?: (value: T[keyof T], row: T) => React.ReactNode
  /** Column alignment */
  align?: 'left' | 'center' | 'right'
  /** Whether this is the primary column (shown prominently on mobile) */
  primary?: boolean
}

export interface DataTableProps<T> {
  /** Table data */
  data: T[]
  /** Column definitions */
  columns: Column<T>[]
  /** Key extractor for rows */
  keyExtractor: (row: T) => string
  /** Empty state message */
  emptyMessage?: string
  /** Loading state */
  loading?: boolean
  /** Row click handler */
  onRowClick?: (row: T) => void
  /** Additional class names */
  className?: string
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  loading = false,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const primaryColumn = columns.find((col) => col.primary) || columns[0]
  const secondaryColumns = columns.filter((col) => col !== primaryColumn)

  const getValue = (row: T, key: keyof T | string): T[keyof T] => {
    return row[key as keyof T]
  }

  const renderCell = (column: Column<T>, row: T) => {
    const value = getValue(row, column.key)
    if (column.render) {
      return column.render(value, row)
    }
    return String(value ?? '')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: Card view - Enhanced for touch interaction */}
      <div className="md:hidden space-y-3">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            className={cn(
              'bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border p-4 min-h-[44px]',
              onRowClick && 'cursor-pointer hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] active:bg-[var(--bg-surface)] dark:active:bg-[var(--text-secondary)] transition-colors'
            )}
            onClick={() => onRowClick?.(row)}
          >
            {/* Primary value - Larger text for mobile */}
            <div className="font-medium text-base text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3">
              {renderCell(primaryColumn, row)}
            </div>
            
            {/* Secondary values - Optimized spacing for mobile */}
            <div className="space-y-2">
              {secondaryColumns
                .filter((col) => !col.hideOnMobile)
                .map((column) => (
                  <div
                    key={String(column.key)}
                    className="flex justify-between items-start text-sm min-h-[24px]"
                  >
                    <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)] font-medium flex-shrink-0 mr-3">
                      {column.header}
                    </span>
                    <span className="text-[var(--text-primary)] dark:text-[var(--text-primary)] text-right flex-1">
                      {renderCell(column, row)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tablet/Desktop: Table view - Enhanced horizontal scroll */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
                {columns
                  .filter((col) => !col.hideOnTablet)
                  .map((column) => (
                    <th
                      key={String(column.key)}
                      className={cn(
                        'py-3 px-4 font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] whitespace-nowrap',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.align !== 'center' && column.align !== 'right' && 'text-left'
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  className={cn(
                    'border-b hover:bg-[var(--bg-surface)] dark:hover:bg-[var(--border-strong)] transition-colors',
                    onRowClick && 'cursor-pointer active:bg-[var(--bg-surface)] dark:active:bg-[var(--border-strong)]'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns
                    .filter((col) => !col.hideOnTablet)
                    .map((column) => (
                      <td
                        key={String(column.key)}
                        className={cn(
                          'py-3 px-4 whitespace-nowrap',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {renderCell(column, row)}
                      </td>
                    ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Horizontal scroll indicator for tablet */}
        <div className="md:block lg:hidden mt-2 text-xs text-[var(--text-muted)] text-center">
          ← Scroll horizontally to see more columns →
        </div>
      </div>
    </div>
  )
}
