'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckboxField, SelectField } from '@/components/ui/form-field'
import {
  TeacherAccessData,
  TeacherAccessLevel,
  TeacherPermissions,
  ChannelConfig,
  DEFAULT_TEACHER_PERMISSIONS,
  DEFAULT_CHANNEL_CONFIG,
} from '@/types/teacher'

/**
 * Teacher Access Step Component
 * Requirements: 4.1-4.7, 5.1-5.2
 * - Implements system access toggle (record-only vs access)
 * - Implements access level selector (TEACHER, TEACHER_ADMIN)
 * - Implements permission checkboxes (attendance, marks, reports, messages)
 * - Implements channel configuration toggles
 */

export interface TeacherAccessStepProps {
  /** Current access data */
  data: Partial<TeacherAccessData>
  /** Change handler */
  onChange: (data: Partial<TeacherAccessData>) => void
}

const ACCESS_LEVEL_OPTIONS = [
  {
    value: TeacherAccessLevel.TEACHER,
    label: 'Teacher Access',
    description: 'Standard teacher access with configurable permissions',
  },
  {
    value: TeacherAccessLevel.TEACHER_ADMIN,
    label: 'Teacher + Admin Access',
    description: 'Teacher access plus limited administrative capabilities (rare)',
  },
]

export function TeacherAccessStep({ data, onChange }: TeacherAccessStepProps) {
  const grantSystemAccess = data.grantSystemAccess ?? true // Default to true to prevent profile linking issues
  const accessLevel = data.accessLevel ?? TeacherAccessLevel.TEACHER
  const permissions = data.permissions ?? DEFAULT_TEACHER_PERMISSIONS
  const channelConfig = data.channelConfig ?? DEFAULT_CHANNEL_CONFIG

  // Initialize with system access enabled by default on first render
  React.useEffect(() => {
    if (data.grantSystemAccess === undefined) {
      onChange({
        grantSystemAccess: true,
        accessLevel: TeacherAccessLevel.TEACHER,
        permissions: DEFAULT_TEACHER_PERMISSIONS,
        channelConfig: DEFAULT_CHANNEL_CONFIG,
      })
    }
  }, [data.grantSystemAccess, onChange])

  // Handle system access toggle
  const handleAccessToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    onChange({
      grantSystemAccess: checked,
      accessLevel: checked ? TeacherAccessLevel.TEACHER : TeacherAccessLevel.NONE,
      permissions: checked ? DEFAULT_TEACHER_PERMISSIONS : undefined,
      channelConfig: checked ? DEFAULT_CHANNEL_CONFIG : undefined,
    })
  }

  // Handle access level change
  const handleAccessLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ accessLevel: e.target.value as TeacherAccessLevel })
  }

  // Handle permission toggle
  const handlePermissionToggle = (
    permission: keyof TeacherPermissions,
    checked: boolean
  ) => {
    onChange({
      permissions: {
        ...permissions,
        [permission]: checked,
      },
    })
  }

  // Handle channel toggle
  const handleChannelToggle = (channel: keyof ChannelConfig, checked: boolean) => {
    onChange({
      channelConfig: {
        ...channelConfig,
        [channel]: checked,
      },
    })
  }

  return (
    <div className="space-y-8">
      {/* System Access Toggle */}
      <div className="p-6 border rounded-lg border-[var(--info-light)] dark:border-[var(--info-dark)] bg-[var(--info-light)] dark:bg-[var(--info-dark)]">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium">System Access (Recommended)</h3>
            <p className="text-sm text-muted-foreground mt-1">
              <strong>Recommended:</strong> Create a user account linked to this teacher profile to prevent login issues.
              This ensures teachers can access their classes, students, and teaching materials immediately.
            </p>
            <div className="mt-3 p-3 bg-[var(--success-light)] dark:bg-[var(--success-dark)] border border-[var(--success-light)] dark:border-[var(--success-dark)] rounded-lg">
              <p className="text-sm text-[var(--success-dark)] dark:text-[var(--success)]">
                <strong>✅ Prevents Profile Linking Issues:</strong> Creating teachers with system access from the start 
                eliminates the "No teacher profile linked to this account" errors that occur when teachers try to log in.
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={grantSystemAccess}
              onChange={handleAccessToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[var(--bg-surface)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--info)] dark:peer-focus:ring-[var(--info-dark)] rounded-full peer dark:bg-[var(--border-strong)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg-main)] after:border-[var(--border-default)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-[var(--border-strong)] peer-checked:bg-[var(--chart-blue)]"></div>
          </label>
        </div>

        {!grantSystemAccess && (
          <div className="mt-4 p-4 bg-[var(--warning-light)] dark:bg-[var(--warning-dark)] border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-[var(--warning-dark)] dark:text-[var(--warning)]">
              <strong>⚠️ Record-Only Mode:</strong> This teacher will be created as an institutional
              record only. They will not be able to log in to the system and you may encounter 
              "No teacher profile linked to this account" errors later. You can grant system
              access later, but it's easier to do it now.
            </p>
          </div>
        )}
      </div>

      {/* Access Level & Permissions (only shown when access is granted) */}
      {grantSystemAccess && (
        <>
          {/* Access Level */}
          <div>
            <h3 className="text-lg font-medium mb-2">Access Level</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Select the level of system access for this teacher.
            </p>
            <div className="space-y-3">
              {ACCESS_LEVEL_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors',
                    accessLevel === option.value
                      ? 'border-[var(--accent-primary)] bg-[var(--info-light)] dark:bg-[var(--info-dark)]'
                      : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:border-[var(--border-default)]'
                  )}
                >
                  <input
                    type="radio"
                    name="accessLevel"
                    value={option.value}
                    checked={accessLevel === option.value}
                    onChange={handleAccessLevelChange}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">{option.label}</span>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-medium mb-2">Permissions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure what actions this teacher can perform in the system.
              Note: Teachers never get full administrative access.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <CheckboxField
                  label="Take Attendance"
                  name="canTakeAttendance"
                  checked={permissions.canTakeAttendance}
                  onChange={(e) =>
                    handlePermissionToggle('canTakeAttendance', e.target.checked)
                  }
                  helpText="Mark student attendance for assigned classes"
                />
              </div>
              <div className="p-4 border rounded-lg">
                <CheckboxField
                  label="Enter Marks"
                  name="canEnterMarks"
                  checked={permissions.canEnterMarks}
                  onChange={(e) =>
                    handlePermissionToggle('canEnterMarks', e.target.checked)
                  }
                  helpText="Enter student marks for assigned subjects"
                />
              </div>
              <div className="p-4 border rounded-lg">
                <CheckboxField
                  label="View Reports"
                  name="canViewReports"
                  checked={permissions.canViewReports}
                  onChange={(e) =>
                    handlePermissionToggle('canViewReports', e.target.checked)
                  }
                  helpText="View academic reports for assigned classes"
                />
              </div>
              <div className="p-4 border rounded-lg">
                <CheckboxField
                  label="Send Messages"
                  name="canSendMessages"
                  checked={permissions.canSendMessages}
                  onChange={(e) =>
                    handlePermissionToggle('canSendMessages', e.target.checked)
                  }
                  helpText="Send messages to students and parents"
                />
              </div>
            </div>
          </div>

          {/* Communication Channels */}
          <div>
            <h3 className="text-lg font-medium mb-2">Communication Channels</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure which communication channels this teacher can use.
              Only SMS is available to control costs and ensure universal accessibility.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div className="p-4 border rounded-lg">
                <CheckboxField
                  label="In-App Messaging"
                  name="inAppMessaging"
                  checked={channelConfig.inAppMessaging}
                  onChange={(e) =>
                    handleChannelToggle('inAppMessaging', e.target.checked)
                  }
                  helpText="Send messages within the application"
                />
              </div>
              <div className="p-4 border rounded-lg border-[var(--info-light)] dark:border-[var(--info-dark)] bg-[var(--info-light)] dark:bg-[var(--info-dark)]">
                <CheckboxField
                  label="SMS"
                  name="sms"
                  checked={channelConfig.sms}
                  onChange={(e) => handleChannelToggle('sms', e.target.checked)}
                  helpText="Send SMS messages (UGX 45 per message)"
                />
              </div>
              
              <div className="p-4 border rounded-lg border-[var(--border-default)] dark:border-[var(--border-strong)] bg-[var(--bg-surface)] dark:bg-[var(--text-primary)]">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-[var(--text-primary)] dark:text-[var(--text-muted)]">Email & WhatsApp (Disabled)</h4>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    Email and WhatsApp have been removed to keep costs low and ensure universal accessibility.
                    Email is reserved for system functions only (password resets, registration).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="p-4 bg-[var(--info-light)] dark:bg-[var(--info-dark)] border border-[var(--info-light)] dark:border-[var(--info-dark)] rounded-lg">
            <h4 className="font-medium text-[var(--info-dark)] dark:text-[var(--info)] mb-2">
              User Account Creation Process
            </h4>
            <ul className="text-sm text-[var(--accent-hover)] dark:text-[var(--info)] space-y-1 list-disc list-inside">
              <li>
                A user account will be automatically created and linked to this teacher profile
              </li>
              <li>
                A temporary password will be generated and sent to the teacher&apos;s email
              </li>
              <li>The teacher will be required to change their password on first login</li>
              <li>
                This prevents "No teacher profile linked to this account" errors
              </li>
              <li>
                Teachers can only message students and parents in their assigned classes
              </li>
              <li>Teachers cannot send bulk messages, fee-related messages, or announcements</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

export default TeacherAccessStep
