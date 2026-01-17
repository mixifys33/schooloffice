'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Send, AlertTriangle, Users, User, History, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Teacher Messaging Page
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 * - Restrict recipients to students in assigned classes (8.1)
 * - Conditionally enable parent messaging based on school settings (8.2)
 * - Log all messages to audit service (8.3)
 * - Display audit notice (8.4)
 * - No bulk announcements (8.5)
 * - No SMS capability (8.6)
 * - No WhatsApp capability (8.7)
 * - Show only messages sent by logged-in teacher (8.8)
 */

interface AssignedClass {
  id: string
  name: string
  streamName?: string
  studentCount: number
}

interface Recipient {
  id: string
  name: string
  type: 'student' | 'parent'
  classId: string
  className: string
}

interface MessageLog {
  id: string
  content: string
  recipientName: string
  recipientType: 'student' | 'parent'
  sentAt: string
  status: 'sent' | 'delivered' | 'failed'
}

interface MessagingConfig {
  parentMessagingEnabled: boolean
  assignedClasses: AssignedClass[]
}

export default function TeacherMessagesPage() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose')
  const [config, setConfig] = useState<MessagingConfig | null>(null)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [recipientType, setRecipientType] = useState<'student' | 'parent'>('student')
  const [messageContent, setMessageContent] = useState('')
  const [messageHistory, setMessageHistory] = useState<MessageLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)


  // Fetch messaging configuration
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setIsLoading(true)
        const response = await fetch('/api/teacher/messages/config')
        if (!response.ok) throw new Error('Failed to load messaging configuration')
        const data = await response.json()
        setConfig(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load configuration')
      } finally {
        setIsLoading(false)
      }
    }
    fetchConfig()
  }, [])

  // Fetch recipients when class or type changes
  const fetchRecipients = useCallback(async () => {
    if (!selectedClass) {
      setRecipients([])
      return
    }
    
    try {
      setIsLoadingRecipients(true)
      const response = await fetch(
        `/api/teacher/messages/recipients?classId=${selectedClass}&type=${recipientType}`
      )
      if (!response.ok) throw new Error('Failed to load recipients')
      const data = await response.json()
      setRecipients(data.recipients || [])
      setSelectedRecipients([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recipients')
    } finally {
      setIsLoadingRecipients(false)
    }
  }, [selectedClass, recipientType])

  useEffect(() => {
    fetchRecipients()
  }, [fetchRecipients])

  // Fetch message history
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/teacher/messages/history')
      if (!response.ok) throw new Error('Failed to load message history')
      const data = await response.json()
      setMessageHistory(data.messages || [])
    } catch (err) {
      console.error('Failed to load message history:', err)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab, fetchHistory])

  // Handle send message
  const handleSendMessage = async () => {
    if (!messageContent.trim() || selectedRecipients.length === 0) {
      setError('Please select recipients and enter a message')
      return
    }

    try {
      setIsSending(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/teacher/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientIds: selectedRecipients,
          recipientType,
          content: messageContent,
          classId: selectedClass,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send message')
      }

      setSuccessMessage('Message sent successfully')
      setMessageContent('')
      setSelectedRecipients([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  // Toggle recipient selection
  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  // Select all recipients
  const selectAllRecipients = () => {
    if (selectedRecipients.length === recipients.length) {
      setSelectedRecipients([])
    } else {
      setSelectedRecipients(recipients.map(r => r.id))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }


  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Messages</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Send in-app messages to students in your classes
          </p>
        </div>
      </div>

      {/* Requirement 8.4: Audit Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Messages are logged and visible to administration
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            All messages you send are recorded for accountability and compliance purposes.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'compose'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <Send className="h-4 w-4 inline mr-2" />
          Compose
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <History className="h-4 w-4 inline mr-2" />
          History
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recipients Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Recipients</CardTitle>
              <CardDescription>
                Choose students{config?.parentMessagingEnabled ? ' or parents' : ''} from your assigned classes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="">Select a class</option>
                  {config?.assignedClasses.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}{cls.streamName ? ` - ${cls.streamName}` : ''} ({cls.studentCount} students)
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Type - Only show if parent messaging is enabled */}
              {config?.parentMessagingEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recipient Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRecipientType('student')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        recipientType === 'student'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      <User className="h-4 w-4 inline mr-1" />
                      Students
                    </button>
                    <button
                      onClick={() => setRecipientType('parent')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        recipientType === 'parent'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      <Users className="h-4 w-4 inline mr-1" />
                      Parents
                    </button>
                  </div>
                </div>
              )}


              {/* Recipients List */}
              {selectedClass && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recipients ({selectedRecipients.length} selected)
                    </label>
                    <button
                      onClick={selectAllRecipients}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {selectedRecipients.length === recipients.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  {isLoadingRecipients ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                  ) : recipients.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                      No {recipientType === 'parent' ? 'parents' : 'students'} found in this class
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                      {recipients.map((recipient) => (
                        <label
                          key={recipient.id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedRecipients.includes(recipient.id)}
                            onChange={() => toggleRecipient(recipient.id)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {recipient.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Composer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compose Message</CardTitle>
              <CardDescription>
                Write your message (in-app only)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Type your message here..."
                  rows={8}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {messageContent.length}/1000 characters
                </p>
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={isSending || !messageContent.trim() || selectedRecipients.length === 0}
                className="w-full"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message ({selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? 's' : ''})
                  </>
                )}
              </Button>

              {/* Requirement 8.5, 8.6, 8.7: Disabled features notice */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>• SMS and WhatsApp messaging are not available</p>
                <p>• Bulk announcements require administrator access</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Message History - Requirement 8.8 */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message History</CardTitle>
            <CardDescription>
              Messages you have sent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {messageHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">
                No messages sent yet
              </p>
            ) : (
              <div className="space-y-3">
                {messageHistory.map((msg) => (
                  <div
                    key={msg.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {msg.recipientName}
                          </span>
                          <Badge variant={msg.recipientType === 'parent' ? 'secondary' : 'outline'}>
                            {msg.recipientType}
                          </Badge>
                          <Badge
                            variant={
                              msg.status === 'sent' ? 'default' :
                              msg.status === 'delivered' ? 'default' : 'destructive'
                            }
                          >
                            {msg.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {msg.content}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(msg.sentAt).toLocaleDateString()} {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
