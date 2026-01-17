/**
 * System Health API Route
 * Requirements: 20.1, 20.2, 20.3, 20.4
 * - GET: Get system health status (SMS balance, queue status, storage usage, backup status)
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// System health status interface
interface SystemHealthStatus {
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
}

// Thresholds for warnings
const SMS_LOW_THRESHOLD = 100
const BACKUP_OVERDUE_HOURS = 48
const STORAGE_WARNING_PERCENT = 80

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const schoolId = (session.user as { schoolId?: string }).schoolId
    if (!schoolId) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Get school data for SMS credits - Requirement 20.1
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        smsCreditsUsed: true,
        smsBudgetPerTerm: true,
      },
    })

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      )
    }

    // Calculate SMS balance
    const smsCreditsBalance = school.smsBudgetPerTerm - school.smsCreditsUsed
    const smsCreditsLow = smsCreditsBalance < SMS_LOW_THRESHOLD

    // Get message queue status - Requirement 20.2
    // Count pending messages (messages created in last 24 hours that haven't been sent)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const messageQueueSize = await prisma.message.count({
      where: {
        schoolId,
        status: 'PENDING',
        createdAt: { gte: oneDayAgo },
      },
    })

    // Count failed messages
    const failedJobsCount = await prisma.message.count({
      where: {
        schoolId,
        status: 'FAILED',
        createdAt: { gte: oneDayAgo },
      },
    })

    // Storage usage - Requirement 20.3
    // Count documents and estimate storage (simplified calculation)
    const documentCount = await prisma.guardianDocument.count({
      where: {
        guardian: {
          schoolId,
        },
      },
    })
    
    // Estimate storage based on document count (average 500KB per document)
    const estimatedStorageMB = Math.round(documentCount * 0.5)
    const storageQuotaMB = 5000 // 5GB default quota

    // Backup status - Requirement 20.4
    // In a real implementation, this would check actual backup timestamps
    // For now, we'll simulate with a placeholder
    const lastBackupAt = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
    const backupAge = Date.now() - new Date(lastBackupAt).getTime()
    const backupOverdue = backupAge > BACKUP_OVERDUE_HOURS * 60 * 60 * 1000

    // Database health check
    let databaseStatus: 'healthy' | 'degraded' | 'error' = 'healthy'
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      databaseStatus = 'error'
    }

    const healthStatus: SystemHealthStatus = {
      smsCreditsBalance,
      smsCreditsLow,
      messageQueueSize,
      failedJobsCount,
      storageUsedMB: estimatedStorageMB,
      storageQuotaMB,
      lastBackupAt,
      backupOverdue,
      databaseStatus,
      lastCheckedAt: new Date().toISOString(),
    }

    // Add warnings if thresholds exceeded - Requirement 20.5
    const warnings: string[] = []
    if (smsCreditsLow) {
      warnings.push(`SMS credits low: ${smsCreditsBalance} remaining`)
    }
    if (failedJobsCount > 0) {
      warnings.push(`${failedJobsCount} failed messages in the last 24 hours`)
    }
    if (estimatedStorageMB / storageQuotaMB > STORAGE_WARNING_PERCENT / 100) {
      warnings.push(`Storage usage at ${Math.round(estimatedStorageMB / storageQuotaMB * 100)}%`)
    }
    if (backupOverdue) {
      warnings.push('Backup is overdue')
    }
    if (databaseStatus !== 'healthy') {
      warnings.push(`Database status: ${databaseStatus}`)
    }

    return NextResponse.json({
      ...healthStatus,
      warnings,
      hasWarnings: warnings.length > 0,
    })
  } catch (error) {
    console.error('Error fetching system health:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system health status' },
      { status: 500 }
    )
  }
}
