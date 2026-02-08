'use client'

import React, { useState, useEffect } from 'react'

export default function DebugTest() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testApi = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Making API call to /api/staff/assignments/truth-table')
      const response = await fetch('/api/staff/assignments/truth-table')
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.log('Error data:', errorData)
        const errorMessage = errorData?.error || errorData?.message || 'Failed to load assignments'
        throw new Error(errorMessage)
      }
      
      const data = await response.json()
      console.log('Success data:', data)
      setResult(data)
      
    } catch (err) {
      console.error('Error caught:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testApi()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">API Debug Test</h1>
      
      {loading && <div className="text-blue-600">Loading...</div>}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {result && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <strong>Success!</strong>
          <pre className="mt-2 text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
      
      <button
        onClick={testApi}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API Again'}
      </button>
    </div>
  )
}