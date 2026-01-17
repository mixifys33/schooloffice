'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { 
  SchoolMessagingStats, 
  MessageChannel, 
  QuotaUpdate,
  SchoolQuotas 
} from '@/types/communication-hub'

/**
 * Quota Management Modal Component
 * Requirements: 4.1-4.8
 * - Quota editing form per school
 * - Credit addition form
 * - Emergency override toggle
 */

interface QuotaManagementModalProps {
  school: SchoolMessagingStats
  isOpen: boolean
  onClose: () => void
  onUpdateQuota: (quotas: QuotaUpdate) => void
  onAddCredits: (channel: MessageChannel, amount: number) => void
  onSetEmergencyOverride: (enabled: boolean) => void
}

export default function QuotaManagementModal({ 
  school, 
  isOpen, 
  onClose, 
  onUpdateQuota, 
  onAddCredits,
  onSetEmergencyOverride
}: QuotaManagementModalProps) {
  const [quotas, setQuotas] = useState<SchoolQuotas | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creditAmount, setCreditAmount] = useState<Record<MessageChannel, string>>({
    [MessageChannel.SMS]: '',
    [MessageChannel.WHATSAPP]: '',
    [MessageChannel.EMAIL]: '',
  })
  const [quotaValues, setQuotaValues] = useState<QuotaUpdate>({})

  useEffect(() => {
    if (isOpen && school) {
      fetchQuotas()
    }
  }, [isOpen, school])

  const fetchQuotas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/communication-hub/schools/${school.schoolId}/quotas`)
      if (response.ok) {
        const data = await response.json()
        setQuotas(data)
        // Initialize form values
        setQuotaValues({
          smsLimitDaily: data.smsLimitDaily,
          smsLimitMonthly: data.smsLimitMonthly,
          whatsappLimitDaily: data.whatsappLimitDaily,
          whatsappLimitMonthly: data.whatsappLimitMonthly,
          emailLimitDaily: data.emailLimitDaily,
          emailLimitMonthly: data.emailLimitMonthly,
        })
      }
    } catch (error) {
      console.error('Failed to fetch quotas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCredits = async (channel: MessageChannel) => {
    const amount = parseInt(creditAmount[channel])
    if (amount > 0) {
      await onAddCredits(channel, amount)
      setCreditAmount(prev => ({ ...prev, [channel]: '' }))
      fetchQuotas() // Refresh quotas
    }
  }

  const handleSaveQuotas = async () => {
    try {
      setSaving(true)
      await onUpdateQuota(quotaValues)
      fetchQuotas() // Refresh quotas
    } catch (error) {
      console.error('Failed to save quotas:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEmergencyOverrideToggle = async (enabled: boolean) => {
    try {
      await onSetEmergencyOverride(enabled)
      fetchQuotas() // Refresh quotas
    } catch (error) {
      console.error('Failed to update emergency override:', error)
    }
  }

  const formatNumber = (value: number | null | undefined): string => {
    return value?.toString() || ''
  }

  const parseNumber = (value: string): number | null => {
    const parsed = parseInt(value)
    return isNaN(parsed) ? null : parsed
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Manage Quotas - {school.schoolName}
            </h3>
            <p className="text-sm text-slate-400">
              Configure messaging limits and credits for this school
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <SkeletonLoader variant="card" count={3} />
        ) : quotas ? (
          <div className="space-y-6">
            {/* SMS Section */}
            <div className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h4 className="text-sm font-medium text-slate-200">SMS Configuration</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Daily Limit</label>
                  <Input
                    type="number"
                    value={formatNumber(quotaValues.smsLimitDaily)}
                    onChange={(e) => setQuotaValues(prev => ({ 
                      ...prev, 
                      smsLimitDaily: parseNumber(e.target.value) 
                    }))}
                    placeholder="No limit"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Monthly Limit</label>
                  <Input
                    type="number"
                    value={formatNumber(quotaValues.smsLimitMonthly)}
                    onChange={(e) => setQuotaValues(prev => ({ 
                      ...prev, 
                      smsLimitMonthly: parseNumber(e.target.value) 
                    }))}
                    placeholder="No limit"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Current Credits</label>
                  <div className="text-lg font-semibold text-slate-100 py-2">
                    {quotas.smsCredits.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={creditAmount[MessageChannel.SMS]}
                  onChange={(e) => setCreditAmount(prev => ({ ...prev, [MessageChannel.SMS]: e.target.value }))}
                  placeholder="Add credits"
                  className="flex-1 bg-slate-700 border-slate-600"
                />
                <Button
                  onClick={() => handleAddCredits(MessageChannel.SMS)}
                  disabled={!creditAmount[MessageChannel.SMS]}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Credits
                </Button>
              </div>
            </div>

            {/* WhatsApp Section */}
            <div className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.700"/>
                </svg>
                <h4 className="text-sm font-medium text-slate-200">WhatsApp Configuration</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Daily Limit</label>
                  <Input
                    type="number"
                    value={formatNumber(quotaValues.whatsappLimitDaily)}
                    onChange={(e) => setQuotaValues(prev => ({ 
                      ...prev, 
                      whatsappLimitDaily: parseNumber(e.target.value) 
                    }))}
                    placeholder="No limit"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Monthly Limit</label>
                  <Input
                    type="number"
                    value={formatNumber(quotaValues.whatsappLimitMonthly)}
                    onChange={(e) => setQuotaValues(prev => ({ 
                      ...prev, 
                      whatsappLimitMonthly: parseNumber(e.target.value) 
                    }))}
                    placeholder="No limit"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Current Credits</label>
                  <div className="text-lg font-semibold text-slate-100 py-2">
                    {quotas.whatsappCredits.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={creditAmount[MessageChannel.WHATSAPP]}
                  onChange={(e) => setCreditAmount(prev => ({ ...prev, [MessageChannel.WHATSAPP]: e.target.value }))}
                  placeholder="Add credits"
                  className="flex-1 bg-slate-700 border-slate-600"
                />
                <Button
                  onClick={() => handleAddCredits(MessageChannel.WHATSAPP)}
                  disabled={!creditAmount[MessageChannel.WHATSAPP]}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Add Credits
                </Button>
              </div>
            </div>

            {/* Email Section */}
            <div className="border border-slate-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h4 className="text-sm font-medium text-slate-200">Email Configuration</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Daily Limit</label>
                  <Input
                    type="number"
                    value={formatNumber(quotaValues.emailLimitDaily)}
                    onChange={(e) => setQuotaValues(prev => ({ 
                      ...prev, 
                      emailLimitDaily: parseNumber(e.target.value) 
                    }))}
                    placeholder="No limit"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Monthly Limit</label>
                  <Input
                    type="number"
                    value={formatNumber(quotaValues.emailLimitMonthly)}
                    onChange={(e) => setQuotaValues(prev => ({ 
                      ...prev, 
                      emailLimitMonthly: parseNumber(e.target.value) 
                    }))}
                    placeholder="No limit"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Current Credits</label>
                  <div className="text-lg font-semibold text-slate-100 py-2">
                    {quotas.emailCredits.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Input
                  type="number"
                  value={creditAmount[MessageChannel.EMAIL]}
                  onChange={(e) => setCreditAmount(prev => ({ ...prev, [MessageChannel.EMAIL]: e.target.value }))}
                  placeholder="Add credits"
                  className="flex-1 bg-slate-700 border-slate-600"
                />
                <Button
                  onClick={() => handleAddCredits(MessageChannel.EMAIL)}
                  disabled={!creditAmount[MessageChannel.EMAIL]}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Add Credits
                </Button>
              </div>
            </div>

            {/* Emergency Override */}
            <div className="border border-red-700/50 rounded-lg p-4 bg-red-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-400">Emergency Override</h4>
                    <p className="text-xs text-slate-400">Allow critical messages to bypass all quotas and pause status</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quotas.emergencyOverride}
                    onChange={(e) => handleEmergencyOverrideToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>
              {quotas.emergencyOverride && (
                <div className="mt-3 p-2 bg-red-900/30 rounded text-xs text-red-300">
                  ⚠️ Emergency override is active. Critical messages will bypass all limits.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-400">Failed to load quota information</p>
            <Button
              onClick={fetchQuotas}
              variant="outline"
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-slate-700">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveQuotas}
            disabled={loading || saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}