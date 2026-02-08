'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { ForcedPasswordReset } from './forced-password-reset'

/**
 * Password Reset Guard Component
 * Intercepts users who need to reset their password
 * Requirements: Force password reset for new staff members
 */

interface PasswordResetGuardProps {
  children: React.ReactNode
}

export function PasswordResetGuard({ children }: PasswordResetGuardProps) {
  const { data: session, status } = useSession()
  const [showPasswordReset, setShowPasswordReset] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    // Check if user needs to reset password
    if (session?.user && session.user.forcePasswordReset) {
      setShowPasswordReset(true)
    } else {
      setShowPasswordReset(false)
    }
  }, [session, status])

  const handlePasswordResetComplete = () => {
    setShowPasswordReset(false)
    // Refresh the page to update session
    window.location.reload()
  }

  // Show loading while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[var(--bg-surface)] dark:bg-[var(--text-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]"></div>
      </div>
    )
  }

  // Show password reset if required
  if (showPasswordReset) {
    return <ForcedPasswordReset onComplete={handlePasswordResetComplete} />
  }

  // Show normal content
  return <>{children}</>
}