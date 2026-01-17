'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, ChevronRight } from 'lucide-react'
import { Task } from '@/types/staff-dashboard'
import { TaskStatus } from '@/types/enums'

/**
 * TaskList Component
 * Requirements: 11.4 - Display tasks with status indicators
 * Status badge colors: pending=amber, completed=green, overdue=red
 * Supports maxItems prop for truncation with "View all" link
 */

export interface TaskListProps {
  /** Array of tasks to display */
  tasks: Task[]
  /** Optional click handler for task items */
  onTaskClick?: (taskId: string) => void
  /** Whether to show status badges */
  showStatus?: boolean
  /** Maximum number of items to display (truncates with "View all" link) */
  maxItems?: number
  /** URL for "View all" link */
  viewAllUrl?: string
  /** Title for the task list card */
  title?: string
  /** Additional class names */
  className?: string
}

const statusStyles: Record<TaskStatus, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
  [TaskStatus.PENDING]: {
    variant: 'secondary',
    label: 'Pending',
  },
  [TaskStatus.COMPLETED]: {
    variant: 'default',
    label: 'Completed',
  },
  [TaskStatus.OVERDUE]: {
    variant: 'destructive',
    label: 'Overdue',
  },
}

function formatDeadline(deadline: Date): string {
  const now = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`
  } else if (diffDays === 0) {
    return 'Due today'
  } else if (diffDays === 1) {
    return 'Due tomorrow'
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`
  } else {
    return deadlineDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }
}

interface TaskItemProps {
  task: Task
  showStatus: boolean
  onClick?: () => void
}

function TaskItem({ task, showStatus, onClick }: TaskItemProps) {
  const statusConfig = statusStyles[task.status]
  const isOverdue = task.status === TaskStatus.OVERDUE

  const content = (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg transition-colors',
      'hover:bg-muted/50',
      onClick && 'cursor-pointer'
    )}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium line-clamp-1">{task.title}</p>
          {showStatus && (
            <Badge 
              variant={statusConfig.variant}
              className={cn(
                'text-xs',
                task.status === TaskStatus.PENDING && 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
                task.status === TaskStatus.COMPLETED && 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
              )}
            >
              {statusConfig.label}
            </Badge>
          )}
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        <div className={cn(
          'flex items-center gap-1 text-xs',
          isOverdue ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
        )}>
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>{formatDeadline(task.deadline)}</span>
        </div>
      </div>
      {onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" aria-hidden="true" />
      )}
    </div>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
        aria-label={`View task: ${task.title}`}
      >
        {content}
      </button>
    )
  }

  return content
}

export function TaskList({
  tasks,
  onTaskClick,
  showStatus = true,
  maxItems,
  viewAllUrl = '/dashboard/tasks',
  title = 'Tasks',
  className,
}: TaskListProps) {
  const displayedTasks = maxItems ? tasks.slice(0, maxItems) : tasks
  const hasMore = maxItems && tasks.length > maxItems
  const remainingCount = hasMore ? tasks.length - maxItems : 0

  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No tasks to display
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {hasMore && (
            <Link
              href={viewAllUrl}
              className="text-sm text-primary hover:underline"
            >
              View all ({tasks.length})
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="divide-y">
          {displayedTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              showStatus={showStatus}
              onClick={onTaskClick ? () => onTaskClick(task.id) : undefined}
            />
          ))}
        </div>
        {hasMore && (
          <div className="pt-2 text-center">
            <Link
              href={viewAllUrl}
              className="text-sm text-muted-foreground hover:text-primary"
            >
              +{remainingCount} more task{remainingCount !== 1 ? 's' : ''}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
