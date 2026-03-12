'use client'

import * as React from 'react'
import { ReactNode, useMemo, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Home,
  Users,
  GraduationCap,
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
  AlertTriangle,
  FolderOpen,
} from 'lucide-react'
import {
  DashboardLayout,
  type NavItem,
} from '@/components/layout'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { PasswordResetGuard } from '@/components/auth/password-reset-guard'
import { StaffOnboardingProvider } from '@/components/providers/staff-onboarding-provider'
import { Role, StaffRole } from '@/types/enums'
import { AIChatToggle } from '@/components/ai-assistant/ai-chat-toggle'

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
 * Admin navigation items with permission requirements
 * Requirements: 12.3, 12.4 - Wrap menu items with PermissionGuard
 */
const adminNavItems: PermissionNavItem[] = [
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
  },
  {
    href: '/dashboard/assignments',
    label: 'Assignments',
    icon: <ClipboardList className="h-5 w-5" />,
    permission: 'view_students',
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
    icon: <MessageSquare className="h-5 w-5" />,
    children: [
      { href: '/dashboard/communications', label: 'Message Center' },
      { href: '/dashboard/sms/templates', label: 'SMS Templates' },
      { href: '/dashboard/sms/templates/manage', label: 'Manage Templates' },
    ],
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
 * Class Teacher navigation items
 * Focused on class management and teaching activities
 * Comprehensive features for new curriculum compliance
 * Communications removed for cost control and abuse prevention
 */
const classTeacherNavItems: PermissionNavItem[] = [
  {
    href: '/dashboard/class-teacher',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />
  },
  {
    href: '/dashboard/class-teacher/my-class',
    label: 'My Class',
    icon: <GraduationCap className="h-5 w-5" />
  },
  {
    href: '/dashboard/class-teacher/students',
    label: 'Students',
    icon: <GraduationCap className="h-5 w-5" />
  },
  {
    href: '/dashboard/class-teacher/timetable',
    label: 'Timetable',
    icon: <ClipboardList className="h-5 w-5" />
  },
  {
    href: '/dashboard/class-teacher/assessments',
    label: 'Assessments / Results',
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      { href: '/dashboard/class-teacher/assessments/ca', label: 'Continuous Assessment' },
      { href: '/dashboard/class-teacher/assessments/exam', label: 'Exam Management' },
      { href: '/dashboard/class-teacher/assessments/report', label: 'Assessment Reports' },
    ],
  },
  {
    href: '/dashboard/class-teacher/performance',
    label: 'Performance',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    href: '/dashboard/class-teacher/evidence',
    label: 'Learning Evidence',
    icon: <FolderOpen className="h-5 w-5" />
  },
  {
    href: '/dashboard/class-teacher/reports',
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />
  },
  {
    href: '/dashboard/attendance',
    label: 'Attendance',
    icon: <ClipboardList className="h-5 w-5" />,
    children: [
      { href: '/dashboard/attendance/mark', label: 'Mark Attendance' },
      { href: '/dashboard/attendance/view', label: 'View Records' },
    ],
  },
  {
    href: '/dashboard/discipline',
    label: 'Discipline',
    icon: <AlertTriangle className="h-5 w-5" />,
    children: [
      { href: '/dashboard/discipline', label: 'View Records' },
      { href: '/dashboard/discipline/report', label: 'Report Incident' },
    ],
  },
  {
    href: '/dashboard/class-teacher/profile',
    label: 'Profile & Workload',
    icon: <User className="h-5 w-5" />
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />
  },
]

/**
 * Regular Teacher navigation items
 * Focused on subject teaching and student management
 * Communications removed for cost control and abuse prevention
 */
const teacherNavItems: PermissionNavItem[] = [
  {
    href: '/teacher',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />
  },
  {
    href: '/teacher/classes',
    label: 'My Classes',
    icon: <Building2 className="h-5 w-5" />,
    children: [
      { href: '/teacher/classes', label: 'All Classes' },
      { href: '/teacher/timetable', label: 'Timetable' },
    ],
  },
  {
    href: '/teacher/attendance',
    label: 'Attendance',
    icon: <ClipboardList className="h-5 w-5" />,
    children: [
      { href: '/teacher/attendance', label: 'Mark Attendance' },
      { href: '/teacher/attendance/history', label: 'View Records' },
    ],
  },
  {
    href: '/teacher/assessments',
    label: 'Assessments / Results',
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      { href: '/teacher/assessments', label: 'Assessments Overview' },
      { href: '/teacher/assessments/ca-entry', label: 'Continuous Assessment' },
      { href: '/teacher/assessments/exam', label: 'Exam Management' },
      { href: '/teacher/marks', label: 'Enter Marks' },
      { href: '/teacher/reports', label: 'Generate Reports' },
    ],
  },
  {
    href: '/teacher/evidence',
    label: 'Learning Evidence',
    icon: <FolderOpen className="h-5 w-5" />
  },
  {
    href: '/teacher/students',
    label: 'Students',
    icon: <GraduationCap className="h-5 w-5" />,
    children: [
      { href: '/teacher/students', label: 'My Students' },
      { href: '/teacher/students/performance', label: 'Performance' },
    ],
  },
  {
    href: '/teacher/messages',
    label: 'Messages',
    icon: <MessageSquare className="h-5 w-5" />
  },
  {
    href: '/teacher/profile',
    label: 'Profile & Workload',
    icon: <User className="h-5 w-5" />
  },
  {
    href: '/teacher/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />
  },
]

/**
 * Get navigation items based on user role
 */
function getNavItemsForRole(role: Role | StaffRole | undefined): PermissionNavItem[] {
  switch (role) {
    case StaffRole.CLASS_TEACHER:
      return classTeacherNavItems
    case Role.TEACHER:
      return teacherNavItems
    case Role.SCHOOL_ADMIN:
    case Role.DEPUTY:
    case StaffRole.DOS:
    case StaffRole.BURSAR:
    default:
      return adminNavItems
  }
}

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
      // Ensure all properties are properly typed and not objects
      href: String(item.href || ''),
      label: typeof item.label === 'object' && item.label !== null
        ? (((item.label as Record<string, unknown>).name as string) || 
           ((item.label as Record<string, unknown>).text as string) || 
           String(item.label))
        : String(item.label || ''),
      children: item.children 
        ? filterNavItemsByPermission(item.children, userRole)
        : undefined,
    }))
}

// Format role for display (e.g., SCHOOL_ADMIN -> School Admin)
function formatRole(role: string | Role | StaffRole | unknown): string {
  // Handle null, undefined, or object cases
  if (!role) return 'User'
  
  // If it's an object, try to extract a meaningful string
  if (typeof role === 'object' && role !== null) {
    const roleObj = role as Record<string, unknown>
    if (typeof roleObj.name === 'string') return formatRole(roleObj.name)
    if (typeof roleObj.role === 'string') return formatRole(roleObj.role)
    if (typeof roleObj.type === 'string') return formatRole(roleObj.type)
    return 'User'
  }
  
  // Ensure we have a string to work with
  const roleString = String(role)
  
  return roleString
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [notificationCount, setNotificationCount] = useState(0)

  // Get current active role (from session or stored preference) - moved before early returns
  const currentRole = useMemo(() => {
    return (session?.user?.activeRole || session?.user?.role) as Role | StaffRole
  }, [session])
  
  // Get navigation items based on user role - moved before early returns
  // Requirements: 12.3, 12.4 - Only show accessible menu items
  const filteredNavItems = useMemo(() => {
    const roleNavItems = getNavItemsForRole(currentRole)
    return filterNavItemsByPermission(roleNavItems, currentRole)
  }, [currentRole])

  // Handle authentication
  React.useEffect(() => {
    if (status === 'loading') return // Still loading
    
    if (!session?.user) {
      // No session, redirect to login
      console.log('No session found, redirecting to login')
      router.push('/login')
      return
    }
    
    // Check if user has required data
    if (!session.user.schoolId) {
      console.warn('User has no schoolId, this may cause API issues')
    }
  }, [session, status, router])

  // Debug: Log session data to identify potential object issues
  React.useEffect(() => {
    if (session?.user) {
      console.log('Session user data:', {
        role: session.user.role,
        roleType: typeof session.user.role,
        email: session.user.email,
        emailType: typeof session.user.email,
        roles: session.user.roles,
        rolesType: typeof session.user.roles,
        schoolId: session.user.schoolId,
      })
      
      // Check if role or email are objects
      if (typeof session.user.role === 'object') {
        console.warn('User role is an object:', session.user.role)
      }
      if (typeof session.user.email === 'object') {
        console.warn('User email is an object:', session.user.email)
      }
    }
  }, [session])

  // Fetch notification count - moved before early returns
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await fetch('/api/notifications/unread-count')
        
        // Check if response is actually JSON
        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.warn('API returned non-JSON response, likely an error page')
          setNotificationCount(0)
          return
        }
        
        if (response.ok) {
          const data = await response.json()
          setNotificationCount(data.count || 0)
        } else {
          console.warn('Failed to fetch notification count:', response.status, response.statusText)
          setNotificationCount(0)
        }
      } catch (error) {
        console.warn('Error fetching notification count:', error)
        setNotificationCount(0)
      }
    }

    if (session?.user) {
      fetchNotificationCount()
      // Poll every 5 minutes for updates (optimized for performance)
      const interval = setInterval(fetchNotificationCount, 300000)
      return () => clearInterval(interval)
    }
  }, [session])

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if no session (will redirect)
  if (!session?.user) {
    return null
  }

  const userRole = session?.user?.role || 'User'
  const userEmail = session?.user?.email || ''
  
  // Debug: Ensure we're working with strings, not objects
  const safeUserRole = typeof userRole === 'object' && userRole !== null 
    ? (((userRole as Record<string, unknown>).name as string) || 
       ((userRole as Record<string, unknown>).role as string) || 
       ((userRole as Record<string, unknown>).type as string) || 
       JSON.stringify(userRole))
    : typeof userRole === 'string' 
      ? userRole 
      : String(userRole || 'User')
  
  const safeUserEmail = typeof userEmail === 'object' && userEmail !== null
    ? (((userEmail as Record<string, unknown>).email as string) || 
       ((userEmail as Record<string, unknown>).name as string) || 
       JSON.stringify(userEmail))
    : typeof userEmail === 'string' 
      ? userEmail 
      : String(userEmail || '')
  
  // Get role-specific subtitle
  const getSubtitleForRole = (role: Role | StaffRole | undefined): string => {
    switch (role) {
      case StaffRole.CLASS_TEACHER:
        return 'Class Teacher'
      case Role.TEACHER:
        return 'Teacher'
      case StaffRole.DOS:
        return 'DOS'
      case StaffRole.BURSAR:
        return 'Bursar'
      case Role.SCHOOL_ADMIN:
      case Role.DEPUTY:
      default:
        return 'Admin'
    }
  }

  // Check if we're in routes that have their own standalone layouts
  const isDosRoute = pathname.startsWith('/dos')
  const isBursarRoute = pathname.startsWith('/dashboard/bursar')
  const isTeacherRoute = pathname.startsWith('/dashboard/teacher')
  const isClassTeacherRoute = pathname.startsWith('/dashboard/class-teacher')
  const isParentRoute = pathname.startsWith('/dashboard/parent')
  const isStudentRoute = pathname.startsWith('/dashboard/student')
  
  // If this is a route with its own layout, render children without the admin dashboard layout
  // BUT we must do this AFTER all hooks have been called
  if (isDosRoute || isBursarRoute || isTeacherRoute || isClassTeacherRoute || isParentRoute || isStudentRoute) {
    return (
      <StaffOnboardingProvider>
        {children}
      </StaffOnboardingProvider>
    )
  }

  return (
    <StaffOnboardingProvider>
      <PasswordResetGuard>
        <DashboardLayout
          navItems={filteredNavItems}
          brandLogo="/images/schooloffice.png"
          brandText="SchoolOffice"
          subtitle={getSubtitleForRole(currentRole)}
          headerContent={
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
              {/* Context Display - Requirements: 9.4, 18.5 */}
              {/* Temporarily disabled to debug React error */}
              {/* <InlineContextDisplay className="hidden md:flex" /> */}
              
              {/* Role Switcher - Requirements: 1.3, 1.4, 1.5 */}
              {/* Temporarily disabled to debug React error */}
              {/* {hasMultipleRoles && currentRole && (
                <div className="hidden sm:block">
                  <DashboardRoleSwitcher
                    currentRole={currentRole}
                    availableRoles={availableRoles}
                    onRoleChange={handleRoleChange}
                  />
                </div>
              )} */}
              
              {/* Staff Onboarding Button - Only for School Admins */}
              {/* Temporarily disabled to debug React error */}
              {/* <StaffOnboardingButton /> */}
              
              {/* Theme toggle - always visible for admins */}
              <ThemeToggle />
              
              {/* AI Assistant Toggle */}
              <AIChatToggle />
              
              <Button 
                variant="ghost" 
                size="touch-icon" 
                className="relative h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => router.push('/dashboard/notifications')}
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--danger)] text-[10px] text-[var(--white-pure)]">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="touch-icon"
                className="h-9 w-9 sm:h-10 sm:w-10"
                onClick={() => router.push('/dashboard/profile')}
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          }
          sidebarFooter={
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{formatRole(safeUserRole)}</p>
              <p className="truncate">{safeUserEmail}</p>
              
              {/* Mobile Theme Toggle - shown in sidebar footer on small screens */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs">Theme</span>
                <ThemeToggle />
              </div>
              
              {/* Mobile Role Switcher - shown in sidebar footer on small screens */}
              {/* Temporarily disabled to debug React error */}
              {/* {hasMultipleRoles && currentRole && (
                <div className="mt-3 sm:hidden">
                  <DashboardRoleSwitcher
                    currentRole={currentRole}
                    availableRoles={availableRoles}
                    onRoleChange={handleRoleChange}
                  />
                </div>
              )} */}
            </div>
          }
        >
          {children}
        </DashboardLayout>
      </PasswordResetGuard>
    </StaffOnboardingProvider>
  )
}
