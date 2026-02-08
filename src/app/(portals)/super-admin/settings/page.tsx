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