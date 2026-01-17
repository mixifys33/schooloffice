'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from './input'

/**
 * SearchInput Component with Debounce
 * Requirements: 3.5 - Filter students by name, admission number, or class within 300 milliseconds
 */

export interface SearchInputProps {
  /** Placeholder text */
  placeholder?: string
  /** Current search value */
  value: string
  /** Callback when value changes (debounced) */
  onChange: (value: string) => void
  /** Debounce delay in milliseconds (default 300ms per Requirement 3.5) */
  debounceMs?: number
  /** Whether search is loading */
  loading?: boolean
  /** Additional class names */
  className?: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

export function SearchInput({
  placeholder = 'Search...',
  value,
  onChange,
  debounceMs = 300,
  loading = false,
  className,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = React.useState(value)
  const debouncedValue = useDebounce(internalValue, debounceMs)

  // Sync external value changes
  React.useEffect(() => {
    setInternalValue(value)
  }, [value])

  // Call onChange when debounced value changes
  React.useEffect(() => {
    if (debouncedValue !== value) {
      onChange(debouncedValue)
    }
  }, [debouncedValue, onChange, value])

  const handleClear = () => {
    setInternalValue('')
    onChange('')
  }

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
        className="pl-9 pr-9"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : internalValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
