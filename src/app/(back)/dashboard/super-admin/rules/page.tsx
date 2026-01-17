'use client'

import React, { useEffect, useState } from 'react'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Toast } from '@/components/ui/toast'

/**
 * System Rules Page
 * Requirements: 17.1, 17.2, 17.3, 17.4
 * - Display configurable rules: grace period days, features disabled on late payment, suspension trigger conditions
 * - Save new grace period value via PUT to /api/admin/settings
 * - Define feature lock order (SMS, then reports, then full access)
 * - Apply changes to all schools on next daily check
 */

interface SystemRules {
  id: string
  gracePeriodDays: number
  featureLockOrder: string[]
  pilotStudentLimit: number
  pilotSmsLimit: number
  pilotDurationDays: number
  updatedAt: string
  updatedBy: string
}

interface ToastState {
  show: boolean
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

const AVAILABLE_FEATURES = ['SMS', 'REPORTS', 'FULL_ACCESS']

export default function SystemRulesPage() {
  const [rules, setRules] = useState<SystemRules | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>({ show: false, type: 'info', message: '' })
  
  // Form state
  const [gracePeriodDays, setGracePeriodDays] = useState(14)
  const [featureLockOrder, setFeatureLockOrder] = useState<string[]>(['SMS', 'REPORTS', 'FULL_ACCESS'])
  const [pilotStudentLimit, setPilotStudentLimit] = useState(50)
  const [pilotSmsLimit, setPilotSmsLimit] = useState(100)
  const [pilotDurationDays, setPilotDurationDays] = useState(30)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchRules()
  }, [])

  // Track changes
  useEffect(() => {
    if (rules) {
      const changed = 
        gracePeriodDays !== rules.gracePeriodDays ||
        JSON.stringify(featureLockOrder) !== JSON.stringify(rules.featureLockOrder) ||
        pilotStudentLimit !== rules.pilotStudentLimit ||
        pilotSmsLimit !== rules.pilotSmsLimit ||
        pilotDurationDays !== rules.pilotDurationDays
      setHasChanges(changed)
    }
  }, [gracePeriodDays, featureLockOrder, pilotStudentLimit, pilotSmsLimit, pilotDurationDays, rules])

  async function fetchRules() {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/admin/settings')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access denied. Super Admin privileges required.')
        }
        throw new Error('Failed to fetch system rules')
      }
      
      const data = await response.json()
      setRules(data)
      setGracePeriodDays(data.gracePeriodDays)
      setFeatureLockOrder(data.featureLockOrder)
      setPilotStudentLimit(data.pilotStudentLimit)
      setPilotSmsLimit(data.pilotSmsLimit)
      setPilotDurationDays(data.pilotDurationDays)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    try {
      setSaving(true)
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gracePeriodDays,
          featureLockOrder,
          pilotStudentLimit,
          pilotSmsLimit,
          pilotDurationDays
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update system rules')
      }

      setRules(data.rules)
      setToast({
        show: true,
        type: 'success',
        message: 'System rules updated successfully. Changes will apply on next daily check.'
      })
      setHasChanges(false)
    } catch (err) {
      setToast({
        show: true,
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to update system rules'
      })
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    if (rules) {
      setGracePeriodDays(rules.gracePeriodDays)
      setFeatureLockOrder(rules.featureLockOrder)
      setPilotStudentLimit(rules.pilotStudentLimit)
      setPilotSmsLimit(rules.pilotSmsLimit)
      setPilotDurationDays(rules.pilotDurationDays)
    }
  }

  function moveFeatureUp(index: number) {
    if (index === 0) return
    const newOrder = [...featureLockOrder]
    ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
    setFeatureLockOrder(newOrder)
  }

  function moveFeatureDown(index: number) {
    if (index === featureLockOrder.length - 1) return
    const newOrder = [...featureLockOrder]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    setFeatureLockOrder(newOrder)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Rules</h1>
          <p className="text-gray-600">Configure system-wide payment enforcement rules</p>
        </div>
        <SkeletonLoader variant="card" count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">System Rules</h1>
          <p className="text-gray-600">Configure system-wide payment enforcement rules</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchRules}
            className="mt-2 text-sm text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast.show && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Rules</h1>
        <p className="text-gray-600">Configure system-wide payment enforcement rules</p>
        {rules && (
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {new Date(rules.updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Grace Period Configuration - Requirement 17.1, 17.2 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Payment Grace Period</h2>
        <p className="text-sm text-gray-600 mb-4">
          Number of days after payment due date before a school is suspended. 
          During the grace period, SMS and report features will be disabled.
        </p>
        
        <div className="flex items-center gap-4">
          <label htmlFor="gracePeriod" className="text-sm font-medium text-gray-700">
            Grace Period Days:
          </label>
          <input
            id="gracePeriod"
            type="number"
            min="0"
            max="90"
            value={gracePeriodDays}
            onChange={(e) => setGracePeriodDays(parseInt(e.target.value) || 0)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">days (0-90)</span>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">How it works:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Day 0: Payment due date passes</li>
            <li>• Day 1 to {gracePeriodDays}: Grace period - SMS and reports disabled</li>
            <li>• Day {gracePeriodDays + 1}+: School suspended - all access blocked</li>
          </ul>
        </div>
      </div>

      {/* Feature Lock Order - Requirement 17.3 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Feature Restriction Order</h2>
        <p className="text-sm text-gray-600 mb-4">
          Define the order in which features are disabled when a school fails to pay. 
          Features at the top are disabled first.
        </p>

        <div className="space-y-2">
          {featureLockOrder.map((feature, index) => (
            <div 
              key={feature}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-700">
                  {feature === 'SMS' && '📱 SMS Messaging'}
                  {feature === 'REPORTS' && '📊 Report Cards'}
                  {feature === 'FULL_ACCESS' && '🔒 Full Dashboard Access'}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => moveFeatureUp(index)}
                  disabled={index === 0}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveFeatureDown(index)}
                  disabled={index === featureLockOrder.length - 1}
                  className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> During the grace period, features are progressively disabled 
            in this order. Full access suspension only occurs after the grace period expires.
          </p>
        </div>
      </div>

      {/* Pilot School Limits - Requirement 17.1 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Pilot School Limits</h2>
        <p className="text-sm text-gray-600 mb-4">
          Configure default limits for schools on free pilot/trial period.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="pilotStudents" className="block text-sm font-medium text-gray-700 mb-1">
              Student Limit
            </label>
            <input
              id="pilotStudents"
              type="number"
              min="1"
              max="500"
              value={pilotStudentLimit}
              onChange={(e) => setPilotStudentLimit(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Max students per pilot school</p>
          </div>

          <div>
            <label htmlFor="pilotSms" className="block text-sm font-medium text-gray-700 mb-1">
              SMS Limit
            </label>
            <input
              id="pilotSms"
              type="number"
              min="0"
              max="1000"
              value={pilotSmsLimit}
              onChange={(e) => setPilotSmsLimit(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Max SMS per pilot school</p>
          </div>

          <div>
            <label htmlFor="pilotDuration" className="block text-sm font-medium text-gray-700 mb-1">
              Trial Duration
            </label>
            <input
              id="pilotDuration"
              type="number"
              min="7"
              max="365"
              value={pilotDurationDays}
              onChange={(e) => setPilotDurationDays(parseInt(e.target.value) || 7)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Days before pilot expires</p>
          </div>
        </div>
      </div>

      {/* Suspension Trigger Conditions - Requirement 17.1 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Suspension Trigger Conditions</h2>
        <p className="text-sm text-gray-600 mb-4">
          Schools are automatically suspended when any of these conditions are met:
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium text-red-800">Payment Overdue + Grace Period Expired</p>
              <p className="text-sm text-red-700">
                School has not paid and {gracePeriodDays} days have passed since due date
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <span className="text-red-500 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium text-red-800">Pilot Period Expired</p>
              <p className="text-sm text-red-700">
                Pilot school has exceeded {pilotDurationDays} days without converting to paid
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <span className="text-orange-500 mt-0.5">📋</span>
            <div>
              <p className="font-medium text-orange-800">Manual Suspension by Super Admin</p>
              <p className="text-sm text-orange-700">
                Super Admin can manually suspend any school at any time
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rule Propagation Notice - Requirement 17.4 */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-purple-500 text-xl">🔄</span>
          <div>
            <h3 className="font-medium text-purple-800">Rule Propagation</h3>
            <p className="text-sm text-purple-700 mt-1">
              Changes to system rules will be applied to all schools on the next daily enforcement check.
              The daily check runs automatically at midnight and can also be triggered manually from the 
              Subscriptions page.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleReset}
          disabled={!hasChanges || saving}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset Changes
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saving ? (
            <>
              <span className="animate-spin">⏳</span>
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}
