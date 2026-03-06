/**
 * SMS Template Editor
 * The engine, not the paint job. Proper controls to prevent SMS abuse.
 */
'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertBanner } from '@/components/ui/alert-banner'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'
import {
  SMSTemplateKey,
  BuiltInSMSTemplate,
  SMSTemplateValidation,
  SMSTemplatePreview,
  SMSTemplateRenderData
} from '@/types/sms-templates'

interface SMSTemplateEditorProps {
  template: BuiltInSMSTemplate
  customContent?: string
  userRole: string
  onSave: (templateKey: SMSTemplateKey, content: string) => Promise<void>
  onReset: (templateKey: SMSTemplateKey) => Promise<void>
  onPreview: (templateKey: SMSTemplateKey, content: string) => Promise<SMSTemplatePreview>
  onValidate: (templateKey: SMSTemplateKey, content: string) => Promise<SMSTemplateValidation>
}

export function SMSTemplateEditor({
  template,
  customContent,
  userRole,
  onSave,
  onReset,
  onPreview,
  onValidate
}: SMSTemplateEditorProps) {
  const [content, setContent] = useState(customContent || template.defaultContent)
  const [validation, setValidation] = useState<SMSTemplateValidation | null>(null)
  const [preview, setPreview] = useState<SMSTemplatePreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('editor')

  // Check if user has permission to edit this template
  const canEdit = template.editable && template.allowedRoles.includes(userRole)
  const canSend = template.allowedRoles.includes(userRole)

  // Validate content whenever it changes
  useEffect(() => {
    const validateContent = async () => {
      if (content.trim()) {
        try {
          const result = await onValidate(template.key, content)
          setValidation(result)
        } catch (error) {
          console.error('Validation error:', error)
        }
      }
    }

    const debounceTimer = setTimeout(validateContent, 500)
    return () => clearTimeout(debounceTimer)
  }, [content, template.key, onValidate])

  // Generate preview
  const handlePreview = async () => {
    try {
      setIsLoading(true)
      const result = await onPreview(template.key, content)
      setPreview(result)
      setActiveTab('preview')
    } catch (error) {
      console.error('Preview error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Save template
  const handleSave = async () => {
    if (!validation?.valid) return

    try {
      setIsLoading(true)
      await onSave(template.key, content)
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset to default
  const handleReset = async () => {
    try {
      setIsLoading(true)
      await onReset(template.key)
      setContent(template.defaultContent)
      setShowResetDialog(false)
    } catch (error) {
      console.error('Reset error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Insert variable at cursor position
  const insertVariable = (variableKey: string) => {
    const textarea = document.getElementById(`content-${template.key}`) as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newContent = content.substring(0, start) + `{${variableKey}}` + content.substring(end)
    
    setContent(newContent)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + variableKey.length + 2, start + variableKey.length + 2)
    }, 0)
  }

  return (
    <Card className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        {/* Template Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold">{template.name}</h3>
              <Badge variant={template.triggerType === 'AUTOMATIC' ? 'default' : 'secondary'}>
                {template.triggerType}
              </Badge>
              {template.requiresConfirmation && (
                <Badge variant="destructive" className="text-xs">REQUIRES CONFIRMATION</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{template.purpose}</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
              <span>Roles: {template.allowedRoles.join(', ')}</span>
              {template.maxPerTerm && (
                <span className="hidden sm:inline">• Max {template.maxPerTerm}/term</span>
              )}
            </div>
          </div>
          
          {!canEdit && (
            <Badge variant="outline" className="self-start">Read Only</Badge>
          )}
        </div>

        {/* Permission Check */}
        {!canSend && (
          <AlertBanner
            type="warning"
            message={`You don't have permission to send ${template.name} messages. Required roles: ${template.allowedRoles.join(', ')}`}
          />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor" className="text-xs sm:text-sm">Editor</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs sm:text-sm">Preview</TabsTrigger>
            <TabsTrigger value="variables" className="text-xs sm:text-sm">Variables</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-4">
            {/* Template Editor */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Left Panel: Template Controls */}
              <div className="space-y-4 order-2 lg:order-1">
                <div>
                  <Label className="text-sm font-medium">Template Type</Label>
                  <p className="text-sm text-muted-foreground">{template.key}</p>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Trigger Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {template.triggerType === 'MANUAL' && 'Manual sending only'}
                    {template.triggerType === 'AUTOMATIC' && 'Automatic triggers enabled'}
                    {template.triggerType === 'BOTH' && 'Manual and automatic'}
                  </p>
                </div>

                {/* Variable Chips */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">Quick Insert Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map((variable) => (
                      <button
                        key={variable.key}
                        onClick={() => insertVariable(variable.key)}
                        disabled={!canEdit}
                        className="inline-flex items-center px-2 py-1 text-xs bg-[var(--info-light)] text-[var(--info-dark)] rounded hover:bg-[var(--info)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        title={`${variable.description} (${variable.required ? 'Required' : 'Optional'})`}
                      >
                        {variable.key}
                        {variable.required && <span className="ml-1 text-[var(--danger)]">*</span>}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tap to insert into message
                  </p>
                </div>
              </div>

              {/* Center Panel: Message Editor */}
              <div className="space-y-4 order-1 lg:order-2">
                <div>
                  <Label htmlFor={`content-${template.key}`} className="text-sm font-medium">
                    Message Content
                  </Label>
                  <Textarea
                    id={`content-${template.key}`}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Enter your SMS template content..."
                    className="min-h-[200px] font-mono text-sm"
                    maxLength={template.maxLength}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>
                      {content.length} / {template.maxLength} chars
                    </span>
                    {validation && (
                      <span className={validation.costEstimate.isWithinLimit ? 'text-[var(--chart-green)]' : 'text-[var(--chart-yellow)]'}>
                        {validation.costEstimate.smsUnits} SMS units
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation Messages */}
                {validation && (
                  <div className="space-y-2">
                    {validation.errors.length > 0 && (
                      <AlertBanner
                        type="error"
                        message={`Errors: ${validation.errors.join(', ')}`}
                      />
                    )}
                    {validation.warnings.length > 0 && (
                      <AlertBanner
                        type="warning"
                        message={`Warnings: ${validation.warnings.join(', ')}`}
                      />
                    )}
                  </div>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={!validation?.valid || isLoading}
                      className="flex-1 w-full sm:w-auto"
                    >
                      {isLoading ? 'Saving...' : 'Save Template'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handlePreview}
                      disabled={!validation?.valid || isLoading}
                      className="w-full sm:w-auto"
                    >
                      Preview
                    </Button>
                    {customContent && (
                      <Button
                        variant="outline"
                        onClick={() => setShowResetDialog(true)}
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Right Panel: Live Preview */}
              <div className="space-y-4 order-3">
                <div>
                  <Label className="text-sm font-medium">Live Preview</Label>
                  <div className="border rounded-lg p-4 bg-[var(--bg-surface)] min-h-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
                      <span className="text-xs text-muted-foreground">Sample Phone</span>
                    </div>
                    <div className="bg-[var(--bg-main)] rounded-lg p-3 shadow-sm">
                      <p className="text-sm whitespace-pre-wrap">
                        {preview?.content || content || 'Type your message to see preview...'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cost Information */}
                {validation && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cost Estimate</Label>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Characters:</span>
                        <span className="font-medium">{validation.characterCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SMS Units:</span>
                        <span className="font-medium">{validation.costEstimate.smsUnits}</span>
                      </div>
                      <div className="flex justify-between font-medium text-[var(--chart-blue)]">
                        <span>Est. Cost:</span>
                        <span>UGX {validation.costEstimate.estimatedCost}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {preview ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Message Preview</Label>
                    <div className="border rounded-lg p-4 bg-[var(--bg-surface)]">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-[var(--success)] rounded-full"></div>
                        <span className="text-xs text-muted-foreground">+256700123456</span>
                      </div>
                      <div className="bg-[var(--bg-main)] rounded-lg p-3 shadow-sm">
                        <p className="text-sm whitespace-pre-wrap">{preview.content}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Sample Data Used</Label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {Object.entries(preview.sampleData).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm gap-2">
                          <span className="font-mono text-[var(--chart-blue)] text-xs">{key}:</span>
                          <span className="text-right break-words">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-semibold">{preview.characterCount}</div>
                    <div className="text-xs text-muted-foreground">Characters</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-semibold">{preview.smsUnits}</div>
                    <div className="text-xs text-muted-foreground">SMS Units</div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="text-lg font-semibold">UGX {preview.estimatedCost}</div>
                    <div className="text-xs text-muted-foreground">Est. Cost</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Click "Preview" button in the Editor tab to generate a preview with sample data</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="variables" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Template Variables</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Click "Insert" to add a variable to your template. Required variables are marked with *.
                </p>
              </div>

              <div className="grid gap-3 md:gap-4">
                {template.variables.map((variable) => (
                  <div key={variable.key} className="border rounded-lg p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="text-xs sm:text-sm bg-[var(--bg-surface)] px-2 py-1 rounded">
                            {`{${variable.key}}`}
                          </code>
                          {variable.required && (
                            <Badge variant="destructive" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{variable.description}</p>
                        <p className="text-xs text-muted-foreground">
                          Example: <span className="font-medium">{variable.example}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          insertVariable(variable.key)
                          setActiveTab('editor')
                        }}
                        disabled={!canEdit}
                        className="w-full sm:w-auto"
                      >
                        Insert
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Reset Confirmation Dialog */}
        <ConfirmationDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          title="Reset Template to Default"
          description="This will permanently delete your custom template and restore the built-in default. This action cannot be undone."
          confirmText="Reset Template"
          onConfirm={handleReset}
          variant="destructive"
        />
      </div>
    </Card>
  )
}