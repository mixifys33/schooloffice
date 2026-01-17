'use client'

import * as React from 'react'
import { Role } from '@/types/enums'
import {
  onboardingService,
  type OnboardingState,
  type TourStep,
  type QuickAction,
  type ErrorMessage,
  type SuccessConfirmation,
} from '@/services/onboarding.service'
import { WelcomeTour } from '@/components/ui/welcome-tour'

/**
 * Onboarding Provider
 * Requirements: 35.1, 35.2, 35.3, 35.4, 35.5
 * 
 * Provides onboarding context and manages tour state across the application
 */

interface OnboardingContextValue {
  // State
  state: OnboardingState | null
  isLoading: boolean
  
  // Tour
  tourSteps: TourStep[]
  isTourOpen: boolean
  startTour: () => void
  completeTour: () => void
  skipTour: () => void
  
  // Tooltips
  shouldShowTooltip: (tooltipId: string) => boolean
  dismissTooltip: (tooltipId: string) => void
  
  // Quick Actions
  quickActions: QuickAction[]
  
  // Error Messages
  getErrorMessage: (code: string) => ErrorMessage
  
  // Success Confirmations
  getSuccessConfirmation: (action: string) => SuccessConfirmation | undefined
  showSuccess: (action: string) => void
  
  // Current success state
  currentSuccess: SuccessConfirmation | null
  clearSuccess: () => void
}

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null)

export interface OnboardingProviderProps {
  children: React.ReactNode
  userId: string
  userRole: Role
  isFirstLogin?: boolean
}

const STORAGE_KEY = 'schooloffice_onboarding'

export function OnboardingProvider({
  children,
  userId,
  userRole,
  isFirstLogin = false,
}: OnboardingProviderProps) {
  const [state, setState] = React.useState<OnboardingState | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isTourOpen, setIsTourOpen] = React.useState(false)
  const [currentSuccess, setCurrentSuccess] = React.useState<SuccessConfirmation | null>(null)

  // Load state from localStorage on mount
  React.useEffect(() => {
    const loadState = () => {
      try {
        const stored = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          setState({
            ...parsed,
            tourCompletedAt: parsed.tourCompletedAt ? new Date(parsed.tourCompletedAt) : undefined,
            lastLoginAt: parsed.lastLoginAt ? new Date(parsed.lastLoginAt) : undefined,
          })
        } else {
          // Create initial state for new user
          const initialState = onboardingService.createInitialState(userId, isFirstLogin)
          setState(initialState)
          saveState(initialState)
        }
      } catch (error) {
        console.error('Failed to load onboarding state:', error)
        const initialState = onboardingService.createInitialState(userId, isFirstLogin)
        setState(initialState)
      }
      setIsLoading(false)
    }

    loadState()
  }, [userId, isFirstLogin])

  // Auto-start tour for first-time users
  React.useEffect(() => {
    if (state && onboardingService.shouldShowTour(state)) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setIsTourOpen(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [state])

  const saveState = (newState: OnboardingState) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(newState))
    } catch (error) {
      console.error('Failed to save onboarding state:', error)
    }
  }

  const tourSteps = React.useMemo(
    () => onboardingService.getTourForRole(userRole),
    [userRole]
  )

  const quickActions = React.useMemo(
    () => onboardingService.getQuickActionsForRole(userRole),
    [userRole]
  )

  const startTour = React.useCallback(() => {
    setIsTourOpen(true)
  }, [])

  const completeTour = React.useCallback(() => {
    if (state) {
      const newState = onboardingService.completeTour(state)
      setState(newState)
      saveState(newState)
    }
    setIsTourOpen(false)
  }, [state])

  const skipTour = React.useCallback(() => {
    if (state) {
      const newState = onboardingService.completeTour(state)
      setState(newState)
      saveState(newState)
    }
    setIsTourOpen(false)
  }, [state])

  const shouldShowTooltip = React.useCallback(
    (tooltipId: string) => {
      if (!state) return true
      return onboardingService.shouldShowTooltip(state, tooltipId)
    },
    [state]
  )

  const dismissTooltip = React.useCallback(
    (tooltipId: string) => {
      if (state) {
        const newState = onboardingService.dismissTooltip(state, tooltipId)
        setState(newState)
        saveState(newState)
      }
    },
    [state]
  )

  const getErrorMessage = React.useCallback(
    (code: string) => onboardingService.getErrorMessage(code),
    []
  )

  const getSuccessConfirmation = React.useCallback(
    (action: string) => onboardingService.getSuccessConfirmation(action),
    []
  )

  const showSuccess = React.useCallback(
    (action: string) => {
      const confirmation = onboardingService.getSuccessConfirmation(action)
      if (confirmation) {
        setCurrentSuccess(confirmation)
      }
    },
    []
  )

  const clearSuccess = React.useCallback(() => {
    setCurrentSuccess(null)
  }, [])

  const value: OnboardingContextValue = {
    state,
    isLoading,
    tourSteps,
    isTourOpen,
    startTour,
    completeTour,
    skipTour,
    shouldShowTooltip,
    dismissTooltip,
    quickActions,
    getErrorMessage,
    getSuccessConfirmation,
    showSuccess,
    currentSuccess,
    clearSuccess,
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
      {/* Welcome Tour */}
      <WelcomeTour
        steps={tourSteps}
        isOpen={isTourOpen}
        onComplete={completeTour}
        onSkip={skipTour}
      />
    </OnboardingContext.Provider>
  )
}

/**
 * Hook to access onboarding context
 */
export function useOnboarding() {
  const context = React.useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

/**
 * Hook to get error message helper
 */
export function useErrorMessage() {
  const { getErrorMessage } = useOnboarding()
  return getErrorMessage
}

/**
 * Hook to get success confirmation helper
 */
export function useSuccessConfirmation() {
  const { showSuccess, currentSuccess, clearSuccess, getSuccessConfirmation } = useOnboarding()
  return { showSuccess, currentSuccess, clearSuccess, getSuccessConfirmation }
}

/**
 * Hook to get quick actions for current user
 */
export function useQuickActions() {
  const { quickActions } = useOnboarding()
  return quickActions
}
