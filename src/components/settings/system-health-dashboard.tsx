'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { 
  Activity, 
  MessageSquare, 
  HardDrive, 
  Database, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SkeletonLoader } from '@/components/ui/skeleton-loader'
import { AlertBanner } from '@/components/ui/alert-banner'
import { Badge } from '@/components/ui/badge'

/**
 * System Health Dashboard Component
 * Requirements: 20.1, 20.2, 20.3, 20.4, 20.5
 * - SMS balance, queue status, storage usage, backup status
 */

interface SystemHealthData {
  smsCreditsBalance: number
  smsCreditsLow: boolean
  messageQueueSize: number
  failedJobsCount: number
  storageUsedMB: number
  storageQuotaMB: number
  lastBackupAt?: string
  backupOverdue: boolean
  databaseStatus: 'healthy' | 'degraded' | 'error'
  lastCheckedAt: string
  warnings: string[]
  hasWarnings: boolean
}

export function SystemHealthDashboard() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null)

  const fetchHealth = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      const response = await fetch('/api/settings/system-health')
      if (!response.ok) throw new Error('Failed to fetch system health')
      const data: SystemHealthData = await response.json()
      setHealthData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching system health:', err)
      setError('Unable to load system health data. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleString()
  }

  const getStoragePercentage = () => {
    if (!healthData) return 0
    return Math.round((healthData.storageUsedMB / healthData.storageQuotaMB) * 100)
  }

  const getStatusColor = (status: 'healthy' | 'degraded' | 'error') => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'degraded': return 'text-yellow-500'
      case 'error': return 'text-red-500'
      default: return 'text-muted-foreground'
    }
  }

  const getStatusIcon = (status: 'healthy' | 'degraded' | 'error') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />
      default: return null
    }
  }

  if (loading) {
    return <SkeletonLoader variant="card" count={4} />
  }

  if (error) {
    return <AlertBanner type="danger" message={error} action={{ label: 'Retry', onClick: () => fetchHealth() }} />
  }

  if (!healthData) {
    return <AlertBanner type="warning" message="No health data available" />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">System Health</h2>
          <p className="text-sm text-muted-foreground">
            Monitor system status and resource usage
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchHealth(true)} 
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {healthData.hasWarnings && (
        <AlertBanner 
          type="warning" 
          message={
            <div>
              <strong>System Warnings:</strong>
              <ul className="list-disc list-inside mt-1">
                {healthData.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          } 
        />
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* SMS Credits Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              SMS Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${healthData.smsCreditsLow ? 'text-red-500' : ''}`}>
                {healthData.smsCreditsBalance.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">remaining</span>
            </div>
            {healthData.smsCreditsLow && (
              <Badge variant="destructive" className="mt-2">Low Balance</Badge>
            )}
          </CardContent>
        </Card>

        {/* Message Queue Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Message Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{healthData.messageQueueSize}</span>
                <span className="text-sm text-muted-foreground">pending</span>
              </div>
              {healthData.failedJobsCount > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">{healthData.failedJobsCount} failed</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Storage Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">{getStoragePercentage()}%</span>
                <span className="text-sm text-muted-foreground">used</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getStoragePercentage() > 80 ? 'bg-red-500' : 'bg-primary'}`}
                  style={{ width: `${Math.min(getStoragePercentage(), 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {healthData.storageUsedMB} MB / {healthData.storageQuotaMB} MB
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Database Status Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusIcon(healthData.databaseStatus)}
              <span className={`text-lg font-medium capitalize ${getStatusColor(healthData.databaseStatus)}`}>
                {healthData.databaseStatus}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Backup Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Backup Status
            </CardTitle>
            <CardDescription>Last backup information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Backup</span>
                <span className="font-medium">{formatDate(healthData.lastBackupAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  {healthData.backupOverdue ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <Badge variant="outline" className="text-yellow-600">Overdue</Badge>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Badge variant="outline" className="text-green-600">Up to date</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>General system status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Health Check</span>
                <span className="font-medium">{formatDate(healthData.lastCheckedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Overall Status</span>
                <div className="flex items-center gap-2">
                  {healthData.hasWarnings ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <Badge variant="outline" className="text-yellow-600">
                        {healthData.warnings.length} Warning{healthData.warnings.length > 1 ? 's' : ''}
                      </Badge>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <Badge variant="outline" className="text-green-600">All Systems Normal</Badge>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
