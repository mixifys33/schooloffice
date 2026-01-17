'use client'

import React, { useState } from 'react'
import { 
  Building2, 
  GraduationCap, 
  DollarSign, 
  MessageSquare, 
  Clock, 
  Award, 
  Users, 
  Shield, 
  Zap, 
  Activity 
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SchoolIdentitySettings } from '@/components/settings/school-identity-settings'
import { AcademicSettings } from '@/components/settings/academic-settings'
import { CommunicationSettings } from '@/components/settings/communication-settings'
import { AttendanceSettings } from '@/components/settings/attendance-settings'
import { GradingSettings } from '@/components/settings/grading-settings'
import { FinanceSettings } from '@/components/settings/finance-settings'
import { GuardianSettingsPage } from '@/components/settings/guardian-settings'
import { SecuritySettings } from '@/components/settings/security-settings'
import { AutomationRulesPage } from '@/components/settings/automation-rules'
import { SystemHealthDashboard } from '@/components/settings/system-health-dashboard'

/**
 * School Settings Page with Tabbed Navigation
 * Requirements: 10.1 - Settings navigation structure
 * Tabs: School Setup, Academic Rules, Finance Rules, Communication Rules, Automation, Security, System
 */

const settingsTabs = [
  { id: 'identity', label: 'School Setup', icon: Building2 },
  { id: 'academic', label: 'Academic', icon: GraduationCap },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'grading', label: 'Grading', icon: Award },
  { id: 'guardian', label: 'Guardian', icon: Users },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'system', label: 'System', icon: Activity },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('identity')

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your school&apos;s system settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2 px-3 py-2 text-sm"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
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

        <TabsContent value="finance" className="mt-6">
          <FinanceSettings />
        </TabsContent>

        <TabsContent value="communication" className="mt-6">
          <CommunicationSettings />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceSettings />
        </TabsContent>

        <TabsContent value="grading" className="mt-6">
          <GradingSettings />
        </TabsContent>

        <TabsContent value="guardian" className="mt-6">
          <GuardianSettingsPage />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="automation" className="mt-6">
          <AutomationRulesPage />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemHealthDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
