'use client'

import * as React from 'react'
import { HelpCircle, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from './tooltip'

/**
 * Help Tooltip Component
 * Requirements: 35.2 - Display contextual tooltips explaining features
 */

export interface HelpTooltipProps {
  title: string
  description: string
  learnMoreUrl?: string
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
  className?: string
  iconClassName?: string
  dismissible?: boolean
  onDismiss?: () => void
}

export function HelpTooltip({
  title,
  description,
  learnMoreUrl,
  side = 'top',
  align = 'center',
  className,
  iconClassName,
  dismissible = false,
  onDismiss,
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsOpen(false)
    onDismiss?.()
  }

  return (
    <Tooltip open={isOpen} onOpenChange={setIsOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'transition-colors',
            iconClassName
          )}
          aria-label={`Help: ${title}`}
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        className={cn(
          'max-w-xs p-3 bg-white dark:bg-gray-800 border shadow-lg',
          className
        )}
        sideOffset={8}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {title}
            </h4>
            {dismissible && (
              <button
                type="button"
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Dismiss tooltip"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {description}
          </p>
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Learn more
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Feature Label with Help Tooltip
 * Combines a label with an inline help tooltip
 */
export interface FeatureLabelProps {
  label: string
  helpTitle: string
  helpDescription: string
  learnMoreUrl?: string
  required?: boolean
  className?: string
}

export function FeatureLabel({
  label,
  helpTitle,
  helpDescription,
  learnMoreUrl,
  required = false,
  className,
}: FeatureLabelProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <HelpTooltip
        title={helpTitle}
        description={helpDescription}
        learnMoreUrl={learnMoreUrl}
      />
    </div>
  )
}
