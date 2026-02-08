'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle, Smartphone, Send, Loader2 } from 'lucide-react'

interface LiveSMSTesterProps {
  className?: string
}

interface TestResult {
  success: boolean
  message: string
  messageId?: string
  cost?: number
  deliveryStatus?: string
}

export function LiveSMSTester({ className = '' }: LiveSMSTesterProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('Test message from SchoolOffice. If you receive this, SMS is working perfectly!')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const handleSendTest = async () => {
    if (!phoneNumber.trim() || !message.trim()) {
      setResult({
        success: false,
        message: 'Please enter both phone number and message'
      })
      return
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      setResult({
        success: false,
        message: 'Please enter a valid phone number (at least 10 digits)'
      })
      return
    }

    try {
      setSending(true)
      setResult(null)

      const response = await fetch('/api/sms/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          message: message.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'SMS sent successfully! Check your phone.',
          messageId: data.messageId,
          cost: data.cost,
          deliveryStatus: data.status
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send SMS'
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Network error. Please check your connection and try again.'
      })
    } finally {
      setSending(false)
    }
  }

  const characterCount = message.length
  const smsUnits = Math.ceil(characterCount / 160)
  const estimatedCost = smsUnits * 45 // UGX 45 per SMS unit

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Smartphone className="h-5 w-5 mr-2 text-[var(--chart-blue)]" />
            Live SMS Test
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Send a real SMS to verify your system is working
          </p>
        </div>
        <Badge variant="outline" className="bg-[var(--info-light)] text-[var(--accent-hover)]">
          Demo Tool
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Phone Number Input */}
        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="0700123456 or +256700123456"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Enter your own phone number to test SMS delivery
          </p>
        </div>

        {/* Message Input */}
        <div>
          <Label htmlFor="message">Test Message</Label>
          <Textarea
            id="message"
            placeholder="Enter your test message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1"
            rows={3}
          />
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
            <span>Characters: {characterCount}/160</span>
            <span>SMS Units: {smsUnits} | Cost: UGX {estimatedCost}</span>
          </div>
        </div>

        {/* Character Limit Warning */}
        {characterCount > 160 && (
          <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-[var(--chart-yellow)] mr-2" />
              <span className="text-sm text-[var(--warning-dark)]">
                Message exceeds 160 characters. This will be sent as {smsUnits} SMS units.
              </span>
            </div>
          </div>
        )}

        {/* Send Button */}
        <Button 
          onClick={handleSendTest}
          disabled={sending || !phoneNumber.trim() || !message.trim()}
          className="w-full bg-[var(--chart-green)] hover:bg-[var(--chart-green)]"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending SMS...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Test SMS
            </>
          )}
        </Button>

        {/* Result Display */}
        {result && (
          <div className={`rounded-lg p-4 ${
            result.success 
              ? 'bg-[var(--success-light)] border border-[var(--success-light)]' 
              : 'bg-[var(--danger-light)] border border-[var(--danger-light)]'
          }`}>
            <div className="flex items-center">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-[var(--chart-green)] mr-2" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-[var(--chart-red)] mr-2" />
              )}
              <span className={`font-medium ${
                result.success ? 'text-[var(--success-dark)]' : 'text-[var(--danger-dark)]'
              }`}>
                {result.message}
              </span>
            </div>
            
            {result.success && result.messageId && (
              <div className="mt-2 text-sm text-[var(--chart-green)]">
                <p>Message ID: {result.messageId}</p>
                {result.cost && <p>Cost: UGX {result.cost}</p>}
                {result.deliveryStatus && <p>Status: {result.deliveryStatus}</p>}
              </div>
            )}
          </div>
        )}

        {/* Demo Instructions */}
        <div className="bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--info-dark)] mb-2">Demo Instructions:</h4>
          <ol className="text-sm text-[var(--info-dark)] space-y-1">
            <li>1. Enter your phone number</li>
            <li>2. Click "Send Test SMS"</li>
            <li>3. Wait for your phone to buzz</li>
            <li>4. Show the received SMS to the school</li>
          </ol>
          <p className="text-xs text-[var(--chart-blue)] mt-2">
            This single moment proves SMS works better than any explanation.
          </p>
        </div>
      </div>
    </Card>
  )
}