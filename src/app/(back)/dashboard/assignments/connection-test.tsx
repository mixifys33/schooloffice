'use client'

import React, { useState, useEffect } from 'react'
import { prisma } from '@/lib/db'

export default function ConnectionTest() {
  const [status, setStatus] = useState<string>('Testing...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        setStatus('Testing database connection...')
        
        // Try to connect to the database
        await prisma.$connect()
        setStatus('✅ Database connected successfully')
        
        // Try a simple query
        setStatus('Testing simple query...')
        const result = await prisma.staff.findFirst()
        setStatus(`✅ Database query successful. Found staff record: ${result ? 'Yes' : 'No'}`)
        
      } catch (err) {
        console.error('Connection test failed:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('❌ Database connection failed')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Database Connection Test</h2>
      <div className="space-y-2">
        <p className="font-medium">Status: {status}</p>
        {error && (
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <p className="text-red-800 font-medium">Error Details:</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}