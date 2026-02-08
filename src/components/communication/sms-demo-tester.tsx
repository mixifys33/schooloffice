'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Smartphone, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface SMSDemoTesterProps {
  schoolId: string
  className?: string
  title?: string
}

export function SMSDemoTester({ 
  schoolId, 
  className = '',
  title = "LIVE SMS DEMO - PROOF IT WORKS"
}: SMSDemoTesterProps) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('Test message from SchoolOffice')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleSendDemo = async () => {
    if (!phone.trim()) {
      setResult({ success: false, message: 'Please enter a phone number' })
      return
    }

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/sms/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phone.trim(),
          message: message.trim(),
          schoolId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({ success: true, message: 'SMS sent successfully!' })
      } else {
        setResult({ success: false, message: data.error || 'Failed to send SMS' })
      }
    } catch (error) {
      setResult({ success: false, message: 'Network error occurred' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-[var(--chart-blue)]" />
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <Input
              type="tel"
              placeholder="+256700000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sending}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <Input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              maxLength={160}
            />
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {message.length}/160 characters
            </div>
          </div>

          <Button
            onClick={handleSendDemo}
            disabled={sending || !phone.trim()}
            className="w-full"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Demo SMS
              </>
            )}
          </Button>

          {result && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              result.success 
                ? 'bg-[var(--success-light)] text-[var(--success-dark)] border border-[var(--success-light)]' 
                : 'bg-[var(--danger-light)] text-[var(--danger-dark)] border border-[var(--danger-light)]'
            }`}>
              {result.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{result.message}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}