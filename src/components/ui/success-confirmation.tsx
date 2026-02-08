'use client'

import * as React from 'react'
import { CheckCircle, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './card'

/**
 * Success Confirmation Component
 * Requirements: 35.4 - Display success confirmation with next steps
 */

export interface NextStep {
  label: string
  href?: string
  action?: string
  isPrimary?: boolean
}

export interface SuccessConfirmationProps {
  title: string
  message: string
  nextSteps?: NextStep[]
  onClose?: () => void
  onAction?: (action: string) => void
  autoCloseDelay?: number
  className?: string
}

export function SuccessConfirmation({
  title,
  message,
  nextSteps = [],
  onClose,
  onAction,
  autoCloseDelay,
  className,
}: SuccessConfirmationProps) {
  const [isVisible, setIsVisible] = React.useState(true)

  // Auto-close after delay if specified
  React.useEffect(() => {
    if (autoCloseDelay && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoCloseDelay)
      return () => clearTimeout(timer)
    }
  }, [autoCloseDelay, onClose])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  const handleStepClick = (step: NextStep) => {
    if (step.action) {
      onAction?.(step.action)
    }
    // If href is provided, navigation will be handled by the link
  }

  if (!isVisible) return null

  return (
    <Card
      role="alert"
      aria-live="polite"
      className={cn(className)}
      style={{
        backgroundColor: 'var(--success-light)',
        borderColor: 'var(--success)',
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle 
              className="h-5 w-5" 
              style={{ color: 'var(--success)' }}
            />
            <CardTitle 
              className="text-base"
              style={{ color: 'var(--success-dark)' }}
            >
              {title}
            </CardTitle>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:opacity-80"
              style={{ color: 'var(--success)' }}
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <p 
          className="text-sm"
          style={{ color: 'var(--success-dark)' }}
        >
          {message}
        </p>
      </CardContent>

      {nextSteps.length > 0 && (
        <CardFooter className="flex flex-wrap gap-2 pt-0">
          {nextSteps.map((step, index) => {
            const ButtonComponent = step.href ? 'a' : 'button'
            const buttonProps = step.href
              ? { href: step.href }
              : { onClick: () => handleStepClick(step) }

            return (
              <Button
                key={index}
                asChild={!!step.href}
                variant={step.isPrimary ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  !step.isPrimary && 'hover:opacity-80'
                )}
                style={
                  step.isPrimary
                    ? undefined
                    : {
                        borderColor: 'var(--success)',
                        color: 'var(--success-dark)',
                      }
                }
              >
                {step.href ? (
                  <a href={step.href}>
                    {step.label}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </a>
                ) : (
                  <button onClick={() => handleStepClick(step)}>
                    {step.label}
                    {step.isPrimary && <ArrowRight className="ml-1 h-3 w-3" />}
                  </button>
                )}
              </Button>
            )
          })}
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * Toast-style Success Message
 * Compact version for quick confirmations
 */
export interface SuccessToastProps {
  message: string
  duration?: number
  onClose?: () => void
  className?: string
}

export function SuccessToast({
  message,
  duration = 3000,
  onClose,
  className,
}: SuccessToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const [isExiting, setIsExiting] = React.useState(false)

  React.useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true)
    }, duration - 300)

    const closeTimer = setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, duration)

    return () => {
      clearTimeout(exitTimer)
      clearTimeout(closeTimer)
    }
  }, [duration, onClose])

  if (!isVisible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg',
        'transition-all duration-300',
        isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
        className
      )}
      style={{
        backgroundColor: 'var(--success)',
        color: 'var(--accent-contrast)',
      }}
    >
      <CheckCircle className="h-5 w-5" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
