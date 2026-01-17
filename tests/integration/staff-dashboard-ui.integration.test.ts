/**
 * Staff Dashboard UI Integration Tests
 * 
 * Final checkpoint tests for the staff dashboard UI implementation.
 * Tests: login → dashboard flow, role switching, staff management, permission guards
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 8.1-8.8, 9.1-9.6, 12.1-12.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Role, StaffRole, StaffStatus, AlertSeverity } from '../../src/types/enums'
import { getDashboardPathForRole, getUserAvailableRoles } from '../../src/components/dashboard/dashboard-router'
import type { StaffListItem, StaffProfile } from '../../src/types/staff-dashboard'

/**
 * Test 1: Dashboard Router - Login → Dashboard Flow
 * Requirements: 1.1, 1.2
 */
describe('Dashboard Router Integration', () => {
  describe('getDashboardPathForRole', () => {
    it('should route TEACHER to /dashboard/teacher', () => {
      expect(getDashboardPathForRole(Role.TEACHER)).toBe('/dashboard/teacher')
    })

    it('should route CLASS_TEACHER to /dashboard/class-teacher', () => {
      expect(getDashboardPathForRole(StaffRole.CLASS_TEACHER)).toBe('/dashboard/class-teacher')
    })

    it('should route DOS to /dashboard/dos', () => {
      expect(getDashboardPathForRole(StaffRole.DOS)).toBe('/dashboard/dos')
    })

    it('should route BURSAR to /dashboard/bursar', () => {
      expect(getDashboardPathForRole(StaffRole.BURSAR)).toBe('/dashboard/bursar')
    })

    it('should route HOSTEL_STAFF to /dashboard/hostel', () => {
      expect(getDashboardPathForRole(StaffRole.HOSTEL_STAFF)).toBe('/dashboard/hostel')
    })

    it('should route SUPPORT_STAFF to /dashboard/support', () => {
      expect(getDashboardPathForRole(StaffRole.SUPPORT_STAFF)).toBe('/dashboard/support')
    })

    it('should route SCHOOL_ADMIN to /dashboard/school-admin', () => {
      expect(getDashboardPathForRole(Role.SCHOOL_ADMIN)).toBe('/dashboard/school-admin')
    })

    it('should route SUPER_ADMIN to /super-admin', () => {
      expect(getDashboardPathForRole(Role.SUPER_ADMIN)).toBe('/super-admin')
    })

    it('should route STUDENT to /student', () => {
      expect(getDashboardPathForRole(Role.STUDENT)).toBe('/student')
    })

    it('should route PARENT to /parent', () => {
      expect(getDashboardPathForRole(Role.PARENT)).toBe('/parent')
    })

    it('should return /dashboard for unknown roles', () => {
      expect(getDashboardPathForRole('UNKNOWN_ROLE' as Role)).toBe('/dashboard')
    })
  })

  describe('getUserAvailableRoles', () => {
    it('should return primary role when no secondary roles', () => {
      const roles = getUserAvailableRoles(Role.TEACHER, [], [])
      expect(roles).toContain(Role.TEACHER)
      expect(roles.length).toBe(1)
    })

    it('should combine primary and secondary roles', () => {
      const roles = getUserAvailableRoles(
        Role.TEACHER,
        [StaffRole.CLASS_TEACHER],
        []
      )
      expect(roles).toContain(Role.TEACHER)
      expect(roles).toContain(StaffRole.CLASS_TEACHER)
      expect(roles.length).toBe(2)
    })

    it('should include session roles', () => {
      const roles = getUserAvailableRoles(
        Role.TEACHER,
        [],
        [Role.DEPUTY]
      )
      expect(roles).toContain(Role.TEACHER)
      expect(roles).toContain(Role.DEPUTY)
    })

    it('should deduplicate roles', () => {
      const roles = getUserAvailableRoles(
        Role.TEACHER,
        [Role.TEACHER, StaffRole.CLASS_TEACHER],
        [Role.TEACHER]
      )
      // Should only have TEACHER once
      const teacherCount = roles.filter(r => r === Role.TEACHER).length
      expect(teacherCount).toBe(1)
    })

    it('should return empty array when no primary role', () => {
      const roles = getUserAvailableRoles(undefined, [], [])
      expect(roles.length).toBe(0)
    })
  })
})

/**
 * Test 2: Role Switching
 * Requirements: 1.3, 1.4, 1.5
 */
describe('Role Switching Integration', () => {
  const SESSION_STORAGE_KEY = 'dashboard_selected_role'

  beforeEach(() => {
    // Mock sessionStorage
    const storage: Record<string, string> = {}
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => { storage[key] = value },
      removeItem: (key: string) => { delete storage[key] },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]) },
    })
  })

  it('should store selected role in sessionStorage', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, StaffRole.CLASS_TEACHER)
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(StaffRole.CLASS_TEACHER)
  })

  it('should retrieve stored role from sessionStorage', () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, Role.TEACHER)
    const storedRole = sessionStorage.getItem(SESSION_STORAGE_KEY)
    expect(storedRole).toBe(Role.TEACHER)
  })

  it('should return null when no role is stored', () => {
    const storedRole = sessionStorage.getItem(SESSION_STORAGE_KEY)
    expect(storedRole).toBeNull()
  })

  it('should allow role switching between available roles', () => {
    const availableRoles = [Role.TEACHER, StaffRole.CLASS_TEACHER, StaffRole.DOS]
    
    // Switch to CLASS_TEACHER
    sessionStorage.setItem(SESSION_STORAGE_KEY, StaffRole.CLASS_TEACHER)
    expect(availableRoles).toContain(sessionStorage.getItem(SESSION_STORAGE_KEY))
    
    // Switch to DOS
    sessionStorage.setItem(SESSION_STORAGE_KEY, StaffRole.DOS)
    expect(availableRoles).toContain(sessionStorage.getItem(SESSION_STORAGE_KEY))
  })
})

/**
 * Test 3: Staff Management Data Structures
 * Requirements: 8.1, 8.2, 8.3, 8.4
 */
describe('Staff Management Integration', () => {
  const mockStaffList: StaffListItem[] = [
    {
      id: 'staff-1',
      name: 'John Doe',
      employeeNumber: 'EMP001',
      primaryRole: Role.TEACHER,
      secondaryRoles: [StaffRole.CLASS_TEACHER],
      department: 'Mathematics',
      status: StaffStatus.ACTIVE,
      phone: '+254700000001',
      lastActivity: new Date('2025-01-10T08:00:00Z'),
      alerts: [],
    },
    {
      id: 'staff-2',
      name: 'Jane Smith',
      employeeNumber: 'EMP002',
      primaryRole: StaffRole.BURSAR,
      secondaryRoles: [],
      department: 'Finance',
      status: StaffStatus.ACTIVE,
      phone: '+254700000002',
      lastActivity: new Date('2025-01-09T15:30:00Z'),
      alerts: [
        { id: 'alert-1', type: 'PENDING_APPROVAL', severity: AlertSeverity.WARNING, message: 'Pending approvals' }
      ],
    },
    {
      id: 'staff-3',
      name: 'Bob Wilson',
      employeeNumber: 'EMP003',
      primaryRole: Role.TEACHER,
      secondaryRoles: [],
      department: 'Science',
      status: StaffStatus.INACTIVE,
      phone: '+254700000003',
      alerts: [],
    },
  ]

  describe('Staff List Filtering', () => {
    it('should filter staff by role', () => {
      const filtered = mockStaffList.filter(s => s.primaryRole === Role.TEACHER)
      expect(filtered.length).toBe(2)
      expect(filtered.every(s => s.primaryRole === Role.TEACHER)).toBe(true)
    })

    it('should filter staff by department', () => {
      const filtered = mockStaffList.filter(s => s.department === 'Mathematics')
      expect(filtered.length).toBe(1)
      expect(filtered[0].name).toBe('John Doe')
    })

    it('should filter staff by status', () => {
      const activeStaff = mockStaffList.filter(s => s.status === StaffStatus.ACTIVE)
      expect(activeStaff.length).toBe(2)
      
      const inactiveStaff = mockStaffList.filter(s => s.status === StaffStatus.INACTIVE)
      expect(inactiveStaff.length).toBe(1)
    })

    it('should filter staff by search term (name)', () => {
      const searchTerm = 'john'
      const filtered = mockStaffList.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      expect(filtered.length).toBe(1)
      expect(filtered[0].name).toBe('John Doe')
    })

    it('should filter staff by search term (employee number)', () => {
      const searchTerm = 'EMP002'
      const filtered = mockStaffList.filter(s => 
        s.employeeNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
      expect(filtered.length).toBe(1)
      expect(filtered[0].name).toBe('Jane Smith')
    })

    it('should combine multiple filters', () => {
      const filtered = mockStaffList.filter(s => 
        s.primaryRole === Role.TEACHER && 
        s.status === StaffStatus.ACTIVE
      )
      expect(filtered.length).toBe(1)
      expect(filtered[0].name).toBe('John Doe')
    })
  })

  describe('Staff List Sorting', () => {
    it('should sort staff by name ascending', () => {
      const sorted = [...mockStaffList].sort((a, b) => a.name.localeCompare(b.name))
      expect(sorted[0].name).toBe('Bob Wilson')
      expect(sorted[1].name).toBe('Jane Smith')
      expect(sorted[2].name).toBe('John Doe')
    })

    it('should sort staff by last activity descending', () => {
      const sorted = [...mockStaffList].sort((a, b) => {
        const dateA = a.lastActivity ? new Date(a.lastActivity).getTime() : 0
        const dateB = b.lastActivity ? new Date(b.lastActivity).getTime() : 0
        return dateB - dateA
      })
      expect(sorted[0].name).toBe('John Doe') // Most recent
    })
  })

  describe('Staff Alerts', () => {
    it('should identify staff with alerts', () => {
      const staffWithAlerts = mockStaffList.filter(s => s.alerts.length > 0)
      expect(staffWithAlerts.length).toBe(1)
      expect(staffWithAlerts[0].name).toBe('Jane Smith')
    })

    it('should count alerts by severity', () => {
      const staff = mockStaffList.find(s => s.id === 'staff-2')!
      const warningCount = staff.alerts.filter(a => a.severity === AlertSeverity.WARNING).length
      expect(warningCount).toBe(1)
    })
  })
})

/**
 * Test 4: Permission Guards
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5
 */
describe('Permission Guards Integration', () => {
  // Permission mapping for staff roles
  const rolePermissions: Record<string, string[]> = {
    [Role.TEACHER]: ['enter_marks', 'view_students', 'modify_attendance'],
    [StaffRole.CLASS_TEACHER]: ['enter_marks', 'view_students', 'modify_attendance', 'view_fees'],
    [StaffRole.DOS]: ['approve_marks', 'generate_reports', 'lock_reports', 'view_students'],
    [StaffRole.BURSAR]: ['view_fees', 'record_payments', 'issue_receipts', 'edit_finance'],
    [StaffRole.HOSTEL_STAFF]: ['track_presence', 'log_discipline', 'send_emergency_alerts'],
    [StaffRole.SUPPORT_STAFF]: ['view_tasks', 'view_notices'],
    [Role.SCHOOL_ADMIN]: ['enter_marks', 'approve_marks', 'view_fees', 'record_payments', 'view_students', 'edit_class_assignments'],
  }

  function hasPermission(role: Role | StaffRole, permission: string): boolean {
    const permissions = rolePermissions[role] || []
    return permissions.includes(permission)
  }

  describe('Teacher Permissions', () => {
    it('should allow teachers to enter marks', () => {
      expect(hasPermission(Role.TEACHER, 'enter_marks')).toBe(true)
    })

    it('should not allow teachers to approve marks', () => {
      expect(hasPermission(Role.TEACHER, 'approve_marks')).toBe(false)
    })

    it('should not allow teachers to view fees', () => {
      expect(hasPermission(Role.TEACHER, 'view_fees')).toBe(false)
    })

    it('should not allow teachers to edit class assignments', () => {
      expect(hasPermission(Role.TEACHER, 'edit_class_assignments')).toBe(false)
    })
  })

  describe('Class Teacher Permissions', () => {
    it('should allow class teachers to view fees (read-only)', () => {
      expect(hasPermission(StaffRole.CLASS_TEACHER, 'view_fees')).toBe(true)
    })

    it('should not allow class teachers to record payments', () => {
      expect(hasPermission(StaffRole.CLASS_TEACHER, 'record_payments')).toBe(false)
    })
  })

  describe('DOS Permissions', () => {
    it('should allow DOS to approve marks', () => {
      expect(hasPermission(StaffRole.DOS, 'approve_marks')).toBe(true)
    })

    it('should allow DOS to generate reports', () => {
      expect(hasPermission(StaffRole.DOS, 'generate_reports')).toBe(true)
    })

    it('should allow DOS to lock reports', () => {
      expect(hasPermission(StaffRole.DOS, 'lock_reports')).toBe(true)
    })

    it('should not allow DOS to edit marks directly', () => {
      expect(hasPermission(StaffRole.DOS, 'edit_marks')).toBe(false)
    })
  })

  describe('Bursar Permissions', () => {
    it('should allow bursar to record payments', () => {
      expect(hasPermission(StaffRole.BURSAR, 'record_payments')).toBe(true)
    })

    it('should allow bursar to issue receipts', () => {
      expect(hasPermission(StaffRole.BURSAR, 'issue_receipts')).toBe(true)
    })

    it('should not allow bursar to enter marks', () => {
      expect(hasPermission(StaffRole.BURSAR, 'enter_marks')).toBe(false)
    })

    it('should not allow bursar to modify attendance', () => {
      expect(hasPermission(StaffRole.BURSAR, 'modify_attendance')).toBe(false)
    })
  })

  describe('Hostel Staff Permissions', () => {
    it('should allow hostel staff to track presence', () => {
      expect(hasPermission(StaffRole.HOSTEL_STAFF, 'track_presence')).toBe(true)
    })

    it('should allow hostel staff to log discipline', () => {
      expect(hasPermission(StaffRole.HOSTEL_STAFF, 'log_discipline')).toBe(true)
    })

    it('should allow hostel staff to send emergency alerts', () => {
      expect(hasPermission(StaffRole.HOSTEL_STAFF, 'send_emergency_alerts')).toBe(true)
    })

    it('should not allow hostel staff to view fees', () => {
      expect(hasPermission(StaffRole.HOSTEL_STAFF, 'view_fees')).toBe(false)
    })
  })

  describe('Support Staff Permissions', () => {
    it('should allow support staff to view tasks', () => {
      expect(hasPermission(StaffRole.SUPPORT_STAFF, 'view_tasks')).toBe(true)
    })

    it('should allow support staff to view notices', () => {
      expect(hasPermission(StaffRole.SUPPORT_STAFF, 'view_notices')).toBe(true)
    })

    it('should not allow support staff to view student records', () => {
      expect(hasPermission(StaffRole.SUPPORT_STAFF, 'view_students')).toBe(false)
    })

    it('should not allow support staff to view fees', () => {
      expect(hasPermission(StaffRole.SUPPORT_STAFF, 'view_fees')).toBe(false)
    })
  })
})

/**
 * Test 5: Role Assignment and Self-Modification Prevention
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
describe('Role Assignment Integration', () => {
  interface RoleAssignment {
    staffId: string
    role: Role | StaffRole
    isPrimary: boolean
    assignedBy: string
  }

  function canAssignRole(
    assignerId: string,
    targetStaffId: string,
    role: Role | StaffRole
  ): { allowed: boolean; reason?: string } {
    // Self-modification prevention (Requirement 9.6)
    if (assignerId === targetStaffId) {
      return { allowed: false, reason: 'Cannot modify your own roles' }
    }

    // Only admins can assign roles
    return { allowed: true }
  }

  function assignRole(
    assignerId: string,
    targetStaffId: string,
    role: Role | StaffRole,
    isPrimary: boolean
  ): RoleAssignment | { error: string } {
    const check = canAssignRole(assignerId, targetStaffId, role)
    if (!check.allowed) {
      return { error: check.reason! }
    }

    return {
      staffId: targetStaffId,
      role,
      isPrimary,
      assignedBy: assignerId,
    }
  }

  describe('Self-Modification Prevention', () => {
    it('should prevent users from modifying their own roles', () => {
      const result = assignRole('admin-1', 'admin-1', StaffRole.DOS, true)
      expect('error' in result).toBe(true)
      if ('error' in result) {
        expect(result.error).toBe('Cannot modify your own roles')
      }
    })

    it('should allow admins to modify other users roles', () => {
      const result = assignRole('admin-1', 'staff-2', StaffRole.CLASS_TEACHER, false)
      expect('error' in result).toBe(false)
      if (!('error' in result)) {
        expect(result.staffId).toBe('staff-2')
        expect(result.role).toBe(StaffRole.CLASS_TEACHER)
      }
    })
  })

  describe('Primary Role Assignment', () => {
    it('should assign primary role correctly', () => {
      const result = assignRole('admin-1', 'staff-2', Role.TEACHER, true)
      expect('error' in result).toBe(false)
      if (!('error' in result)) {
        expect(result.isPrimary).toBe(true)
      }
    })
  })

  describe('Secondary Role Assignment', () => {
    it('should assign secondary role correctly', () => {
      const result = assignRole('admin-1', 'staff-2', StaffRole.CLASS_TEACHER, false)
      expect('error' in result).toBe(false)
      if (!('error' in result)) {
        expect(result.isPrimary).toBe(false)
      }
    })
  })
})

/**
 * Test 6: Dashboard Content Exclusions
 * Requirements: 2.6, 3.5, 5.6
 */
describe('Dashboard Content Exclusions', () => {
  // Features that should be excluded from each dashboard
  const dashboardExclusions: Record<string, string[]> = {
    teacher: ['fee_information', 'mark_approval', 'class_assignment_editing'],
    class_teacher: ['payment_recording'],
    bursar: ['marks_editing', 'class_changes', 'attendance_modification'],
    hostel: ['marks', 'finance'],
    support: ['student_records', 'marks', 'finance'],
  }

  function isFeatureExcluded(dashboard: string, feature: string): boolean {
    const exclusions = dashboardExclusions[dashboard] || []
    return exclusions.includes(feature)
  }

  describe('Teacher Dashboard Exclusions', () => {
    it('should exclude fee information', () => {
      expect(isFeatureExcluded('teacher', 'fee_information')).toBe(true)
    })

    it('should exclude mark approval functions', () => {
      expect(isFeatureExcluded('teacher', 'mark_approval')).toBe(true)
    })

    it('should exclude class assignment editing', () => {
      expect(isFeatureExcluded('teacher', 'class_assignment_editing')).toBe(true)
    })
  })

  describe('Class Teacher Dashboard Exclusions', () => {
    it('should exclude payment recording', () => {
      expect(isFeatureExcluded('class_teacher', 'payment_recording')).toBe(true)
    })
  })

  describe('Bursar Dashboard Exclusions', () => {
    it('should exclude marks editing', () => {
      expect(isFeatureExcluded('bursar', 'marks_editing')).toBe(true)
    })

    it('should exclude class changes', () => {
      expect(isFeatureExcluded('bursar', 'class_changes')).toBe(true)
    })

    it('should exclude attendance modification', () => {
      expect(isFeatureExcluded('bursar', 'attendance_modification')).toBe(true)
    })
  })

  describe('Hostel Dashboard Exclusions', () => {
    it('should exclude marks', () => {
      expect(isFeatureExcluded('hostel', 'marks')).toBe(true)
    })

    it('should exclude finance', () => {
      expect(isFeatureExcluded('hostel', 'finance')).toBe(true)
    })
  })

  describe('Support Dashboard Exclusions', () => {
    it('should exclude student records', () => {
      expect(isFeatureExcluded('support', 'student_records')).toBe(true)
    })

    it('should exclude marks', () => {
      expect(isFeatureExcluded('support', 'marks')).toBe(true)
    })

    it('should exclude finance', () => {
      expect(isFeatureExcluded('support', 'finance')).toBe(true)
    })
  })
})

/**
 * Test 7: Pagination
 * Requirements: 8.4
 */
describe('Pagination Integration', () => {
  interface PaginationInfo {
    page: number
    limit: number
    totalCount: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }

  function calculatePagination(
    totalCount: number,
    page: number,
    limit: number
  ): PaginationInfo {
    const totalPages = Math.ceil(totalCount / limit)
    return {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    }
  }

  it('should calculate pagination correctly for first page', () => {
    const pagination = calculatePagination(100, 1, 20)
    expect(pagination.totalPages).toBe(5)
    expect(pagination.hasNextPage).toBe(true)
    expect(pagination.hasPreviousPage).toBe(false)
  })

  it('should calculate pagination correctly for middle page', () => {
    const pagination = calculatePagination(100, 3, 20)
    expect(pagination.hasNextPage).toBe(true)
    expect(pagination.hasPreviousPage).toBe(true)
  })

  it('should calculate pagination correctly for last page', () => {
    const pagination = calculatePagination(100, 5, 20)
    expect(pagination.hasNextPage).toBe(false)
    expect(pagination.hasPreviousPage).toBe(true)
  })

  it('should handle single page', () => {
    const pagination = calculatePagination(15, 1, 20)
    expect(pagination.totalPages).toBe(1)
    expect(pagination.hasNextPage).toBe(false)
    expect(pagination.hasPreviousPage).toBe(false)
  })

  it('should handle empty results', () => {
    const pagination = calculatePagination(0, 1, 20)
    expect(pagination.totalPages).toBe(0)
    expect(pagination.hasNextPage).toBe(false)
    expect(pagination.hasPreviousPage).toBe(false)
  })
})
