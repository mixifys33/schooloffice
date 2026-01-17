'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Role } from '@/types/enums'

/**
 * Role Switcher Component
 * Requirements: 3.3, 3.5, 3.6
 * - Display available roles for multi-role users
 * - Allow role selection without re-authentication
 * - Update session and redirect to appropriate dashboard
 */

interface RoleSwitcherProps {
  availableRoles: Role[]
  currentRole?: Role
  schoolName?: string
  onRoleSelect?: (role: Role) => Promise<void>
  variant?: 'modal' | 'inline' | 'dropdown'
}

/**
 * Get display name for a role
 */
function getRoleDisplayName(role: Role): string {
  const roleNames: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'Super Admin',
    [Role.SCHOOL_ADMIN]: 'School Admin',
    [Role.TEACHER]: 'Teacher',
    [Role.PARENT]: 'Parent',
    [Role.STUDENT]: 'Student',
  }
  return roleNames[role] || role
}

/**
 * Get description for a role
 */
function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    [Role.SUPER_ADMIN]: 'Platform administration and school management',
    [Role.SCHOOL_ADMIN]: 'School overview, setup, reports, and finance',
    [Role.TEACHER]: 'Classes, attendance, marks, and timetable',
    [Role.PARENT]: 'View child information, fees, and results',
    [Role.STUDENT]: 'View timetable, results, and assignments',
  }
  return descriptions[role] || ''
}

/**
 * Get icon for a role
 */
function getRoleIcon(role: Role): React.ReactNode {
  const icons: Record<Role, React.ReactNode> = {
    [Role.SUPER_ADMIN]: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    [Role.SCHOOL_ADMIN]: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    [Role.TEACHER]: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    [Role.PARENT]: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    [Role.STUDENT]: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  }
  return icons[role] || null
}

/**
 * Get dashboard path for a role
 */
function getDashboardPath(role: Role): string {
  const paths: Record<Role, string> = {
    [Role.SUPER_ADMIN]: '/super-admin',
    [Role.SCHOOL_ADMIN]: '/dashboard',
    [Role.TEACHER]: '/dashboard',
    [Role.PARENT]: '/parent',
    [Role.STUDENT]: '/student',
  }
  return paths[role] || '/dashboard'
}

export function RoleSwitcher({
  availableRoles,
  currentRole,
  schoolName,
  onRoleSelect,
  variant = 'modal',
}: RoleSwitcherProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * Handle role selection
   * Requirements: 3.5, 3.6 - Update session and redirect without re-authentication
   */
  const handleRoleSelect = async (role: Role) => {
    setSelectedRole(role)
    setError(null)

    startTransition(async () => {
      try {
        if (onRoleSelect) {
          await onRoleSelect(role)
        } else {
          // Default behavior: call API to switch role and redirect
          const response = await fetch('/api/auth/switch-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role }),
          })

          if (!response.ok) {
            const data = await response.json()
            setError(data.error || 'Failed to switch role')
            setSelectedRole(null)
            return
          }

          // Redirect to the appropriate dashboard
          const dashboardPath = getDashboardPath(role)
          router.push(dashboardPath)
          router.refresh()
        }
      } catch (err) {
        console.error('Role switch error:', err)
        setError('An unexpected error occurred')
        setSelectedRole(null)
      }
    })
  }

  if (variant === 'modal') {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Select Your Role
            </h2>
            {schoolName && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                at {schoolName}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div 
              role="alert"
              className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
            >
              <p className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </p>
            </div>
          )}

          {/* Role Options */}
          <div className="space-y-3">
            {availableRoles.map((role) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                disabled={isPending}
                className={`
                  w-full p-4 rounded-lg border-2 transition-all text-left
                  ${currentRole === role 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                  }
                  ${isPending && selectedRole === role 
                    ? 'opacity-75 cursor-wait' 
                    : ''
                  }
                  ${isPending && selectedRole !== role 
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-2 rounded-lg
                    ${currentRole === role 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }
                  `}>
                    {getRoleIcon(role)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getRoleDisplayName(role)}
                      </span>
                      {currentRole === role && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full">
                          Current
                        </span>
                      )}
                      {isPending && selectedRole === role && (
                        <svg 
                          className="animate-spin h-4 w-4 text-blue-600" 
                          xmlns="http://www.w3.org/2000/svg" 
                          fill="none" 
                          viewBox="0 0 24 24"
                        >
                          <circle 
                            className="opacity-25" 
                            cx="12" 
                            cy="12" 
                            r="10" 
                            stroke="currentColor" 
                            strokeWidth="4"
                          />
                          <path 
                            className="opacity-75" 
                            fill="currentColor" 
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {getRoleDescription(role)}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Dropdown variant for header/navigation
  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <select
          value={currentRole || ''}
          onChange={(e) => handleRoleSelect(e.target.value as Role)}
          disabled={isPending}
          className="
            appearance-none bg-white dark:bg-gray-800 
            border border-gray-300 dark:border-gray-600 
            rounded-lg px-4 py-2 pr-8
            text-sm font-medium text-gray-700 dark:text-gray-200
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {getRoleDisplayName(role)}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {isPending ? (
            <svg 
              className="animate-spin h-4 w-4 text-gray-400" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
    )
  }

  // Inline variant for compact display
  return (
    <div className="flex flex-wrap gap-2">
      {availableRoles.map((role) => (
        <Button
          key={role}
          variant={currentRole === role ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleRoleSelect(role)}
          disabled={isPending}
        >
          {isPending && selectedRole === role ? (
            <span className="flex items-center gap-2">
              <svg 
                className="animate-spin h-4 w-4" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Switching...
            </span>
          ) : (
            getRoleDisplayName(role)
          )}
        </Button>
      ))}
    </div>
  )
}

export default RoleSwitcher
