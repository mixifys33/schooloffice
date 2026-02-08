'use client'

import React, { useState } from 'react'
import { Ban, PlayCircle, Edit, Key, LogOut, UserCog } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * School Quick Actions Component
 * Requirement 6.3: Display quick action buttons for suspend, reactivate, change plan, reset admin password, force logout, and impersonate
 * Requirement 7.7: Require confirmation with reason for action
 */

interface SchoolQuickActionsProps {
  schoolId: string
  schoolName: string
  currentStatus: 'active' | 'suspended'
  currentPlan: string
  onActionComplete?: () => void
}

type ActionType = 'suspend' | 'reactivate' | 'changePlan' | 'resetPassword' | 'forceLogout' | 'impersonate'

interface ActionDialogState {
  open: boolean
  action: ActionType | null
  reason: string
  newPlan: string
  loading: boolean
  error: string | null
  success: boolean
}

const PLAN_OPTIONS = [
  { value: 'FREE_PILOT', label: 'Free Pilot' },
  { value: 'BASIC', label: 'Basic' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'FULL', label: 'Full Payment' },
  { value: 'HALF', label: 'Half Payment' },
  { value: 'QUARTER', label: 'Quarter Payment' },
  { value: 'NONE', label: 'No Payment' },
]

export function SchoolQuickActions({
  schoolId,
  schoolName,
  currentStatus,
  currentPlan,
  onActionComplete,
}: SchoolQuickActionsProps) {
  const [dialogState, setDialogState] = useState<ActionDialogState>({
    open: false,
    action: null,
    reason: '',
    newPlan: currentPlan,
    loading: false,
    error: null,
    success: false,
  })

  const openDialog = (action: ActionType) => {
    setDialogState({
      open: true,
      action,
      reason: '',
      newPlan: currentPlan,
      loading: false,
      error: null,
      success: false,
    })
  }

  const closeDialog = () => {
    setDialogState({
      open: false,
      action: null,
      reason: '',
      newPlan: currentPlan,
      loading: false,
      error: null,
      success: false,
    })
  }

  const executeAction = async () => {
    if (!dialogState.action) return

    // Validate inputs
    if (dialogState.action !== 'impersonate' && !dialogState.reason.trim()) {
      setDialogState(prev => ({ 
        ...prev, 
        error: 'Reason is required. Please provide a reason for this action.' 
      }))
      return
    }

    if (dialogState.action !== 'impersonate' && dialogState.reason.trim().length < 10) {
      setDialogState(prev => ({ 
        ...prev, 
        error: 'Please provide a more detailed reason (at least 10 characters).' 
      }))
      return
    }

    if (dialogState.action === 'changePlan' && !dialogState.newPlan) {
      setDialogState(prev => ({ 
        ...prev, 
        error: 'Please select a new plan before proceeding.' 
      }))
      return
    }

    if (dialogState.action === 'changePlan' && dialogState.newPlan === currentPlan) {
      setDialogState(prev => ({ 
        ...prev, 
        error: `The school is already on the ${currentPlan} plan. Please select a different plan.` 
      }))
      return
    }

    setDialogState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const endpoint = `/api/super-admin/schools/${schoolId}/${dialogState.action === 'changePlan' ? 'change-plan' : dialogState.action === 'resetPassword' ? 'reset-password' : dialogState.action === 'forceLogout' ? 'force-logout' : dialogState.action}`
      
      const requestBody: Record<string, unknown> = {}
      
      if (dialogState.action !== 'impersonate') {
        requestBody.reason = dialogState.reason
      }
      
      if (dialogState.action === 'changePlan') {
        requestBody.newPlan = dialogState.newPlan
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to ${dialogState.action}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || 'Action failed')
      }

      // Handle impersonate action (redirect to school admin portal)
      if (dialogState.action === 'impersonate' && result.data?.redirectUrl) {
        window.location.href = result.data.redirectUrl
        return
      }

      setDialogState(prev => ({ ...prev, success: true, loading: false }))

      // Refresh page after 2 seconds to allow user to read success message
      setTimeout(() => {
        if (onActionComplete) {
          onActionComplete()
        } else {
          window.location.reload()
        }
      }, 2000)

    } catch (err) {
      console.error('Action error:', err)
      setDialogState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.',
      }))
    }
  }

  const getActionConfig = (action: ActionType) => {
    const configs = {
      suspend: {
        title: 'Suspend School',
        description: `You are about to suspend ${schoolName}. This will disable access for all users in this school.`,
        buttonLabel: 'Suspend School',
        buttonClass: 'bg-[var(--chart-red)] hover:bg-[var(--chart-red)]',
        requiresReason: true,
      },
      reactivate: {
        title: 'Reactivate School',
        description: `You are about to reactivate ${schoolName}. This will restore access for all users in this school.`,
        buttonLabel: 'Reactivate School',
        buttonClass: 'bg-[var(--chart-green)] hover:bg-[var(--chart-green)]',
        requiresReason: true,
      },
      changePlan: {
        title: 'Change Plan',
        description: `You are about to change the subscription plan for ${schoolName}.`,
        buttonLabel: 'Change Plan',
        buttonClass: 'bg-[var(--chart-blue)] hover:bg-[var(--accent-hover)]',
        requiresReason: true,
      },
      resetPassword: {
        title: 'Reset Admin Password',
        description: `You are about to reset the admin password for ${schoolName}. A password reset link will be sent to the admin email.`,
        buttonLabel: 'Reset Password',
        buttonClass: 'bg-[var(--chart-yellow)] hover:bg-[var(--warning)]',
        requiresReason: true,
      },
      forceLogout: {
        title: 'Force Logout',
        description: `You are about to force logout all users in ${schoolName}. All active sessions will be invalidated.`,
        buttonLabel: 'Force Logout',
        buttonClass: 'bg-[var(--chart-purple)] hover:bg-[var(--chart-purple)]',
        requiresReason: true,
      },
      impersonate: {
        title: 'Impersonate Admin',
        description: `You are about to impersonate the admin of ${schoolName}. This action will be logged in the audit trail.`,
        buttonLabel: 'Impersonate',
        buttonClass: 'bg-indigo-600 hover:bg-indigo-700',
        requiresReason: false,
      },
    }
    return configs[action]
  }

  const getSuccessMessage = (action: ActionType | null): string => {
    const messages = {
      suspend: 'School Suspended Successfully',
      reactivate: 'School Reactivated Successfully',
      changePlan: 'Plan Changed Successfully',
      resetPassword: 'Password Reset Link Sent',
      forceLogout: 'All Users Logged Out',
      impersonate: 'Impersonation Started',
    }
    return action ? messages[action] : 'Action Completed Successfully'
  }

  const getSuccessDetails = (action: ActionType | null): string => {
    const details = {
      suspend: `${schoolName} has been suspended. All users have been logged out and access is disabled.`,
      reactivate: `${schoolName} has been reactivated. Users can now access the school again.`,
      changePlan: `The subscription plan for ${schoolName} has been updated to ${dialogState.newPlan}.`,
      resetPassword: `A password reset link has been sent to the admin email address.`,
      forceLogout: `All active sessions for ${schoolName} have been invalidated.`,
      impersonate: `You are being redirected to ${schoolName}'s admin portal.`,
    }
    return action ? details[action] : 'The action has been completed successfully.'
  }

  const config = dialogState.action ? getActionConfig(dialogState.action) : null

  return (
    <>
      <div className="bg-[var(--bg-main)] dark:bg-[var(--border-strong)] rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] p-3 sm:p-4 md:p-6">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] mb-3 sm:mb-4">
          Quick Actions
        </h2>
        
        {/* Mobile: 2 columns, Tablet: 3 columns, Desktop: 6 columns */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {currentStatus === 'active' ? (
            <button
              onClick={() => openDialog('suspend')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-[var(--danger-light)] dark:border-[var(--danger-dark)] hover:bg-[var(--danger-light)] dark:hover:bg-[var(--danger-dark)]/20 transition-colors"
            >
              <Ban className="h-6 w-6 text-[var(--chart-red)]" />
              <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Suspend</span>
            </button>
          ) : (
            <button
              onClick={() => openDialog('reactivate')}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-[var(--success-light)] dark:border-[var(--success-dark)] hover:bg-[var(--success-light)] dark:hover:bg-[var(--success-dark)]/20 transition-colors"
            >
              <PlayCircle className="h-6 w-6 text-[var(--chart-green)]" />
              <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Reactivate</span>
            </button>
          )}

          <button
            onClick={() => openDialog('changePlan')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-[var(--info-light)] dark:border-[var(--info-dark)] hover:bg-[var(--info-light)] dark:hover:bg-[var(--info-dark)]/20 transition-colors"
          >
            <Edit className="h-6 w-6 text-[var(--chart-blue)]" />
            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Change Plan</span>
          </button>

          <button
            onClick={() => openDialog('resetPassword')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-[var(--warning-light)] dark:border-[var(--warning-dark)] hover:bg-[var(--warning-light)] dark:hover:bg-[var(--warning-dark)]/20 transition-colors"
          >
            <Key className="h-6 w-6 text-[var(--chart-yellow)]" />
            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Reset Password</span>
          </button>

          <button
            onClick={() => openDialog('forceLogout')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-[var(--info-light)] dark:border-[var(--info-dark)] hover:bg-[var(--info-light)] dark:hover:bg-[var(--info-dark)]/20 transition-colors"
          >
            <LogOut className="h-6 w-6 text-[var(--chart-purple)]" />
            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Force Logout</span>
          </button>

          <button
            onClick={() => openDialog('impersonate')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
          >
            <UserCog className="h-6 w-6 text-[var(--chart-purple)]" />
            <span className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Impersonate</span>
          </button>
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={dialogState.open} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{config?.title}</DialogTitle>
            <DialogDescription>{config?.description}</DialogDescription>
          </DialogHeader>

          {dialogState.success ? (
            <div className="py-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-[var(--success-light)] dark:bg-[var(--success-dark)]/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-[var(--chart-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {getSuccessMessage(dialogState.action)}
              </p>
              <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-2">
                {getSuccessDetails(dialogState.action)}
              </p>
              <p className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] mt-3">
                Refreshing page...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {dialogState.error && (
                <div className="p-3 rounded-md bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20 text-[var(--danger-dark)] dark:text-[var(--danger)] text-sm">
                  {dialogState.error}
                </div>
              )}

              {dialogState.action === 'changePlan' && (
                <div>
                  <label htmlFor="new-plan" className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    New Plan *
                  </label>
                  <select
                    id="new-plan"
                    value={dialogState.newPlan}
                    onChange={(e) => setDialogState(prev => ({ ...prev, newPlan: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-primary)]"
                  >
                    {PLAN_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {config?.requiresReason && (
                <div>
                  <label htmlFor="action-reason" className="block text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)] mb-2">
                    Reason * <span className="text-xs text-[var(--text-muted)]">({dialogState.reason.length} characters)</span>
                  </label>
                  <textarea
                    id="action-reason"
                    rows={3}
                    value={dialogState.reason}
                    onChange={(e) => setDialogState(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Enter the reason for this action... (minimum 10 characters recommended)"
                    className="w-full px-3 py-2 border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] dark:bg-[var(--border-strong)] dark:text-[var(--text-primary)]"
                    required
                  />
                  {dialogState.reason.length > 0 && dialogState.reason.length < 10 && (
                    <p className="text-xs text-[var(--chart-yellow)] dark:text-[var(--warning)] mt-1">
                      Please provide a more detailed reason (at least 10 characters)
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                <button
                  onClick={closeDialog}
                  disabled={dialogState.loading}
                  className="px-4 py-2 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--text-muted)] rounded-md hover:bg-[var(--border-default)] dark:hover:bg-[var(--text-secondary)] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={dialogState.loading}
                  className={cn(
                    'px-4 py-2 text-[var(--white-pure)] rounded-md transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed',
                    config?.buttonClass
                  )}
                >
                  {dialogState.loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Processing...
                    </span>
                  ) : (
                    config?.buttonLabel
                  )}
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
