'use client'

import React from 'react'
import { CheckSquare, XSquare, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BulkActionsProps {
  onMarkAllPresent: () => void
  onMarkAllAbsent: () => void
  onClearAll: () => void
  disabled?: boolean
  studentCount: number
}

export function BulkActions({
  onMarkAllPresent,
  onMarkAllAbsent,
  onClearAll,
  disabled = false,
  studentCount,
}: BulkActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onMarkAllPresent}
        disabled={disabled}
        className="gap-2"
      >
        <CheckSquare className="h-4 w-4 text-green-600" />
        Mark All Present ({studentCount})
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onMarkAllAbsent}
        disabled={disabled}
        className="gap-2"
      >
        <XSquare className="h-4 w-4 text-red-600" />
        Mark All Absent
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onClearAll}
        disabled={disabled}
        className="gap-2"
      >
        <RotateCcw className="h-4 w-4" />
        Clear All
      </Button>
    </div>
  )
}
