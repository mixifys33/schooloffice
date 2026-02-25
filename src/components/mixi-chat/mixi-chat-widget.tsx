'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Minimize2, Maximize2, Trash2, MessageSquare } from 'lucide-react'
import { MixiChatMessage } from './mixi-chat-message'
import { useMixiChat } from './use-mixi-chat'

export function MixiChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { messages, isLoading, sendMessage, clearHistory } = useMixiChat()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const userMessage = input.trim()
    setInput('')
    await sendMessage(userMessage)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-[var(--chart-blue)] to-[var(--chart-purple)] shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110"
        aria-label="Open Mixi AI Assistant"
      >
        <MessageSquare className="w-7 h-7 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--chart-green)] rounded-full animate-pulse" />
      </button>
    )
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 bg-[var(--bg-main)] dark:bg-[var(--bg-secondary)] rounded-2xl shadow-2xl border border-[var(--border-default)] dark:border-[var(--border-strong)] transition-all duration-300 ${
        isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)] dark:border-[var(--border-strong)] bg-gradient-to-r from-[var(--chart-blue)] to-[var(--chart-purple)] rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Mixi AI Assistant</h3>
            <p className="text-white/80 text-xs">Powered by AD-Technologies & 7 Boys</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white/80 hover:text-white transition-colors p-1"
            aria-label={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="text-white/80 hover:text-white transition-colors p-1"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-[calc(600px-140px)]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[var(--chart-blue)] to-[var(--chart-purple)] flex items-center justify-center mb-4">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                  Hi! I'm Mixi 👋
                </h4>
                <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] mb-4">
                  Your intelligent SchoolOffice assistant. I can help you with:
                </p>
                <ul className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] space-y-2 text-left">
                  <li>• Navigation and feature guidance</li>
                  <li>• Error troubleshooting</li>
                  <li>• System documentation</li>
                  <li>• Best practices and tips</li>
                  <li>• Technical support</li>
                </ul>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MixiChatMessage key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--chart-red)] transition-colors mb-2 flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear history
              </button>
            )}
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-3 py-2 bg-[var(--bg-secondary)] dark:bg-[var(--bg-main)] border border-[var(--border-default)] dark:border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] dark:text-[var(--white-pure)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--chart-blue)] resize-none"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-4 py-2 bg-gradient-to-r from-[var(--chart-blue)] to-[var(--chart-purple)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
