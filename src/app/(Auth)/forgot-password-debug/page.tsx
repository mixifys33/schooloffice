'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function ForgotPasswordDebugPage() {
  const [debugResult, setDebugResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const runDebugTest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/forgot-password/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolCode: 'STMARYS',
          identifier: 'test@example.com'
        }),
      })
      
      const result = await response.json()
      setDebugResult(result)
      console.log('Debug result:', result)
    } catch (error) {
      console.error('Debug test failed:', error)
      setDebugResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }
  
  const runEmailTest = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/test-email')
      const result = await response.json()
      setDebugResult(result)
      console.log('Email test result:', result)
    } catch (error) {
      console.error('Email test failed:', error)
      setDebugResult({ error: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Forgot Password Debug</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Button onClick={runDebugTest} disabled={isLoading}>
          {isLoading ? 'Running Debug Test...' : 'Run Full Debug Test'}
        </Button>
        <Button onClick={runEmailTest} disabled={isLoading} variant="outline">
          {isLoading ? 'Testing Email...' : 'Test Email Service'}
        </Button>
      </div>
      
      {debugResult && (
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Debug Results</h2>
          <pre className="text-sm overflow-auto max-h-96">
            {JSON.stringify(debugResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}