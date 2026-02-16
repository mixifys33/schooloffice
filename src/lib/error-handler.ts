/**
 * Global error handler for unhandled rejections and exceptions
 * Prevents errors from crashing the application and provides user-friendly handling
 */

// Handle unhandled promise rejections (Server-side)
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason, promise) => {
    console.warn('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Check if it's a JSON parsing error and suppress it
    if (reason instanceof SyntaxError && 
        reason.message.includes('Unexpected non-whitespace character after JSON')) {
      console.warn('Suppressing JSON parsing error in development');
      return;
    }
    
    // Log other unhandled rejections but don't crash
    console.error('Unhandled Promise Rejection:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.warn('Uncaught Exception:', error);
    
    // Check if it's a source map parsing error and suppress it
    if (error.message && error.message.includes('sourceMapURL could not be parsed')) {
      console.warn('Suppressing source map parsing error in development');
      return;
    }
    
    // Log other uncaught exceptions but don't crash in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Uncaught Exception in development:', error);
      return;
    }
    
    // In production, we should still crash on uncaught exceptions
    throw error;
  });
}

// Handle unhandled promise rejections (Client-side)
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    
    // Suppress NextAuth fetch errors - they're handled internally
    if (
      reason?.message?.includes('Failed to fetch') ||
      reason?.message?.includes('ClientFetchError') ||
      reason?.message?.includes('errors.authjs.dev')
    ) {
      event.preventDefault() // Prevent error from showing in console
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Auth] Fetch error suppressed (handled internally)')
      }
      return
    }
    
    // Log other unhandled rejections for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Unhandled Promise Rejection (client):', reason)
    }
  })

  // Handle uncaught errors (Client-side)
  window.addEventListener('error', (event) => {
    const error = event.error
    
    // Suppress NextAuth-related errors
    if (
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('ClientFetchError') ||
      error?.message?.includes('SessionProvider')
    ) {
      event.preventDefault() // Prevent error from showing
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Auth] Error suppressed (handled internally)')
      }
      return
    }
    
    // Log other errors for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('Uncaught Error (client):', error)
    }
  })
}

export {};