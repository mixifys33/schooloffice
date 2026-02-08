'use client'

import React from 'react'
import { UserCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStaffOnboardingContext } from '@/components/providers/staff-onboarding-provider'
import { useSession } from 'next-auth/react'
import { Role } from '@/types/enums'

interface StaffOnboardingButtonProps {
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'touch' | 'touch-sm' | 'touch-lg' | 'touch-icon'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
}

export function StaffOnboardingButton({ 
  className = '', 
  size = 'touch-icon',
  variant = 'ghost'
}: StaffOnboardingButtonProps) {
  const { data: session } = useSession()
  const { showModal, buttonLoading, onboardingStatus } = useStaffOnboardingContext()

  // Only show for school admins
  if (session?.user?.role !== Role.SCHOOL_ADMIN) {
    return null
  }

  const isIncomplete = onboardingStatus && !onboardingStatus.isComplete && 
    onboardingStatus.missingRoles.some((role: any) => role.isRequired)

  return (
    <Button 
      variant={variant}
      size={size}
      onClick={showModal}
      disabled={buttonLoading}
      title={buttonLoading ? "Loading..." : "Staff Onboarding - Click to manage staff setup"}
      className={`relative transition-all duration-200 ${className}`}
      style={{
        backgroundColor: isIncomplete ? 'var(--warning-light)' : undefined,
        color: isIncomplete ? 'var(--warning-dark)' : 'var(--text-primary)'
      }}
    >
      {buttonLoading ? (
        <div 
          className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" 
          style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }}
        />
      ) : (
        <UserCog className="h-5 w-5" />
      )}
    </Button>
  )
}