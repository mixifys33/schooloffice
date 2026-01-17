'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Role, StaffRole } from '@/types/enums'
import { ChevronDown, Check, Loader2 } from 'lucide-react'

/**
 * Dashboard RoleSwitcher Component
 * Requirements: 1.3, 1.4, 1.5 - Role switching for staff with multiple roles
 * - Dropdown showing current role and available roles
 * - Store selected role in sessionStorage
 * - Trigger navigation on role change
 * - Only render if user has multiple roles
 */

const SESSION_STORAGE_KEY = 'dashboard_selected_role'

export interface DashboardRoleSwitcherProps {
  /** Current active role */
  currentRole: StaffRole | Role
  /** Available roles for the user */
  availableRoles: (StaffRole | Role)[]
  /** Callback when role changes */
  onRoleChange: (role: StaffRole | Role) => void
  /** Additional class names */
  className?: string
}

/**
 * Get display name for a role
 */
function getRoleDisplayName(role: StaffRole | Role): string {
  const roleNames: Record<string, string> = {
    // StaffRole values
    [StaffRole.CLASS_TEACHER]: 'Class Teacher',
    [StaffRole.DOS]: 'Director of Studies',
    [StaffRole.HOSTEL_STAFF]: 'Hostel Staff',
    [StaffRole.SUPPORT_STAFF]: 'Support Staff',
    [StaffRole.BURSAR]: 'Bursar',
    // Role values
    [Role.SUPER_ADMIN]: 'Super Admin',
    [Role.SCHOOL_ADMIN]: 'School Admin',
    [Role.DEPUTY]: 'Deputy',
    [Role.TEACHER]: 'Teacher',
    [Role.ACCOUNTANT]: 'Accountant',
    [Role.STUDENT]: 'Student',
    [Role.PARENT]: 'Parent',
  }
  return roleNames[role] || role
}

/**
 * Get dashboard path for a role
 */
function getDashboardPath(role: StaffRole | Role): string {
  const paths: Record<string, string> = {
    // StaffRole paths
    [StaffRole.CLASS_TEACHER]: '/dashboard/class-teacher',
    [StaffRole.DOS]: '/dashboard/dos',
    [StaffRole.HOSTEL_STAFF]: '/dashboard/hostel',
    [StaffRole.SUPPORT_STAFF]: '/dashboard/support',
    [StaffRole.BURSAR]: '/dashboard/bursar',
    // Role paths
    [Role.SUPER_ADMIN]: '/super-admin',
    [Role.SCHOOL_ADMIN]: '/dashboard',
    [Role.DEPUTY]: '/dashboard',
    [Role.TEACHER]: '/dashboard/teacher',
    [Role.ACCOUNTANT]: '/dashboard/bursar',
    [Role.STUDENT]: '/student',
    [Role.PARENT]: '/parent',
  }
  return paths[role] || '/dashboard'
}

/**
 * Store selected role in sessionStorage
 */
function storeSelectedRole(role: StaffRole | Role): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(SESSION_STORAGE_KEY, role)
  }
}

/**
 * Get stored role from sessionStorage
 */
export function getStoredRole(): StaffRole | Role | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) as StaffRole | Role | null
  }
  return null
}

export function DashboardRoleSwitcher({
  currentRole,
  availableRoles,
  onRoleChange,
  className,
}: DashboardRoleSwitcherProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = React.useState(false)
  const [isPending, setIsPending] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Don't render if user has only one role
  if (availableRoles.length <= 1) {
    return null
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on escape key
  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleRoleSelect = async (role: StaffRole | Role) => {
    if (role === currentRole) {
      setIsOpen(false)
      return
    }

    setIsPending(true)
    
    try {
      // Store in sessionStorage
      storeSelectedRole(role)
      
      // Call the callback
      onRoleChange(role)
      
      // Navigate to the appropriate dashboard
      const dashboardPath = getDashboardPath(role)
      router.push(dashboardPath)
    } finally {
      setIsPending(false)
      setIsOpen(false)
    }
  }

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <span className="text-sm font-medium">
              {getRoleDisplayName(currentRole)}
            </span>
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              isOpen && 'rotate-180'
            )} />
          </>
        )}
      </Button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select role"
          className={cn(
            'absolute right-0 mt-2 w-56 z-50',
            'bg-white dark:bg-gray-900',
            'border border-gray-200 dark:border-gray-700',
            'rounded-lg shadow-lg',
            'py-1'
          )}
        >
          {availableRoles.map((role) => (
            <button
              key={role}
              role="option"
              aria-selected={role === currentRole}
              onClick={() => handleRoleSelect(role)}
              disabled={isPending}
              className={cn(
                'w-full px-4 py-2 text-left text-sm',
                'flex items-center justify-between',
                'hover:bg-gray-100 dark:hover:bg-gray-800',
                'transition-colors',
                role === currentRole && 'bg-gray-50 dark:bg-gray-800/50',
                isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className={cn(
                'font-medium',
                role === currentRole 
                  ? 'text-primary' 
                  : 'text-gray-700 dark:text-gray-300'
              )}>
                {getRoleDisplayName(role)}
              </span>
              {role === currentRole && (
                <Check className="h-4 w-4 text-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardRoleSwitcher
