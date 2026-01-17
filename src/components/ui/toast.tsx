'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Toast Notification Component
 * Requirements: 21.2 - Display success notification toast for 3 seconds on form submission
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  /** Toast type determines styling */
  type: ToastType
  /** Toast message to display */
  message: string
  /** Duration in milliseconds (default 3000ms per Requirement 21.2) */
  duration?: number
  /** Callback when toast is dismissed */
  onDismiss?: () => void
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    containerClass: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
    textClass: 'text-green-800 dark:text-green-200',
    iconClass: 'text-green-500 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    containerClass: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
    textClass: 'text-red-800 dark:text-red-200',
    iconClass: 'text-red-500 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    containerClass: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
    textClass: 'text-yellow-800 dark:text-yellow-200',
    iconClass: 'text-yellow-500 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    containerClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
    textClass: 'text-blue-800 dark:text-blue-200',
    iconClass: 'text-blue-500 dark:text-blue-400',
  },
}

export function Toast({
  type,
  message,
  duration = 3000,
  onDismiss,
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true)
  const config = toastConfig[type]
  const Icon = config.icon

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onDismiss])

  if (!isVisible) return null

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-3 px-4 py-3 border rounded-lg shadow-lg',
        'animate-in slide-in-from-top-2 fade-in duration-200',
        config.containerClass
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0', config.iconClass)} />
      <p className={cn('flex-1 text-sm font-medium', config.textClass)}>
        {message}
      </p>
      <button
        type="button"
        onClick={() => {
          setIsVisible(false)
          onDismiss?.()
        }}
        className={cn(
          'flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
          config.iconClass
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Toast Container for positioning multiple toasts
export interface ToastContainerProps {
  children: React.ReactNode
  position?: 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center'
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
}

export function ToastContainer({
  children,
  position = 'top-right',
}: ToastContainerProps) {
  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 max-w-sm w-full',
        positionClasses[position]
      )}
    >
      {children}
    </div>
  )
}

// Toast Context for managing toasts globally
interface ToastContextValue {
  showToast: (props: Omit<ToastProps, 'onDismiss'>) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastState extends Omit<ToastProps, 'onDismiss'> {
  id: string
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([])

  const showToast = React.useCallback((props: Omit<ToastProps, 'onDismiss'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...props, id }])
  }, [])

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  )
}

// Simple hook for local toast state (no provider needed)
export interface LocalToastState {
  type: ToastType
  message: string
}

export function useLocalToast() {
  const [toast, setToast] = React.useState<LocalToastState | null>(null)

  const showToast = React.useCallback((type: ToastType, message: string) => {
    setToast({ type, message })
  }, [])

  const hideToast = React.useCallback(() => {
    setToast(null)
  }, [])

  return { toast, showToast, hideToast }
}
