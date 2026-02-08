/**
 * Enhanced Toast Component with Interactive Feedback
 * 
 * Requirements: 20.1, 20.2, 20.3 - Provide immediate visual feedback, toast notifications, smooth animations
 * 
 * Features:
 * - Progress indicators for long operations
 * - Success animations with icons
 * - Error handling with retry options
 * - Smooth enter/exit animations
 * - Action buttons for user interaction
 * - Auto-dismiss with manual override
 */

'use client'

import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { getToastConfig, type EnhancedToast } from '@/hooks/use-enhanced-toast'

export interface EnhancedToastComponentProps {
  toast: EnhancedToast
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
}

export function EnhancedToastComponent({ 
  toast, 
  onDismiss,
  position = 'top-right' 
}: EnhancedToastComponentProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const config = getToastConfig(toast.type)
  const Icon = config.icon

  // Handle entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Handle dismiss with exit animation
  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
      toast.onDismiss?.()
    }, 200)
  }

  // Auto-dismiss logic (handled by the hook, but we can override here if needed)
  useEffect(() => {
    if (!toast.persistent && toast.duration && toast.type !== 'loading' && toast.type !== 'progress') {
      const timer = setTimeout(handleDismiss, toast.duration)
      return () => clearTimeout(timer)
    }
  }, [toast.persistent, toast.duration, toast.type])

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg shadow-lg border backdrop-blur-sm',
        'transition-all duration-200 ease-out transform',
        'max-w-sm w-full relative overflow-hidden',
        // Entrance animations
        isVisible && !isExiting && 'translate-x-0 opacity-100 scale-100',
        !isVisible && !isExiting && (
          position.includes('right') 
            ? 'translate-x-full opacity-0 scale-95' 
            : position.includes('center')
            ? 'translate-y-[-20px] opacity-0 scale-95'
            : 'translate-x-[-100%] opacity-0 scale-95'
        ),
        // Exit animations
        isExiting && (
          position.includes('right')
            ? 'translate-x-full opacity-0 scale-95'
            : position.includes('center')
            ? 'translate-y-[-20px] opacity-0 scale-95'
            : 'translate-x-[-100%] opacity-0 scale-95'
        )
      )}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      {/* Progress bar for progress type */}
      {toast.type === 'progress' && toast.showProgress && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30 transition-all duration-300"
          style={{ 
            width: `${Math.max(0, Math.min(100, toast.progress || 0))}%`,
            backgroundColor: config.iconColor 
          }}
        />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon 
          className={cn(
            'h-5 w-5 transition-transform duration-200',
            config.animate === 'spin' && 'animate-spin',
            toast.type === 'success' && isVisible && 'animate-bounce'
          )}
          style={{ color: config.iconColor }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div 
            className="font-semibold text-sm mb-1 truncate"
            style={{ color: config.textColor }}
          >
            {toast.title}
          </div>
        )}
        <div 
          className="text-sm leading-relaxed"
          style={{ color: config.textColor }}
        >
          {toast.message}
        </div>
        
        {/* Progress text for progress type */}
        {toast.type === 'progress' && toast.progress !== undefined && (
          <div 
            className="text-xs mt-1 font-medium"
            style={{ color: config.iconColor }}
          >
            {Math.round(toast.progress)}% complete
          </div>
        )}

        {/* Action button */}
        {toast.action && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toast.action.onClick}
              className="text-xs h-7 px-3"
              style={{ 
                borderColor: config.borderColor,
                color: config.textColor 
              }}
            >
              {toast.action.label}
            </Button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      <button
        type="button"
        onClick={handleDismiss}
        className={cn(
          'flex-shrink-0 p-1 rounded-md transition-all duration-150',
          'hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1',
          'active:scale-95'
        )}
        style={{ 
          color: config.iconColor,
          focusRingColor: config.borderColor 
        }}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Container for positioning multiple toasts
export interface EnhancedToastContainerProps {
  toasts: EnhancedToast[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
  maxToasts?: number
}

const positionClasses = {
  'top-right': 'top-4 right-4 items-end',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-4 right-4 items-end',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center',
}

export function EnhancedToastContainer({
  toasts,
  onDismiss,
  position = 'top-right',
  maxToasts = 5
}: EnhancedToastContainerProps) {
  // Limit the number of visible toasts
  const visibleToasts = toasts.slice(-maxToasts)

  if (visibleToasts.length === 0) return null

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none',
        positionClasses[position]
      )}
    >
      {visibleToasts.map((toast, index) => (
        <div 
          key={toast.id} 
          className="pointer-events-auto"
          style={{ 
            zIndex: 1000 + index,
            // Stagger animation delays for multiple toasts
            animationDelay: `${index * 100}ms` 
          }}
        >
          <EnhancedToastComponent
            toast={toast}
            onDismiss={onDismiss}
            position={position}
          />
        </div>
      ))}
    </div>
  )
}

// Provider component for enhanced toasts
export interface EnhancedToastProviderProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
  maxToasts?: number
}

export function EnhancedToastProvider({ 
  children, 
  position = 'top-right',
  maxToasts = 5 
}: EnhancedToastProviderProps) {
  // This would typically use a context, but for now we'll keep it simple
  // In a real implementation, you'd want to use React Context to manage global toast state
  
  return (
    <>
      {children}
      {/* Toast container would be rendered here with global state */}
    </>
  )
}

// Utility function to create toast with common patterns
export const createToastWithFeedback = (
  showToast: (options: any) => string,
  updateToast: (id: string, updates: any) => void,
  dismissToast: (id: string) => void
) => {
  return {
    // Show loading toast that can be updated to success/error
    showOperation: (message: string) => {
      return showToast({
        type: 'loading',
        message,
        persistent: true
      })
    },
    
    // Update loading toast to success
    showSuccess: (id: string, message: string) => {
      updateToast(id, {
        type: 'success',
        message,
        persistent: false,
        duration: 3000
      })
    },
    
    // Update loading toast to error
    showError: (id: string, message: string, retry?: () => void) => {
      updateToast(id, {
        type: 'error',
        message,
        persistent: false,
        duration: 5000,
        action: retry ? {
          label: 'Retry',
          onClick: retry
        } : undefined
      })
    },
    
    // Show progress toast
    showProgress: (message: string, progress: number) => {
      return showToast({
        type: 'progress',
        message,
        progress,
        showProgress: true,
        persistent: true
      })
    },
    
    // Update progress
    updateProgress: (id: string, progress: number, message?: string) => {
      updateToast(id, {
        progress,
        ...(message && { message })
      })
    }
  }
}

export default EnhancedToastComponent