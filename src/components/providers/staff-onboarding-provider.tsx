'use client'

import React, { createContext, useContext } from 'react'
import { StaffOnboardingModal } from '@/components/auth/staff-onboarding-modal'
import { useStaffOnboarding } from '@/hooks/use-staff-onboarding'
import { useSession } from 'next-auth/react'
import { Role } from '@/types/enums'

interface StaffOnboardingContextType {
  showModal: () => void
  dismissModal: () => void
  shouldShowModal: boolean
  onboardingStatus: any
  buttonLoading: boolean
}

const StaffOnboardingContext = createContext<StaffOnboardingContextType | null>(null)

export function useStaffOnboardingContext() {
  const context = useContext(StaffOnboardingContext)
  if (!context) {
    // Return a no-op implementation if not within provider
    return {
      showModal: () => {},
      dismissModal: () => {},
      shouldShowModal: false,
      onboardingStatus: null,
      buttonLoading: false
    }
  }
  return context
}

interface StaffOnboardingProviderProps {
  children: React.ReactNode
}

export function StaffOnboardingProvider({ children }: StaffOnboardingProviderProps) {
  const { data: session } = useSession()
  const {
    shouldShowModal,
    dismissModal,
    showModal,
    completeOnboarding,
    buttonLoading,
    onboardingStatus,
  } = useStaffOnboarding()

  // Only provide onboarding functionality for school admins
  const isSchoolAdmin = session?.user?.role === Role.SCHOOL_ADMIN

  const contextValue: StaffOnboardingContextType = {
    showModal,
    dismissModal,
    shouldShowModal,
    onboardingStatus,
    buttonLoading
  }

  return (
    <StaffOnboardingContext.Provider value={contextValue}>
      {children}
      {/* Render the modal globally for school admins */}
      {isSchoolAdmin && (
        <StaffOnboardingModal
          isOpen={shouldShowModal}
          onClose={dismissModal}
          onComplete={completeOnboarding}
        />
      )}
    </StaffOnboardingContext.Provider>
  )
}