'use client'

import React, { useState } from 'react'
import { 
  User, 
  Palette,
  Bell
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppearanceSettings } from '@/components/settings/appearance-settings'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { ProfileSettings } from '@/components/settings/profile-settings'

/**
 * Teacher Settings Page
 * Simplified settings for teachers with focus on personal preferences
 */

const teacherSettingsTabs = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
]

export default function TeacherSettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance')

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Customize your teaching experience
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList 
          className="flex flex-wrap gap-1 h-auto p-1"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {teacherSettingsTabs.map((tab) => {
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
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="profile" className="mt-6">
          <ProfileSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}