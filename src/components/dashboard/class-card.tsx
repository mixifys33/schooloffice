'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CheckCircle, Circle, BookOpen, Calendar } from 'lucide-react'

/**
 * ClassCard Component
 * Requirements: 11.3 - Display class info and completion status
 * Clickable card linking to class details
 */

export interface ClassCardProps {
  /** Class ID for navigation */
  classId: string
  /** Class name to display */
  className: string
  /** Subject name */
  subject: string
  /** Term name */
  term: string
  /** Number of students in the class */
  studentCount: number
  /** Whether attendance has been completed */
  attendanceDone: boolean
  /** Whether marks have been entered */
  marksDone: boolean
  /** Optional click handler (alternative to navigation) */
  onClick?: () => void
  /** Additional class names */
  cardClassName?: string
}

interface StatusIndicatorProps {
  done: boolean
  label: string
}

function StatusIndicator({ done, label }: StatusIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5">
      {done ? (
        <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" aria-hidden="true" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      )}
      <span className={cn(
        'text-xs',
        done ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'
      )}>
        {label}
      </span>
    </div>
  )
}

export function ClassCard({
  classId,
  className,
  subject,
  term,
  studentCount,
  attendanceDone,
  marksDone,
  onClick,
  cardClassName,
}: ClassCardProps) {
  const cardContent = (
    <Card className={cn(
      'transition-all hover:shadow-md hover:border-primary/50',
      'cursor-pointer',
      'dark:hover:border-primary/50',
      cardClassName
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold line-clamp-1">
          {className}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Subject */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          <span className="line-clamp-1">{subject}</span>
        </div>

        {/* Term */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          <span>{term}</span>
        </div>

        {/* Student count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden="true" />
          <span>{studentCount} students</span>
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4 pt-2 border-t">
          <StatusIndicator done={attendanceDone} label="Attendance" />
          <StatusIndicator done={marksDone} label="Marks" />
        </div>
      </CardContent>
    </Card>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
        aria-label={`View ${className} details`}
      >
        {cardContent}
      </button>
    )
  }

  return (
    <Link
      href={`/dashboard/classes/${classId}`}
      className="block"
      aria-label={`View ${className} details`}
    >
      {cardContent}
    </Link>
  )
}
