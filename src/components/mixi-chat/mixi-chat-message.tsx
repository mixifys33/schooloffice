'use client'

import { Bot, User, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface MixiChatMessageProps {
  message: Message
}

export function MixiChatMessage({ message }: MixiChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-[var(--chart-blue)]'
            : 'bg-gradient-to-br from-[var(--chart-purple)] to-[var(--chart-blue)]'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isUser ? 'flex justify-end' : ''}`}>
        <div
          className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 ${
            isUser
              ? 'bg-[var(--chart-blue)] text-white'
              : 'bg-[var(--bg-secondary)] dark:bg-[var(--bg-main)] border border-[var(--border-default)] dark:border-[var(--border-strong)] text-[var(--text-primary)] dark:text-[var(--white-pure)]'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  code: ({ node, inline, className, children, ...props }: any) => {
                    return inline ? (
                      <code
                        className="bg-[var(--bg-main)] dark:bg-[var(--bg-secondary)] px-1 py-0.5 rounded text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <div className="relative group">
                        <pre className="bg-[var(--bg-main)] dark:bg-[var(--bg-secondary)] p-3 rounded-lg overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                        <button
                          onClick={handleCopy}
                          className="absolute top-2 right-2 p-1.5 bg-[var(--bg-secondary)] dark:bg-[var(--bg-main)] rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {copied ? (
                            <Check className="w-3 h-3 text-[var(--chart-green)]" />
                          ) : (
                            <Copy className="w-3 h-3 text-[var(--text-muted)]" />
                          )}
                        </button>
                      </div>
                    )
                  },
                  a: ({ node, ...props }: any) => (
                    <a
                      className="text-[var(--chart-blue)] hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    />
                  ),
                  ul: ({ node, ...props }: any) => (
                    <ul className="list-disc list-inside space-y-1" {...props} />
                  ),
                  ol: ({ node, ...props }: any) => (
                    <ol className="list-decimal list-inside space-y-1" {...props} />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          
          {!isUser && (
            <button
              onClick={handleCopy}
              className="mt-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--white-pure)] transition-colors flex items-center gap-1"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>
          )}
        </div>
        
        <p className="text-xs text-[var(--text-muted)] mt-1 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}
