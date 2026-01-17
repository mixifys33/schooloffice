'use client'

import React from 'react'
import { X, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SelectField } from './form-field'
import { Button } from './button'
import { Badge } from './badge'

/**
 * Multi-Filter Component for Students
 * Supports filtering by multiple criteria with clear visual feedback
 */

export interface FilterOption {
  value: string
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  placeholder: string
  options: FilterOption[]
  multiple?: boolean
}

export interface ActiveFilter {
  key: string
  value: string
  label: string
  displayValue: string
}

export interface MultiFilterProps {
  filters: FilterConfig[]
  activeFilters: ActiveFilter[]
  onFilterChange: (key: string, value: string) => void
  onFilterRemove: (key: string, value?: string) => void
  onClearAll: () => void
  className?: string
}

export function MultiFilter({
  filters,
  activeFilters,
  onFilterChange,
  onFilterRemove,
  onClearAll,
  className,
}: MultiFilterProps) {
  const hasActiveFilters = activeFilters.length > 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {filters.map((filter) => (
          <div key={filter.key} className="min-w-0">
            <SelectField
              label=""
              name={filter.key}
              placeholder={filter.placeholder}
              options={[
                { value: '', label: `All ${filter.label}` },
                ...filter.options,
              ]}
              value={
                activeFilters.find((af) => af.key === filter.key)?.value || ''
              }
              onChange={(e) => {
                const value = e.target.value
                if (value) {
                  onFilterChange(filter.key, value)
                } else {
                  onFilterRemove(filter.key)
                }
              }}
              touchFriendly={false}
              className="mb-0"
            />
          </div>
        ))}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Active filters:</span>
          </div>
          
          {activeFilters.map((filter) => (
            <Badge
              key={`${filter.key}-${filter.value}`}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-xs font-medium">{filter.label}:</span>
              <span className="text-xs">{filter.displayValue}</span>
              <button
                onClick={() => onFilterRemove(filter.key, filter.value)}
                className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                aria-label={`Remove ${filter.label} filter`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}