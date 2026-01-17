'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TeacherFormState,
  TeacherFormStep,
  EmploymentType,
  TeacherJobTitle,
  TeacherAccessLevel,
  ExaminationRole,
} from '@/types/teacher'
import { Gender } from '@/types/enums'

/**
 * Teacher Review Step Component
 * Requirements: 9.2, 9.3, 9.4
 * - Display summary of all entered data
 * - Supports "Save draft", "Create teacher", "Create & send login invite" buttons
 *   (buttons are rendered in parent TeacherFormSteps component)
 */

export interface TeacherReviewStepProps {
  /** Complete form state */
  formState: TeacherFormState
  /** Available subjects for display */
  subjects: Array<{ id: string; name: string }>
  /** Available classes for display */
  classes: Array<{ id: string; name: string }>
  /** Available streams for display */
  streams: Array<{ id: string; name: string; classId: string }>
  /** Mode: create or edit */
  mode: 'create' | 'edit'
}

// Helper functions for display labels
const getGenderLabel = (gender: Gender | undefined): string => {
  if (!gender) return 'Not specified'
  const labels: Record<Gender, string> = {
    [Gender.MALE]: 'Male',
    [Gender.FEMALE]: 'Female',
  }
  return labels[gender] || gender
}

const getEmploymentTypeLabel = (type: EmploymentType | undefined): string => {
  if (!type) return 'Not specified'
  const labels: Record<EmploymentType, string> = {
    [EmploymentType.FULL_TIME]: 'Full-time',
    [EmploymentType.PART_TIME]: 'Part-time',
    [EmploymentType.CONTRACT]: 'Contract',
    [EmploymentType.VOLUNTEER]: 'Volunteer',
  }
  return labels[type] || type
}


const getJobTitleLabel = (title: TeacherJobTitle | undefined): string => {
  if (!title) return 'Not specified'
  const labels: Record<TeacherJobTitle, string> = {
    [TeacherJobTitle.CLASS_TEACHER]: 'Class Teacher',
    [TeacherJobTitle.SUBJECT_TEACHER]: 'Subject Teacher',
    [TeacherJobTitle.HEAD_OF_DEPARTMENT]: 'Head of Department',
    [TeacherJobTitle.SENIOR_TEACHER]: 'Senior Teacher',
    [TeacherJobTitle.ASSISTANT_TEACHER]: 'Assistant Teacher',
  }
  return labels[title] || title
}

const getAccessLevelLabel = (level: TeacherAccessLevel | undefined): string => {
  if (!level || level === TeacherAccessLevel.NONE) return 'No system access (record-only)'
  const labels: Record<TeacherAccessLevel, string> = {
    [TeacherAccessLevel.NONE]: 'No system access (record-only)',
    [TeacherAccessLevel.TEACHER]: 'Teacher Access',
    [TeacherAccessLevel.TEACHER_ADMIN]: 'Teacher + Admin Access',
  }
  return labels[level] || level
}

const getExamRoleLabel = (role: ExaminationRole): string => {
  const labels: Record<ExaminationRole, string> = {
    [ExaminationRole.SETTER]: 'Exam Setter',
    [ExaminationRole.MARKER]: 'Exam Marker',
    [ExaminationRole.MODERATOR]: 'Exam Moderator',
  }
  return labels[role] || role
}

const formatDate = (date: Date | undefined): string => {
  if (!date) return 'Not specified'
  if (typeof date === 'string') {
    return new Date(date).toLocaleDateString()
  }
  return date.toLocaleDateString()
}

interface ReviewSectionProps {
  title: string
  children: React.ReactNode
  step: TeacherFormStep
  hasErrors?: boolean
}

function ReviewSection({ title, children, hasErrors }: ReviewSectionProps) {
  return (
    <Card className={cn(hasErrors && 'border-red-300 dark:border-red-700')}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {title}
          {hasErrors && (
            <span className="text-xs text-red-600 dark:text-red-400 font-normal">
              (incomplete)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface ReviewFieldProps {
  label: string
  value: string | React.ReactNode
  required?: boolean
  missing?: boolean
}

function ReviewField({ label, value, required, missing }: ReviewFieldProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 py-1">
      <span className="text-sm text-muted-foreground min-w-[140px]">
        {label}
        {required && <span className="text-red-500">*</span>}:
      </span>
      <span className={cn('text-sm font-medium', missing && 'text-red-600 dark:text-red-400 italic')}>
        {value || (missing ? 'Required' : 'Not specified')}
      </span>
    </div>
  )
}


export function TeacherReviewStep({
  formState,
  subjects,
  classes,
  streams,
  mode,
}: TeacherReviewStepProps) {
  const { identity, employment, academicRoles, accessPermissions } = formState.data

  // Get names for IDs
  const getSubjectNames = (ids: string[]): string => {
    if (!ids || ids.length === 0) return 'None assigned'
    return ids
      .map((id) => subjects.find((s) => s.id === id)?.name || id)
      .join(', ')
  }

  const getClassNames = (ids: string[]): string => {
    if (!ids || ids.length === 0) return 'None assigned'
    return ids
      .map((id) => classes.find((c) => c.id === id)?.name || id)
      .join(', ')
  }

  const getStreamNames = (ids: string[]): string => {
    if (!ids || ids.length === 0) return 'None assigned'
    return ids
      .map((id) => streams.find((s) => s.id === id)?.name || id)
      .join(', ')
  }

  // Check for missing required fields
  const identityMissing = {
    firstName: !identity.firstName?.trim(),
    lastName: !identity.lastName?.trim(),
    gender: !identity.gender,
    nationalId: !identity.nationalId?.trim(),
    phone: !identity.phone?.trim(),
    email: !identity.email?.trim(),
    dateOfBirth: !identity.dateOfBirth,
  }

  const employmentMissing = {
    employmentType: !employment.employmentType,
    jobTitle: !employment.jobTitle,
    department: !employment.department?.trim(),
    dateOfAppointment: !employment.dateOfAppointment,
  }

  const hasIdentityErrors = Object.values(identityMissing).some(Boolean)
  const hasEmploymentErrors = Object.values(employmentMissing).some(Boolean)

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
          {mode === 'create' ? 'Review Teacher Information' : 'Review Changes'}
        </h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Please review all the information below before {mode === 'create' ? 'creating' : 'updating'} the teacher record.
          {(hasIdentityErrors || hasEmploymentErrors) && (
            <span className="block mt-1 text-red-600 dark:text-red-400">
              Some required fields are missing. Please go back and complete them.
            </span>
          )}
        </p>
      </div>

      {/* Identity Section */}
      <ReviewSection
        title="Personal Information"
        step={TeacherFormStep.IDENTITY}
        hasErrors={hasIdentityErrors}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ReviewField
            label="First Name"
            value={identity.firstName}
            required
            missing={identityMissing.firstName}
          />
          <ReviewField
            label="Last Name"
            value={identity.lastName}
            required
            missing={identityMissing.lastName}
          />
          <ReviewField
            label="Gender"
            value={getGenderLabel(identity.gender)}
            required
            missing={identityMissing.gender}
          />
          <ReviewField
            label="Date of Birth"
            value={formatDate(identity.dateOfBirth)}
            required
            missing={identityMissing.dateOfBirth}
          />
          <ReviewField
            label="National ID"
            value={identity.nationalId}
            required
            missing={identityMissing.nationalId}
          />
          <ReviewField
            label="Phone"
            value={identity.phone}
            required
            missing={identityMissing.phone}
          />
          <ReviewField
            label="Email"
            value={identity.email}
            required
            missing={identityMissing.email}
          />
          <ReviewField label="Address" value={identity.address} />
        </div>
      </ReviewSection>


      {/* Employment Section */}
      <ReviewSection
        title="Employment Details"
        step={TeacherFormStep.EMPLOYMENT}
        hasErrors={hasEmploymentErrors}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ReviewField
            label="Employment Type"
            value={getEmploymentTypeLabel(employment.employmentType)}
            required
            missing={employmentMissing.employmentType}
          />
          <ReviewField
            label="Job Title"
            value={getJobTitleLabel(employment.jobTitle)}
            required
            missing={employmentMissing.jobTitle}
          />
          <ReviewField
            label="Department"
            value={employment.department}
            required
            missing={employmentMissing.department}
          />
          <ReviewField
            label="Date of Appointment"
            value={formatDate(employment.dateOfAppointment)}
            required
            missing={employmentMissing.dateOfAppointment}
          />
        </div>
      </ReviewSection>

      {/* Academic Roles Section */}
      <ReviewSection title="Academic Assignments" step={TeacherFormStep.ACADEMIC_ROLES}>
        <div className="space-y-3">
          <ReviewField
            label="Subjects"
            value={getSubjectNames(academicRoles.assignedSubjects || [])}
          />
          <ReviewField
            label="Classes"
            value={getClassNames(academicRoles.assignedClasses || [])}
          />
          <ReviewField
            label="Streams"
            value={getStreamNames(academicRoles.assignedStreams || [])}
          />
          <ReviewField
            label="Class Teacher For"
            value={getClassNames(academicRoles.classTeacherFor || [])}
          />
          <ReviewField
            label="Examination Roles"
            value={
              academicRoles.examinationRoles && academicRoles.examinationRoles.length > 0
                ? academicRoles.examinationRoles.map((r) => getExamRoleLabel(r.role)).join(', ')
                : 'None assigned'
            }
          />
        </div>
      </ReviewSection>

      {/* Access & Permissions Section */}
      <ReviewSection title="System Access & Permissions" step={TeacherFormStep.ACCESS_PERMISSIONS}>
        <div className="space-y-4">
          <ReviewField
            label="System Access"
            value={
              accessPermissions.grantSystemAccess ? (
                <span className="text-green-600 dark:text-green-400">Enabled</span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  Record-only (no login)
                </span>
              )
            }
          />

          {accessPermissions.grantSystemAccess && (
            <>
              <ReviewField
                label="Access Level"
                value={getAccessLevelLabel(accessPermissions.accessLevel)}
              />

              {/* Permissions */}
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground">Permissions:</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <PermissionBadge
                    label="Take Attendance"
                    enabled={accessPermissions.permissions?.canTakeAttendance ?? false}
                  />
                  <PermissionBadge
                    label="Enter Marks"
                    enabled={accessPermissions.permissions?.canEnterMarks ?? false}
                  />
                  <PermissionBadge
                    label="View Reports"
                    enabled={accessPermissions.permissions?.canViewReports ?? false}
                  />
                  <PermissionBadge
                    label="Send Messages"
                    enabled={accessPermissions.permissions?.canSendMessages ?? false}
                  />
                </div>
              </div>

              {/* Communication Channels */}
              <div className="pt-2 border-t">
                <span className="text-sm text-muted-foreground">Communication Channels:</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ChannelBadge
                    label="In-App"
                    enabled={accessPermissions.channelConfig?.inAppMessaging ?? false}
                  />
                  <ChannelBadge
                    label="Email"
                    enabled={accessPermissions.channelConfig?.email ?? false}
                  />
                  <ChannelBadge
                    label="SMS"
                    enabled={accessPermissions.channelConfig?.sms ?? false}
                    warning={accessPermissions.channelConfig?.sms}
                  />
                  <ChannelBadge
                    label="WhatsApp"
                    enabled={accessPermissions.channelConfig?.whatsapp ?? false}
                    warning={accessPermissions.channelConfig?.whatsapp}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </ReviewSection>


      {/* Action Summary */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-medium mb-3">What happens next?</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          {accessPermissions.grantSystemAccess ? (
            <>
              <p>
                <strong>Create Teacher:</strong> Creates the teacher record without sending login
                credentials. You can send the invite later.
              </p>
              <p>
                <strong>Create & Send Login Invite:</strong> Creates the teacher record and
                immediately sends login credentials to {identity.email || 'their email'}.
              </p>
            </>
          ) : (
            <p>
              <strong>Create Teacher:</strong> Creates the teacher as a record-only entry. They
              will not be able to log in until you grant system access.
            </p>
          )}
          <p>
            <strong>Save Draft:</strong> Saves the current information as a draft. You can
            continue later.
          </p>
        </div>
      </div>
    </div>
  )
}

interface PermissionBadgeProps {
  label: string
  enabled: boolean
}

function PermissionBadge({ label, enabled }: PermissionBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
        enabled
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      )}
    >
      {enabled ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {label}
    </div>
  )
}

interface ChannelBadgeProps {
  label: string
  enabled: boolean
  warning?: boolean
}

function ChannelBadge({ label, enabled, warning }: ChannelBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm',
        enabled && warning
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
          : enabled
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
      )}
    >
      {enabled ? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {label}
      {enabled && warning && (
        <span className="text-xs">(costs apply)</span>
      )}
    </div>
  )
}

export default TeacherReviewStep
