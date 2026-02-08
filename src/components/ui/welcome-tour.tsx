'use client'

import * as React from 'react'
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card'
import type { TourStep } from '@/services/onboarding.service'

/**
 * Welcome Tour Component
 * Requirements: 35.1 - Display a welcome tour highlighting key features for user's role
 */

export interface WelcomeTourProps {
  steps: TourStep[]
  isOpen: boolean
  onComplete: () => void
  onSkip: () => void
  className?: string
}

export function WelcomeTour({
  steps,
  isOpen,
  onComplete,
  onSkip,
  className,
}: WelcomeTourProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [highlightedElement, setHighlightedElement] = React.useState<HTMLElement | null>(null)

  const sortedSteps = React.useMemo(
    () => [...steps].sort((a, b) => a.order - b.order),
    [steps]
  )

  const step = sortedSteps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === sortedSteps.length - 1
  const progress = ((currentStep + 1) / sortedSteps.length) * 100

  // Find and highlight the target element
  React.useEffect(() => {
    if (!isOpen || !step) return

    const target = document.querySelector(step.target) as HTMLElement
    setHighlightedElement(target)

    if (target && step.placement !== 'center') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    return () => {
      setHighlightedElement(null)
    }
  }, [isOpen, step])

  // Calculate tooltip position
  const getTooltipPosition = React.useCallback(() => {
    if (!highlightedElement || step?.placement === 'center') {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const rect = highlightedElement.getBoundingClientRect()
    const tooltipWidth = 320
    const tooltipHeight = 200
    const padding = 16

    switch (step.placement) {
      case 'top':
        return {
          position: 'fixed' as const,
          top: `${rect.top - tooltipHeight - padding}px`,
          left: `${rect.left + rect.width / 2 - tooltipWidth / 2}px`,
        }
      case 'bottom':
        return {
          position: 'fixed' as const,
          top: `${rect.bottom + padding}px`,
          left: `${rect.left + rect.width / 2 - tooltipWidth / 2}px`,
        }
      case 'left':
        return {
          position: 'fixed' as const,
          top: `${rect.top + rect.height / 2 - tooltipHeight / 2}px`,
          left: `${rect.left - tooltipWidth - padding}px`,
        }
      case 'right':
        return {
          position: 'fixed' as const,
          top: `${rect.top + rect.height / 2 - tooltipHeight / 2}px`,
          left: `${rect.right + padding}px`,
        }
      default:
        return {
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }
    }
  }, [highlightedElement, step])

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1)
    }
  }

  if (!isOpen || !step) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-[var(--text-primary)]/50 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Highlight ring around target element */}
      {highlightedElement && step.placement !== 'center' && (
        <div
          className="fixed z-50 rounded-lg ring-4 ring-[var(--accent-primary)] ring-offset-4 ring-offset-transparent pointer-events-none"
          style={{
            top: highlightedElement.getBoundingClientRect().top - 4,
            left: highlightedElement.getBoundingClientRect().left - 4,
            width: highlightedElement.getBoundingClientRect().width + 8,
            height: highlightedElement.getBoundingClientRect().height + 8,
          }}
        />
      )}

      {/* Tour tooltip */}
      <Card
        className={cn(
          'z-50 w-80 shadow-xl',
          className
        )}
        style={getTooltipPosition()}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-content"
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle id="tour-title" className="text-base">
              {step.title}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onSkip}
              aria-label="Skip tour"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 w-full rounded-full bg-[var(--bg-surface)] dark:bg-[var(--border-strong)]">
            <div
              className="h-1 rounded-full bg-[var(--chart-blue)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </CardHeader>

        <CardContent id="tour-content" className="pb-4">
          <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
            {step.content}
          </p>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-0">
          <span className="text-xs text-[var(--text-muted)]">
            Step {currentStep + 1} of {sortedSteps.length}
          </span>
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevious}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
            >
              {isLastStep ? (
                <>
                  <Check className="mr-1 h-4 w-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </>
  )
}
