/**
 * SMS Templates Manager
 * The complete SMS template system with built-in templates and controls
 * Prevents SMS abuse through proper permissions and limits
 */
'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SMSTemplateEditor } from './sms-template-editor'
import {
  SMSTemplateKey,
  BuiltInSMSTemplate,
  CustomSMSTemplate,
  SMSTemplateValidation,
  SMSTemplatePreview,
  SMSAutomationRule,
  SMSCreditProtection
} from '@/types/sms-templates'

interface SMSTemplatesManagerProps {
  schoolId: string
  userRole: string
  userId: string
}

export function SMSTemplatesManager({ schoolId, userRole, userId }: SMSTemplatesManagerProps) {
  const [builtInTemplates, setBuiltInTemplates] = useState<BuiltInSMSTemplate[]>([])
  const [customTemplates, setCustomTemplates] = useState<Map<SMSTemplateKey, CustomSMSTemplate>>(new Map())
  const [automationRules, setAutomationRules] = useState<SMSAutomationRule[]>([])
  const [creditProtection, setCreditProtection] = useState<SMSCreditProtection | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplateKey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load data on component mount
  useEffect(() => {
    loadTemplateData()
  }, [schoolId])

  const loadTemplateData = async () => {
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

      // Load automation rules
      const automationResponse = await fetch(`/api/sms/automation?schoolId=${schoolId}`)
      if (!automationResponse.ok) throw new Error('Failed to load automation rules')
      const automationData = await automationResponse.json()
      setAutomationRules(automationData.rules)

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
  }

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
      
      // Show success message (you might want to add a toast notification here)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)] mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading SMS templates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <AlertBanner
        type="error"
        message={error}
        action={
          <Button variant="outline" size="sm" onClick={loadTemplateData}>
            Retry
          </Button>
        }
      />
    )
  }

  const selectedTemplateData = builtInTemplates.find(t => t.key === selectedTemplate)
  const customTemplate = selectedTemplate ? customTemplates.get(selectedTemplate) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Templates</h2>
          <p className="text-muted-foreground">
            Manage your school's SMS templates with built-in controls and cost protection
          </p>
        </div>
        
        {/* Credit Protection Status */}
        {creditProtection && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Credit Protection</div>
            <Badge variant={creditProtection.enableProtection ? 'default' : 'secondary'}>
              {creditProtection.enableProtection ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar: Template List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Templates</h3>
            <div className="space-y-2">
              {builtInTemplates.map((template) => {
                const hasCustom = customTemplates.has(template.key)
                const canUse = template.allowedRoles.includes(userRole)
                
                return (
                  <button
                    key={template.key}
                    onClick={() => setSelectedTemplate(template.key)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate === template.key
                        ? 'border-[var(--accent-primary)] bg-[var(--info-light)]'
                        : 'border-[var(--border-default)] hover:border-[var(--border-default)]'
                    } ${!canUse ? 'opacity-50' : ''}`}
                    disabled={!canUse}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{template.name}</span>
                      {hasCustom && (
                        <Badge variant="outline" className="text-xs">Custom</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <Badge 
                        variant={template.triggerType === 'AUTOMATIC' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {template.triggerType}
                      </Badge>
                      {template.requiresConfirmation && (
                        <Badge variant="destructive" className="text-xs">!</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {template.purpose}
                    </p>
                    {!canUse && (
                      <p className="text-xs text-[var(--danger)] mt-1">
                        Requires: {template.allowedRoles.join(', ')}
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
              <p className="text-muted-foreground">Select a template to edit</p>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Section: System Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold mb-2">Template Rules</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• SMS has one job - don't try to do two things</li>
            <li>• Character limits prevent cost overruns</li>
            <li>• Required variables ensure message completeness</li>
            <li>• Role restrictions prevent unauthorized sending</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Cost Protection</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Real-time cost estimation</li>
            <li>• Daily and term limits enforced</li>
            <li>• Emergency reserve protection</li>
            <li>• Automatic blocking on zero balance</li>
          </ul>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-2">Audit & Control</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Every SMS logged forever</li>
            <li>• Template changes tracked</li>
            <li>• Permission violations blocked</li>
            <li>• Usage reports available</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}