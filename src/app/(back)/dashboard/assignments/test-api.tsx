'use client'

import { useEffect, useState } from 'react'

export default function TestApiPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testApi = async () => {
      try {
        setLoading(true)
        setError(null)
        
        console.log('Making API request to /api/staff/assignments/truth-table')
        const response = await fetch('/api/staff/assignments/truth-table')
        
        console.log('Response status:', response.status)
        console.log('Response ok:', response.ok)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.log('Error response text:', errorText)
          try {
            const errorData = JSON.parse(errorText)
            throw new Error(errorData.error || errorData.message || 'Failed to load assignments')
          } catch (parseError) {
            throw new Error(`HTTP ${response.status}: ${errorText}`)
          }
        }
        
        const data = await response.json()
        console.log('Success data:', data)
        setResult(data)
      } catch (err) {
        console.error('API Test Error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    testApi()
  }, [])

  if (loading) {
    return <div className="p-6">Testing API... Loading</div>
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">API Test Failed</h1>
        <p className="mt-2 text-red-500">Error: {error}</p>
        <div className="mt-4">
          <h2 className="font-semibold">Debug Info:</h2>
          <pre className="bg-gray-100 p-4 mt-2 rounded">
            {JSON.stringify({ error }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-green-600">API Test Success</h1>
      <div className="mt-4">
        <h2 className="font-semibold">Response Data:</h2>
        <pre className="bg-gray-100 p-4 mt-2 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    </div>
  )
}