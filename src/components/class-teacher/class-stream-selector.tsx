'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface ClassOption {
  id: string
  streamId: string | null
  name: string
  streamName: string | null
  displayName: string
}

interface ClassStreamSelectorProps {
  availableClasses: ClassOption[]
  selectedClassId: string | null
  selectedStreamId: string | null
  onClassChange: (classId: string, streamId: string | null) => void
  className?: string
  label?: string
}

/**
 * Reusable Class/Stream Selector Component
 * Used across all class-teacher pages to allow selection of different classes/streams
 */
export function ClassStreamSelector({
  availableClasses,
  selectedClassId,
  selectedStreamId,
  onClassChange,
  className,
  label = 'Switch Class:'
}: ClassStreamSelectorProps) {
  if (!availableClasses || availableClasses.length <= 1) {
    return null
  }

  const handleChange = (value: string) => {
    const selected = availableClasses.find(
      cls => (cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id) === value
    )
    if (selected) {
      onClassChange(selected.id, selected.streamId)
    }
  }

  const currentValue = selectedStreamId 
    ? `${selectedClassId}-${selectedStreamId}` 
    : selectedClassId || availableClasses[0]?.id || ''

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label 
        htmlFor="class-stream-selector" 
        className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] whitespace-nowrap"
      >
        {label}
      </label>
      <select
        id="class-stream-selector"
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        className="px-3 py-2 border border-[var(--border-primary)] dark:border-[var(--border-dark)] rounded-lg bg-white dark:bg-[var(--bg-secondary)] text-[var(--text-primary)] dark:text-[var(--white-pure)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        {availableClasses.map((cls) => (
          <option 
            key={cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id} 
            value={cls.streamId ? `${cls.id}-${cls.streamId}` : cls.id}
          >
            {cls.displayName}
          </option>
        ))}
      </select>
    </div>
  )
}
