'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertTriangle, Trash2, FileCheck, Lock, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'

/**
 * Confirmation Dialog Component
 * Requires explicit confirmation for destructive actions
 * Requirements: 9.5 - Require explicit confirmation for delete, publish results, close term actions
 */

export type DestructiveActionType = 
  | 'delete'
  | 'publish-results'
  | 'close-term'
  | 'suspend-account'
  | 'lock-financial-period'
  | 'custom'

interface ActionConfig {
  icon: React.ElementType
  title: string
  description: string
  confirmText: string
  iconColor: string
  buttonVariant: 'destructive' | 'default'
}

const actionConfigs: Record<Exclude<DestructiveActionType, 'custom'>, ActionConfig> = {
  'delete': {
    icon: Trash2,
    title: 'Confirm Deletion',
    description: 'This action cannot be undone. The data will be permanently removed.',
    confirmText: 'Delete',
    iconColor: 'text-red-500',
    buttonVariant: 'destructive',
  },
  'publish-results': {
    icon: FileCheck,
    title: 'Publish Results',
    description: 'Once published, results will be visible to students and parents. Marks cannot be edited after publishing.',
    confirmText: 'Publish Results',
    iconColor: 'text-orange-500',
    buttonVariant: 'default',
  },
  'close-term': {
    icon: Lock,
    title: 'Close Term',
    description: 'Closing the term will lock all attendance, marks, and results for this term. This action requires Super Admin to unlock.',
    confirmText: 'Close Term',
    iconColor: 'text-amber-500',
    buttonVariant: 'default',
  },
  'suspend-account': {
    icon: AlertTriangle,
    title: 'Suspend Account',
    description: 'The user will be immediately logged out and unable to access the system until reactivated.',
    confirmText: 'Suspend Account',
    iconColor: 'text-red-500',
    buttonVariant: 'destructive',
  },
  'lock-financial-period': {
    icon: Lock,
    title: 'Lock Financial Period',
    description: 'Locking this period will prevent any new fee transactions or modifications to existing records.',
    confirmText: 'Lock Period',
    iconColor: 'text-amber-500',
    buttonVariant: 'default',
  },
}

export interface ConfirmationDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void
  /** Type of destructive action */
  actionType: DestructiveActionType
  /** Custom title (overrides default) */
  title?: string
  /** Custom description (overrides default) */
  description?: string
  /** Custom confirm button text (overrides default) */
  confirmText?: string
  /** Additional warning message */
  warningMessage?: string
  /** Name of the item being affected */
  itemName?: string
  /** Callback when action is confirmed */
  onConfirm: () => void | Promise<void>
  /** Whether the confirm action is loading */
  isLoading?: boolean
  /** Custom icon for custom action type */
  customIcon?: React.ElementType
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  actionType,
  title,
  description,
  confirmText,
  warningMessage,
  itemName,
  onConfirm,
  isLoading = false,
  customIcon,
}: ConfirmationDialogProps) {
  const [isConfirming, setIsConfirming] = React.useState(false)

  const config = actionType !== 'custom' ? actionConfigs[actionType] : null
  const Icon = customIcon || config?.icon || AlertTriangle
  const displayTitle = title || config?.title || 'Confirm Action'
  const displayDescription = description || config?.description || 'Are you sure you want to proceed?'
  const displayConfirmText = confirmText || config?.confirmText || 'Confirm'
  const buttonVariant = config?.buttonVariant || 'destructive'
  const iconColor = config?.iconColor || 'text-amber-500'

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
      onOpenChange(false)
    } finally {
      setIsConfirming(false)
    }
  }

  const loading = isLoading || isConfirming

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-md',
            'translate-x-[-50%] translate-y-[-50%]',
            'bg-white dark:bg-gray-900 rounded-lg shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200'
          )}
        >
          {/* Close button */}
          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 rounded-sm opacity-70 transition-opacity',
              'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400',
              'disabled:pointer-events-none'
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>

          {/* Content */}
          <div className="p-6">
            {/* Icon and Title */}
            <div className="flex items-start gap-4">
              <div className={cn(
                'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full',
                actionType === 'delete' || actionType === 'suspend-account'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              )}>
                <Icon className={cn('h-6 w-6', iconColor)} />
              </div>
              <div className="flex-1">
                <DialogPrimitive.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {displayTitle}
                </DialogPrimitive.Title>
                {itemName && (
                  <p className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {itemName}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <DialogPrimitive.Description className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {displayDescription}
            </DialogPrimitive.Description>

            {/* Warning Message */}
            {warningMessage && (
              <div className="mt-4 rounded-md bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {warningMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant={buttonVariant}
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Processing...' : displayConfirmText}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}


/**
 * Hook for managing confirmation dialog state
 * Provides a simple API for triggering confirmation dialogs
 */
export interface UseConfirmationDialogOptions {
  actionType: DestructiveActionType
  title?: string
  description?: string
  confirmText?: string
  warningMessage?: string
  itemName?: string
  customIcon?: React.ElementType
}

export interface UseConfirmationDialogReturn {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Open the dialog */
  open: () => void
  /** Close the dialog */
  close: () => void
  /** Props to spread on ConfirmationDialog */
  dialogProps: Omit<ConfirmationDialogProps, 'onConfirm'>
  /** Trigger confirmation and return promise that resolves when confirmed */
  confirm: () => Promise<boolean>
}

export function useConfirmationDialog(
  options: UseConfirmationDialogOptions
): UseConfirmationDialogReturn {
  const [isOpen, setIsOpen] = React.useState(false)
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null)

  const open = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = React.useCallback(() => {
    setIsOpen(false)
    if (resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
  }, [])

  const confirm = React.useCallback(() => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
      setIsOpen(true)
    })
  }, [])

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open)
    if (!open && resolveRef.current) {
      resolveRef.current(false)
      resolveRef.current = null
    }
  }, [])

  const handleConfirm = React.useCallback(() => {
    if (resolveRef.current) {
      resolveRef.current(true)
      resolveRef.current = null
    }
    setIsOpen(false)
  }, [])

  const dialogProps: Omit<ConfirmationDialogProps, 'onConfirm'> = {
    open: isOpen,
    onOpenChange: handleOpenChange,
    ...options,
  }

  return {
    isOpen,
    open,
    close,
    dialogProps,
    confirm: async () => {
      const result = await confirm()
      if (result) {
        handleConfirm()
      }
      return result
    },
  }
}

/**
 * Standalone confirmation function for one-off confirmations
 * Creates a temporary dialog and returns a promise
 */
export function createConfirmation(
  options: UseConfirmationDialogOptions & { onConfirm: () => void | Promise<void> }
): { open: () => void; Component: React.FC } {
  let setOpen: React.Dispatch<React.SetStateAction<boolean>> | null = null

  const Component: React.FC = () => {
    const [isOpen, setIsOpenState] = React.useState(false)
    setOpen = setIsOpenState

    return (
      <ConfirmationDialog
        open={isOpen}
        onOpenChange={setIsOpenState}
        onConfirm={options.onConfirm}
        {...options}
      />
    )
  }

  return {
    open: () => setOpen?.(true),
    Component,
  }
}

export default ConfirmationDialog
