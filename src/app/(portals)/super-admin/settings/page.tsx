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
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Super Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage system-wide settings and configurations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          {superAdminSettingsTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">System Settings</h2>
            <p className="text-muted-foreground">System configuration options will be available here.</p>
          </div>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Security Settings</h2>
            <p className="text-muted-foreground">Security configuration options will be available here.</p>
          </div>
        </TabsContent>

        <TabsContent value="database" className="mt-6">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Database Settings</h2>
            <p className="text-muted-foreground">Database configuration options will be available here.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}