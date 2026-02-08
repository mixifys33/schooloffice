/**
 * SMS Templates Test Page
 * Demonstrates the new SMS template system with real data rendering
 */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  MessageSquare, 
  Eye, 
  CheckCircle,
  AlertTriangle,
  FileText,
  Users,
  DollarSign,
  Settings,
  Edit3
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SMSLiveTester } from '@/components/communication/sms-live-tester'

interface TemplateDemo {
  key: string
  name: string
  purpose: string
  sampleData: Record<string, string>
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const templateDemos: TemplateDemo[] = [
  {
    key: 'FEES_BALANCE',
    name: 'Fee Balance Reminder',
    purpose: 'Push payment without sounding like extortion',
    sampleData: {
      PARENT_NAME: 'Mr. Mukasa',
      STUDENT_NAME: 'Sarah Mukasa',
      BALANCE: '350,000',
      TERM: 'Term 1 2024',
      SCHOOL_NAME: 'St. Mary\'s Primary School',
      PAYMENT_DEADLINE: '15th March 2024'
    },
    icon: DollarSign,
    color: 'text-[var(--chart-green)]'
  },
  {
    key: 'FEES_RECEIPT',
    name: 'Fee Payment Confirmation',
    purpose: 'Reassurance. Proof. Calm.',
    sampleData: {
      STUDENT_NAME: 'Sarah Mukasa',
      AMOUNT_PAID: '200,000',
      BALANCE: '150,000',
      DATE: '10th March 2024',
      RECEIPT_NO: 'RCP001234'
    },
    icon: CheckCircle,
    color: 'text-[var(--chart-blue)]'
  },
  {
    key: 'REPORT_READY',
    name: 'Report Card Ready',
    purpose: 'Notify, not explain. Creates anticipation.',
    sampleData: {
      STUDENT_NAME: 'Sarah Mukasa',
      TERM: 'Term 1 2024',
      POSITION: '5th',
      SCHOOL_NAME: 'St. Mary\'s Primary School'
    },
    icon: FileText,
    color: 'text-[var(--chart-purple)]'
  },
  {
    key: 'ATTENDANCE_ALERT',
    name: 'Attendance Alert',
    purpose: 'Inform without judgment. Safety first.',
    sampleData: {
      STUDENT_NAME: 'Sarah Mukasa',
      DATE: 'today',
      SCHOOL_NAME: 'St. Mary\'s Primary School'
    },
    icon: Users,
    color: 'text-[var(--chart-yellow)]'
  },
  {
    key: 'ANNOUNCEMENT',
    name: 'General Announcement',
    purpose: 'Inform all. Keep it brief.',
    sampleData: {
      MESSAGE: 'School will close early on Friday at 2 PM for staff meeting.',
      SCHOOL_NAME: 'St. Mary\'s Primary School'
    },
    icon: MessageSquare,
    color: 'text-[var(--chart-yellow)]'
  },
  {
    key: 'EMERGENCY_ALERT',
    name: 'Emergency Alert',
    purpose: 'Immediate attention. Must be rare.',
    sampleData: {
      STUDENT_NAME: 'Sarah Mukasa',
      REASON: 'medical attention needed',
      CONTACT: '0700123456'
    },
    icon: AlertTriangle,
    color: 'text-[var(--chart-red)]'
  }
]

export default function SMSTemplatesPage() {
  const { data: session } = useSession()
  const [selectedDemo, setSelectedDemo] = useState<string>('FEES_BALANCE')
  const [renderedContent, setRenderedContent] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const generatePreview = useCallback(async () => {
    const demo = templateDemos.find(d => d.key === selectedDemo)
    if (!demo) return

    try {
      setLoading(true)
      const response = await fetch('/api/sms/templates/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: demo.key,
          content: getDefaultContent(demo.key)
        })
      })

      if (response.ok) {
        const data = await response.json()
        setRenderedContent(data.preview.content)
      }
    } catch (error) {
      console.error('Error generating preview:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDemo])

  // Generate preview when demo changes
  useEffect(() => {
    generatePreview()
  }, [generatePreview])

  const getDefaultContent = (templateKey: string): string => {
    switch (templateKey) {
      case 'FEES_BALANCE':
        return '{PARENT_NAME}, {STUDENT_NAME} owes UGX {BALANCE}. Pay now or child may be sent home. {SCHOOL_NAME}'
      case 'FEES_RECEIPT':
        return 'UGX {AMOUNT_PAID} received for {STUDENT_NAME}. Receipt: {RECEIPT_NO}. Balance: UGX {BALANCE}. Thank you.'
      case 'REPORT_READY':
        return '{STUDENT_NAME} {TERM} report ready. Position: {POSITION}. Visit school. {SCHOOL_NAME}'
      case 'ANNOUNCEMENT':
        return '{MESSAGE} - {SCHOOL_NAME}'
      case 'ATTENDANCE_ALERT':
        return '{STUDENT_NAME} absent {DATE}. Please confirm safety. {SCHOOL_NAME}'
      case 'EMERGENCY_ALERT':
        return 'URGENT: Contact school about {STUDENT_NAME}. Reason: {REASON}. Call: {CONTACT}.'
      default:
        return 'Default template content'
    }
  }

  const getCharacterCount = (templateKey: string): number => {
    const content = getDefaultContent(templateKey)
    const demo = templateDemos.find(d => d.key === templateKey)
    if (!demo) return content.length

    let renderedContent = content
    Object.entries(demo.sampleData).forEach(([key, value]) => {
      renderedContent = renderedContent.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    })
    return renderedContent.length
  }

  if (!session) {
    return <div>Please log in to access SMS templates.</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">SMS Templates</h1>
          <p className="text-[var(--text-secondary)] mt-2">Test and preview your SMS templates with real data</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/sms/templates/manage">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Templates
            </Button>
          </Link>
          <Link href="/dashboard/communications">
            <Button>
              <MessageSquare className="h-4 w-4 mr-2" />
              Communications Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Character Limit Warning */}
      <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--chart-yellow)]" />
          <div>
            <h3 className="font-medium text-[var(--warning-dark)]">SMS Character Limits</h3>
            <p className="text-sm text-[var(--warning)] mt-1">
              SMS messages are limited to 160 characters per segment. Each segment costs UGX 45. 
              Keep messages short to control costs and ensure delivery.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selection */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Template Types
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templateDemos.map((demo) => {
                const IconComponent = demo.icon
                const charCount = getCharacterCount(demo.key)
                const isOverLimit = charCount > 160
                return (
                  <button
                    key={demo.key}
                    onClick={() => setSelectedDemo(demo.key)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedDemo === demo.key
                        ? 'border-[var(--accent-primary)] bg-[var(--info-light)]'
                        : 'border-[var(--border-default)] hover:border-[var(--border-default)]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className={`h-5 w-5 mt-0.5 ${demo.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-[var(--text-primary)] text-sm">{demo.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded ${
                            isOverLimit ? 'bg-[var(--danger-light)] text-[var(--chart-red)]' : 
                            charCount > 140 ? 'bg-[var(--warning-light)] text-[var(--warning)]' :
                            'bg-[var(--success-light)] text-[var(--chart-green)]'
                          }`}>
                            {charCount}/160
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{demo.purpose}</p>
                        <div className="mt-2 text-xs text-[var(--text-muted)]">
                          Cost: UGX {Math.ceil(charCount / 160) * 45}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--chart-blue)]"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[var(--bg-surface)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Rendered Message:</h4>
                    <div className="bg-[var(--bg-main)] border rounded p-3 text-sm">
                      {renderedContent || 'Select a template to see preview'}
                    </div>
                    {renderedContent && (
                      <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
                        <span>Characters: {renderedContent.length}/160</span>
                        <span>Cost: UGX {Math.ceil(renderedContent.length / 160) * 45}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-[var(--info-light)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Sample Data Used:</h4>
                    <div className="text-sm text-[var(--text-secondary)]">
                      {selectedDemo && templateDemos.find(d => d.key === selectedDemo) && (
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(templateDemos.find(d => d.key === selectedDemo)?.sampleData, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>

                  <div className="bg-[var(--success-light)] rounded-lg p-4">
                    <h4 className="font-medium text-[var(--text-primary)] mb-2">Template Management:</h4>
                    <div className="flex gap-2">
                      <Link href="/dashboard/sms/templates/manage">
                        <Button size="sm" variant="outline">
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Templates
                        </Button>
                      </Link>
                      <Link href="/dashboard/communications">
                        <Button size="sm">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Send Messages
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}