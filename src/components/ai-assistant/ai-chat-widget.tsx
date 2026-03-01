'use client'

import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, RotateCcw, Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Message } from '@/lib/ai-assistant/openrouter-client'
import { chatStorage, ChatSession } from '@/lib/ai-assistant/chat-storage'
import ReactMarkdown from 'react-markdown'

export function AIChatWidget({ 
  isOpen: externalIsOpen, 
  onClose, 
  hideFloatingButton = false 
}: { 
  isOpen?: boolean
  onClose?: () => void
  hideFloatingButton?: boolean
} = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatWidgetRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const handleClose = () => {
    if (onClose) {
      onClose()
    } else {
      setInternalIsOpen(false)
    }
  }
  const handleOpen = () => externalIsOpen === undefined && setInternalIsOpen(true)

  // Initialize session
  useEffect(() => {
    const newSessionId = chatStorage.generateSessionId()
    setSessionId(newSessionId)
    
    // Load welcome message
    const welcomeMessage: Message = {
      role: 'assistant',
      content: `Hi! I'm ${process.env.NEXT_PUBLIC_AI_ASSISTANT_NAME || 'Ofiniti AI'}, your SchoolOffice assistant powered by AD-Technologies. How can I help you today?`,
    }
    setMessages([welcomeMessage])
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        chatWidgetRef.current &&
        !chatWidgetRef.current.contains(event.target as Node)
      ) {
        if (onClose) {
          onClose()
        } else {
          setInternalIsOpen(false)
        }
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Save session when messages change
  useEffect(() => {
    if (sessionId && messages.length > 1) {
      const session: ChatSession = {
        id: sessionId,
        messages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: chatStorage.generateTitle(messages[1]?.content || 'New Chat'),
      }
      chatStorage.saveSession(session)
    }
  }, [messages, sessionId])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setError('')

    try {
      // Prepare messages for API (last 10 messages for context)
      const recentMessages = messages.slice(-10)
      const apiMessages = [...recentMessages, userMessage]

      // Call API with context
      const response = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          pathname,
          error,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      console.error('Chat error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response'
      setError(errorMessage)
      
      const errorResponse: Message = {
        role: 'assistant',
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again or check your API configuration.`,
      }
      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = () => {
    const welcomeMessage: Message = {
      role: 'assistant',
      content: `Chat cleared. How can I help you?`,
    }
    setMessages([welcomeMessage])
    const newSessionId = chatStorage.generateSessionId()
    setSessionId(newSessionId)
    setError('')
  }

  return (
    <>
      {/* Floating Button - Only show if not hidden */}
      {!hideFloatingButton && !isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 group"
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={handleClose} />
          
          {/* Chat Container */}
          <div 
            ref={chatWidgetRef}
            className="fixed inset-x-0 bottom-0 top-[25vh] md:inset-auto md:bottom-6 md:right-6 z-50 md:w-[600px] md:h-[75vh] md:max-h-[75vh] bg-white dark:bg-gray-900 rounded-t-3xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-t md:border border-gray-200 dark:border-gray-700"
          >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-xs md:text-sm">
                  {process.env.NEXT_PUBLIC_AI_ASSISTANT_NAME || 'Ofiniti AI'}
                </h3>
                <p className="text-[10px] md:text-xs text-blue-100">
                  Powered by AD-Technologies
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              <button
                onClick={handleClearChat}
                className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 md:p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close chat"
              >
                <X className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50 dark:bg-gray-800">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-3 py-2 md:px-4 md:py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="text-xs md:text-sm whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="text-xs md:text-sm prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-700 rounded-2xl px-3 py-2 md:px-4 md:py-3 border border-gray-200 dark:border-gray-600">
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-blue-600" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 md:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 md:px-4 md:py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-xs md:text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-3 py-2 md:px-4 md:py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <Send className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            <p className="text-[10px] md:text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Powered by AD-Technologies and AI Enterprises
            </p>
          </div>
          </div>
        </>
      )}
    </>
  )
}
