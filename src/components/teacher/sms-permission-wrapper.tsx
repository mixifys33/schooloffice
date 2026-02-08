'use client'

import React, { useState } from 'react'
import { PermissionCodeInput } from '@/components/teacher/permission-code-input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Shield, Send, AlertCircle } from 'lucide-react'

interface SMSPermissionWrapperProps {
  children: React.ReactNode
  onPermissionGranted: () => void
}

export function SMSPermissionWrapper({ children, onPermissionGranted }: SMSPermissionWrapperProps) {
  const [hasPermission, setHasPermission] = useState(false)
  const [permissionCode, setPermissionCode] = useState<string | null>(null)
  const [showPermissionRequired, setShowPermissionRequired] = useState(true)
  const isMountedRef = useRef(true)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handleCodeValidated = (code: string) => {
    if (isMountedRef.current) {
      setPermissionCode(code)
      setHasPermission(true)
      setShowPermissionRequired(false)
      onPermissionGranted()
    }
  }

  const handleCodeInvalid = (error: string) => {
    if (isMountedRef.current) {
      setHasPermission(false)
      setPermissionCode(null)
    }
  }

  const handleResetPermission = () => {
    if (isMountedRef.current) {
      setHasPermission(false)
      setPermissionCode(null)
      setShowPermissionRequired(true)
    }
  }

  if (showPermissionRequired) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <PermissionCodeInput 
          onCodeValidated={handleCodeValidated}
          onCodeInvalid={handleCodeInvalid}
        />
      </div>
    )
  }

  if (hasPermission && permissionCode) {
    return (
      <div className="space-y-6">
        <AlertBanner
          type="success"
          message={
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Permission granted with code: <strong>{permissionCode}</strong></span>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleResetPermission}
                className="text-xs"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Change Code
              </Button>
            </div>
          }
        />
        
        {/* Pass the permission code to children components */}
        <div data-permission-code={permissionCode}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          Permission Required
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center py-8">
        <p className="text-muted-foreground mb-4">
          You need administrator permission to send SMS messages
        </p>
        <Button onClick={() => isMountedRef.current && setShowPermissionRequired(true)}>
          <Shield className="h-4 w-4 mr-2" />
          Enter Permission Code
        </Button>
      </CardContent>
    </Card>
  )
}