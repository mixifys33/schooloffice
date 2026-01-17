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
  const grantSystemAccess = data.grantSystemAccess ?? false
  const accessLevel = data.accessLevel ?? TeacherAccessLevel.TEACHER
  const permissions = data.permissions ?? DEFAULT_TEACHER_PERMISSIONS
  const channelConfig = data.channelConfig ?? DEFAULT_CHANNEL_CONFIG

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
      <div className="p-6 border rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium">System Access</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Teachers can exist as records without system access (record-only mode).
              Enable this to allow the teacher to log in and use the system.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={grantSystemAccess}
              onChange={handleAccessToggle}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {!grantSystemAccess && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Record-Only Mode:</strong> This teacher will be created as an institutional
              record only. They will not be able to log in to the system. You can grant system
              access later.
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
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
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
              SMS and WhatsApp are disabled by default to control costs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="p-4 border rounded-lg">
                <CheckboxField
                  label="Email"
                  name="email"
                  checked={channelConfig.email}
                  onChange={(e) => handleChannelToggle('email', e.target.checked)}
                  helpText="Send email notifications"
                />
              </div>
              <div className="p-4 border rounded-lg border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                <CheckboxField
                  label="SMS"
                  name="sms"
                  checked={channelConfig.sms}
                  onChange={(e) => handleChannelToggle('sms', e.target.checked)}
                  helpText="Send SMS messages (costs apply)"
                />
              </div>
              <div className="p-4 border rounded-lg border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
                <CheckboxField
                  label="WhatsApp"
                  name="whatsapp"
                  checked={channelConfig.whatsapp}
                  onChange={(e) => handleChannelToggle('whatsapp', e.target.checked)}
                  helpText="Send WhatsApp messages (costs apply)"
                />
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Important Notes
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>
                A temporary password will be generated and sent to the teacher&apos;s email
              </li>
              <li>The teacher will be required to change their password on first login</li>
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
