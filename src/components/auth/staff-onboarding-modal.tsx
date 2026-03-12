'use client'

import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Send, CheckCircle, AlertCircle, Eye, EyeOff, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { StaffCredentialsModal } from './staff-credentials-modal'
import { StaffRole, Role } from '@/types/enums'
import { useFormNotifications } from '@/lib/notifications'
import { createThemeStyle } from '@/lib/theme-utils'

/**
 * Staff Onboarding Modal
 * Guides school admins through registering required staff members
 * Requirements: Check for DOS, Bursar, Deputy Admin, Head Teacher and register them
 */

interface RequiredStaffRole {
  role: StaffRole | Role
  title: string
  description: string
  isRequired: boolean
}

interface StaffRegistrationData {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: StaffRole | Role
  employeeNumber: string
  department?: string
}

interface OnboardingStatus {
  isComplete: boolean
  missingRoles: RequiredStaffRole[]
  registeredStaff: Array<{
    id: string
    name: string
    role: StaffRole | Role
    email: string
    phone: string
  }>
}

interface StaffCredentials {
  name: string
  email: string
  phone: string
  password: string
  role: string
  schoolCode: string
}

interface StaffOnboardingModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
}

type Step = 'check' | 'register' | 'credentials' | 'complete'

export function StaffOnboardingModal({ isOpen, onClose, onComplete }: StaffOnboardingModalProps) {
  const { showSuccess, showError } = useFormNotifications()
  const [step, setStep] = useState<Step>('check')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [selectedRole, setSelectedRole] = useState<RequiredStaffRole | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [credentials, setCredentials] = useState<StaffCredentials | null>(null)
  const [sendingCredentials, setSendingCredentials] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [selectedStaffForCredentials, setSelectedStaffForCredentials] = useState<{
    id: string
    name: string
  } | null>(null)

  // Form data for staff registration
  const [formData, setFormData] = useState<StaffRegistrationData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: StaffRole.DOS,
    employeeNumber: '',
    department: '',
  })

  // Check onboarding status when modal opens
  useEffect(() => {
    if (isOpen) {
      checkOnboardingStatus()
    }
  }, [isOpen])

  // Reset form when role changes
  useEffect(() => {
    if (selectedRole) {
      setFormData(prev => ({
        ...prev,
        role: selectedRole.role,
        department: selectedRole.role === StaffRole.DOS ? 'Academic Affairs' :
                   selectedRole.role === StaffRole.BURSAR ? 'Finance' :
                   selectedRole.role === Role.DEPUTY ? 'Administration' : '',
      }))
    }
  }, [selectedRole])

  const checkOnboardingStatus = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/staff/onboarding/status')
      if (!response.ok) {
        throw new Error('Failed to check onboarding status')
      }
      const status = await response.json()
      setOnboardingStatus(status)

      // If onboarding is complete, show completion step
      if (status.isComplete) {
        setStep('complete')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check onboarding status')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleSelection = (role: RequiredStaffRole) => {
    setSelectedRole(role)
    setStep('register')
    setError(null)
  }

  const handleRegisterStaff = async () => {
    if (!selectedRole) return

    // Validate form data
    const errors: string[] = []
    if (!formData.firstName.trim()) errors.push('First name is required')
    if (!formData.lastName.trim()) errors.push('Last name is required')
    if (!formData.email.trim()) errors.push('Email is required')
    if (!formData.phone.trim()) errors.push('Phone number is required')
    if (!formData.employeeNumber.trim()) errors.push('Employee number is required')

    if (errors.length > 0) {
      setError(errors.join(', '))
      return
    }

    setLoading(true)
    setError(null)

    try {
      // First, check if user already exists to provide better error message
      const checkResponse = await fetch('/api/staff/onboarding/check-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email.trim(), 
          phone: formData.phone.trim() 
        }),
      })

      if (checkResponse.ok) {
        const checkData = await checkResponse.json()
        if (checkData.exists) {
          let conflictMessage = 'Registration conflict detected:'
          
          // Build conflict details more concisely
          const conflicts = []
          if (checkData.emailExists) conflicts.push(`Email: ${formData.email}`)
          if (checkData.phoneExists) conflicts.push(`Phone: ${formData.phone}`)
          
          if (conflicts.length > 0) {
            conflictMessage += `\n${conflicts.join(' • ')}`
          }
          
          if (checkData.existingUser) {
            conflictMessage += `\nRegistered to: ${checkData.existingUser.name} (${checkData.existingUser.role})`
          }
          
          conflictMessage += '\n\nSuggestions: Verify contact details or use different information if this is a different person. thank you'
          
          setError(conflictMessage)
          setLoading(false)
          return
        }
      }

      const response = await fetch('/api/staff/onboarding/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Staff registration error:', errorData)
        
        // Build a comprehensive error message
        let errorMessage = errorData.error || errorData.message || 'Failed to register staff'
        
        // Add details if available
        if (errorData.details) {
          errorMessage += ` ${errorData.details}`
        }
        
        // In development, also show the original error
        if (errorData.originalError && process.env.NODE_ENV === 'development') {
          errorMessage += ` (Technical: ${errorData.originalError})`
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      setCredentials(result.credentials)
      
      // Check if credentials were automatically sent
      if (result.credentialsSent) {
        // Credentials were sent successfully, refresh status and show success
        await checkOnboardingStatus()
        
        // Show success toast
        showSuccess(`${result.credentials.name} registered successfully! Login credentials have been sent automatically.`)
        
        // Reset form for next registration if there are more roles to register
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          role: StaffRole.DOS,
          employeeNumber: '',
          department: '',
        })
        setStep('check')
        
        // Clear any previous errors
        setError(null)
      } else {
        // Credentials weren't sent, show credentials step with error message
        setStep('credentials')
        if (result.sendingError) {
          setError(`Registration successful, but ${result.sendingError}. Please use the resend button below.`)
          showError(`${result.credentials.name} registered, but credentials could not be sent automatically. Please use the resend button.`)
        } else {
          showSuccess(`${result.credentials.name} registered successfully! Please send the credentials manually.`)
        }
      }
    } catch (err) {
      // Preserve the exact error message from the API
      let errorMessage = err instanceof Error ? err.message : 'Failed to register staff'
      
      // Add helpful suggestions for common errors (more concise)
      if (errorMessage.includes('already exists')) {
        errorMessage += '\n\nSuggestions: Check if this person is already registered or use different contact information.'
      }
      
      console.error('Staff registration error:', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSendCredentials = async () => {
    if (!credentials) return

    setSendingCredentials(true)
    setError(null)

    try {
      const response = await fetch('/api/staff/onboarding/send-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials }),
      })

      if (!response.ok) {
        throw new Error('Failed to send credentials')
      }

      // Refresh onboarding status
      await checkOnboardingStatus()
      
      // Reset form for next registration
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: StaffRole.DOS,
        employeeNumber: '',
        department: '',
      })
      setSelectedRole(null)
      setCredentials(null)
      
      // Show success and return to check step
      setStep('check')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send credentials')
    } finally {
      setSendingCredentials(false)
    }
  }

  const handleSkipCredentials = async () => {
    // Refresh status and continue
    await checkOnboardingStatus()
    setCredentials(null)
    setSelectedRole(null)
    
    // Reset form for next registration
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: StaffRole.DOS,
      employeeNumber: '',
      department: '',
    })
    
    setStep('check')
  }

  const handleComplete = () => {
    onComplete()
    onClose()
  }

  const handleViewCredentials = (staff: { id: string; name: string }) => {
    setSelectedStaffForCredentials(staff)
    setShowCredentialsModal(true)
  }

  const formatRoleTitle = (role: StaffRole | Role): string => {
    const roleMap: Record<string, string> = {
      [StaffRole.DOS]: 'Director of Studies',
      [StaffRole.BURSAR]: 'Bursar',
      [Role.DEPUTY]: 'Deputy Head Teacher',
      [Role.TEACHER]: 'Head Teacher',
    }
    return roleMap[role] || role
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader 
          className="p-6 border-b"
          style={{ borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--accent-contrast)'
              }}
            >
              <Users className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle 
                className="text-xl font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {onboardingStatus?.registeredStaff.length > 0 
                  ? `Complete Staff Setup (${onboardingStatus.missingRoles.length} remaining)`
                  : 'Staff Onboarding'
                }
              </DialogTitle>
              <DialogDescription 
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {onboardingStatus?.registeredStaff.length > 0
                  ? `Register the remaining ${onboardingStatus.missingRoles.length} staff member${onboardingStatus.missingRoles.length === 1 ? '' : 's'} to complete setup`
                  : 'Register required staff members to complete your school setup'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="p-6">
            {loading && step === 'check' && (
              <div className="text-center py-8">
                <div 
                  className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
                  style={{ borderColor: 'var(--accent-primary)' }}
                ></div>
                <p style={{ color: 'var(--text-secondary)' }}>Checking onboarding status...</p>
              </div>
            )}

            {error && (
              <div 
                className="mb-4 p-3 border rounded-md bg-gradient-to-r from-red-50 to-red-50/50 dark:from-red-950/20 dark:to-red-900/10"
                style={{
                  borderColor: 'var(--danger)',
                  borderLeftWidth: '3px',
                  borderLeftColor: 'var(--danger)'
                }}
              >
                <div className="flex items-start gap-2">
                  <AlertCircle 
                    className="h-4 w-4 flex-shrink-0 mt-0.5" 
                    style={{ color: 'var(--danger)' }}
                  />
                  <div className="flex-1 min-w-0">
                    {error.split('\n').map((line, index) => {
                      const isTitle = index === 0
                      const isSubheading = line.includes('Registered to:') || line.includes('Suggestions:')
                      const isDetail = line.includes('•') || (line.includes(':') && !isTitle && !isSubheading)
                      
                      return (
                        <div key={index} className={index > 0 ? 'mt-1.5' : ''}>
                          {isTitle && (
                            <p className="text-sm font-semibold" style={{ color: 'var(--danger-dark)' }}>
                              {line}
                            </p>
                          )}
                          {isSubheading && (
                            <p className="text-xs font-medium mt-2 flex items-center gap-1" style={{ color: 'var(--danger-dark)' }}>
                              {line.includes('Registered to:') && (
                                <span className="inline-block w-1 h-1 bg-current rounded-full opacity-60"></span>
                              )}
                              {line.includes('Suggestions:') && (
                                <span className="inline-block w-1 h-1 bg-current rounded-full opacity-60"></span>
                              )}
                              {line}
                            </p>
                          )}
                          {isDetail && (
                            <p className="text-xs font-mono bg-white/60 dark:bg-black/30 px-2 py-1 rounded border-l-2 ml-2" 
                               style={{ 
                                 color: 'var(--danger-dark)',
                                 borderLeftColor: 'var(--danger)',
                                 fontSize: '11px',
                                 lineHeight: '1.3'
                               }}>
                              {line}
                            </p>
                          )}
                          {!isTitle && !isSubheading && !isDetail && line.trim() && (
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--danger-dark)' }}>
                              {line}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Check Status */}
            {step === 'check' && onboardingStatus && (
              <div className="space-y-6">
                {/* Show progress if some roles are already registered */}
                {onboardingStatus.registeredStaff.length > 0 && (
                  <div 
                    className="p-4 border rounded-lg"
                    style={createThemeStyle.alert('info')}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <CheckCircle 
                        className="h-5 w-5" 
                        style={{ color: 'var(--info)' }}
                      />
                      <h3 
                        className="font-medium"
                        style={{ color: 'var(--info-dark)' }}
                      >
                        Progress: {onboardingStatus.registeredStaff.length} of {onboardingStatus.registeredStaff.length + onboardingStatus.missingRoles.length} roles registered
                      </h3>
                    </div>
                    <div 
                      className="p-4 border rounded-lg"
                      style={createThemeStyle.alert('info')}
                    >
                      <h4 
                        className="font-medium mb-2"
                        style={{ color: 'var(--info-dark)' }}
                      >
                        Registered Staff:
                      </h4>
                      <div className="space-y-2">
                        {onboardingStatus.registeredStaff.map((staff) => (
                          <div key={staff.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <CheckCircle 
                                className="h-4 w-4" 
                                style={{ color: 'var(--success)' }}
                              />
                              <span style={{ color: 'var(--info-dark)' }}>
                                {formatRoleTitle(staff.role)}: {staff.name}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCredentials({ id: staff.id, name: staff.name })}
                              style={{ color: 'var(--info)' }}
                              className="hover:opacity-80"
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              View Credentials
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {onboardingStatus.missingRoles.length > 0 && (
                  <div>
                    <h3 
                      className="text-lg font-medium mb-2"
                      style={createThemeStyle.text('primary')}
                    >
                      {onboardingStatus.registeredStaff.length > 0 ? 'Remaining' : 'Required'} Staff Roles
                    </h3>
                    <p 
                      className="text-sm mb-4"
                      style={createThemeStyle.text('secondary')}
                    >
                      {onboardingStatus.missingRoles.length === 1 
                        ? 'Please register the following staff member to complete your school setup:'
                        : `Please register the following ${onboardingStatus.missingRoles.length} staff members to complete your school setup:`
                      }
                    </p>
                    <div className="space-y-3">
                      {onboardingStatus.missingRoles.map((role) => (
                        <div
                          key={role.role}
                          className="p-4 border rounded-lg hover:opacity-90 transition-opacity"
                          style={createThemeStyle.alert('warning')}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 
                                  className="font-medium"
                                  style={{ color: 'var(--warning-dark)' }}
                                >
                                  {role.title}
                                </h4>
                                {role.isRequired && (
                                  <Badge variant="destructive">Required</Badge>
                                )}
                              </div>
                              <p 
                                className="text-sm"
                                style={{ color: 'var(--warning-dark)' }}
                              >
                                {role.description}
                              </p>
                            </div>
                            <Button
                              onClick={() => handleRoleSelection(role)}
                              size="sm"
                              className="ml-4"
                              style={createThemeStyle.button('warning')}
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Register Now
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {onboardingStatus.missingRoles.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle 
                      className="h-12 w-12 mx-auto mb-4" 
                      style={{ color: 'var(--success)' }}
                    />
                    <h3 
                      className="text-lg font-medium mb-2"
                      style={createThemeStyle.text('primary')}
                    >
                      Staff Onboarding Complete! 🎉
                    </h3>
                    <p 
                      className="mb-4"
                      style={createThemeStyle.text('secondary')}
                    >
                      All required staff roles have been registered. Your school is now ready for full operation.
                    </p>
                    <div 
                      className="p-4 border rounded-lg mb-4"
                      style={createThemeStyle.alert('success')}
                    >
                      <h4 
                        className="font-medium mb-2"
                        style={{ color: 'var(--success-dark)' }}
                      >
                        Registered Staff:
                      </h4>
                      <div className="space-y-2">
                        {onboardingStatus.registeredStaff.map((staff) => (
                          <div key={staff.id} className="flex items-center justify-between text-sm">
                            <div style={{ color: 'var(--success-dark)' }}>
                              • {formatRoleTitle(staff.role)}: {staff.name}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewCredentials({ id: staff.id, name: staff.name })}
                              className="hover:opacity-80"
                              style={{ color: 'var(--success)' }}
                            >
                              <Settings className="h-4 w-4 mr-1" />
                              Manage
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleComplete} className="mt-4" size="lg">
                      Continue to Dashboard
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Register Staff */}
            {step === 'register' && selectedRole && (
              <div className="space-y-6">
                <div 
                  className="p-4 border rounded-lg"
                  style={createThemeStyle.alert('info')}
                >
                  <h3 
                    className="font-medium mb-1"
                    style={{ color: 'var(--info-dark)' }}
                  >
                    Registering: {selectedRole.title}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: 'var(--info-dark)' }}
                  >
                    {selectedRole.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="First Name"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Enter first name"
                    required
                    touchFriendly
                  />

                  <FormField
                    label="Last Name"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Enter last name"
                    required
                    touchFriendly
                  />

                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                    required
                    touchFriendly
                  />

                  <FormField
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                    required
                    touchFriendly
                  />

                  <FormField
                    label="Employee Number"
                    name="employeeNumber"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeNumber: e.target.value }))}
                    placeholder="Enter employee number"
                    required
                    touchFriendly
                  />

                  <FormField
                    label="Department"
                    name="department"
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    placeholder="Enter department"
                    touchFriendly
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep('check')}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleRegisterStaff}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Registering...' : 'Register Staff Member'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Show Credentials */}
            {step === 'credentials' && credentials && (
              <div className="space-y-6">
                <div className="text-center">
                  <CheckCircle 
                    className="h-12 w-12 mx-auto mb-4" 
                    style={{ color: 'var(--success)' }}
                  />
                  <h3 
                    className="text-lg font-medium mb-2"
                    style={createThemeStyle.text('primary')}
                  >
                    {selectedRole?.title} Registered Successfully! ✅
                  </h3>
                  <p style={createThemeStyle.text('secondary')}>
                    Login credentials have been generated. Please share these with {credentials.name}.
                  </p>
                </div>

                <div 
                  className="p-6 border rounded-lg"
                  style={createThemeStyle.card()}
                >
                  <h4 
                    className="font-medium mb-4"
                    style={createThemeStyle.text('primary')}
                  >
                    Login Credentials for {credentials.name}
                  </h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label 
                          className="text-sm font-medium"
                          style={createThemeStyle.text('secondary')}
                        >
                          Name
                        </label>
                        <p style={createThemeStyle.text('primary')}>{credentials.name}</p>
                      </div>
                      <div>
                        <label 
                          className="text-sm font-medium"
                          style={createThemeStyle.text('secondary')}
                        >
                          Role
                        </label>
                        <p style={createThemeStyle.text('primary')}>{credentials.role}</p>
                      </div>
                      <div>
                        <label 
                          className="text-sm font-medium"
                          style={createThemeStyle.text('secondary')}
                        >
                          Email
                        </label>
                        <p style={createThemeStyle.text('primary')}>{credentials.email}</p>
                      </div>
                      <div>
                        <label 
                          className="text-sm font-medium"
                          style={createThemeStyle.text('secondary')}
                        >
                          Phone
                        </label>
                        <p style={createThemeStyle.text('primary')}>{credentials.phone}</p>
                      </div>
                      <div>
                        <label 
                          className="text-sm font-medium"
                          style={createThemeStyle.text('secondary')}
                        >
                          School Code
                        </label>
                        <p style={createThemeStyle.text('primary')}>{credentials.schoolCode}</p>
                      </div>
                      <div>
                        <label 
                          className="text-sm font-medium"
                          style={createThemeStyle.text('secondary')}
                        >
                          Temporary Password
                        </label>
                        <div className="flex items-center gap-2">
                          <code 
                            className="px-2 py-1 rounded text-sm font-mono border"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-default)',
                              color: 'var(--text-primary)'
                            }}
                          >
                            {showPassword ? credentials.password : '••••••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div 
                  className="p-4 border rounded-lg"
                  style={createThemeStyle.alert('warning')}
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle 
                      className="h-5 w-5 flex-shrink-0 mt-0.5" 
                      style={{ color: 'var(--warning)' }}
                    />
                    <div>
                      <h4 
                        className="font-medium mb-1"
                        style={{ color: 'var(--warning-dark)' }}
                      >
                        Important Security Notice
                      </h4>
                      <ul 
                        className="text-sm space-y-1"
                        style={{ color: 'var(--warning-dark)' }}
                      >
                        <li>• {credentials.name} must change their password on first login</li>
                        <li>• They will need to verify their identity during password reset</li>
                        <li>• Share these credentials securely (preferably in person)</li>
                        <li>• The temporary password will expire after first use</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleSkipCredentials}
                    disabled={sendingCredentials}
                  >
                    Continue Without Sending
                  </Button>
                  <Button
                    onClick={handleSendCredentials}
                    disabled={sendingCredentials}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {sendingCredentials ? 'Sending...' : 'Send Credentials via SMS & Email'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {step === 'complete' && (
              <div className="text-center py-8">
                <CheckCircle 
                  className="h-16 w-16 mx-auto mb-6" 
                  style={{ color: 'var(--success)' }}
                />
                <h3 
                  className="text-xl font-semibold mb-4"
                  style={createThemeStyle.text('primary')}
                >
                  Staff Onboarding Complete!
                </h3>
                <p 
                  className="mb-6"
                  style={createThemeStyle.text('secondary')}
                >
                  All required staff members have been registered. Your school is now ready for full operation.
                </p>
                <Button onClick={handleComplete} size="lg">
                  Continue to Dashboard
                </Button>
              </div>
            )}
          </div>

          {/* Staff Credentials Modal */}
          <StaffCredentialsModal
            isOpen={showCredentialsModal}
            onClose={() => {
              setShowCredentialsModal(false)
              setSelectedStaffForCredentials(null)
            }}
            staffId={selectedStaffForCredentials?.id || null}
            staffName={selectedStaffForCredentials?.name}
          />
      </DialogContent>
    </Dialog>
  )
}