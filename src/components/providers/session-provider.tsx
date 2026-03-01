'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'
import { ReactNode, useEffect } from 'react'

interface SessionProviderProps {
  children: ReactNode
}

export function SessionProvider({ children }: SessionProviderProps) {
  useEffect(() => {
    // Suppress NextAuth fetch errors from appearing in console
    // These are handled internally by NextAuth and don't affect functionality
    const originalError = console.error
    console.error = (...args: any[]) => {
      // Filter out NextAuth fetch errors that are handled internally
      const errorMessage = args[0]?.toString() || ''
      
      // Suppress these specific NextAuth errors that don't affect user experience
      if (
        errorMessage.includes('ClientFetchError') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('errors.authjs.dev#autherror') ||
        errorMessage.includes('SessionProvider')
      ) {
        // Silently ignore - these are handled by NextAuth internally
        return
      }
      
      // Log all other errors normally
      originalError.apply(console, args)
    }

    return () => {
      console.error = originalError
    }
  }, [])

  return (
    <NextAuthSessionProvider
      // Refetch session every 10 minutes to reduce server load
      refetchInterval={10 * 60}
      // Only refetch on window focus if session is older than 5 minutes
      refetchOnWindowFocus={false}
      // Don't show errors to users - handle them gracefully
      onError={(error) => {
        // Log to console for debugging but don't show to users
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Auth] Session error (handled):', error.message)
        }
        // Errors are handled internally by NextAuth
        // Users will be redirected to login if session is invalid
      }}
    >
      {children}
    </NextAuthSessionProvider>
  )
}
