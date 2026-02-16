'use client'

import React, { useState } from 'react'
import { 
  Building2, 
  GraduationCap, 
  MessageSquare, 
  Shield, 
  Palette
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SchoolIdentitySettings } from '@/components/settings/school-identity-settings'
import { AcademicSettings } from '@/components/settings/academic-settings'
import { CommunicationSettings } from '@/components/settings/communication-settings'
import { SecuritySettings } from '@/components/settings/security-settings'
import { AppearanceSettings } from '@/components/settings/appearance-settings'

/**
 * School Settings Page with Tabbed Navigation
 * Requirements: 10.1 - Settings navigation structure
 * Tabs: School Setup, Academic Rules, Finance Rules, Communication Rules, Automation, Security, System
 */

const settingsTabs = [
  { id: 'identity', label: 'School', icon: Building2, status: 'working' },
  { id: 'academic', label: 'Academic', icon: GraduationCap, status: 'coming-soon' },
  { id: 'communication', label: 'Communication', icon: MessageSquare, status: 'partial' },
  { id: 'security', label: 'Security', icon: Shield, status: 'coming-soon' },
  { id: 'appearance', label: 'Appearance', icon: Palette, status: 'working' },
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'working': return 'text-[var(--chart-green)]'
    case 'partial': return 'text-[var(--chart-yellow)]'
    case 'coming-soon': return 'text-[var(--text-muted)]'
    default: return 'text-[var(--text-secondary)]'
  }
}

const getStatusIndicator = (status: string) => {
  switch (status) {
    case 'working': return '●'
    case 'partial': return '◐'
    case 'coming-soon': return '○'
    default: return ''
  }
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('identity')

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your school&apos;s system settings and preferences
        </p>
        <div className="mt-2 text-xs text-[var(--text-muted)]">
          Status: <span className="text-[var(--chart-green)]">● Working</span> | 
          <span className="text-[var(--chart-yellow)]"> ◐ Partial</span> | 
          <span className="text-[var(--text-muted)]"> ○ Coming Soon</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon
            const statusColor = getStatusColor(tab.status)
            const statusIndicator = getStatusIndicator(tab.status)
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className={`text-xs ${statusColor}`}>{statusIndicator}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="identity" className="mt-6">
          <SchoolIdentitySettings />
        </TabsContent>

        <TabsContent value="academic" className="mt-6">
          <AcademicSettings />
        </TabsContent>

        <TabsContent value="communication" className="mt-6">
          <CommunicationSettings />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <AppearanceSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
