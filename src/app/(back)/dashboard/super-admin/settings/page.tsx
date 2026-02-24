'use client'

import React, { useState } from 'react'
import { 
  Palette,
  Shield,
  Database,
  Settings as SettingsIcon,
  Globe,
  Activity
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppearanceSettings } from '@/components/settings/appearance-settings'

/**
 * Super Admin Settings Page
 * System-wide settings for super administrators
 */

const superAdminSettingsTabs = [
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'system', label: 'System', icon: SettingsIcon },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
]

export default function SuperAdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('appearance')

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Super Admin Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage system-wide settings and configurations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          {superAdminSettingsTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="system">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">
              System settings configuration coming soon...
            </p>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Security settings configuration coming soon...
            </p>
          </div>
        </TabsContent>

        <TabsContent value="database">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-4">Database Settings</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Database settings configuration coming soon...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
 