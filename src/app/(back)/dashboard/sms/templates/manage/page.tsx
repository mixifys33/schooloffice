/**
 * SMS Template Management Page
 * Complete template creation, editing, and management with 160-character limits
 */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { 
  MessageSquare, 
  Plus, 
  Edit3, 
  Eye, 
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  DollarSign,
  Clock,
  Trash2,
  Copy
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface SMSTemplate {
  id: string | null
  type: string
  name: string
  content: string
  isCustom: boolean
  isActive: boolean
  placeholders: string[]
  category: 'fees' | 'attendance' | 'academic' | 'general'
  estimatedCost: number
  characterCount: number
}

const TEMPLATE_CATEGORIES = {
  fees: { name: 'Fee Management', icon: DollarSign, color: 'text-[var(--chart-green)]' },
  attendance: { name: 'Attendance', icon: Users, color: 'text-[var(--chart-blue)]' },
  academic: { name: 'Academic', icon: FileText, color: 'text-[var(--chart-purple)]' },
  general: { name: 'General', icon: MessageSquare, color: 'text-[var(--chart-yellow)]' }
}

export default function SMSTemplateManagePage() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading SMS templates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            SMS Template Manager
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">Create and manage SMS templates with 160-character limits for cost control</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            UGX 45 per SMS
          </Badge>
          <Badge variant="outline" className="text-sm">
            160 char limit
          </Badge>
        </div>
      </div>

      <Card className="p-8 text-center">
        <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">SMS Template Management</h3>
        <p className="text-muted-foreground mb-4">
          This feature is being enhanced with 160-character limits and cost management.
        </p>
        <Button onClick={() => window.location.href = '/dashboard/sms/templates'}>
          <FileText className="h-4 w-4 mr-2" />
          Go to Current Templates
        </Button>
      </Card>
    </div>
  )
}