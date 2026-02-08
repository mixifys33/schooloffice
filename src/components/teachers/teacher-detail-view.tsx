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
  /** Loading states for individual buttons */
  editLoading?: boolean
  statusLoading?: boolean
  accessLoading?: boolean
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
    [TeacherEmploymentStatus.ACTIVE]: 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)] dark:text-[var(--success)]',
    [TeacherEmploymentStatus.ON_LEAVE]: 'bg-[var(--warning-light)] text-[var(--warning-dark)] dark:bg-[var(--warning-dark)] dark:text-[var(--warning)]',
    [TeacherEmploymentStatus.SUSPENDED]: 'bg-[var(--danger-light)] text-[var(--danger-dark)] dark:bg-[var(--danger-dark)] dark:text-[var(--danger)]',
    [TeacherEmploymentStatus.LEFT]: 'bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-[var(--border-default)] dark:text-[var(--text-secondary)]',
  }
  return colors[status] || 'bg-[var(--bg-surface)] text-[var(--text-primary)]'
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
  editLoading = false,
  statusLoading = false,
  accessLoading = false,
}: TeacherDetailViewProps) {
  // Get names for IDs
  const getSubjectNames = (ids: string[]): string[] => {
    return ids.map((id) => {
      const subject = subjects.find((s) => s.id === id)
      return typeof subject?.name === 'string' ? subject.name : id
    })
  }

  const getClassNames = (ids: string[]): string[] => {
    return ids.map((id) => {
      const cls = classes.find((c) => c.id === id)
      return typeof cls?.name === 'string' ? cls.name : id
    })
  }

  const getStreamNames = (ids: string[]): string[] => {
    return ids.map((id) => {
      const stream = streams.find((s) => s.id === id)
      return typeof stream?.name === 'string' ? stream.name : id
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]"></div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header with Actions */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">
              {teacher.firstName} {teacher.lastName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {getJobTitleLabel(teacher.jobTitle)} • {teacher.department}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Badge className={cn('text-sm', getStatusColor(teacher.employmentStatus))}>
              {getStatusLabel(teacher.employmentStatus)}
            </Badge>
            {teacher.hasSystemAccess ? (
              <Badge className="bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)] dark:text-[var(--info)] text-sm">
                Has System Access
              </Badge>
            ) : (
              <Badge className="bg-[var(--bg-surface)] text-[var(--text-secondary)] dark:bg-[var(--border-default)] dark:text-[var(--text-muted)] text-sm">
                Record Only
              </Badge>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={onEdit}
              disabled={editLoading}
            >
              {editLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Loading...
                </>
              ) : (
                'Edit Profile'
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={onStatusChange}
              disabled={statusLoading}
            >
              {statusLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Updating...
                </>
              ) : (
                'Change Status'
              )}
            </Button>
            {teacher.hasSystemAccess ? (
              <Button 
                variant="outline" 
                className="text-[var(--chart-red)]" 
                onClick={onRevokeAccess}
                disabled={accessLoading}
              >
                {accessLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Revoking...
                  </>
                ) : (
                  'Revoke Access'
                )}
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={onGrantAccess}
                disabled={accessLoading}
              >
                {accessLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Granting...
                  </>
                ) : (
                  'Grant Access'
                )}
              </Button>
            )}
          </div>
        )}
      </div>

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
          <div className="space-y-6">
            {/* Subjects */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Assigned Subjects</h4>
              {teacher.assignedSubjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getSubjectNames(teacher.assignedSubjects).map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  No subjects assigned yet
                </p>
              )}
            </div>

            {/* Classes */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Assigned Classes</h4>
              {teacher.assignedClasses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getClassNames(teacher.assignedClasses).map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  No classes assigned yet
                </p>
              )}
            </div>

            {/* Streams */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Assigned Streams</h4>
              {teacher.assignedStreams.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getStreamNames(teacher.assignedStreams).map((name, i) => (
                    <Badge key={i} variant="secondary" className="text-sm px-3 py-1">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  No streams assigned yet
                </p>
              )}
            </div>

            {/* Class Teacher For */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Class Teacher For</h4>
              {teacher.classTeacherFor && teacher.classTeacherFor.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {getClassNames(teacher.classTeacherFor).map((name, i) => (
                    <Badge key={i} className="bg-[var(--info-light)] text-[var(--info-dark)] dark:bg-[var(--info-dark)] dark:text-[var(--info)] text-sm px-3 py-1">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  Not assigned as a class teacher
                </p>
              )}
            </div>

            {/* Examination Roles */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Examination Roles</h4>
              {teacher.examinationRoles.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teacher.examinationRoles.map((role, i) => (
                    <Badge key={i} className="bg-indigo-100 text-[var(--info-dark)] dark:bg-indigo-900 dark:text-[var(--info)] text-sm px-3 py-1">
                      {getExamRoleLabel(role.role)}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                  No examination roles assigned
                </p>
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
                      <div className="w-10 h-10 bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded flex items-center justify-center">
                        <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="flex flex-col space-y-1">
      <span className="text-sm text-muted-foreground font-medium">{label}:</span>
      <span className="text-sm break-words">{value}</span>
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
          ? 'bg-[var(--success-light)] text-[var(--success-dark)] dark:bg-[var(--success-dark)] dark:text-[var(--success)]'
          : 'bg-[var(--bg-surface)] text-[var(--text-muted)] dark:bg-[var(--border-default)] dark:text-[var(--text-muted)]'
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
        warning ? 'border-amber-200 bg-[var(--warning-light)] dark:border-amber-800 dark:bg-[var(--warning-dark)]' : ''
      )}
    >
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className={cn('text-2xl font-bold', warning && 'text-[var(--chart-yellow)] dark:text-[var(--warning)]')}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}

export default TeacherDetailView
