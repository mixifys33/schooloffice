'use client'

import React, { useState } from 'react'
import { 
  Palette,
  Bell,
  Shield,
  User
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppearanceSettings } from '@/components/settings/appearance-settings'

/**
 * Parent Settings Page
 * Simplified settings for parents
 */

const parentSettingsTabs = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'privacy', label: 'Privacy', icon: Shield },
]

export default function ParentSettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance')

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Customize your parent portal experience
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList 
          className="flex flex-wrap gap-1 h-auto p-1"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {parentSettingsTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
                style={{
                  color: activeTab === tab.id ? 'var(--accent-contrast)' : 'var(--text-secondary)',
                  backgroundColor: activeTab === tab.id ? 'var(--accent-primary)' : 'transparent',
                }}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <div 
            className="p-6 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Notification Preferences
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Notification settings will be available in a future update.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <div 
            className="p-6 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Profile Settings
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Profile management will be available in a future update.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <div 
            className="p-6 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Privacy Settings
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Privacy controls will be available in a future update.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}