'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Simple markdown renderer without external packages
const renderMarkdown = (text: string) => {
  // Split by code blocks first to preserve them
  const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g)
  
  return parts.map((part, index) => {
    // Handle code blocks
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).trim()
      const lines = code.split('\n')
      const language = lines[0].trim()
      const codeContent = lines.length > 1 ? lines.slice(1).join('\n') : code
      
      return (
        <pre key={index} className="bg-gray-100 dark:bg-gray-800 rounded p-3 my-2 overflow-x-auto">
          {language && <div className="text-xs text-gray-500 mb-1">{language}</div>}
          <code className="text-sm">{codeContent}</code>
        </pre>
      )
    }
    
    // Handle inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm">
          {part.slice(1, -1)}
        </code>
      )
    }
    
    // Process regular text with inline formatting
    let processed = part
    
    // Bold: **text** or __text__
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    processed = processed.replace(/__(.+?)__/g, '<strong class="font-semibold">$1</strong>')
    
    // Italic: *text* or _text_ (but not in middle of words)
    processed = processed.replace(/\*([^\*]+?)\*/g, '<em class="italic">$1</em>')
    processed = processed.replace(/\b_([^_]+?)_\b/g, '<em class="italic">$1</em>')
    
    // Links: [text](url)
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-600 dark:text-purple-400 underline hover:text-purple-700 dark:hover:text-purple-300">$1</a>')
    
    // Headers (must be at start of line)
    processed = processed.replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-2">$1</h3>')
    processed = processed.replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
    processed = processed.replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-3">$1</h1>')
    
    // Numbered lists with proper formatting
    processed = processed.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="flex gap-2 my-1"><span class="font-semibold min-w-[1.5rem]">$1.</span><span class="flex-1">$2</span></div>')
    
    // Bullet points with proper formatting
    processed = processed.replace(/^[\-\*]\s+(.+)$/gm, '<div class="flex gap-2 my-1"><span class="text-purple-600 dark:text-purple-400 min-w-[1rem]">•</span><span class="flex-1">$1</span></div>')
    
    // Preserve line breaks
    processed = processed.replace(/\n\n/g, '<br/><br/>')
    processed = processed.replace(/\n/g, '<br/>')
    
    return (
      <span 
        key={index} 
        dangerouslySetInnerHTML={{ __html: processed }}
        className="markdown-content block"
      />
    )
  })
}

const LOADING_STEPS = [
  'Connecting to AI assistant...',
  'Reading your request...',
  'Checking the application for relevant info...',
  'Analyzing your question...',
  'Searching through documentation...',
  'Gathering context from your conversation...',
  'Processing information...',
  'Preparing the perfect response...',
  'Refining the answer...',
  'Double-checking accuracy...',
  'Almost there...',
  'Finalizing answer...'
]

export function AIHelpToggle() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('ai-chat-history')
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages))
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }, [])

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    try {
      if (messages.length > 0) {
        localStorage.setItem('ai-chat-history', JSON.stringify(messages))
      }
    } catch (error) {
      console.error('Failed to save chat history:', error)
    }
  }, [messages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading, loadingStep])

  // Cycle through loading steps
  useEffect(() => {
    if (!isLoading) {
      setLoadingStep(0)
      return
    }

    const interval = setInterval(() => {
      setLoadingStep(prev => {
        const nextStep = prev + 1
        return nextStep >= LOADING_STEPS.length ? prev : nextStep
      })
    }, 3500) // Change step every 3.5 seconds

    return () => clearInterval(interval)
  }, [isLoading])

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim()
    if (!textToSend || isLoading) return

    const userMessage: Message = { role: 'user', content: textToSend }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setLoadingStep(0)

    try {
      const response = await fetch('/api/teacher/ai-help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI help error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again or contact support if the issue persists.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      setLoadingStep(0)
    }
  }

  const handleClearHistory = () => {
    setMessages([])
    setInput('')
    // Also clear from localStorage
    try {
      localStorage.removeItem('ai-chat-history')
    } catch (error) {
      console.error('Failed to clear chat history:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickQuestions = [
    'How do I enter CA marks?',
    'How to take attendance?',
    'How to generate reports?',
    'How to view my timetable?',
    'How to enter exam scores?',
    'How to view student performance?'
  ]

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 relative group hover:border-purple-500 dark:hover:border-purple-400 transition-colors"
        >
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <span className="hidden sm:inline">Self Help</span>
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-purple-500 rounded-full animate-pulse" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="pb-3">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              Ofiniti AI
            </SheetTitle>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="h-8 px-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                title="Clear chat history"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
         
        </SheetHeader>

        <div className="flex flex-col flex-1 mt-4 min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                  How can I help you?
                </h3>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-6">
                  Ask me anything about SchoolOffice:
                </p>
                <div className="grid gap-2 w-full">
                  {quickQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        handleSend(question)
                      }}
                      disabled={isLoading}
                      className="text-left px-4 py-3 text-sm bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-700 rounded-lg border border-[var(--border-default)] dark:border-[var(--border-strong)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'flex gap-2 max-w-[85%]',
                      message.role === 'user'
                        ? 'ml-auto flex-row-reverse'
                        : 'mr-auto'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-7 h-7 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center mt-1">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'px-4 py-2.5 rounded-lg',
                        message.role === 'user'
                          ? 'bg-purple-600 dark:bg-purple-700 text-white'
                          : 'bg-[var(--bg-surface)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)]'
                      )}
                    >
                      <div className="text-sm break-words leading-relaxed">
                        {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 max-w-[85%] mr-auto">
                    <div className="flex-shrink-0 w-7 h-7 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center mt-1">
                      <Loader2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 animate-spin" />
                    </div>
                    <div className="px-4 py-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                      <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                        {LOADING_STEPS[loadingStep]}
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-[var(--border-default)] dark:border-[var(--border-strong)] pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg bg-[var(--bg-main)] dark:bg-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)] focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors disabled:opacity-50"
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </Button>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Powered by AD-TECH. AI may be inaccurate. Verify key facts
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
