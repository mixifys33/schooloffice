'use client'

import React, { useState } from 'react'
import { 
  Palette,
  Bell,
  Shield,
  Database,
  Settings as SettingsIcon
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppearanceSettings } from '@/components/settings/appearance-settings'

/**
 * DoS Settings Page
 * Academic-focused settings for Directors of Studies
 */

const dosSettingsTabs = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'academic', label: 'Academic', icon: SettingsIcon },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data Management', icon: Database },
  { id: 'security', label: 'Security', icon: Shield },
]

export default function DoSSettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance')

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          DoS Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Configure your academic management preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList 
          className="flex flex-wrap gap-1 h-auto p-1"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {dosSettingsTabs.map((tab) => {
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

        <TabsContent value="academic" className="mt-6">
          <div 
            className="p-6 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Academic Settings
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Academic configuration options will be available in a future update.
            </p>
          </div>
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

        <TabsContent value="data" className="mt-6">
          <div 
            className="p-6 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Data Management
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Data management tools will be available in a future update.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div 
            className="p-6 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
            }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Security Settings
            </h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Security controls will be available in a future update.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}