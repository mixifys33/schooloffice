'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TeacherFormStep,
  TeacherFormState,
  TeacherIdentityData,
  TeacherEmploymentData,
  TeacherAcademicData,
  TeacherAccessData,
  DEFAULT_TEACHER_PERMISSIONS,
  DEFAULT_CHANNEL_CONFIG,
} from '@/types/teacher'

/**
 * Teacher Form Steps Component
 * Requirements: 9.1, 9.5
 * - Step-based form with 5 sections: Identity, Employment, Academic Roles, Access & Permissions, Review & Create
 * - NO popups - uses full-page forms
 */

export interface TeacherFormStepsProps {
  /** Initial form state (for editing or resuming draft) */
  initialState?: Partial<TeacherFormState>
  /** Draft ID if resuming a draft */
  draftId?: string
  /** Mode: create or edit */
  mode?: 'create' | 'edit'
  /** Teacher ID (for edit mode) */
  teacherId?: string
  /** Available subjects for assignment */
  subjects?: Array<{ id: string; name: string }>
  /** Available classes for assignment */
  classes?: Array<{ id: string; name: string }>
  /** Available streams for assignment */
  streams?: Array<{ id: string; name: string; classId: string }>
  /** Available departments */
  departments?: string[]
  /** Callback when form is submitted */
  onSubmit?: (data: TeacherFormState, action: 'create' | 'create_invite' | 'save_draft') => Promise<void>
  /** Callback when navigating away */
  onCancel?: () => void
  /** Loading state */
  loading?: boolean
}

const STEP_LABELS: Record<TeacherFormStep, string> = {
  [TeacherFormStep.IDENTITY]: 'Identity',
  [TeacherFormStep.EMPLOYMENT]: 'Employment',
  [TeacherFormStep.ACADEMIC_ROLES]: 'Academic Roles',
  [TeacherFormStep.ACCESS_PERMISSIONS]: 'Access & Permissions',
  [TeacherFormStep.REVIEW_CREATE]: 'Review & Create',
}

const STEP_DESCRIPTIONS: Record<TeacherFormStep, string> = {
  [TeacherFormStep.IDENTITY]: 'Personal information and contact details',
  [TeacherFormStep.EMPLOYMENT]: 'Employment type, job title, and department',
  [TeacherFormStep.ACADEMIC_ROLES]: 'Subject, class, and stream assignments',
  [TeacherFormStep.ACCESS_PERMISSIONS]: 'System access and permissions',
  [TeacherFormStep.REVIEW_CREATE]: 'Review all information and create teacher',
}

export function TeacherFormSteps({
  initialState,
  draftId,
  mode = 'create',
  teacherId,
  subjects = [],
  classes = [],
  streams = [],
  departments = [],
  onSubmit,
  onCancel,
  loading = false,
}: TeacherFormStepsProps) {
  const [formState, setFormState] = React.useState<TeacherFormState>(() => ({
    currentStep: initialState?.currentStep ?? TeacherFormStep.IDENTITY,
    isDraft: initialState?.isDraft ?? false,
    draftId: draftId,
    data: {
      identity: initialState?.data?.identity ?? {},
      employment: initialState?.data?.employment ?? {},
      academicRoles: initialState?.data?.academicRoles ?? {
        assignedSubjects: [],
        assignedClasses: [],
        assignedStreams: [],
        classTeacherFor: [],
        examinationRoles: [],
      },
      accessPermissions: initialState?.data?.accessPermissions ?? {
        grantSystemAccess: false,
        permissions: DEFAULT_TEACHER_PERMISSIONS,
        channelConfig: DEFAULT_CHANNEL_CONFIG,
      },
    },
    validationErrors: {},
  }))

  const [stepErrors, setStepErrors] = React.useState<Record<number, boolean>>({})

  // Update identity data
  const updateIdentity = React.useCallback((data: Partial<TeacherIdentityData>) => {
    setFormState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        identity: { ...prev.data.identity, ...data },
      },
    }))
  }, [])

  // Update employment data
  const updateEmployment = React.useCallback((data: Partial<TeacherEmploymentData>) => {
    setFormState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        employment: { ...prev.data.employment, ...data },
      },
    }))
  }, [])

  // Update academic roles data
  const updateAcademicRoles = React.useCallback((data: Partial<TeacherAcademicData>) => {
    setFormState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        academicRoles: { ...prev.data.academicRoles, ...data },
      },
    }))
  }, [])

  // Update access permissions data
  const updateAccessPermissions = React.useCallback((data: Partial<TeacherAccessData>) => {
    setFormState((prev) => ({
      ...prev,
      data: {
        ...prev.data,
        accessPermissions: { ...prev.data.accessPermissions, ...data },
      },
    }))
  }, [])

  // Validate current step
  const validateStep = React.useCallback((step: TeacherFormStep): boolean => {
    const errors: Record<string, string[]> = {}

    switch (step) {
      case TeacherFormStep.IDENTITY: {
        const { identity } = formState.data
        if (!identity.firstName?.trim()) errors.firstName = ['First name is required']
        if (!identity.lastName?.trim()) errors.lastName = ['Last name is required']
        if (!identity.gender) errors.gender = ['Gender is required']
        if (!identity.nationalId?.trim()) errors.nationalId = ['National ID is required']
        if (!identity.phone?.trim()) errors.phone = ['Phone number is required']
        if (!identity.email?.trim()) errors.email = ['Email is required']
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email)) {
          errors.email = ['Invalid email format']
        }
        if (!identity.dateOfBirth) errors.dateOfBirth = ['Date of birth is required']
        break
      }
      case TeacherFormStep.EMPLOYMENT: {
        const { employment } = formState.data
        if (!employment.employmentType) errors.employmentType = ['Employment type is required']
        if (!employment.jobTitle) errors.jobTitle = ['Job title is required']
        if (!employment.department?.trim()) errors.department = ['Department is required']
        if (!employment.dateOfAppointment) errors.dateOfAppointment = ['Date of appointment is required']
        break
      }
      case TeacherFormStep.ACADEMIC_ROLES:
        // Academic roles are optional
        break
      case TeacherFormStep.ACCESS_PERMISSIONS:
        // Access permissions are optional (record-only mode is valid)
        break
      case TeacherFormStep.REVIEW_CREATE:
        // Final review - validate all previous steps
        break
    }

    setFormState((prev) => ({ ...prev, validationErrors: errors }))
    setStepErrors((prev) => ({ ...prev, [step]: Object.keys(errors).length > 0 }))
    return Object.keys(errors).length === 0
  }, [formState.data])

  // Navigate to next step
  const goToNextStep = React.useCallback(() => {
    if (validateStep(formState.currentStep)) {
      setFormState((prev) => ({
        ...prev,
        currentStep: Math.min(prev.currentStep + 1, TeacherFormStep.REVIEW_CREATE) as TeacherFormStep,
      }))
    }
  }, [formState.currentStep, validateStep])

  // Navigate to previous step
  const goToPreviousStep = React.useCallback(() => {
    setFormState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, TeacherFormStep.IDENTITY) as TeacherFormStep,
    }))
  }, [])

  // Navigate to specific step
  const goToStep = React.useCallback((step: TeacherFormStep) => {
    // Allow navigation to any previous step or current step
    if (step <= formState.currentStep) {
      setFormState((prev) => ({ ...prev, currentStep: step }))
    } else {
      // For forward navigation, validate current step first
      if (validateStep(formState.currentStep)) {
        setFormState((prev) => ({ ...prev, currentStep: step }))
      }
    }
  }, [formState.currentStep, validateStep])

  // Handle form submission
  const handleSubmit = React.useCallback(async (action: 'create' | 'create_invite' | 'save_draft') => {
    if (action !== 'save_draft') {
      // Validate all steps for final submission
      let hasErrors = false
      for (let step = TeacherFormStep.IDENTITY; step <= TeacherFormStep.ACCESS_PERMISSIONS; step++) {
        if (!validateStep(step as TeacherFormStep)) {
          hasErrors = true
          setFormState((prev) => ({ ...prev, currentStep: step as TeacherFormStep }))
          break
        }
      }
      if (hasErrors) return
    }

    await onSubmit?.(formState, action)
  }, [formState, onSubmit, validateStep])

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Step Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {Object.entries(STEP_LABELS).map(([stepNum, label], index) => {
            const step = Number(stepNum) as TeacherFormStep
            const isActive = formState.currentStep === step
            const isCompleted = formState.currentStep > step
            const hasError = stepErrors[step]

            return (
              <React.Fragment key={step}>
                <button
                  type="button"
                  onClick={() => goToStep(step)}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-colors',
                    isActive && 'text-blue-600',
                    isCompleted && !hasError && 'text-green-600',
                    hasError && 'text-red-600',
                    !isActive && !isCompleted && !hasError && 'text-gray-400'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                      isActive && 'border-blue-600 bg-blue-600 text-white',
                      isCompleted && !hasError && 'border-green-600 bg-green-600 text-white',
                      hasError && 'border-red-600 bg-red-600 text-white',
                      !isActive && !isCompleted && !hasError && 'border-gray-300 bg-white text-gray-500'
                    )}
                  >
                    {isCompleted && !hasError ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : hasError ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      step
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{label}</span>
                </button>
                {index < Object.keys(STEP_LABELS).length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      formState.currentStep > step ? 'bg-green-600' : 'bg-gray-200'
                    )}
                  />
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEP_LABELS[formState.currentStep]}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {STEP_DESCRIPTIONS[formState.currentStep]}
          </p>
        </CardHeader>
        <CardContent>
          <TeacherFormStepContent
            step={formState.currentStep}
            formState={formState}
            updateIdentity={updateIdentity}
            updateEmployment={updateEmployment}
            updateAcademicRoles={updateAcademicRoles}
            updateAccessPermissions={updateAccessPermissions}
            subjects={subjects}
            classes={classes}
            streams={streams}
            departments={departments}
            mode={mode}
            teacherId={teacherId}
          />
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          {formState.currentStep > TeacherFormStep.IDENTITY && (
            <Button
              type="button"
              variant="outline"
              onClick={goToPreviousStep}
              disabled={loading}
            >
              Previous
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Save Draft button - available on all steps */}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSubmit('save_draft')}
            disabled={loading}
          >
            Save Draft
          </Button>

          {formState.currentStep < TeacherFormStep.REVIEW_CREATE ? (
            <Button
              type="button"
              onClick={goToNextStep}
              disabled={loading}
            >
              Next
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleSubmit('create')}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Teacher'}
              </Button>
              {formState.data.accessPermissions.grantSystemAccess && (
                <Button
                  type="button"
                  onClick={() => handleSubmit('create_invite')}
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create & Send Login Invite'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}


// Import step components
import { TeacherIdentityStep } from './teacher-identity-step'
import { TeacherEmploymentStep } from './teacher-employment-step'
import { TeacherAcademicStep } from './teacher-academic-step'
import { TeacherAccessStep } from './teacher-access-step'
import { TeacherReviewStep } from './teacher-review-step'

interface TeacherFormStepContentProps {
  step: TeacherFormStep
  formState: TeacherFormState
  updateIdentity: (data: Partial<TeacherIdentityData>) => void
  updateEmployment: (data: Partial<TeacherEmploymentData>) => void
  updateAcademicRoles: (data: Partial<TeacherAcademicData>) => void
  updateAccessPermissions: (data: Partial<TeacherAccessData>) => void
  subjects: Array<{ id: string; name: string }>
  classes: Array<{ id: string; name: string }>
  streams: Array<{ id: string; name: string; classId: string }>
  departments: string[]
  mode: 'create' | 'edit'
  teacherId?: string
}

function TeacherFormStepContent({
  step,
  formState,
  updateIdentity,
  updateEmployment,
  updateAcademicRoles,
  updateAccessPermissions,
  subjects,
  classes,
  streams,
  departments,
  mode,
  teacherId,
}: TeacherFormStepContentProps) {
  switch (step) {
    case TeacherFormStep.IDENTITY:
      return (
        <TeacherIdentityStep
          data={formState.data.identity}
          errors={formState.validationErrors}
          onChange={updateIdentity}
          teacherId={teacherId}
        />
      )
    case TeacherFormStep.EMPLOYMENT:
      return (
        <TeacherEmploymentStep
          data={formState.data.employment}
          errors={formState.validationErrors}
          departments={departments}
          onChange={updateEmployment}
        />
      )
    case TeacherFormStep.ACADEMIC_ROLES:
      return (
        <TeacherAcademicStep
          data={formState.data.academicRoles}
          subjects={subjects}
          classes={classes}
          streams={streams}
          onChange={updateAcademicRoles}
        />
      )
    case TeacherFormStep.ACCESS_PERMISSIONS:
      return (
        <TeacherAccessStep
          data={formState.data.accessPermissions}
          onChange={updateAccessPermissions}
        />
      )
    case TeacherFormStep.REVIEW_CREATE:
      return (
        <TeacherReviewStep
          formState={formState}
          subjects={subjects}
          classes={classes}
          streams={streams}
          mode={mode}
        />
      )
    default:
      return null
  }
}

export default TeacherFormSteps
