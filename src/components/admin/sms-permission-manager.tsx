'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Toast, useLocalToast } from '@/components/ui/toast'
import { Key, Clock, Users, CheckCircle, XCircle, Copy } from 'lucide-react'

interface PermissionCode {
  id: string
  code: string
  schoolId: string
  adminId: string
  teacherId: string | null
  expiresAt: string
  usedAt: string | null
  createdAt: string
  updatedAt: string
}

interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
}

export function AdminSMSPermissionManager() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast, showToast, hideToast } = useLocalToast()
  
  const [activeCodes, setActiveCodes] = useState<PermissionCode[]>([])
  const [adminCodes, setAdminCodes] = useState<PermissionCode[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [expiresInHours, setExpiresInHours] = useState<number>(5)
  
  const [newCode, setNewCode] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch active codes and teachers
  const fetchData = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      setLoading(true)
      setError(null)
      
      // Fetch permission codes
      const codesResponse = await fetch('/api/admin/sms-permission')
      if (!codesResponse.ok) {
        throw new Error('Failed to fetch permission codes')
      }
      const codesData = await codesResponse.json()
      
      if (isMountedRef.current) {
        setActiveCodes(codesData.activeCodes || [])
        setAdminCodes(codesData.adminCodes || [])
      }
      
      // Fetch teachers
      const teachersResponse = await fetch('/api/teachers')
      if (teachersResponse.ok) {
        const teachersData = await teachersResponse.json()
        if (isMountedRef.current) {
          setTeachers(teachersData || [])
        }
      }
      
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error fetching data:', err)
        setError('Unable to load data. Please try again.')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerateCode = async () => {
    if (!isMountedRef.current) return;
    
    try {
      setGenerating(true)
      setNewCode(null)
      
      const response = await fetch('/api/admin/sms-permission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: selectedTeacher || undefined,
          expiresInHours: expiresInHours,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate code')
      }
      
      if (isMountedRef.current) {
        setNewCode(data.code)
        showToast('success', `Permission code generated: ${data.code}`)
        fetchData() // Refresh the data
      }
      
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error generating code:', err)
        showToast('error', err instanceof Error ? err.message : 'Failed to generate code')
      }
    } finally {
      if (isMountedRef.current) {
        setGenerating(false)
      }
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    if (isMountedRef.current) {
      showToast('success', 'Code copied to clipboard')
    }
  }

  const formatTimeRemaining = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`
    }
    return `${minutes}m remaining`
  }

  if (loading && !isMountedRef.current) {
    return null;
  }

  if (error && !isMountedRef.current) {
    return null;
  }

  return (
    <div className="space-y-6">
      {toast && isMountedRef.current && (
        <div className="fixed top-4 right-4 z-50">
          <Toast type={toast.type} message={toast.message} onDismiss={hideToast} />
        </div>
      )}

      {/* New Code Generated Banner */}
      {newCode && isMountedRef.current && (
        <AlertBanner 
          type="success" 
          message={
            <div className="flex items-center justify-between">
              <span>New permission code generated: <strong className="text-lg">{newCode}</strong></span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyToClipboard(newCode)}
                className="ml-2"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          }
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generate Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Generate Permission Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assign to Teacher (Optional)</label>
              <select 
                value={selectedTeacher} 
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Any Teacher</option>
                {isMountedRef.current && teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to allow any teacher to use this code
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Expires In (Hours)</label>
              <select 
                value={expiresInHours} 
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={3}>3 hours</option>
                <option value={4}>4 hours</option>
                <option value={5}>5 hours (Default)</option>
                <option value={8}>8 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>
            
            <Button 
              onClick={handleGenerateCode} 
              disabled={generating}
              className="w-full"
            >
              {generating ? 'Generating...' : 'Generate Permission Code'}
            </Button>
            
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
              <p className="font-medium mb-1">Instructions:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Codes expire after the selected time period</li>
                <li>Each code can only be used once</li>
                <li>Share codes securely with teachers</li>
                <li>Teachers must enter the code when sending SMS</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Active Codes Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Permission Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isMountedRef.current && activeCodes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No active permission codes
              </p>
            ) : (
              <div className="space-y-3">
                {isMountedRef.current && activeCodes.map(code => (
                  <div key={code.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-mono bg-muted px-2 py-1 rounded">
                            {code.code}
                          </code>
                          {code.teacherId ? (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Assigned
                            </span>
                          ) : (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Any Teacher
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {new Date(code.expiresAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Time remaining: {formatTimeRemaining(code.expiresAt)}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recently Generated Codes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recently Generated Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isMountedRef.current && adminCodes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No codes generated yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Code</th>
                    <th className="text-left py-2 px-3">Assigned To</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Expires</th>
                    <th className="text-left py-2 px-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {isMountedRef.current && adminCodes.slice(0, 10).map(code => (
                    <tr key={code.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3">
                        <code className="font-mono">{code.code}</code>
                      </td>
                      <td className="py-2 px-3">
                        {code.teacherId ? (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Assigned
                          </span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Any Teacher
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        {code.usedAt ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Used
                          </span>
                        ) : new Date(code.expiresAt) < new Date() ? (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            Expired
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <Clock className="h-4 w-4" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {new Date(code.expiresAt).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {new Date(code.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}