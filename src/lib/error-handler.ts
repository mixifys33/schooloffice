/**
 * Global error handler for unhandled rejections and exceptions
 * Prevents the JSON parsing errors from crashing the development server
 */

// Handle unhandled promise rejections
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

export {};