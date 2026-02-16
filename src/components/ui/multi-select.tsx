'use client'

import * as React from 'react'
import { X, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((i) => i !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setOpen(!open)
          }
        }}
        className={cn(
          'w-full min-h-[40px] h-auto px-3 py-2 text-left border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] flex items-center justify-between gap-2 cursor-pointer',
          className
        )}
      >
        <div className="flex gap-1 flex-wrap flex-1">
          {selected.length > 0 ? (
            selected.map((item) => {
              const option = options.find((opt) => opt.value === item)
              return (
                <Badge
                  key={item}
                  variant="secondary"
                  className="mr-1 mb-1"
                >
                  {option?.label}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 rounded-full outline-none cursor-pointer inline-flex"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleUnselect(item)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        handleUnselect(item)
                      }
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              )
            })
          ) : (
            <span className="text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
              {placeholder}
            </span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--bg-main)] dark:bg-[var(--bg-secondary)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md shadow-lg">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md bg-[var(--bg-main)] dark:bg-[var(--text-primary)] text-[var(--text-primary)] dark:text-[var(--white-pure)]"
            />
          </div>
          <div className="max-h-64 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                No items found.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleSelect(option.value)
                    }
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-tertiary)] flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center',
                      selected.includes(option.value)
                        ? 'bg-[var(--primary)] border-[var(--primary)]'
                        : 'border-[var(--border-default)]'
                    )}
                  >
                    {selected.includes(option.value) && (
                      <div className="w-2 h-2 bg-white rounded-sm" />
                    )}
                  </div>
                  <span className="text-sm">{option.label}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
