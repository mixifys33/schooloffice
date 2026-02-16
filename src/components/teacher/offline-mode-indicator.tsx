/**
 * Offline Mode Indicator and Graceful Degradation Component
 * 
 * Requirements: 14.4 - Implement graceful degradation for service unavailability
 * - Show offline status and available functionality
 * - Queue operations for when connection is restored
 * - Provide alternative workflows when services are unavailable
 */

'use client'

import React, { useState, useEffect } from 'react'
import { 
  WifiOff, 
  Wifi, 
  Cloud, 
  CloudOff, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  Upload,
  Download,
  Sync,
  X,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { teacherColors } from '@/lib/teacher-ui-standards'
import { focusStyles, statusAccessibility } from '@/lib/accessibility'
import { useNetworkStatus, useOfflineSync } from '@/hooks/use-network-status'

export interface OfflineModeIndicatorProps {
  className?: string
  showDetails?: boolean
  onSyncComplete?: () => void
}

export interface OfflineCapabilitiesProps {
  availableFeatures: string[]
  unavailableFeatures: string[]
  className?: string
}

export interface SyncStatusProps {
  pendingItems: number
  isSyncing: boolean
  lastSyncTime?: Date
  onSync?: () => void
  className?: string
}

/**
 * Main offline mode indicator with status and controls
 */
export function OfflineModeIndicator({
  className,
  showDetails = false,
  onSyncComplete
}: OfflineModeIndicatorProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(showDetails)
  const networkStatus = useNetworkStatus()
  
  const offlineSync = useOfflineSync('teacher-marks', async (data) => {
    // Sync offline marks data when connection is restored
    const response = await fetch('/api/teacher/marks/batch-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entries: data,
        submitForApproval: false
      })
    })

    if (!response.ok) {
      throw new Error('Failed to sync offline data')
    }

    onSyncComplete?.()
  })

  const getStatusColor = () => {
    if (networkStatus.isOnline) {
      return offlineSync.hasOfflineData ? 'text-yellow-600' : 'text-green-600'
    }
    return 'text-red-600'
  }

  const getStatusIcon = () => {
    if (networkStatus.isOnline) {
      if (offlineSync.isSyncing) {
        return <Sync className="h-4 w-4 animate-spin" />
      }
      return offlineSync.hasOfflineData ? <Upload className="h-4 w-4" /> : <Wifi className="h-4 w-4" />
    }
    return <WifiOff className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (networkStatus.isOnline) {
      if (offlineSync.isSyncing) {
        return 'Syncing...'
      }
      return offlineSync.hasOfflineData ? 'Sync Pending' : 'Online'
    }
    return 'Offline'
  }

  const getStatusDescription = () => {
    if (networkStatus.isOnline) {
      if (offlineSync.hasOfflineData) {
        return `${offlineSync.offlineData.length} items waiting to sync`
      }
      return 'All data is synchronized'
    }
    return 'Working offline - changes will sync when connection is restored'
  }

  return (
    <Card className={cn('border-l-4', {
      'border-l-green-500': networkStatus.isOnline && !offlineSync.hasOfflineData,
      'border-l-yellow-500': networkStatus.isOnline && offlineSync.hasOfflineData,
      'border-l-red-500': !networkStatus.isOnline
    }, className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={getStatusColor()}>
              {getStatusIcon()}
            </span>
            <span className="text-sm font-medium">
              {getStatusText()}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {offlineSync.hasOfflineData && networkStatus.isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={offlineSync.sync}
                disabled={offlineSync.isSyncing}
                className="h-7 px-2 text-xs"
              >
                {offlineSync.isSyncing ? (
                  <>
                    <Sync className="h-3 w-3 mr-1 animate-spin" />
                    Syncing
                  </>
                ) : (
                  <>
                    <Upload className="h-3 w-3 mr-1" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
            
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  {isDetailsOpen ? 'Hide' : 'Details'}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">
          {getStatusDescription()}
        </p>
        
        {offlineSync.syncError && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Sync Error</AlertTitle>
            <AlertDescription>
              {offlineSync.syncError.message}
              <Button
                variant="outline"
                size="sm"
                onClick={offlineSync.sync}
                className="ml-2 h-6 px-2 text-xs"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <CollapsibleContent className="space-y-3">
            <OfflineCapabilities
              availableFeatures={[
                'View existing marks',
                'Enter new marks (saved locally)',
                'Edit draft entries',
                'View grade calculations',
                'Generate reports (cached data)'
              ]}
              unavailableFeatures={[
                'Submit marks for approval',
                'Load new student data',
                'Real-time collaboration',
                'DoS approval workflow'
              ]}
            />
            
            {offlineSync.hasOfflineData && (
              <SyncStatus
                pendingItems={offlineSync.offlineData.length}
                isSyncing={offlineSync.isSyncing}
                onSync={offlineSync.sync}
              />
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}

/**
 * Component showing available and unavailable features in offline mode
 */
export function OfflineCapabilities({
  availableFeatures,
  unavailableFeatures,
  className
}: OfflineCapabilitiesProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      <div>
        <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Available Offline
        </h4>
        <ul className="space-y-1">
          {availableFeatures.map((feature, index) => (
            <li key={index} className="text-xs text-green-600 flex items-start gap-1">
              <span className="text-green-500 mt-0.5">•</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
      
      <div>
        <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
          <X className="h-3 w-3" />
          Requires Connection
        </h4>
        <ul className="space-y-1">
          {unavailableFeatures.map((feature, index) => (
            <li key={index} className="text-xs text-red-600 flex items-start gap-1">
              <span className="text-red-500 mt-0.5">•</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/**
 * Component showing sync status and pending items
 */
export function SyncStatus({
  pendingItems,
  isSyncing,
  lastSyncTime,
  onSync,
  className
}: SyncStatusProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Sync Status</h4>
        {onSync && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing}
            className="h-6 px-2 text-xs"
          >
            {isSyncing ? (
              <>
                <Sync className="h-3 w-3 mr-1 animate-spin" />
                Syncing
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1" />
                Sync
              </>
            )}
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span>Pending items: {pendingItems}</span>
          {lastSyncTime && (
            <span className="text-muted-foreground">
              Last sync: {lastSyncTime.toLocaleTimeString()}
            </span>
          )}
        </div>
        
        {isSyncing && (
          <div className="space-y-1">
            <Progress value={undefined} className="h-1" />
            <p className="text-xs text-muted-foreground">
              Uploading changes to server...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact network status badge for headers/toolbars
 */
export interface NetworkStatusBadgeProps {
  className?: string
  showText?: boolean
}

export function NetworkStatusBadge({ className, showText = true }: NetworkStatusBadgeProps) {
  const networkStatus = useNetworkStatus()
  const offlineSync = useOfflineSync('teacher-marks', async () => {})

  const getVariant = () => {
    if (networkStatus.isOnline) {
      return offlineSync.hasOfflineData ? 'secondary' : 'default'
    }
    return 'destructive'
  }

  const getIcon = () => {
    if (networkStatus.isOnline) {
      return offlineSync.hasOfflineData ? <Upload className="h-3 w-3" /> : <Wifi className="h-3 w-3" />
    }
    return <WifiOff className="h-3 w-3" />
  }

  const getText = () => {
    if (networkStatus.isOnline) {
      return offlineSync.hasOfflineData ? 'Sync Pending' : 'Online'
    }
    return 'Offline'
  }

  return (
    <Badge variant={getVariant()} className={cn('flex items-center gap-1', className)}>
      {getIcon()}
      {showText && <span className="text-xs">{getText()}</span>}
    </Badge>
  )
}

/**
 * Full-screen offline mode overlay for critical functionality
 */
export interface OfflineModeOverlayProps {
  isVisible: boolean
  title?: string
  message?: string
  onDismiss?: () => void
  allowOfflineMode?: boolean
  className?: string
}

export function OfflineModeOverlay({
  isVisible,
  title = 'Connection Required',
  message = 'This feature requires an internet connection to function properly.',
  onDismiss,
  allowOfflineMode = false,
  className
}: OfflineModeOverlayProps) {
  const networkStatus = useNetworkStatus()

  if (!isVisible || networkStatus.isOnline) return null

  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      'bg-black/50 backdrop-blur-sm',
      className
    )}>
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudOff className="h-5 w-5 text-red-500" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {message}
          </p>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What you can do:</AlertTitle>
            <AlertDescription>
              <ul className="text-sm space-y-1 mt-2">
                <li>• Check your internet connection</li>
                <li>• Try refreshing the page</li>
                {allowOfflineMode && <li>• Continue in offline mode (limited functionality)</li>}
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Refresh Page
            </Button>
            
            {allowOfflineMode && onDismiss && (
              <Button
                variant="secondary"
                onClick={onDismiss}
                className="flex-1"
              >
                Continue Offline
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}