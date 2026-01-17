import React, { ReactNode } from 'react';

/**
 * Auth Layout
 * Requirements: 9.1, 9.2, 10.1
 * - Neutral colors with strong contrast, no gradients
 * - Centered card layout with ample white space
 * - Professional, calm aesthetic
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-950 px-4 py-8">
      {/* Logo/Brand Area */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-900 dark:bg-white mb-3">
          <span className="text-white dark:text-gray-900 font-bold text-lg">SO</span>
        </div>
      </div>
      
      {/* Main Content Card */}
      <div className="w-full max-w-md">
        {children}
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© {new Date().getFullYear()} SchoolOffice. All rights reserved.</p>
      </div>
    </div>
  );
}
