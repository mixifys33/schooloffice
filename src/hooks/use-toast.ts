'use client'

import * as React from 'react'

/**
 * Toast Hook for displaying notifications
 * Simple implementation that provides consistent interface
 */

export type ToastVariant = 'default' | 'destructive' | 'success'

export interface ToastProps {
  title?: string
  description?: string
  variant?: ToastVariant
  duration?: number
}

export function useToast() {
  // Simple implementation that provides visual feedback
  return {
    toast: (props: ToastProps) => {
      const message = props.title ? `${props.title}: ${props.description || ''}` : (props.description || '')
      
      // Log to console for development feedback
      if (props.variant === 'destructive') {
        console.error('🔴 Toast Error:', message)
      } else if (props.variant === 'success') {
        console.log('✅ Toast Success:', message)
      } else {
        console.info('ℹ️ Toast Info:', message)
      }

      // Create a simple visual toast notification
      const toastElement = document.createElement('div')
      toastElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
        ${props.variant === 'destructive' 
          ? 'background-color: #dc2626; border-left: 4px solid #b91c1c;' 
          : props.variant === 'success'
          ? 'background-color: #16a34a; border-left: 4px solid #15803d;'
          : 'background-color: #2563eb; border-left: 4px solid #1d4ed8;'
        }
      `
      
      const icon = props.variant === 'destructive' ? '❌' : props.variant === 'success' ? '✅' : 'ℹ️'
      toastElement.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${icon}</span>
          <div>
            ${props.title ? `<div style="font-weight: 600; margin-bottom: 2px;">${props.title}</div>` : ''}
            ${props.description ? `<div style="opacity: 0.9;">${props.description}</div>` : ''}
          </div>
        </div>
      `

      // Add animation styles
      const style = document.createElement('style')
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `
      if (!document.querySelector('#toast-styles')) {
        style.id = 'toast-styles'
        document.head.appendChild(style)
      }

      document.body.appendChild(toastElement)

      // Auto-dismiss after duration
      const duration = props.duration || 5000
      setTimeout(() => {
        toastElement.style.animation = 'slideOut 0.3s ease-in'
        setTimeout(() => {
          if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement)
          }
        }, 300)
      }, duration)
    },
    toasts: [],
    dismiss: () => {},
  }
}

// Export types for external use
export type { ToastProps }