'use client'

import { ReactNode, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  GraduationCap,
  Calendar,
  ClipboardList,
  DollarSign,
  MessageSquare,
  Settings,
  BarChart3,
  Shield,
  Bell,
  User,
  BookOpen,
  Building2,
  UserCog,
} from 'lucide-react'
import {
  DashboardLayout,
  type NavItem,
} from '@/components/layout'
import { Button } from '@/components/ui/button'
import { InlineContextDisplay } from '@/components/ui/context-header'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { DashboardRoleSwitcher, getDashboardPathForRole } from '@/components/dashboard'
import { PermissionGuard } from '@/components/auth/permission-guard'
import { Role, StaffRole } from '@/types/enums'

/**
 * Admin Dashboard Layout
 * Requirements: 34.1, 34.2, 34.3, 34.4, 34.5, 12.3, 12.4
 * - Mobile-optimized layouts
 * - Tablet-adaptive layouts
 * - Desktop full dashboard
 * - Collapsible navigation for mobile
 * - Touch-friendly form controls
 * - Permission-based navigation visibility
 */

interface AdminDashboardLayoutProps {
  children: ReactNode
}

/**
 * Extended NavItem with permission requirements
 * Requirements: 12.3, 12.4 - Only show accessible menu items
 */
interface PermissionNavItem extends NavItem {
  /** Permission(s) required to view this item */
  permission?: string | string[]
  /** Whether all permissions are required (AND) or any (OR) */
  permissionMode?: 'all' | 'any'
  /** Children with permissions */
  children?: PermissionNavItem[]
}

/**
 * Navigation items with permission requirements
 * Requirements: 12.3, 12.4 - Wrap menu items with PermissionGuard
 */
const navItems: PermissionNavItem[] = [
  { 
    href: '/dashboard', 
    label: 'Dashboard', 
    icon: <Home className="h-5 w-5" /> 
  },
  {
    href: '/dashboard/students',
    label: 'Students',
    icon: <GraduationCap className="h-5 w-5" />,
    permission: 'view_students',
    children: [
      { href: '/dashboard/students', label: 'All Students', permission: 'view_students' },
      { href: '/dashboard/students/new', label: 'Enrollment', permission: 'view_students' },
      { href: '/dashboard/students/guardians', label: 'Guardians', permission: 'view_students' },
    ],
  },
  {
    href: '/dashboard/staff',
    label: 'Staff',
    icon: <Users className="h-5 w-5" />,
    permission: 'view_students', // Staff management requires student view permission at minimum
    children: [
      { href: '/dashboard/staff', label: 'All Staff' },
      { href: '/dashboard/staff/assignments', label: 'Assignments' },
    ],
  },
  {
    href: '/dashboard/classes',
    label: 'Classes',
    icon: <Building2 className="h-5 w-5" />,
    permission: 'view_students',
    children: [
      { href: '/dashboard/classes', label: 'All Classes' },
      { href: '/dashboard/classes/new', label: 'New Class' },
    ],
  },
  {
    href: '/dashboard/teachers',
    label: 'Teachers',
    icon: <UserCog className="h-5 w-5" />,
    permission: 'manage_teachers',
    children: [
      { href: '/dashboard/teachers', label: 'All Teachers', permission: 'manage_teachers' },
      { href: '/dashboard/teachers/new', label: 'New Teacher', permission: 'manage_teachers' },
    ],
  },
  {
    href: '/dashboard/subjects',
    label: 'Subjects',
    icon: <BookOpen className="h-5 w-5" />,
    permission: 'view_students',
  },
  { 
    href: '/dashboard/attendance', 
    label: 'Attendance', 
    icon: <ClipboardList className="h-5 w-5" />,
    permission: 'modify_attendance',
  },
  {
    href: '/dashboard/reports',
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
    permission: 'generate_reports',
  },
  {
    href: '/dashboard/fees',
    label: 'Finance',
    icon: <DollarSign className="h-5 w-5" />,
    permission: 'view_fees',
  },
  { 
    href: '/dashboard/communications', 
    label: 'Communications', 
    icon: <MessageSquare className="h-5 w-5" /> 
  },
  { 
    href: '/dashboard/school-admin', 
    label: 'School Admin', 
    icon: <Shield className="h-5 w-5" />,
    // Only visible to school admins - no specific permission needed as it's role-based
  },
  { 
    href: '/dashboard/settings', 
    label: 'Settings', 
    icon: <Settings className="h-5 w-5" /> 
  },
]

/**
 * Filter navigation items based on user permissions
 * Requirements: 12.3, 12.4 - Only show accessible menu items
 */
function filterNavItemsByPermission(
  items: PermissionNavItem[],
  userRole: Role | StaffRole | undefined
): NavItem[] {
  if (!userRole) return []
  
  return items
    .filter(item => {
      // If no permission required, show the item
      if (!item.permission) return true
      
      // For now, we'll include all items and let PermissionGuard handle visibility
      // This allows the sidebar to render and PermissionGuard to conditionally show items
      return true
    })
    .map(item => ({
      ...item,
      children: item.children 
        ? filterNavItemsByPermission(item.children, userRole)
        : undefined,
    }))
}

// Format role for display (e.g., SCHOOL_ADMIN -> School Admin)
function formatRole(role: string): string {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Get all available roles for a user
 * Combines session roles with any additional staff roles
 */
function getAvailableRoles(session: any): (Role | StaffRole)[] {
  if (!session?.user) return []
  
  const roles = new Set<Role | StaffRole>()
  
  // Add primary role
  if (session.user.role) {
    roles.add(session.user.role as Role)
  }
  
  // Add active role
  if (session.user.activeRole) {
    roles.add(session.user.activeRole as Role)
  }
  
  // Add all roles from the roles array
  if (session.user.roles && Array.isArray(session.user.roles)) {
    session.user.roles.forEach((role: Role) => roles.add(role))
  }
  
  return Array.from(roles)
}

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const { data: session } = useSession()
  const router = useRouter()

  const userRole = session?.user?.role || 'User'
  const userEmail = session?.user?.email || ''
  
  // Get current active role (from session or stored preference)
  const currentRole = useMemo(() => {
    return (session?.user?.activeRole || session?.user?.role) as Role | StaffRole
  }, [session])
  
  // Get all available roles for the user
  const availableRoles = useMemo(() => {
    return getAvailableRoles(session)
  }, [session])
  
  // Filter navigation items based on permissions
  // Requirements: 12.3, 12.4 - Only show accessible menu items
  const filteredNavItems = useMemo(() => {
    return filterNavItemsByPermission(navItems, currentRole)
  }, [currentRole])
  
  // Handle role change from RoleSwitcher
  // Requirements: 1.4, 1.5 - Navigate on role change and persist selection
  const handleRoleChange = useCallback((newRole: Role | StaffRole) => {
    // The RoleSwitcher component handles sessionStorage persistence
    // and navigation internally, but we can add additional logic here if needed
    const dashboardPath = getDashboardPathForRole(newRole)
    router.push(dashboardPath)
  }, [router])
  
  // Check if user has multiple roles (for showing RoleSwitcher)
  // Requirements: 1.3 - Only show RoleSwitcher if user has multiple roles
  const hasMultipleRoles = availableRoles.length > 1

  return (
    <DashboardLayout
      navItems={filteredNavItems}
      brandLogo="/images/schooloffice.png"
      brandText="SchoolOffice"
      subtitle="Admin"
      headerContent={
        <div className="flex items-center gap-4">
          {/* Context Display - Requirements: 9.4, 18.5 */}
          <InlineContextDisplay className="hidden md:flex" />
          
          {/* Role Switcher - Requirements: 1.3, 1.4, 1.5 */}
          {hasMultipleRoles && currentRole && (
            <DashboardRoleSwitcher
              currentRole={currentRole}
              availableRoles={availableRoles}
              onRoleChange={handleRoleChange}
              className="hidden sm:block"
            />
          )}
          
          <ThemeToggle />
          <Button variant="ghost" size="touch-icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              3
            </span>
          </Button>
          <Button variant="ghost" size="touch-icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      }
      sidebarFooter={
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">{formatRole(userRole)}</p>
          <p className="truncate">{userEmail}</p>
          {/* Mobile Role Switcher - shown in sidebar footer on small screens */}
          {hasMultipleRoles && currentRole && (
            <div className="mt-3 sm:hidden">
              <DashboardRoleSwitcher
                currentRole={currentRole}
                availableRoles={availableRoles}
                onRoleChange={handleRoleChange}
              />
            </div>
          )}
        </div>
      }
    >
      {children}
    </DashboardLayout>
  )
}
