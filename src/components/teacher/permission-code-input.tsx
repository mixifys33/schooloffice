'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { Shield, Key, Clock, CheckCircle } from 'lucide-react'

interface PermissionCodeInputProps {
  onCodeValidated: (code: string) => void
  onCodeInvalid?: (error: string) => void
}

export function PermissionCodeInput({ onCodeValidated, onCodeInvalid }: PermissionCodeInputProps) {
  const [code, setCode] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    valid: boolean
    message?: string
    expiresAt?: string
  } | null>(null)
  
  const { toast, showToast, hideToast } = useLocalToast()
  const isMountedRef = useRef(true)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const validateCode = async () => {
    if (!code.trim()) {
      showToast('error', 'Please enter a permission code')
      return
    }

    if (code.length !== 6 || !/^\d+$/.test(code)) {
      showToast('error', 'Permission code must be 6 digits')
      return
    }

    try {
      setValidating(true)
      setValidationResult(null)

      const response = await fetch('/api/teacher/sms-permission/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate code')
      }

      if (isMountedRef.current) { // Check if component is still mounted
        if (data.valid) {
          setValidationResult({
            valid: true,
            message: 'Permission code is valid',
            expiresAt: data.expiresAt,
          })
          onCodeValidated(code.trim())
          showToast('success', 'Permission granted! You can now send SMS messages.')
        } else {
          setValidationResult({
            valid: false,
            message: data.error || 'Invalid permission code',
          })
          onCodeInvalid?.(data.error || 'Invalid permission code')
          showToast('error', data.error || 'Invalid permission code')
        }
      }
    } catch (err) {
      if (isMountedRef.current) { // Check if component is still mounted
        console.error('Error validating code:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to validate code'
        setValidationResult({
          valid: false,
          message: errorMessage,
        })
        onCodeInvalid?.(errorMessage)
        showToast('error', errorMessage)
      }
    } finally {
      if (isMountedRef.current) { // Check if component is still mounted
        setValidating(false)
      }
    }
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    setValidationResult(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validateCode()
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  return (
    <div className="space-y-4">
      {toast && isMountedRef.current && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            SMS Permission Required
          </CardTitle>
          <CardDescription>
            Enter the 6-digit permission code provided by your administrator to send SMS messages.
            Codes expire 5 hours after generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <FormField
                label="Permission Code"
                name="permissionCode"
                value={code}
                onChange={handleCodeChange}
                onKeyPress={handleKeyPress}
                placeholder="Enter 6-digit code"
                maxLength={6}
                helpText="Enter the code provided by your administrator"
              />
            </div>
            <Button 
              onClick={validateCode} 
              disabled={validating || code.length !== 6}
              className="self-end h-10"
            >
              {validating ? 'Validating...' : 'Validate'}
            </Button>
          </div>

          {validationResult && isMountedRef.current && (
            <AlertBanner
              type={validationResult.valid ? 'success' : 'danger'}
              message={
                <div className="flex items-center gap-2">
                  {validationResult.valid ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Key className="h-4 w-4" />
                  )}
                  <span>{validationResult.message}</span>
                  {validationResult.valid && validationResult.expiresAt && (
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">
                      <Clock className="h-3 w-3 inline mr-1" />
                      Expires in {formatTimeRemaining(validationResult.expiresAt)}
                    </span>
                  )}
                </div>
              }
            />
          )}

          <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
            <h4 className="font-medium mb-2">Important Information:</h4>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Each permission code can only be used once</li>
              <li>Codes expire 5 hours after generation by default</li>
              <li>You must obtain a new code for each SMS sending session</li>
              <li>Share codes only with authorized personnel</li>
              <li>Contact your administrator if you need a new code</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}