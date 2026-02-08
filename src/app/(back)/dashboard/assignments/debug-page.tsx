'use client'

import React, { useEffect, useState, useCallback } from 'react'

export default function DebugAssignmentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  const loadAssignments = useCallback(async () => {
    try {
      console.log('Starting loadAssignments...')
      setLoading(true)
      setError(null)
      console.log('setError called with null')
      
      const response = await fetch('/api/staff/assignments/truth-table')
      console.log('Response received:', response.status, response.ok)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.log('Error data:', errorData)
        const errorMessage = errorData?.error || errorData?.message || 'Failed to load assignments'
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Data received:', result)
      setData(result)

    } catch (err) {
      console.error('Error in loadAssignments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Debug Assignments Page</h1>
      {error && (
        <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>
          Error: {error}
        </div>
      )}
      {data && (
        <div>
          <h2>Data Loaded Successfully</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
      <button onClick={loadAssignments}>Reload</button>
    </div>
  )
}