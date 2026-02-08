/**
 * Templates Section Component
 * Integrates the SMS Templates Manager into the Communications Hub
 */
'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  MessageSquare, 
  Plus, 
  Edit3, 
  Eye, 
  Settings,
  AlertTriangle,
  CheckCircle,
  FileText,
  Users,
  DollarSign,
  Clock
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SMSTemplate {
  id: string | null
  type: string
  name: string
  content: string
  isCustom: boolean
  isActive: boolean
  placeholders: string[]
  characterCount: number
  estimatedCost: number
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FEES_REMINDER: DollarSign,
  FEES_RECEIPT: CheckCircle,
  ATTENDANCE_ALERT: Users,
  REPORT_READY: FileText,
  GENERAL_ANNOUNCEMENT: MessageSquare,
  EMERGENCY_ALERT: AlertTriangle,
  TERM_START: Clock,
  MID_TERM_PROGRESS: FileText,
  TERM_SUMMARY: FileText,
  DISCIPLINE_NOTICE: AlertTriangle
}

const TEMPLATE_COLORS: Record<string, string> = {
  FEES_REMINDER: 'text-[var(--chart-green)]',
  FEES_RECEIPT: 'text-[var(--chart-blue)]',
  ATTENDANCE_ALERT: 'text-[var(--chart-yellow)]',
  REPORT_READY: 'text-[var(--chart-purple)]',
  GENERAL_ANNOUNCEMENT: 'text-[var(--chart-yellow)]',
  EMERGENCY_ALERT: 'text-[var(--chart-red)]',
  TERM_START: 'text-[var(--chart-purple)]',
  MID_TERM_PROGRESS: 'text-[var(--chart-green)]',
  TERM_SUMMARY: 'text-[var(--chart-cyan)]',
  DISCIPLINE_NOTICE: 'text-[var(--chart-purple)]'
}

export function TemplatesSection() {
  const { data: session } = useSession()
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const schoolId = (session?.user as { schoolId?: string })?.schoolId
  const userRole = (session?.user as { role?: string })?.role || ''

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sms/templates')
      if (!response.ok) throw new Error('Failed to load templates')
      
      const data = await response.json()
      const enhancedTemplates = data.templates.map((template: any) => ({
        ...template,
        characterCount: template.content.length,
        estimatedCost: Math.ceil(template.content.length / 160) * 45
      }))
      
      setTemplates(enhancedTemplates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  if (!schoolId) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Unable to load templates - school information not found</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)] mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading SMS templates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-[var(--danger)]" />
        <p className="text-[var(--chart-red)] mb-4">{error}</p>
        <Button onClick={loadTemplates} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Templates</h2>
          <p className="text-muted-foreground">
            Manage your school's SMS templates with 160-character limits for cost control
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/sms/templates">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview Templates
            </Button>
          </Link>
          <Link href="/dashboard/sms/templates/manage">
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
          </Link>
        </div>
      </div>

      {/* Character Limit Info */}
      <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--chart-yellow)]" />
          <div>
            <h3 className="font-medium text-[var(--warning-dark)]">SMS Cost Management</h3>
            <p className="text-sm text-[var(--warning)] mt-1">
              Each SMS is limited to 160 characters and costs UGX 45. Templates exceeding this limit will be charged for multiple segments.
            </p>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
          <p className="text-muted-foreground mb-4">
            Get started by creating your first SMS template.
          </p>
          <Link href="/dashboard/sms/templates/manage">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const IconComponent = TEMPLATE_ICONS[template.type] || MessageSquare
            const iconColor = TEMPLATE_COLORS[template.type] || 'text-[var(--text-secondary)]'
            const isOverLimit = template.characterCount > 160
            
            return (
              <Card key={template.type} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`h-5 w-5 ${iconColor}`} />
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {template.isCustom && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                      <Badge 
                        variant={isOverLimit ? 'destructive' : 'secondary'} 
                        className="text-xs"
                      >
                        {template.characterCount}/160
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-[var(--text-secondary)] line-clamp-3">
                    {template.content}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cost: UGX {template.estimatedCost}</span>
                    <span>{template.placeholders.length} variables</span>
                  </div>

                  {isOverLimit && (
                    <div className="text-xs text-[var(--chart-red)] bg-[var(--danger-light)] p-2 rounded">
                      ⚠️ Exceeds 160 characters - will cost UGX {template.estimatedCost}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/dashboard/sms/templates?selected=${template.type}`}>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </Button>
                    </Link>
                    <Link href="/dashboard/sms/templates/manage">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[var(--accent-primary)]" />
            <div>
              <div className="text-2xl font-bold">{templates.length}</div>
              <div className="text-sm text-muted-foreground">Total Templates</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-[var(--success)]" />
            <div>
              <div className="text-2xl font-bold">{templates.filter(t => t.isCustom).length}</div>
              <div className="text-sm text-muted-foreground">Custom Templates</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
            <div>
              <div className="text-2xl font-bold">{templates.filter(t => t.characterCount > 160).length}</div>
              <div className="text-sm text-muted-foreground">Over 160 Chars</div>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[var(--chart-purple)]" />
            <div>
              <div className="text-2xl font-bold">
                UGX {Math.round(templates.reduce((sum, t) => sum + t.estimatedCost, 0) / templates.length) || 0}
              </div>
              <div className="text-sm text-muted-foreground">Avg Cost</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}