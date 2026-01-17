'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/search-input'
import { Badge } from '@/components/ui/badge'
import {
  TeacherListItem,
  TeacherFilters,
  TeacherEmploymentStatus,
  EmploymentType,
  TeacherJobTitle,
} from '@/types/teacher'

/**
 * Teacher List Component
 * Requirements: 9.6
 * - Implements teacher list with columns: name, email, phone, type, title, department, status, access
 * - Implements filtering by status, department, employment type
 * - Implements search functionality
 */

export interface TeacherListProps {
  /** List of teachers to display */
  teachers: TeacherListItem[]
  /** Loading state */
  loading?: boolean
  /** Available departments for filtering */
  departments?: string[]
  /** Callback when a teacher is selected */
  onSelect?: (teacher: TeacherListItem) => void
  /** Callback when edit is clicked */
  onEdit?: (teacher: TeacherListItem) => void
  /** Callback when filters change */
  onFilterChange?: (filters: TeacherFilters) => void
  /** Current filters */
  filters?: TeacherFilters
}

// Helper functions for display labels
const getEmploymentTypeLabel = (type: EmploymentType): string => {
  const labels: Record<EmploymentType, string> = {
    [EmploymentType.FULL_TIME]: 'Full-time',
    [EmploymentType.PART_TIME]: 'Part-time',
    [EmploymentType.CONTRACT]: 'Contract',
    [EmploymentType.VOLUNTEER]: 'Volunteer',
  }
  return labels[type] || type
}

const getJobTitleLabel = (title: TeacherJobTitle): string => {
  const labels: Record<TeacherJobTitle, string> = {
    [TeacherJobTitle.CLASS_TEACHER]: 'Class Teacher',
    [TeacherJobTitle.SUBJECT_TEACHER]: 'Subject Teacher',
    [TeacherJobTitle.HEAD_OF_DEPARTMENT]: 'Head of Dept',
    [TeacherJobTitle.SENIOR_TEACHER]: 'Senior Teacher',
    [TeacherJobTitle.ASSISTANT_TEACHER]: 'Assistant Teacher',
  }
  return labels[title] || title
}


const getStatusLabel = (status: TeacherEmploymentStatus): string => {
  const labels: Record<TeacherEmploymentStatus, string> = {
    [TeacherEmploymentStatus.ACTIVE]: 'Active',
    [TeacherEmploymentStatus.ON_LEAVE]: 'On Leave',
    [TeacherEmploymentStatus.SUSPENDED]: 'Suspended',
    [TeacherEmploymentStatus.LEFT]: 'Left',
  }
  return labels[status] || status
}

const getStatusColor = (status: TeacherEmploymentStatus): string => {
  const colors: Record<TeacherEmploymentStatus, string> = {
    [TeacherEmploymentStatus.ACTIVE]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [TeacherEmploymentStatus.ON_LEAVE]: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    [TeacherEmploymentStatus.SUSPENDED]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [TeacherEmploymentStatus.LEFT]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Default departments if none provided
const DEFAULT_DEPARTMENTS = [
  'Sciences',
  'Languages',
  'Mathematics',
  'Humanities',
  'Arts',
  'Physical Education',
  'Primary',
  'Administration',
]

export function TeacherList({
  teachers,
  loading = false,
  departments = DEFAULT_DEPARTMENTS,
  onSelect,
  onEdit,
  onFilterChange,
  filters = {},
}: TeacherListProps) {
  const [localFilters, setLocalFilters] = React.useState<TeacherFilters>(filters)

  // Update local filters when prop changes
  React.useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  // Handle filter changes
  const handleFilterChange = (key: keyof TeacherFilters, value: string | undefined) => {
    const newFilters = { ...localFilters, [key]: value || undefined }
    setLocalFilters(newFilters)
    onFilterChange?.(newFilters)
  }

  // Handle search
  const handleSearch = (searchTerm: string) => {
    handleFilterChange('searchTerm', searchTerm || undefined)
  }

  // Clear all filters
  const clearFilters = () => {
    const emptyFilters: TeacherFilters = {}
    setLocalFilters(emptyFilters)
    onFilterChange?.(emptyFilters)
  }

  const hasActiveFilters = Object.values(localFilters).some((v) => v !== undefined && v !== '')

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filters</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear all
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <SearchInput
                placeholder="Search by name, email..."
                value={localFilters.searchTerm || ''}
                onChange={handleSearch}
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={localFilters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as TeacherEmploymentStatus)}
              >
                <option value="">All Statuses</option>
                {Object.values(TeacherEmploymentStatus).map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={localFilters.department || ''}
                onChange={(e) => handleFilterChange('department', e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Employment Type Filter */}
            <div>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                value={localFilters.employmentType || ''}
                onChange={(e) => handleFilterChange('employmentType', e.target.value as EmploymentType)}
              >
                <option value="">All Types</option>
                {Object.values(EmploymentType).map((type) => (
                  <option key={type} value={type}>
                    {getEmploymentTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Teacher List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="w-12 h-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                No teachers found
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first teacher'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Type
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Title
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                      Department
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground hidden sm:table-cell">
                      Access
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className={cn(
                        'border-b hover:bg-muted/50 transition-colors',
                        onSelect && 'cursor-pointer'
                      )}
                      onClick={() => onSelect?.(teacher)}
                    >
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">
                            {teacher.firstName} {teacher.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground md:hidden">
                            {teacher.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="text-sm">
                          <div>{teacher.email}</div>
                          <div className="text-muted-foreground">{teacher.phone}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className="text-sm">
                          {getEmploymentTypeLabel(teacher.employmentType)}
                        </span>
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className="text-sm">{getJobTitleLabel(teacher.jobTitle)}</span>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-sm">{teacher.department}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={cn('text-xs', getStatusColor(teacher.employmentStatus))}>
                          {getStatusLabel(teacher.employmentStatus)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        {teacher.hasSystemAccess ? (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                            Has Access
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs">
                            Record Only
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.(teacher)
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {!loading && teachers.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {teachers.length} teacher{teachers.length !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtered)'}
        </div>
      )}
    </div>
  )
}

export default TeacherList
