'use client'

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-surface)] dark:bg-[var(--text-primary)] px-4 py-8">
      {/* Logo/Brand Area */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg bg-[var(--bg-main)] dark:bg-[var(--bg-main)] mb-4 shadow-lg border border-[var(--border-default)] dark:border-[var(--border-default)]">
          <img 
            src="/images/schooloffice.png" 
            alt="SchoolOffice Logo" 
            className="w-16 h-16 object-contain"
            onError={(e) => {
              // Fallback to a simple icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `
                  <div class="w-16 h-16 bg-[var(--chart-blue)] rounded-lg flex items-center justify-center">
                    <svg class="w-10 h-10 text-[var(--white-pure)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                `;
              }
            }}
          />
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-1">SchoolOffice</h1>
        <p className="text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Digitalising the Education Sector</p>
      </div>
      
      {/* Main Content Card */}
      <div className="w-full max-w-md">
        {children}
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-sm text-[var(--text-muted)] dark:text-[var(--text-muted)]">
        <p>© {new Date().getFullYear()} SchoolOffice. All rights reserved.</p>
      </div>
    </div>
  );
}
