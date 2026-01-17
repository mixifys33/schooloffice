'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Save, DollarSign, Receipt, CreditCard, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'

/**
 * Finance Settings Component
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6
 * - Currency, receipt format, payment methods, penalties
 */

interface FinanceSettingsData {
  currency: string
  currencySymbol: string
  receiptNumberFormat: string
  paymentMethods: string[]
  latePenaltyPercentage: number
  gracePeriodDays: number
  enableAutoPenalty: boolean
}

const CURRENCIES = [
  { value: 'UGX', symbol: 'UGX', label: 'Ugandan Shilling (UGX)' },
  { value: 'KES', symbol: 'KES', label: 'Kenyan Shilling (KES)' },
  { value: 'TZS', symbol: 'TZS', label: 'Tanzanian Shilling (TZS)' },
  { value: 'USD', symbol: '$', label: 'US Dollar (USD)' },
]

const AVAILABLE_PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'BANK', 'CHEQUE', 'CARD']

export function FinanceSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  const [formData, setFormData] = useState<FinanceSettingsData>({
    currency: 'UGX',
    currencySymbol: 'UGX',
    receiptNumberFormat: 'RCP-{YEAR}-{NUMBER}',
    paymentMethods: ['CASH', 'MOBILE_MONEY', 'BANK'],
    latePenaltyPercentage: 0,
    gracePeriodDays: 7,
    enableAutoPenalty: false,
  })

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/settings/finance')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data: FinanceSettingsData = await response.json()
      setFormData({
        currency: data.currency || 'UGX',
        currencySymbol: data.currencySymbol || 'UGX',
        receiptNumberFormat: data.receiptNumberFormat || 'RCP-{YEAR}-{NUMBER}',
        paymentMethods: data.paymentMethods?.length ? data.paymentMethods : ['CASH', 'MOBILE_MONEY', 'BANK'],
        latePenaltyPercentage: data.latePenaltyPercentage || 0,
        gracePeriodDays: data.gracePeriodDays || 7,
        enableAutoPenalty: data.enableAutoPenalty ?? false,
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError('Unable to load finance settings. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    
    if (name === 'currency') {
      const selectedCurrency = CURRENCIES.find(c => c.value === value)
      setFormData(prev => ({
        ...prev,
        currency: value,
        currencySymbol: selectedCurrency?.symbol || value,
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) || 0 : value
      }))
    }
  }

  const handlePaymentMethodToggle = (method: string) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: prev.paymentMethods.includes(method)
        ? prev.paymentMethods.filter(m => m !== method)
        : [...prev.paymentMethods, method]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.paymentMethods.length === 0) {
      showToast('error', 'At least one payment method is required')
      return
    }
    try {
      setSaving(true)
      const response = await fetch('/api/settings/finance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }
      showToast('success', 'Finance settings saved successfully')
      fetchSettings()
    } catch (err) {
      console.error('Error saving settings:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <SkeletonLoader variant="card" count={2} />
  }

  if (error) {
    return <AlertBanner type="danger" message={error} action={{ label: 'Retry', onClick: fetchSettings }} />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Settings
            </CardTitle>
            <CardDescription>Configure currency and formatting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select name="currency" value={formData.currency} onChange={handleInputChange} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {CURRENCIES.map(currency => (
                  <option key={currency.value} value={currency.value}>{currency.label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Receipt Settings
            </CardTitle>
            <CardDescription>Configure receipt numbering format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Receipt Number Format" 
              name="receiptNumberFormat" 
              value={formData.receiptNumberFormat} 
              onChange={handleInputChange} 
              helpText="Use {YEAR} and {NUMBER} as placeholders"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>Accepted payment methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_PAYMENT_METHODS.map(method => (
                <Badge
                  key={method}
                  variant={formData.paymentMethods.includes(method) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => handlePaymentMethodToggle(method)}
                >
                  {method.replace('_', ' ')}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Click to toggle payment methods</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Late Payment Penalties
            </CardTitle>
            <CardDescription>Configure late payment rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField 
              label="Grace Period (days)" 
              name="gracePeriodDays" 
              type="number" 
              value={formData.gracePeriodDays.toString()} 
              onChange={handleInputChange} 
              helpText="Days after due date before penalty applies"
            />
            <FormField 
              label="Late Penalty (%)" 
              name="latePenaltyPercentage" 
              type="number" 
              value={formData.latePenaltyPercentage.toString()} 
              onChange={handleInputChange} 
              helpText="Percentage penalty for late payments"
            />
            <div className="flex items-center gap-2">
              <input type="checkbox" id="enableAutoPenalty" name="enableAutoPenalty" checked={formData.enableAutoPenalty} onChange={handleInputChange} className="rounded border-input" />
              <label htmlFor="enableAutoPenalty" className="text-sm font-medium">Automatically apply late penalties</label>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  )
}
