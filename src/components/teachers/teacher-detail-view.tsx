'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Teacher,
  TeacherDocument,
  TeacherPerformanceMetrics,
  TeacherEmploymentStatus,
  EmploymentType,
  TeacherJobTitle,
  TeacherAccessLevel,
  TeacherDocumentType,
  ExaminationRole,
} from '@/types/teacher'
import { Gender } from '@/types/enums'

/**
 * Teacher Detail View Component
 * Requirements: 6.6, 7.6, 10.4-10.6
 * - Display full teacher profile
 * - Display academic assignments
 * - Display performance metrics (for authorized roles)
 * - Display documents (for authorized roles)
 * - Hide/disable actions for unauthorized roles
 */

export interface TeacherDetailViewProps {
  /** Teacher data */
  teacher: Teacher
  /** Teacher documents (only shown to authorized roles) */
  documents?: TeacherDocument[]
  /** Performance metrics (only shown to authorized roles) */
  performanceMetrics?: TeacherPerformanceMetrics
  /** Available subjects for display */
  subjects?: Array<{ id: string; name: string }>
  /** Available classes for display */
  classes?: Array<{ id: string; name: string }>
  /** Available streams for display */
  streams?: Array<{ id: string; name: string }>
  /** Whether user can view performance data */
  canViewPerformance?: boolean
  /** Whether user can view documents */
  canViewDocuments?: boolean
  /** Whether user can edit teacher */
  canEdit?: boolean
  /** Callback when edit is clicked */
  onEdit?: () => void
  /** Callback when status change is clicked */
  onStatusChange?: () => void
  /** Callback when grant access is clicked */
  onGrantAccess?: () => void
  /** Callback when revoke access is clicked */
  onRevokeAccess?: () => void
  /** Loading state */
  loading?: boolean
}

// Helper functions for display labels
const getGenderLabel = (gender: Gender): string => {
  const labels: Record<Gender, string> = {
    [Gender.MALE]: 'Male',
    [Gender.FEMALE]: 'Female',
  }
  return labels[gender] || gender
}


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
    [TeacherJobTitle.HEAD_OF_DEPARTMENT]: 'Head of Department',
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

const getAccessLevelLabel = (level: TeacherAccessLevel | undefined): string => {
  if (!level || level === TeacherAccessLevel.NONE) return 'No system access'
  const labels: Record<TeacherAccessLevel, string> = {
    [TeacherAccessLevel.NONE]: 'No system access',
    [TeacherAccessLevel.TEACHER]: 'Teacher Access',
    [TeacherAccessLevel.TEACHER_ADMIN]: 'Teacher + Admin Access',
  }
  return labels[level] || level
}

const getDocumentTypeLabel = (type: TeacherDocumentType): string => {
  const labels: Record<TeacherDocumentType, string> = {
    [TeacherDocumentType.APPOINTMENT_LETTER]: 'Appointment Letter',
    [TeacherDocumentType.CERTIFICATE]: 'Certificate',
    [TeacherDocumentType.NATIONAL_ID]: 'National ID',
    [TeacherDocumentType.CONTRACT]: 'Contract',
    [TeacherDocumentType.OTHER]: 'Other',
  }
  return labels[type] || type
}

const getExamRoleLabel = (role: ExaminationRole): string => {
  const labels: Record<ExaminationRole, string> = {
    [ExaminationRole.SETTER]: 'Exam Setter',
    [ExaminationRole.MARKER]: 'Exam Marker',
    [ExaminationRole.MODERATOR]: 'Exam Moderator',
  }
  return labels[role] || role
}

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString()
}

const formatDateTime = (date: Date | string | undefined): string => {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString()
}


export function TeacherDetailView({
  teacher,
  documents = [],
  performanceMetrics,
  subjects = [],
  classes = [],
  streams = [],
  canViewPerformance = false,
  canViewDocuments = false,
  canEdit = false,
  onEdit,
  onStatusChange,
  onGrantAccess,
  onRevokeAccess,
  loading = false,
}: TeacherDetailViewProps) {
  // Get names for IDs
  const getSubjectNames = (ids: string[]): string[] => {
    return ids.map((id) => subjects.find((s) => s.id === id)?.name || id)
  }

  const getClassNames = (ids: string[]): string[] => {
    return ids.map((id) => classes.find((c) => c.id === id)?.name || id)
  }

  const getStreamNames = (ids: string[]): string[] => {
    return ids.map((id) => streams.find((s) => s.id === id)?.name || id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-muted-foreground">
            {getJobTitleLabel(teacher.jobTitle)} • {teacher.department}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={cn('text-sm', getStatusColor(teacher.employmentStatus))}>
            {getStatusLabel(teacher.employmentStatus)}
          </Badge>
          {teacher.hasSystemAccess ? (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-sm">
              Has System Access
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-sm">
              Record Only
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onEdit}>
            Edit Profile
          </Button>
          <Button variant="outline" onClick={onStatusChange}>
            Change Status
          </Button>
          {teacher.hasSystemAccess ? (
            <Button variant="outline" className="text-red-600" onClick={onRevokeAccess}>
              Revoke Access
            </Button>
          ) : (
            <Button variant="outline" onClick={onGrantAccess}>
              Grant Access
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailField label="Full Name" value={`${teacher.firstName} ${teacher.lastName}`} />
            <DetailField label="Gender" value={getGenderLabel(teacher.gender)} />
            <DetailField label="Date of Birth" value={formatDate(teacher.dateOfBirth)} />
            <DetailField label="National ID" value={teacher.nationalId} />
            <DetailField label="Email" value={teacher.email} />
            <DetailField label="Phone" value={teacher.phone} />
            {teacher.address && <DetailField label="Address" value={teacher.address} />}
          </CardContent>
        </Card>

        {/* Employment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailField label="Employment Type" value={getEmploymentTypeLabel(teacher.employmentType)} />
            <DetailField label="Job Title" value={getJobTitleLabel(teacher.jobTitle)} />
            <DetailField label="Department" value={teacher.department} />
            <DetailField label="Date of Appointment" value={formatDate(teacher.dateOfAppointment)} />
            <DetailField label="Status" value={getStatusLabel(teacher.employmentStatus)} />
            <DetailField label="Teacher ID" value={teacher.id} />
          </CardContent>
        </Card>
      </div>


      {/* Academic Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subjects */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Assigned Subjects</h4>
              {teacher.assignedSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getSubjectNames(teacher.assignedSubjects).map((name, i) => (
                    <Badge key={i} variant="secondary">{name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No subjects assigned</p>
              )}
            </div>

            {/* Classes */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Assigned Classes</h4>
              {teacher.assignedClasses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getClassNames(teacher.assignedClasses).map((name, i) => (
                    <Badge key={i} variant="secondary">{name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No classes assigned</p>
              )}
            </div>

            {/* Streams */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Assigned Streams</h4>
              {teacher.assignedStreams.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getStreamNames(teacher.assignedStreams).map((name, i) => (
                    <Badge key={i} variant="secondary">{name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No streams assigned</p>
              )}
            </div>

            {/* Class Teacher For */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Class Teacher For</h4>
              {teacher.classTeacherFor && teacher.classTeacherFor.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getClassNames(teacher.classTeacherFor).map((name, i) => (
                    <Badge key={i} className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not a class teacher</p>
              )}
            </div>

            {/* Examination Roles */}
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Examination Roles</h4>
              {teacher.examinationRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teacher.examinationRoles.map((role, i) => (
                    <Badge key={i} className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                      {getExamRoleLabel(role.role)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No examination roles assigned</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Access & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Access & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <DetailField
              label="Access Level"
              value={getAccessLevelLabel(teacher.accessLevel)}
            />

            {teacher.hasSystemAccess && teacher.permissions && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Permissions</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <PermissionIndicator label="Attendance" enabled={teacher.permissions.canTakeAttendance} />
                    <PermissionIndicator label="Marks" enabled={teacher.permissions.canEnterMarks} />
                    <PermissionIndicator label="Reports" enabled={teacher.permissions.canViewReports} />
                    <PermissionIndicator label="Messages" enabled={teacher.permissions.canSendMessages} />
                  </div>
                </div>

                {teacher.channelConfig && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Communication Channels</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <PermissionIndicator label="In-App" enabled={teacher.channelConfig.inAppMessaging} />
                      <PermissionIndicator label="Email" enabled={teacher.channelConfig.email} />
                      <PermissionIndicator label="SMS" enabled={teacher.channelConfig.sms} />
                      <PermissionIndicator label="WhatsApp" enabled={teacher.channelConfig.whatsapp} />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Performance Metrics (Requirement 6.6 - only for authorized roles) */}
      {canViewPerformance && performanceMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Attendance Submissions */}
              <MetricCard
                title="Attendance Submissions"
                value={`${performanceMetrics.attendanceSubmissions.totalSubmitted}/${performanceMetrics.attendanceSubmissions.totalExpected}`}
                subtitle={`${performanceMetrics.attendanceSubmissions.onTimeSubmissions} on time`}
              />

              {/* Mark Entries */}
              <MetricCard
                title="Mark Entries"
                value={`${performanceMetrics.markEntries.totalEntered}/${performanceMetrics.markEntries.totalExpected}`}
                subtitle={`${performanceMetrics.markEntries.onTimeEntries} on time`}
              />

              {/* Missed Classes */}
              <MetricCard
                title="Missed Classes"
                value={performanceMetrics.missedClasses.count.toString()}
                subtitle="this period"
                warning={performanceMetrics.missedClasses.count > 3}
              />

              {/* Login Activity */}
              <MetricCard
                title="Total Logins"
                value={performanceMetrics.loginActivity.totalLogins.toString()}
                subtitle={`Last: ${formatDateTime(performanceMetrics.loginActivity.lastLogin)}`}
              />

              {/* Messages Sent */}
              <MetricCard
                title="Messages Sent"
                value={performanceMetrics.messageLogs.totalSent.toString()}
                subtitle={`Last: ${formatDateTime(performanceMetrics.messageLogs.lastMessageAt)}`}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents (Requirement 7.6 - only for authorized roles) */}
      {canViewDocuments && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {getDocumentTypeLabel(doc.documentType)} • Uploaded {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                No documents uploaded
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <DetailField label="Created" value={formatDateTime(teacher.createdAt)} />
          <DetailField label="Last Updated" value={formatDateTime(teacher.updatedAt)} />
          <DetailField label="Created By" value={teacher.createdBy} />
        </CardContent>
      </Card>
    </div>
  )
}


// Helper Components
interface DetailFieldProps {
  label: string
  value: string
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
      <span className="text-sm text-muted-foreground min-w-[140px]">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

interface PermissionIndicatorProps {
  label: string
  enabled: boolean
}

function PermissionIndicator({ label, enabled }: PermissionIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm',
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

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  warning?: boolean
}

function MetricCard({ title, value, subtitle, warning }: MetricCardProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        warning ? 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950' : ''
      )}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={cn('text-2xl font-bold', warning && 'text-amber-600 dark:text-amber-400')}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

export default TeacherDetailView
