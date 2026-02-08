/**
 * Auto-save Indicator Component
 * 
 * Requirements: 15.1, 15.4, 15.5 - Auto-save draft entries, warn before navigation, manual save options
 * 
 * Features:
 * - Visual indicator of save status
 * - Unsaved changes warning
 * - Manual save trigger
 * - Recovery from local storage
 * - Network status awareness
 */

'use client'

import React, { useState } from 'react'
import { 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Badge } from './badge'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip'
import { AutoSaveState } from '@/hooks/use-auto-save'

export interface AutoSaveIndicatorProps {
  state: AutoSaveState
  onManualSave?: () => void
  onRetry?: () => void
  onRecover?: () => void
  hasRecoverableData?: boolean
  className?: string
  showDetails?: boolean
  compact?: boolean
}

export function AutoSaveIndicator({
  state,
  onManualSave,
  onRetry,
  onRecover,
  hasRecoverableData = false,
  className,
  showDetails = true,
  compact = false
}: AutoSaveIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator?.onLine ?? true)

  // Listen for online/offline events
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Get status configuration
  const getStatusConfig = () => {
    switch (state.status) {
      case 'saving':
        return {
          icon: Loader2,
          label: 'Saving...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          animate: 'animate-spin'
        }
      case 'saved':
        return {
          icon: CheckCircle,
          label: state.lastSaved 
            ? `Saved ${formatRelativeTime(state.lastSaved)}`
            : 'All changes saved',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        }
      case 'error':
        return {
          icon: AlertCircle,
          label: state.error || 'Save failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        }
      case 'retrying':
        return {
          icon: RefreshCw,
          label: `Retrying... (${state.retryCount}/${3})`,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          animate: 'animate-spin'
        }
      default:
        if (state.hasUnsavedChanges) {
          return {
            icon: Clock,
            label: 'Unsaved changes',
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200'
          }
        }
        return {
          icon: CheckCircle,
          label: 'Up to date',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  // Compact version for space-constrained areas
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200',
              config.bgColor,
              config.borderColor,
              config.color,
              'border',
              className
            )}>
              <Icon className={cn('h-3 w-3', config.animate)} />
              {state.hasUnsavedChanges && (
                <span className="w-2 h-2 bg-current rounded-full opacity-60" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm">
              <div className="font-medium">{config.label}</div>
              {!isOnline && (
                <div className="text-xs text-muted-foreground mt-1">
                  Offline - changes saved locally
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
      config.bgColor,
      config.borderColor,
      className
    )}>
      {/* Status Icon and Label */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon className={cn('h-4 w-4 flex-shrink-0', config.color, config.animate)} />
        
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-medium', config.color)}>
            {config.label}
          </div>
          
          {showDetails && (
            <div className="flex items-center gap-2 mt-1">
              {/* Network Status */}
              <div className="flex items-center gap-1">
                {isOnline ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              {/* Unsaved Changes Count */}
              {state.hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
              
              {/* Recoverable Data Indicator */}
              {hasRecoverableData && (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                  Recovery available
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Manual Save Button */}
        {(state.hasUnsavedChanges || state.status === 'error') && onManualSave && (
          <Button
            variant="outline"
            size="sm"
            onClick={onManualSave}
            disabled={state.status === 'saving' || state.status === 'retrying'}
            className="h-7 px-3 text-xs"
          >
            <Save className="h-3 w-3 mr-1" />
            Save Now
          </Button>
        )}
        
        {/* Retry Button */}
        {state.status === 'error' && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 px-3 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
        
        {/* Recovery Button */}
        {hasRecoverableData && onRecover && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRecover}
            className="h-7 px-3 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Recover
          </Button>
        )}
      </div>
    </div>
  )
}

// Utility function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Floating auto-save indicator for fixed positioning
export interface FloatingAutoSaveIndicatorProps extends AutoSaveIndicatorProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  hideWhenSaved?: boolean
}

export function FloatingAutoSaveIndicator({
  position = 'bottom-right',
  hideWhenSaved = true,
  ...props
}: FloatingAutoSaveIndicatorProps) {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  // Hide when saved if configured to do so
  if (hideWhenSaved && props.state.status === 'saved' && !props.state.hasUnsavedChanges) {
    return null
  }

  return (
    <div className={cn(
      'fixed z-40 max-w-sm',
      positionClasses[position]
    )}>
      <AutoSaveIndicator
        {...props}
        className={cn(
          'shadow-lg backdrop-blur-sm',
          props.className
        )}
        compact
      />
    </div>
  )
}

// Hook for managing auto-save indicator state
export function useAutoSaveIndicator() {
  const [showIndicator, setShowIndicator] = useState(false)
  const [indicatorMessage, setIndicatorMessage] = useState('')

  const showSaving = () => {
    setIndicatorMessage('Saving changes...')
    setShowIndicator(true)
  }

  const showSaved = () => {
    setIndicatorMessage('All changes saved')
    setShowIndicator(true)
    setTimeout(() => setShowIndicator(false), 2000)
  }

  const showError = (error: string) => {
    setIndicatorMessage(`Save failed: ${error}`)
    setShowIndicator(true)
  }

  const hide = () => {
    setShowIndicator(false)
  }

  return {
    showIndicator,
    indicatorMessage,
    showSaving,
    showSaved,
    showError,
    hide
  }
}