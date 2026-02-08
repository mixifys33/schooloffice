'use client'

/**
 * SMS Cost Calculator Component
 * Provides cost estimation for SMS messages in the Uganda market
 */

import React, { useState } from 'react'
import { Calculator, DollarSign, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const SMS_COST_UGX = 45
const SMS_MAX_CHARACTERS = 160

interface SMSCostCalculatorProps {
  onCostCalculated?: (cost: number, recipients: number) => void
}

export function SMSCostCalculator({ onCostCalculated }: SMSCostCalculatorProps) {
  const [recipients, setRecipients] = useState<number>(1)
  const [messageLength, setMessageLength] = useState<number>(0)
  const [message, setMessage] = useState<string>('')

  const calculateCost = () => {
    // Single segment only for Uganda market
    const segments = 1
    const totalCost = recipients * segments * SMS_COST_UGX
    return totalCost
  }

  const handleMessageChange = (value: string) => {
    if (value.length <= SMS_MAX_CHARACTERS) {
      setMessage(value)
      setMessageLength(value.length)
    }
  }

  const totalCost = calculateCost()
  const isOverLimit = messageLength > SMS_MAX_CHARACTERS
  const remainingChars = SMS_MAX_CHARACTERS - messageLength

  React.useEffect(() => {
    onCostCalculated?.(totalCost, recipients)
  }, [totalCost, recipients, onCostCalculated])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          SMS Cost Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Number of Recipients</label>
            <input
              type="number"
              min="1"
              value={recipients}
              onChange={(e) => setRecipients(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Cost per SMS</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">UGX {SMS_COST_UGX}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Sample Message (Optional)</label>
          <textarea
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Type a sample message to check length..."
            rows={3}
            className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${
              isOverLimit ? 'border-[var(--danger)] bg-[var(--danger-light)] dark:bg-[var(--danger-dark)]/20' :
              messageLength > SMS_MAX_CHARACTERS * 0.9 ? 'border-[var(--warning)] bg-[var(--warning-light)] dark:bg-[var(--warning-dark)]/20' :
              'border-input bg-background'
            }`}
          />
          <div className="flex justify-between items-center text-xs mt-1">
            <span className={`${
              isOverLimit ? 'text-[var(--chart-red)]' : 
              messageLength > SMS_MAX_CHARACTERS * 0.9 ? 'text-[var(--chart-yellow)]' : 
              'text-muted-foreground'
            }`}>
              {messageLength}/{SMS_MAX_CHARACTERS} characters
            </span>
            {remainingChars < 20 && remainingChars >= 0 && (
              <span className="text-[var(--chart-yellow)]">
                {remainingChars} remaining
              </span>
            )}
            {isOverLimit && (
              <span className="text-[var(--chart-red)] font-medium">
                Over limit by {Math.abs(remainingChars)}
              </span>
            )}
          </div>
        </div>

        <div className="p-4 rounded-md bg-muted/50 border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Cost Breakdown</span>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="text-sm">{recipients} recipients</span>
            </div>
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Recipients:</span>
              <span>{recipients}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cost per SMS:</span>
              <span>UGX {SMS_COST_UGX}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Segments:</span>
              <span>1 (160 chars max)</span>
            </div>
            <div className="border-t pt-1 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total Cost:</span>
                <span className="text-lg">UGX {totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-[var(--info-light)] dark:bg-[var(--info-dark)]/20 p-3 rounded-md">
          <h4 className="font-medium text-[var(--info-dark)] dark:text-[var(--info-light)] mb-1">Uganda Market Pricing</h4>
          <ul className="space-y-1 text-[var(--info-dark)] dark:text-[var(--info)]">
            <li>• Annual subscription: UGX 5,000 per student</li>
            <li>• SMS cost: UGX 45 per message</li>
            <li>• Maximum 160 characters per message</li>
            <li>• No multi-segment messages to control costs</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}