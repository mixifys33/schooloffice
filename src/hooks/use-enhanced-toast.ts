/**
 * Enhanced Toast Hook for Interactive Feedback
 * 
 * Requirements: 20.1, 20.2, 20.3 - Provide immediate visual feedback, toast notifications, confirmation dialogs
 * 
 * This hook provides enhanced toast notifications with:
 * - Progress indicators for long operations
 * - Success animations with icons
 * - Error handling with retry options
 * - Auto-dismiss with manual override
 * - Stacking and positioning
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, Loader2, RefreshCw } from 'lucide-react'

export type EnhancedToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'progress'

export interface EnhancedToastOptions {
  type: EnhancedToastType
  title?: string
  message: string
  duration?: number
  persistent?: boolean
  progress?: number
  showProgress?: boolean
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
}

export interface EnhancedToast extends EnhancedToastOptions {
  id: string
  timestamp: number
  isVisible: boolean
}

export interface UseEnhancedToastReturn {
  toasts: EnhancedToast[]
  showToast: (options: EnhancedToastOptions) => string
  updateToast: (id: string, updates: Partial<EnhancedToastOptions>) => void
  dismissToast: (id: string) => void
  dismissAll: () => void
  showSuccess: (message: string, options?: Partial<EnhancedToastOptions>) => string
  showError: (message: string, options?: Partial<EnhancedToastOptions>) => string
  showWarning: (message: string, options?: Partial<EnhancedToastOptions>) => string
  showInfo: (message: string, options?: Partial<EnhancedToastOptions>) => string
  showLoading: (message: string, options?: Partial<EnhancedToastOptions>) => string
  showProgress: (message: string, progress: number, options?: Partial<EnhancedToastOptions>) => string
}

export function useEnhancedToast(): UseEnhancedToastReturn {
  const [toasts, setToasts] = useState<EnhancedToast[]>([])
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Generate unique ID for each toast
  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }, [])

  // Clear timeout for a specific toast
  const clearToastTimeout = useCallback((id: string) => {
    const timeout = timeoutRefs.current.get(id)
    if (timeout) {
      clearTimeout(timeout)
      timeoutRefs.current.delete(id)
    }
  }, [])

  // Set auto-dismiss timeout for a toast
  const setToastTimeout = useCallback((id: string, duration: number) => {
    clearToastTimeout(id)
    const timeout = setTimeout(() => {
      dismissToast(id)
    }, duration)
    timeoutRefs.current.set(id, timeout)
  }, [])

  // Show a new toast
  const showToast = useCallback((options: EnhancedToastOptions): string => {
    const id = generateId()
    const toast: EnhancedToast = {
      ...options,
      id,
      timestamp: Date.now(),
      isVisible: true,
      duration: options.duration ?? (options.type === 'error' ? 5000 : 3000),
    }

    setToasts(prev => [...prev, toast])

    // Set auto-dismiss timeout if not persistent and not loading
    if (!options.persistent && options.type !== 'loading' && options.type !== 'progress') {
      setToastTimeout(id, toast.duration!)
    }

    return id
  }, [generateId, setToastTimeout])

  // Update an existing toast
  const updateToast = useCallback((id: string, updates: Partial<EnhancedToastOptions>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ))

    // Handle duration changes
    if (updates.duration !== undefined) {
      const toast = toasts.find(t => t.id === id)
      if (toast && !toast.persistent && toast.type !== 'loading' && toast.type !== 'progress') {
        setToastTimeout(id, updates.duration)
      }
    }
  }, [toasts, setToastTimeout])

  // Dismiss a specific toast
  const dismissToast = useCallback((id: string) => {
    clearToastTimeout(id)
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [clearToastTimeout])

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
    timeoutRefs.current.clear()
    setToasts([])
  }, [])

  // Convenience methods for different toast types
  const showSuccess = useCallback((message: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ type: 'success', message, ...options })
  }, [showToast])

  const showError = useCallback((message: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ type: 'error', message, ...options })
  }, [showToast])

  const showWarning = useCallback((message: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ type: 'warning', message, ...options })
  }, [showToast])

  const showInfo = useCallback((message: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ type: 'info', message, ...options })
  }, [showToast])

  const showLoading = useCallback((message: string, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ type: 'loading', message, persistent: true, ...options })
  }, [showToast])

  const showProgress = useCallback((message: string, progress: number, options?: Partial<EnhancedToastOptions>) => {
    return showToast({ 
      type: 'progress', 
      message, 
      progress, 
      showProgress: true, 
      persistent: true, 
      ...options 
    })
  }, [showToast])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current.clear()
    }
  }, [])

  return {
    toasts,
    showToast,
    updateToast,
    dismissToast,
    dismissAll,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showLoading,
    showProgress,
  }
}

// Toast configuration for styling
export const getToastConfig = (type: EnhancedToastType) => {
  switch (type) {
    case 'success':
      return {
        icon: CheckCircle,
        bgColor: 'var(--success-light)',
        borderColor: 'var(--success)',
        textColor: 'var(--success-dark)',
        iconColor: 'var(--success)',
      }
    case 'error':
      return {
        icon: XCircle,
        bgColor: 'var(--danger-light)',
        borderColor: 'var(--danger)',
        textColor: 'var(--danger-dark)',
        iconColor: 'var(--danger)',
      }
    case 'warning':
      return {
        icon: AlertTriangle,
        bgColor: 'var(--warning-light)',
        borderColor: 'var(--warning)',
        textColor: 'var(--warning-dark)',
        iconColor: 'var(--warning)',
      }
    case 'info':
      return {
        icon: Info,
        bgColor: 'var(--info-light)',
        borderColor: 'var(--info)',
        textColor: 'var(--info-dark)',
        iconColor: 'var(--info)',
      }
    case 'loading':
      return {
        icon: Loader2,
        bgColor: 'var(--info-light)',
        borderColor: 'var(--info)',
        textColor: 'var(--info-dark)',
        iconColor: 'var(--info)',
        animate: 'spin',
      }
    case 'progress':
      return {
        icon: RefreshCw,
        bgColor: 'var(--info-light)',
        borderColor: 'var(--info)',
        textColor: 'var(--info-dark)',
        iconColor: 'var(--info)',
      }
    default:
      return {
        icon: Info,
        bgColor: 'var(--bg-surface)',
        borderColor: 'var(--border-default)',
        textColor: 'var(--text-primary)',
        iconColor: 'var(--text-muted)',
      }
  }
}

// Hook for operation feedback (create, update, delete operations)
export interface UseOperationFeedbackOptions {
  successMessage?: string
  errorMessage?: string
  loadingMessage?: string
  onSuccess?: () => void
  onError?: (error: any) => void
}

export function useOperationFeedback(options: UseOperationFeedbackOptions = {}) {
  const { showSuccess, showError, showLoading, dismissToast } = useEnhancedToast()
  const [isLoading, setIsLoading] = useState(false)
  const loadingToastId = useRef<string | null>(null)

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    customOptions?: Partial<UseOperationFeedbackOptions>
  ): Promise<T> => {
    const opts = { ...options, ...customOptions }
    
    setIsLoading(true)
    
    // Show loading toast
    if (opts.loadingMessage) {
      loadingToastId.current = showLoading(opts.loadingMessage)
    }

    try {
      const result = await operation()
      
      // Dismiss loading toast
      if (loadingToastId.current) {
        dismissToast(loadingToastId.current)
        loadingToastId.current = null
      }
      
      // Show success toast
      if (opts.successMessage) {
        showSuccess(opts.successMessage)
      }
      
      opts.onSuccess?.()
      return result
    } catch (error) {
      // Dismiss loading toast
      if (loadingToastId.current) {
        dismissToast(loadingToastId.current)
        loadingToastId.current = null
      }
      
      // Show error toast
      if (opts.errorMessage) {
        showError(opts.errorMessage)
      }
      
      opts.onError?.(error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [options, showSuccess, showError, showLoading, dismissToast])

  return {
    execute,
    isLoading,
  }
}