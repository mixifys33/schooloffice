'use client'

import React, { useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { AIChatWidget } from './ai-chat-widget'

/**
 * AI Chat Toggle Component
 * Provides a header icon that toggles the AI chat widget
 */
export function AIChatToggle() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* AI Support Button in Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white transition-all duration-200 shadow-sm hover:shadow-md group"
        aria-label="AI Support Assistant"
        title="Get help from AI Assistant"
      >
        <div className="relative">
          <Bot className="w-4 h-4 md:w-5 md:h-5" />
          <Sparkles className="absolute -top-1 -right-1 w-2.5 h-2.5 text-yellow-300 animate-pulse" />
        </div>
        <span className="hidden sm:inline text-xs md:text-sm font-medium">
          AI Support
        </span>
        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-green-500 text-[10px] font-bold text-white rounded-full">
          24/7
        </span>
      </button>

      {/* AI Chat Widget - Controlled */}
      <AIChatWidget isOpen={isOpen} onClose={() => setIsOpen(false)} hideFloatingButton />
    </>
  )
}
