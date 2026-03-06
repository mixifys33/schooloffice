/**
 * SMS Templates Manager
 * The complete SMS template system with built-in templates and controls
 * Prevents SMS abuse through proper permissions and limits
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SMSTemplateEditor } from '@/components/communication/sms-template-editor'
import { AlertTriangle, FileText, Zap } from 'lucide-react'
import {
  SMSTemplateKey,
  BuiltInSMSTemplate,
  CustomSMSTemplate,
  SMSTemplateValidation,
  SMSTemplatePreview,
  SMSCreditProtection
} from '@/types/sms-templates'

export default function ManageTemplatesPage() {
  const { data: session, status } = useSession()
  const [builtInTemplates, setBuiltInTemplates] = useState<BuiltInSMSTemplate[]>([])
  const [customTemplates, setCustomTemplates] = useState<Map<SMSTemplateKey, CustomSMSTemplate>>(new Map())
  const [creditProtection, setCreditProtection] = useState<SMSCreditProtection | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplateKey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const schoolId = session?.user?.schoolId || session?.user?.id || ''
  const userId = session?.user?.id || ''
  const userRole = session?.user?.role || 'TEACHER'

  const loadTemplateData = useCallback(async () => {
    if (!schoolId) return

    try {
      setIsLoading(true)
      setError(null)

      // Load built-in templates
      const builtInResponse = await fetch('/api/sms/templates/built-in')
      if (!builtInResponse.ok) throw new Error('Failed to load built-in templates')
      const builtInData = await builtInResponse.json()
      setBuiltInTemplates(builtInData.templates)

      // Load custom templates
      const customResponse = await fetch(`/api/sms/templates/custom?schoolId=${schoolId}`)
      if (!customResponse.ok) throw new Error('Failed to load custom templates')
      const customData = await customResponse.json()
      const customMap = new Map<SMSTemplateKey, CustomSMSTemplate>()
      customData.templates.forEach((template: CustomSMSTemplate) => {
        customMap.set(template.templateKey, template)
      })
      setCustomTemplates(customMap)

      // Load credit protection settings
      const protectionResponse = await fetch(`/api/sms/credit-protection?schoolId=${schoolId}`)
      if (!protectionResponse.ok) throw new Error('Failed to load credit protection')
      const protectionData = await protectionResponse.json()
      setCreditProtection(protectionData.protection)

      // Select first template by default
      if (builtInData.templates.length > 0) {
        setSelectedTemplate(builtInData.templates[0].key)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load template data')
    } finally {
      setIsLoading(false)
    }
  }, [schoolId])

  // Load data on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      loadTemplateData()
    }
  }, [status, loadTemplateData])

  const handleSaveTemplate = async (templateKey: SMSTemplateKey, content: string) => {
    try {
      const response = await fetch('/api/sms/templates/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          templateKey,
          customContent: content,
          createdBy: userId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save template')
      }

      const data = await response.json()
      
      // Update local state
      setCustomTemplates(prev => new Map(prev.set(templateKey, data.template)))
      
      console.log('Template saved successfully')
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to save template')
    }
  }

  const handleResetTemplate = async (templateKey: SMSTemplateKey) => {
    try {
      const response = await fetch('/api/sms/templates/custom', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          templateKey
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset template')
      }

      // Update local state
      setCustomTemplates(prev => {
        const newMap = new Map(prev)
        newMap.delete(templateKey)
        return newMap
      })
      
      console.log('Template reset to default successfully')
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to reset template')
    }
  }

  const handlePreviewTemplate = async (templateKey: SMSTemplateKey, content: string): Promise<SMSTemplatePreview> => {
    const response = await fetch('/api/sms/templates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey,
        content
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to generate preview')
    }

    const data = await response.json()
    return data.preview
  }

  const handleValidateTemplate = async (templateKey: SMSTemplateKey, content: string): Promise<SMSTemplateValidation> => {
    const response = await fetch('/api/sms/templates/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateKey,
        content
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to validate template')
    }

    const data = await response.json()
    return data.validation
  }

  // Handle authentication loading
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--chart-blue)] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (status === 'unauthenticated' || !session?.user) {
    redirect('/auth/signin')
  }

  // Check permissions
  const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'TEACHER']
  
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-[var(--danger)]">
          <div className="p-6">
            <div className="flex items-center gap-3 text-[var(--danger)]">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h3 className="font-semibold text-lg">Access Denied</h3>
                <p className="text-sm">You do not have permission to manage SMS templates.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)] mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading SMS templates...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <AlertBanner
          type="error"
          message={error}
        />
        <Button variant="outline" size="sm" onClick={loadTemplateData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  const selectedTemplateData = builtInTemplates.find(t => t.key === selectedTemplate)
  const customTemplate = selectedTemplate ? customTemplates.get(selectedTemplate) : null

  const customTemplateCount = customTemplates.size
  const totalTemplates = builtInTemplates.length

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">SMS Template Manager</h2>
            <p className="text-sm text-muted-foreground">
              Customize SMS templates for school communications
            </p>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-left md:text-right">
              <div className="text-xs text-muted-foreground">Templates</div>
              <div className="text-base md:text-lg font-semibold">
                {customTemplateCount} / {totalTemplates} customized
              </div>
            </div>
            {creditProtection && (
              <div className="text-left md:text-right">
                <div className="text-xs text-muted-foreground">Protection</div>
                <Badge variant={creditProtection.enableProtection ? 'default' : 'secondary'}>
                  {creditProtection.enableProtection ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Left Sidebar: Template List */}
          <div className="lg:col-span-1">
            <Card className="p-3 md:p-4">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="font-semibold text-sm md:text-base">Templates</h3>
                <Badge variant="outline">{builtInTemplates.length}</Badge>
              </div>
              <div className="space-y-2 max-h-[300px] lg:max-h-[calc(100vh-300px)] overflow-y-auto">
                {builtInTemplates.map((template) => {
                  const hasCustom = customTemplates.has(template.key)
                  const canUse = template.allowedRoles.includes(userRole)
                  
                  return (
                    <button
                      key={template.key}
                      onClick={() => setSelectedTemplate(template.key)}
                      className={`w-full text-left p-2 md:p-3 rounded-lg border transition-colors ${
                        selectedTemplate === template.key
                          ? 'border-[var(--accent-primary)] bg-[var(--info-light)]'
                          : 'border-[var(--border-default)] hover:bg-[var(--bg-surface)]'
                      } ${!canUse ? 'opacity-50' : ''}`}
                      disabled={!canUse}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {template.triggerType === 'AUTOMATIC' ? (
                          <Zap className="h-3 w-3 text-[var(--chart-blue)] flex-shrink-0" />
                        ) : (
                          <FileText className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="font-medium text-xs md:text-sm flex-1 line-clamp-1">{template.name}</span>
                        {hasCustom && (
                          <Badge variant="outline" className="text-xs">✓</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 ml-5">
                        {template.purpose}
                      </p>
                      {!canUse && (
                        <p className="text-xs text-[var(--danger)] mt-1 ml-5">
                          Restricted
                        </p>
                      )}
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Main Content: Template Editor */}
          <div className="lg:col-span-3">
            {selectedTemplateData ? (
              <SMSTemplateEditor
                template={selectedTemplateData}
                customContent={customTemplate?.customContent}
                userRole={userRole}
                onSave={handleSaveTemplate}
                onReset={handleResetTemplate}
                onPreview={handlePreviewTemplate}
                onValidate={handleValidateTemplate}
              />
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Select a template to edit</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
