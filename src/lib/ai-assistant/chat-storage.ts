/**
 * Local Storage Manager for Chat History
 * Stores chat conversations in browser localStorage
 */

import { Message } from './openrouter-client'

export interface ChatSession {
  id: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  title?: string
}

class ChatStorage {
  private static STORAGE_KEY = 'ofiniti_ai_chat_history'
  private static MAX_SESSIONS = 10
  private static MAX_MESSAGES_PER_SESSION = 50

  /**
   * Get all chat sessions
   */
  getSessions(): ChatSession[] {
    if (typeof window === 'undefined') return []
    
    try {
      const data = localStorage.getItem(ChatStorage.STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error reading chat history:', error)
      return []
    }
  }

  /**
   * Get a specific session by ID
   */
  getSession(sessionId: string): ChatSession | null {
    const sessions = this.getSessions()
    return sessions.find(s => s.id === sessionId) || null
  }

  /**
   * Save a new session or update existing
   */
  saveSession(session: ChatSession): void {
    if (typeof window === 'undefined') return

    try {
      let sessions = this.getSessions()
      
      // Find existing session
      const existingIndex = sessions.findIndex(s => s.id === session.id)
      
      if (existingIndex >= 0) {
        // Update existing
        sessions[existingIndex] = {
          ...session,
          updatedAt: Date.now(),
        }
      } else {
        // Add new session
        sessions.unshift({
          ...session,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      }

      // Limit number of sessions
      if (sessions.length > ChatStorage.MAX_SESSIONS) {
        sessions = sessions.slice(0, ChatStorage.MAX_SESSIONS)
      }

      // Limit messages per session
      sessions = sessions.map(s => ({
        ...s,
        messages: s.messages.slice(-ChatStorage.MAX_MESSAGES_PER_SESSION),
      }))

      localStorage.setItem(ChatStorage.STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error('Error saving chat history:', error)
    }
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): void {
    if (typeof window === 'undefined') return

    try {
      const sessions = this.getSessions().filter(s => s.id !== sessionId)
      localStorage.setItem(ChatStorage.STORAGE_KEY, JSON.stringify(sessions))
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  /**
   * Clear all chat history
   */
  clearAll(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(ChatStorage.STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing chat history:', error)
    }
  }

  /**
   * Generate a new session ID
   */
  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate session title from first message
   */
  generateTitle(firstMessage: string): string {
    const maxLength = 50
    const cleaned = firstMessage.trim().replace(/\s+/g, ' ')
    return cleaned.length > maxLength 
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned
  }
}

export const chatStorage = new ChatStorage()
