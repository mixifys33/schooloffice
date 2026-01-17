'use client'

import * as React from 'react'
import { FormField, SelectField } from '@/components/ui/form-field'
import { TeacherEmploymentData, EmploymentType, TeacherJobTitle } from '@/types/teacher'

/**
 * Teacher Employment Step Component
 * Requirements: 2.1-2.4
 * - Implements employment fields: employmentType, jobTitle, department, dateOfAppointment
 * - Adds validation for required fields
 */

export interface TeacherEmploymentStepProps {
  /** Current employment data */
  data: Partial<TeacherEmploymentData>
  /** Validation errors */
  errors: Record<string, string[]>
  /** Available departments */
  departments: string[]
  /** Change handler */
  onChange: (data: Partial<TeacherEmploymentData>) => void
}

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: EmploymentType.FULL_TIME, label: 'Full-time' },
  { value: EmploymentType.PART_TIME, label: 'Part-time' },
  { value: EmploymentType.CONTRACT, label: 'Contract' },
  { value: EmploymentType.VOLUNTEER, label: 'Volunteer' },
]

const JOB_TITLE_OPTIONS = [
  { value: TeacherJobTitle.CLASS_TEACHER, label: 'Class Teacher' },
  { value: TeacherJobTitle.SUBJECT_TEACHER, label: 'Subject Teacher' },
  { value: TeacherJobTitle.HEAD_OF_DEPARTMENT, label: 'Head of Department' },
  { value: TeacherJobTitle.SENIOR_TEACHER, label: 'Senior Teacher' },
  { value: TeacherJobTitle.ASSISTANT_TEACHER, label: 'Assistant Teacher' },
]

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

export function TeacherEmploymentStep({
  data,
  errors,
  departments,
  onChange,
}: TeacherEmploymentStepProps) {
  const availableDepartments = departments.length > 0 ? departments : DEFAULT_DEPARTMENTS
  const departmentOptions = availableDepartments.map((dept) => ({
    value: dept,
    label: dept,
  }))

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    if (name === 'dateOfAppointment') {
      onChange({ [name]: value ? new Date(value) : undefined })
    } else {
      onChange({ [name]: value })
    }
  }

  // Format date for input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return ''
    if (typeof date === 'string') return date
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="space-y-6">
      {/* Employment Type */}
      <SelectField
        label="Employment Type"
        name="employmentType"
        options={EMPLOYMENT_TYPE_OPTIONS}
        placeholder="Select employment type"
        value={data.employmentType || ''}
        onChange={handleInputChange}
        error={errors.employmentType?.[0]}
        helpText="The type of employment contract for this teacher"
        required
      />

      {/* Job Title */}
      <SelectField
        label="Job Title"
        name="jobTitle"
        options={JOB_TITLE_OPTIONS}
        placeholder="Select job title"
        value={data.jobTitle || ''}
        onChange={handleInputChange}
        error={errors.jobTitle?.[0]}
        helpText="The primary role of this teacher"
        required
      />

      {/* Department */}
      <SelectField
        label="Department"
        name="department"
        options={departmentOptions}
        placeholder="Select department"
        value={data.department || ''}
        onChange={handleInputChange}
        error={errors.department?.[0]}
        helpText="The department this teacher belongs to"
        required
      />

      {/* Date of Appointment */}
      <FormField
        label="Date of Appointment"
        name="dateOfAppointment"
        type="date"
        value={formatDateForInput(data.dateOfAppointment)}
        onChange={handleInputChange}
        error={errors.dateOfAppointment?.[0]}
        helpText="The date when this teacher was appointed"
        required
      />
    </div>
  )
}

export default TeacherEmploymentStep
