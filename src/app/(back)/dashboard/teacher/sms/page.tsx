'use client'

import React, { useState } from 'react'
import { SMSPermissionWrapper } from '@/components/teacher/sms-permission-wrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Send, MessageSquare } from 'lucide-react'

export default function TeacherSMSSendingPage() {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [permissionCode, setPermissionCode] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handlePermissionGranted = () => {
    // Permission has been granted, we can now send SMS
    if (isMountedRef.current) {
      console.log('Permission granted, ready to send SMS')
    }
  }

  const handleSendSMS = async () => {
    if (!isMountedRef.current) return;
    
    if (!message.trim()) {
      setSendResult({
        success: false,
        message: 'Please enter a message'
      })
      return
    }

    if (!permissionCode) {
      setSendResult({
        success: false,
        message: 'Permission code not available'
      })
      return
    }

    try {
      setSending(true)
      setSendResult(null)

      // This would be the actual SMS sending API call
      // Including the permission code in the request
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          recipientType: 'all',
          permissionCode: permissionCode,
          // Add other required fields as needed
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send SMS')
      }

      if (isMountedRef.current) {
        setSendResult({
          success: true,
          message: `SMS sent successfully to ${data.sentCount} recipients`
        })
        setMessage('')
      }

    } catch (error) {
      if (isMountedRef.current) {
        console.error('Error sending SMS:', error)
        setSendResult({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to send SMS'
        })
      }
    } finally {
      if (isMountedRef.current) {
        setSending(false)
      }
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Send SMS to Parents
        </h1>
        <p className="text-muted-foreground">
          Send important messages to parents and guardians
        </p>
      </div>

      <SMSPermissionWrapper onPermissionGranted={handlePermissionGranted}>
        <Card>
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              label="Message Content"
              name="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message here..."
              textarea
              rows={4}
              maxLength={160}
              helpText={`Characters: ${message.length}/160 (SMS limit)`}
            />

            {isMountedRef.current && sendResult && (
              <AlertBanner
                type={sendResult.success ? 'success' : 'danger'}
                message={sendResult.message}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                onClick={handleSendSMS}
                disabled={sending || !message.trim() || !permissionCode}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send SMS'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </SMSPermissionWrapper>
    </div>
  )
}