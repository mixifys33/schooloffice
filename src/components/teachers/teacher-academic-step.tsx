'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { CheckboxField, SelectField } from '@/components/ui/form-field'
import { TeacherAcademicData, ExaminationRole, ExaminationRoleAssignment } from '@/types/teacher'

/**
 * Teacher Academic Step Component
 * Requirements: 3.1-3.5
 * - Implements subject, class, stream assignment selectors
 * - Implements class teacher designation toggle
 * - Implements examination role assignment
 */

export interface TeacherAcademicStepProps {
  /** Current academic data */
  data: Partial<TeacherAcademicData>
  /** Available subjects */
  subjects: Array<{ id: string; name: string }>
  /** Available classes */
  classes: Array<{ id: string; name: string }>
  /** Available streams */
  streams: Array<{ id: string; name: string; classId: string }>
  /** Change handler */
  onChange: (data: Partial<TeacherAcademicData>) => void
}

const EXAMINATION_ROLE_OPTIONS = [
  { value: ExaminationRole.SETTER, label: 'Exam Setter' },
  { value: ExaminationRole.MARKER, label: 'Exam Marker' },
  { value: ExaminationRole.MODERATOR, label: 'Exam Moderator' },
]

export function TeacherAcademicStep({
  data,
  subjects,
  classes,
  streams,
  onChange,
}: TeacherAcademicStepProps) {
  const assignedSubjects = data.assignedSubjects || []
  const assignedClasses = data.assignedClasses || []
  const assignedStreams = data.assignedStreams || []
  const classTeacherFor = data.classTeacherFor || []
  const examinationRoles = data.examinationRoles || []

  // Filter streams based on assigned classes
  const availableStreams = streams.filter((stream) =>
    assignedClasses.includes(stream.classId)
  )

  // Handle subject selection
  const handleSubjectToggle = (subjectId: string, checked: boolean) => {
    const newSubjects = checked
      ? [...assignedSubjects, subjectId]
      : assignedSubjects.filter((id) => id !== subjectId)
    onChange({ assignedSubjects: newSubjects })
  }

  // Handle class selection
  const handleClassToggle = (classId: string, checked: boolean) => {
    const newClasses = checked
      ? [...assignedClasses, classId]
      : assignedClasses.filter((id) => id !== classId)
    
    // Also remove from classTeacherFor if unchecked
    const newClassTeacherFor = checked
      ? classTeacherFor
      : classTeacherFor.filter((id) => id !== classId)
    
    // Remove streams that belong to unchecked classes
    const newStreams = checked
      ? assignedStreams
      : assignedStreams.filter((streamId) => {
          const stream = streams.find((s) => s.id === streamId)
          return stream && newClasses.includes(stream.classId)
        })

    onChange({
      assignedClasses: newClasses,
      classTeacherFor: newClassTeacherFor,
      assignedStreams: newStreams,
    })
  }

  // Handle stream selection
  const handleStreamToggle = (streamId: string, checked: boolean) => {
    const newStreams = checked
      ? [...assignedStreams, streamId]
      : assignedStreams.filter((id) => id !== streamId)
    onChange({ assignedStreams: newStreams })
  }

  // Handle class teacher designation
  const handleClassTeacherToggle = (classId: string, checked: boolean) => {
    const newClassTeacherFor = checked
      ? [...classTeacherFor, classId]
      : classTeacherFor.filter((id) => id !== classId)
    onChange({ classTeacherFor: newClassTeacherFor })
  }

  // Handle examination role toggle
  const handleExamRoleToggle = (role: ExaminationRole, checked: boolean) => {
    const existingRole = examinationRoles.find((r) => r.role === role)
    
    if (checked && !existingRole) {
      const newRole: ExaminationRoleAssignment = {
        examId: 'general', // Placeholder - actual exam assignment happens elsewhere
        role,
        assignedAt: new Date(),
        assignedBy: 'current-user', // Will be replaced with actual user
      }
      onChange({ examinationRoles: [...examinationRoles, newRole] })
    } else if (!checked && existingRole) {
      onChange({
        examinationRoles: examinationRoles.filter((r) => r.role !== role),
      })
    }
  }

  const hasExamRole = (role: ExaminationRole) =>
    examinationRoles.some((r) => r.role === role)

  return (
    <div className="space-y-8">
      {/* Subject Assignments */}
      <div>
        <h3 className="text-lg font-medium mb-2">Subject Assignments</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select the subjects this teacher will teach. This determines which marks they can enter.
        </p>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No subjects available. Please add subjects first.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {subjects.map((subject) => (
              <CheckboxField
                key={subject.id}
                label={subject.name}
                name={`subject-${subject.id}`}
                checked={assignedSubjects.includes(subject.id)}
                onChange={(e) => handleSubjectToggle(subject.id, e.target.checked)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Class Assignments */}
      <div>
        <h3 className="text-lg font-medium mb-2">Class Assignments</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select the classes this teacher will teach. This determines which attendance they can mark.
        </p>
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No classes available. Please add classes first.
          </p>
        ) : (
          <div className="space-y-4">
            {classes.map((cls) => {
              const isAssigned = assignedClasses.includes(cls.id)
              const isClassTeacher = classTeacherFor.includes(cls.id)
              const classStreams = streams.filter((s) => s.classId === cls.id)

              return (
                <div
                  key={cls.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    isAssigned ? 'border-[var(--info-light)] bg-[var(--info-light)] dark:border-[var(--info-dark)] dark:bg-[var(--info-dark)]' : 'border-[var(--border-default)] dark:border-[var(--border-strong)]'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <CheckboxField
                      label={cls.name}
                      name={`class-${cls.id}`}
                      checked={isAssigned}
                      onChange={(e) => handleClassToggle(cls.id, e.target.checked)}
                    />
                    {isAssigned && (
                      <CheckboxField
                        label="Class Teacher"
                        name={`class-teacher-${cls.id}`}
                        checked={isClassTeacher}
                        onChange={(e) => handleClassTeacherToggle(cls.id, e.target.checked)}
                      />
                    )}
                  </div>

                  {/* Stream selection for assigned classes */}
                  {isAssigned && classStreams.length > 0 && (
                    <div className="ml-6 mt-3 pt-3 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
                      <p className="text-sm font-medium mb-2">Streams:</p>
                      <div className="flex flex-wrap gap-3">
                        {classStreams.map((stream) => (
                          <CheckboxField
                            key={stream.id}
                            label={stream.name}
                            name={`stream-${stream.id}`}
                            checked={assignedStreams.includes(stream.id)}
                            onChange={(e) => handleStreamToggle(stream.id, e.target.checked)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Examination Roles */}
      <div>
        <h3 className="text-lg font-medium mb-2">Examination Roles</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Assign examination responsibilities to this teacher.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {EXAMINATION_ROLE_OPTIONS.map((option) => (
            <CheckboxField
              key={option.value}
              label={option.label}
              name={`exam-role-${option.value}`}
              checked={hasExamRole(option.value)}
              onChange={(e) => handleExamRoleToggle(option.value, e.target.checked)}
            />
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="p-4 bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] rounded-lg">
        <h4 className="font-medium mb-2">Assignment Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Subjects:</span>{' '}
            <span className="font-medium">{assignedSubjects.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Classes:</span>{' '}
            <span className="font-medium">{assignedClasses.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Streams:</span>{' '}
            <span className="font-medium">{assignedStreams.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Class Teacher For:</span>{' '}
            <span className="font-medium">{classTeacherFor.length}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherAcademicStep
