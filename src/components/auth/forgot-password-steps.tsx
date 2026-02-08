'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FormField, PasswordField } from '@/components/ui/form-field'
import { cn } from '@/lib/utils'

interface StepProps {
  step: string
  schoolCode: string
  setSchoolCode: (value: string) => void
  identifier: string
  setIdentifier: (value: string) => void
  recoveryMethod: 'email' | 'sms' | 'admin'
  setRecoveryMethod: (method: 'email' | 'sms' | 'admin') => void
  verificationCode: string
  setVerificationCode: (value: string) => void
  newPassword: string
  setNewPassword: (value: string) => void
  confirmPassword: string
  setConfirmPassword: (value: string) => void
  errors: Record<string, string>
  isLoading: boolean
  maskedContact: string
  canResend: boolean
  resendCountdown: number
  passwordStrength: { score: number; feedback: string[] }
  onInitiateRecovery: () => void
  onSendCode: () => void
  onVerifyCode: () => void
  onResetPassword: () => void
  onRequestAdminHelp: () => void
  onResendCode: () => void
  onBack: () => void
  formatCountdown: (seconds: number) => string
}

export function IdentifyStep({ 
  schoolCode, 
  setSchoolCode, 
  identifier, 
  setIdentifier, 
  errors, 
  isLoading, 
  onInitiateRecovery 
}: Partial<StepProps>) {
  return (
    <div className="space-y-4">
      <FormField
        label="School Code"
        name="schoolCode"
        placeholder="e.g., STMARYS, GREENHILL"
        value={schoolCode}
        onChange={(e) => setSchoolCode?.(e.target.value.toUpperCase())}
        error={errors?.schoolCode}
        required
        touchFriendly
      />

      <FormField
        label="Email, Phone, or Username"
        name="identifier"
        placeholder="Enter your registered contact or username"
        value={identifier}
        onChange={(e) => setIdentifier?.(e.target.value)}
        error={errors?.identifier}
        required
        touchFriendly
      />

      <Button
        onClick={onInitiateRecovery}
        disabled={isLoading}
        size="touch"
        className="w-full mt-6"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Verifying...
          </>
        ) : (
          'Continue'
        )}
      </Button>
    </div>
  )
}
export function MethodStep({ 
  recoveryMethod, 
  setRecoveryMethod, 
  maskedContact, 
  isLoading, 
  onSendCode, 
  onRequestAdminHelp, 
  onBack 
}: Partial<StepProps>) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Email Option */}
        <label 
          className={cn(
            'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200',
            'hover:shadow-sm',
            recoveryMethod === 'email' 
              ? 'border-[var(--accent-primary)] bg-[var(--info-light)] dark:bg-[var(--info-dark)]' 
              : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:border-[var(--border-strong)] dark:hover:border-[var(--accent-primary)]'
          )}
        >
          <input
            type="radio"
            name="method"
            value="email"
            checked={recoveryMethod === 'email'}
            onChange={() => setRecoveryMethod?.('email')}
            className="sr-only"
          />
          <div className="w-12 h-12 rounded-full bg-[var(--chart-blue)] flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">Email Verification</div>
            <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate">
              {maskedContact || 'Send code to your registered email'}
            </div>
          </div>
          {recoveryMethod === 'email' && (
            <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </label>

        {/* SMS Option */}
        <label 
          className={cn(
            'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all duration-200',
            'hover:shadow-sm',
            recoveryMethod === 'sms' 
              ? 'border-[var(--accent-primary)] bg-[var(--success-light)] dark:bg-[var(--success-dark)]' 
              : 'border-[var(--border-default)] dark:border-[var(--border-strong)] hover:border-[var(--border-strong)] dark:hover:border-[var(--accent-primary)]'
          )}
        >
          <input
            type="radio"
            name="method"
            value="sms"
            checked={recoveryMethod === 'sms'}
            onChange={() => setRecoveryMethod?.('sms')}
            className="sr-only"
          />
          <div className="w-12 h-12 rounded-full bg-[var(--chart-green)] flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-[var(--text-primary)] dark:text-[var(--text-primary)]">SMS Verification</div>
            <div className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate">
              Send code to your registered phone
            </div>
          </div>
          {recoveryMethod === 'sms' && (
            <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)] flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </label>
      </div>
    </div>
  )
}