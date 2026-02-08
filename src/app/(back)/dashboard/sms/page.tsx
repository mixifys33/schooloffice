'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { 
  MessageSquare, 
  Send, 
  Users, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
} from 'lucide-react'
import { StatCard, StatsGrid } from '@/components/ui/stat-card'
import { AlertBanner } from '@/components/ui/alert-banner'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { Button } from '@/components/ui/button'
import { Toast, useLocalToast } from '@/components/ui/toast'

/**
 * SMS Center Dashboard Page
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 * - Display SMS balance, messages sent this term, message templates
 * - Allow selection by class, term, or individual students
 * - Automatically exclude unpaid students
 * - Disable SMS if school subscription suspended
 * - Message templates
 * - Track SMS balance
 */

interface SMSCenterData {
  smsBalance: number
  smsBudget: number
  messagesSentThisTerm: number
  usedAmount: number
  totalBudget: number
  isPaused: boolean
  isSchoolSuspended: boolean
  currentTerm: {
    id: string
    name: string
    startDate: string
    endDate: string
  } | null
  templates: {
    id: string | null
    type: string
    content: string
    isActive: boolean
  }[]
  recentMessages: {
    id: string
    studentName: string
    content: string
    status: string
    sentAt: string | null
    createdAt: string
  }[]
  deliveryStats?: {
    queued: number
    sent: number
    delivered: number
    failed: number
    total: number
    deliveryRate: number
  }
}

interface ClassOption {
  id: string
  name: string
  studentCount: number
}

interface StudentOption {
  id: string
  name: string
  className: string
  isPaid: boolean
}

type RecipientType = 'all' | 'class' | 'individual'

interface SendProgress {
  total: number
  sent: number
  failed: number
  currentRecipient: string
  percentage: number
}

export default function SMSCenterPage() {
  const [data, setData] = useState<SMSCenterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()

  // Compose state
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [recipientType, setRecipientType] = useState<RecipientType>('all')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [excludeUnpaid, setExcludeUnpaid] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Progress tracking
  const [progress, setProgress] = useState<SendProgress | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Options for selection
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  // Fetch SMS center data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/sms')
      if (!response.ok) {
        throw new Error('Failed to fetch SMS center data')
      }
      const smsData = await response.json()
      setData(smsData)
      setError(null)
    } catch (err) {
      console.error('Error fetching SMS center data:', err)
      setError('Unable to load SMS center data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch classes and students for recipient selection
  const fetchOptions = useCallback(async () => {
    try {
      setLoadingOptions(true)
      
      // Fetch classes
      const classesResponse = await fetch('/api/classes')
      if (classesResponse.ok) {
        const classesData = await classesResponse.json()
        setClasses(classesData.classes?.map((c: { id: string; name: string; _count?: { students: number } }) => ({
          id: c.id,
          name: c.name,
          studentCount: c._count?.students || 0,
        })) || [])
      }

      // Fetch students
      const studentsResponse = await fetch('/api/students?pageSize=1000')
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        setStudents(studentsData.students?.map((s: { 
          id: string
          firstName: string
          lastName: string
          className?: string
          paymentStatus?: string 
        }) => ({
          id: s.id,
          name: `${s.firstName} ${s.lastName}`,
          className: s.className || 'Unknown',
          isPaid: s.paymentStatus === 'PAID',
        })) || [])
      }
    } catch (err) {
      console.error('Error fetching options:', err)
    } finally {
      setLoadingOptions(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    fetchOptions()
  }, [fetchData, fetchOptions])

  // Handle template selection
  const handleTemplateSelect = (templateType: string) => {
    setSelectedTemplate(templateType)
    
    // Set sample content based on template
    switch (templateType) {
      case 'FEES_BALANCE':
        setMessage('Dear {PARENT_NAME}, {STUDENT_NAME} has an outstanding school fees balance of UGX {BALANCE} for {TERM}. Kindly clear by {PAYMENT_DEADLINE}. {SCHOOL_NAME}')
        break
      case 'FEES_RECEIPT':
        setMessage('Payment of UGX {AMOUNT_PAID} received for {STUDENT_NAME} on {DATE}. Receipt No: {RECEIPT_NO}. Balance: UGX {BALANCE}. Thank you.')
        break
      case 'REPORT_READY':
        setMessage('Dear Parent, {STUDENT_NAME}\'s report for {TERM} is ready. Position: {POSITION}. Kindly visit the school for details. {SCHOOL_NAME}')
        break
      case 'ANNOUNCEMENT':
        setMessage('NOTICE: {MESSAGE} {SCHOOL_NAME}')
        break
      case 'EMERGENCY_ALERT':
        setMessage('URGENT: Please contact the school regarding {STUDENT_NAME}. Reason: {REASON}. Call: {CONTACT}.')
        break
      default:
        setMessage('')
    }
  }

  // Handle sending with template system
  const handleSendWithTemplate = async (templateType: string) => {
    try {
      setSending(true)
      setProgress({ total: 0, sent: 0, failed: 0, currentRecipient: 'Preparing...', percentage: 0 })
      
      const response = await fetch('/api/sms/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateType,
          targetType: recipientType,
          targetOptions: {
            classIds: recipientType === 'class' ? selectedClasses : undefined,
            studentIds: recipientType === 'individual' ? selectedStudents : undefined,
            minimumBalance: templateType === 'FEES_BALANCE' ? 1000 : undefined
          }
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send SMS')
      }

      setProgress({
        total: result.totalRecipients,
        sent: result.sentCount,
        failed: result.failedCount,
        currentRecipient: 'Complete!',
        percentage: 100
      })

      setTimeout(() => {
        showToast('success', `SMS sent to ${result.sentCount} recipients${result.failedCount > 0 ? ` (${result.failedCount} failed)` : ''}`)
        setProgress(null)
        fetchData()
      }, 1000)

    } catch (err) {
      console.error('Error sending SMS with template:', err)
      showToast('error', err instanceof Error ? err.message : 'Failed to send SMS')
      setProgress(null)
    } finally {
      setSending(false)
    }
  }

  // Handle send SMS with progress tracking
  const handleSendSMS = async () => {
    if (!message.trim()) {
      showToast('error', 'Please enter a message')
      return
    }

    if (recipientType === 'class' && selectedClasses.length === 0) {
      showToast('error', 'Please select at least one class')
      return
    }

    if (recipientType === 'individual' && selectedStudents.length === 0) {
      showToast('error', 'Please select at least one student')
      return
    }

    try {
      setSending(true)
      setProgress({ total: 0, sent: 0, failed: 0, currentRecipient: 'Preparing...', percentage: 0 })
      
      abortControllerRef.current = new AbortController()
      
      const response = await fetch('/api/sms/send-with-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          templateType: selectedTemplate,
          recipientType,
          classIds: recipientType === 'class' ? selectedClasses : undefined,
          studentIds: recipientType === 'individual' ? selectedStudents : undefined,
          excludeUnpaid,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send SMS')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        let finalResult = null
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line)
              
              if (data.type === 'progress') {
                setProgress({
                  total: data.total,
                  sent: data.sent,
                  failed: data.failed,
                  currentRecipient: data.currentRecipient || '',
                  percentage: data.total > 0 ? Math.round((data.sent + data.failed) / data.total * 100) : 0,
                })
              } else if (data.type === 'complete') {
                finalResult = data
              } else if (data.type === 'error') {
                throw new Error(data.error)
              }
            } catch (parseError) {
              // Skip invalid JSON lines
            }
          }
        }

        if (finalResult) {
          setProgress({
            total: finalResult.total,
            sent: finalResult.sentCount,
            failed: finalResult.failedCount,
            currentRecipient: 'Complete!',
            percentage: 100,
          })
          
          setTimeout(() => {
            showToast('success', `SMS sent to ${finalResult.sentCount} recipients${finalResult.failedCount > 0 ? ` (${finalResult.failedCount} failed)` : ''}`)
            setProgress(null)
            setMessage('')
            setSelectedTemplate(null)
            setSelectedClasses([])
            setSelectedStudents([])
            fetchData()
          }, 1000)
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        showToast('warning', 'SMS sending cancelled')
      } else {
        console.error('Error sending SMS:', err)
        showToast('error', err instanceof Error ? err.message : 'Failed to send SMS')
      }
      setProgress(null)
    } finally {
      setSending(false)
      abortControllerRef.current = null
    }
  }

  // Cancel sending
  const handleCancelSend = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // Get status icon with accurate delivery status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <div className="flex items-center gap-1" title="Delivered">
            <CheckCircle className="h-4 w-4 text-[var(--success)]" />
          </div>
        )
      case 'SENT':
        return (
          <div className="flex items-center gap-1" title="Sent successfully">
            <CheckCircle className="h-4 w-4 text-[var(--success)]" />
          </div>
        )
      case 'FAILED':
        return (
          <div className="flex items-center gap-1" title="Failed to deliver">
            <XCircle className="h-4 w-4 text-[var(--danger)]" />
          </div>
        )
      case 'QUEUED':
        return (
          <div className="flex items-center gap-1" title="Queued for sending">
            <Clock className="h-4 w-4 text-[var(--warning)]" />
          </div>
        )
      default:
        return <Clock className="h-4 w-4 text-[var(--text-muted)]" />
    }
  }

  // Get status text for display
  const getStatusText = (status: string) => {
    switch (status) {
      case 'DELIVERED': return 'Delivered'
      case 'SENT': return 'Sent'
      case 'FAILED': return 'Failed'
      case 'QUEUED': return 'Queued'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">SMS Center</h1>
          <p className="text-sm text-muted-foreground mt-1">Send and manage SMS communications</p>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonLoader key={i} variant="stat" count={1} />
          ))}
        </div>
        <SkeletonLoader variant="card" count={2} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">SMS Center</h1>
        </div>
        <AlertBanner
          type="danger"
          message={error}
          action={{ label: 'Retry', onClick: fetchData }}
        />
      </div>
    )
  }

  if (!data) return null

  const characterCount = message.length
  const smsSegments = Math.ceil(characterCount / 160) || 1

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Toast notification */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">SMS Center</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send and manage SMS communications
          {data.currentTerm && ` • ${data.currentTerm.name}`}
        </p>
      </div>

      {/* Alerts */}
      <div className="space-y-3">
        {data.isSchoolSuspended && (
          <AlertBanner
            type="danger"
            message="SMS disabled - subscription inactive. Please contact support."
          />
        )}
        {data.isPaused && !data.isSchoolSuspended && (
          <AlertBanner
            type="warning"
            message="SMS sending is paused due to budget exceeded. Contact Super Admin to resume."
          />
        )}
        {data.smsBalance < 50 && !data.isPaused && !data.isSchoolSuspended && (
          <AlertBanner
            type="warning"
            message={`SMS balance low - ${data.smsBalance} messages remaining`}
            dismissible
          />
        )}
      </div>

      {/* Stats */}
      <StatsGrid>
        <StatCard
          title="SMS Balance"
          value={data.smsBalance}
          color={data.smsBalance < 50 ? 'yellow' : 'blue'}
          icon={<MessageSquare className="h-6 w-6" />}
          subtitle="Messages remaining"
        />
        <StatCard
          title="Sent This Term"
          value={data.messagesSentThisTerm}
          color="green"
          icon={<Send className="h-6 w-6" />}
          subtitle="Messages delivered"
        />
        <StatCard
          title="Budget Used"
          value={`${Math.round((data.usedAmount / (data.totalBudget || 1)) * 100)}%`}
          color={data.usedAmount > data.totalBudget * 0.8 ? 'yellow' : 'gray'}
          icon={<FileText className="h-6 w-6" />}
          subtitle={`UGX ${data.usedAmount.toLocaleString()} / ${data.totalBudget.toLocaleString()}`}
        />
        <StatCard
          title="Delivery Rate"
          value={`${data.deliveryStats?.deliveryRate || 0}%`}
          color={
            (data.deliveryStats?.deliveryRate || 0) >= 80 ? 'green' :
            (data.deliveryStats?.deliveryRate || 0) >= 50 ? 'yellow' : 'red'
          }
          icon={<CheckCircle className="h-6 w-6" />}
          subtitle="Last 24 hours"
        />
      </StatsGrid>

      {/* Delivery Status Breakdown */}
      {data.deliveryStats && data.deliveryStats.total > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Delivery Status (Last 24 Hours)</h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[var(--success)]" />
              <span>Delivered: {data.deliveryStats.delivered}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[var(--accent-primary)]" />
              <span>Pending: {data.deliveryStats.sent}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[var(--danger)]" />
              <span>Failed: {data.deliveryStats.failed}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[var(--warning)]" />
              <span>Queued: {data.deliveryStats.queued}</span>
            </div>
          </div>
          {data.deliveryStats.failed > 0 && (
            <p className="text-xs text-[var(--chart-red)] dark:text-[var(--danger)] mt-2">
              ⚠️ {data.deliveryStats.failed} message(s) failed to deliver. Check recipient phone numbers.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Compose SMS */}
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Send className="h-5 w-5" />
            Compose SMS
          </h2>

          {/* Template Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Use Template</label>
            <div className="relative">
              <select
                value={selectedTemplate || ''}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none cursor-pointer"
                disabled={data.isSchoolSuspended || data.isPaused}
              >
                <option value="">Select a template...</option>
                <option value="FEES_BALANCE">Fee Balance Reminder</option>
                <option value="FEES_RECEIPT">Fee Payment Confirmation</option>
                <option value="REPORT_READY">Report Card Ready</option>
                <option value="ANNOUNCEMENT">General Announcement</option>
                <option value="EMERGENCY_ALERT">Emergency Alert</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Templates use the new SMS system with proper validation and cost protection
            </p>
          </div>

          {/* Message Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              disabled={data.isSchoolSuspended || data.isPaused}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{characterCount} characters</span>
              <span>{smsSegments} SMS segment{smsSegments > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Recipient Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Recipients</label>
            <div className="flex gap-2 mb-3">
              {(['all', 'class', 'individual'] as RecipientType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setRecipientType(type)}
                  className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                    recipientType === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent'
                  }`}
                  disabled={data.isSchoolSuspended || data.isPaused}
                >
                  {type === 'all' ? 'All Students' : type === 'class' ? 'By Class' : 'Individual'}
                </button>
              ))}
            </div>

            {recipientType === 'class' && (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {loadingOptions ? (
                  <p className="text-sm text-muted-foreground">Loading classes...</p>
                ) : classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No classes found</p>
                ) : (
                  classes.map((cls) => (
                    <label key={cls.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedClasses.includes(cls.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClasses([...selectedClasses, cls.id])
                          } else {
                            setSelectedClasses(selectedClasses.filter(id => id !== cls.id))
                          }
                        }}
                        className="rounded border-input"
                        disabled={data.isSchoolSuspended || data.isPaused}
                      />
                      <span className="text-sm">{cls.name}</span>
                      <span className="text-xs text-muted-foreground">({cls.studentCount} students)</span>
                    </label>
                  ))
                )}
              </div>
            )}

            {recipientType === 'individual' && (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {loadingOptions ? (
                  <p className="text-sm text-muted-foreground">Loading students...</p>
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No students found</p>
                ) : (
                  students.map((student) => (
                    <label key={student.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id])
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                          }
                        }}
                        className="rounded border-input"
                        disabled={data.isSchoolSuspended || data.isPaused}
                      />
                      <span className="text-sm">{student.name}</span>
                      <span className="text-xs text-muted-foreground">({student.className})</span>
                      {!student.isPaid && excludeUnpaid && (
                        <span className="text-xs text-[var(--danger)]">(Unpaid - will be excluded)</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Exclude Unpaid Option */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeUnpaid}
                onChange={(e) => setExcludeUnpaid(e.target.checked)}
                className="rounded border-input"
                disabled={data.isSchoolSuspended || data.isPaused}
              />
              <span className="text-sm">Exclude unpaid students</span>
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
            </label>
            <p className="text-xs text-muted-foreground mt-1 ml-6">
              Students with unpaid fees will not receive SMS
            </p>
          </div>

          {/* Progress Display */}
          {progress && (
            <div className="mb-4 p-4 rounded-lg border bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 border-[var(--info-light)] dark:border-[var(--info-dark)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--info-dark)] dark:text-[var(--info-light)]">
                  Sending SMS...
                </span>
                <span className="text-sm font-bold text-[var(--accent-hover)] dark:text-[var(--info)]">
                  {progress.percentage}%
                </span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-3 bg-[var(--info)] dark:bg-[var(--info-dark)] rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-[var(--chart-blue)] dark:bg-[var(--info)] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              
              {/* Stats */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-[var(--chart-green)] dark:text-[var(--success)]">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {progress.sent} sent
                  </span>
                  {progress.failed > 0 && (
                    <span className="flex items-center gap-1 text-[var(--chart-red)] dark:text-[var(--danger)]">
                      <XCircle className="h-3.5 w-3.5" />
                      {progress.failed} failed
                    </span>
                  )}
                </div>
                <span className="text-[var(--chart-blue)] dark:text-[var(--chart-blue)]">
                  {progress.sent + progress.failed} / {progress.total}
                </span>
              </div>
              
              {/* Current Recipient */}
              {progress.currentRecipient && (
                <div className="mt-2 text-xs text-[var(--accent-hover)] dark:text-[var(--info)] truncate">
                  {progress.percentage < 100 ? '→ ' : '✓ '}{progress.currentRecipient}
                </div>
              )}
            </div>
          )}

          {/* Send Button */}
          {sending && progress ? (
            <Button
              onClick={handleCancelSend}
              variant="outline"
              className="w-full gap-2 border-[var(--danger)] text-[var(--chart-red)] hover:bg-[var(--danger-light)] dark:border-[var(--chart-red)] dark:text-[var(--danger)] dark:hover:bg-[var(--danger-dark)]"
            >
              <XCircle className="h-4 w-4" />
              Cancel Sending
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleSendSMS}
                disabled={sending || data.isSchoolSuspended || data.isPaused || !message.trim()}
                className="w-full gap-2"
              >
                {sending ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send SMS
                  </>
                )}
              </Button>
              
              {/* Quick Template Actions */}
              {selectedTemplate && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => handleSendWithTemplate('FEES_BALANCE')}
                    disabled={sending || data.isSchoolSuspended || data.isPaused}
                    variant="outline"
                    size="sm"
                  >
                    Send Fee Reminders
                  </Button>
                  <Button
                    onClick={() => handleSendWithTemplate('REPORT_READY')}
                    disabled={sending || data.isSchoolSuspended || data.isPaused}
                    variant="outline"
                    size="sm"
                  >
                    Send Report Alerts
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Messages & Templates */}
        <div className="space-y-6">
          {/* Message Templates */}
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Message Templates
            </h2>
            <div className="space-y-3">
              {data.templates.slice(0, 5).map((template) => (
                <div
                  key={template.type}
                  className="p-3 rounded-md border bg-background hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleTemplateSelect(template.type)}
                >
                  <div className="font-medium text-sm">{template.type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {template.content}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Messages */}
          <div className="rounded-lg border bg-card p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Recent Messages
            </h2>
            {data.recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages sent yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 rounded-md border bg-background">
                    {getStatusIcon(msg.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{msg.studentName}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            msg.status === 'DELIVERED' || msg.status === 'SENT' 
                              ? 'bg-[var(--success-light)] text-[var(--chart-green)] dark:bg-[var(--success-dark)]/30 dark:text-[var(--success)]' :
                            msg.status === 'FAILED' ? 'bg-[var(--danger-light)] text-[var(--chart-red)] dark:bg-[var(--danger-dark)]/30 dark:text-[var(--danger)]' :
                            'bg-[var(--warning-light)] text-[var(--warning)] dark:bg-[var(--warning-dark)]/30 dark:text-[var(--warning)]'
                          }`}>
                            {getStatusText(msg.status)}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {msg.sentAt 
                              ? new Date(msg.sentAt).toLocaleDateString()
                              : new Date(msg.createdAt).toLocaleDateString()
                            }
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
