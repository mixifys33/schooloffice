'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Role } from '@/types/enums'

/**
 * Hook to check staff onboarding status
 * Requirements: Check if required staff roles are registered when admin logs in
 */

interface OnboardingStatus {
  isComplete: boolean
  missingRoles: Array<{
    role: string
    title: string
    description: string
    isRequired: boolean
  }>
  registeredStaff: Array<{
    id: string
    name: string
    role: string
    email: string
    phone: string
  }>
}

export function useStaffOnboarding() {
  const { data: session } = useSession()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shouldShowModal, setShouldShowModal] = useState(false)
  const [buttonLoading, setButtonLoading] = useState(false)

  // Check if user should see onboarding
  const shouldCheckOnboarding = session?.user?.role === Role.SCHOOL_ADMIN && session?.user?.schoolId

  useEffect(() => {
    if (shouldCheckOnboarding) {
      checkOnboardingStatus()
    }
  }, [shouldCheckOnboarding])

  const checkOnboardingStatus = async () => {
    if (!shouldCheckOnboarding) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/staff/onboarding/status')
      if (!response.ok) {
        throw new Error('Failed to check onboarding status')
      }

      const status = await response.json()
      setOnboardingStatus(status)

      // Show modal if onboarding is not complete and there are missing required roles
      const hasRequiredMissingRoles = status.missingRoles.some((role: any) => role.isRequired)
      setShouldShowModal(!status.isComplete && hasRequiredMissingRoles)
      
      // Log the status for debugging
      console.log('Onboarding Status:', {
        isComplete: status.isComplete,
        registeredCount: status.registeredStaff.length,
        missingCount: status.missingRoles.length,
        missingRequired: status.missingRoles.filter((role: any) => role.isRequired).length,
        shouldShow: !status.isComplete && hasRequiredMissingRoles
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check onboarding status')
    } finally {
      setLoading(false)
    }
  }

  const dismissModal = () => {
    setShouldShowModal(false)
  }

  const showModal = async () => {
    setButtonLoading(true)
    try {
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 300))
      setShouldShowModal(true)
    } finally {
      setButtonLoading(false)
    }
  }

  const completeOnboarding = () => {
    setShouldShowModal(false)
    // Refresh the status
    checkOnboardingStatus()
  }

  return {
    onboardingStatus,
    loading,
    error,
    shouldShowModal,
    buttonLoading,
    dismissModal,
    showModal,
    completeOnboarding,
    refreshStatus: checkOnboardingStatus,
  }
}