/**
 * API Health Check Endpoint
 * 
 * Requirements: 14.3, 14.4
 * - Provide health check endpoint for network status monitoring
 * - Return system status and service availability
 * - Support graceful degradation by indicating which services are available
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: {
    database: ServiceStatus
    authentication: ServiceStatus
    marksManagement: ServiceStatus
    fileStorage: ServiceStatus
  }
  version: string
  uptime: number
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  lastChecked: string
  error?: string
}

const startTime = Date.now()

/**
 * GET /api/health
 * Returns system health status and service availability
 */
export async function GET(request: NextRequest) {
  const checkStartTime = Date.now()
  
  try {
    // Check database connectivity
    const dbStatus = await checkDatabaseHealth()
    
    // Check authentication service
    const authStatus = await checkAuthenticationHealth()
    
    // Check marks management service
    const marksStatus = await checkMarksManagementHealth()
    
    // Check file storage (if applicable)
    const storageStatus = await checkFileStorageHealth()
    
    // Determine overall system status
    const services = {
      database: dbStatus,
      authentication: authStatus,
      marksManagement: marksStatus,
      fileStorage: storageStatus
    }
    
    const overallStatus = determineOverallStatus(services)
    
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      version: process.env.APP_VERSION || '1.0.0',
      uptime: Date.now() - startTime
    }
    
    // Return appropriate HTTP status based on health
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 207 : 503
    
    return NextResponse.json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Health check failed'
        },
        authentication: {
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Health check failed'
        },
        marksManagement: {
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Health check failed'
        },
        fileStorage: {
          status: 'down',
          lastChecked: new Date().toISOString(),
          error: 'Health check failed'
        }
      },
      version: process.env.APP_VERSION || '1.0.0',
      uptime: Date.now() - startTime
    }
    
    return NextResponse.json(errorResponse, { status: 503 })
  }
}

/**
 * HEAD /api/health
 * Lightweight health check for network connectivity testing
 */
export async function HEAD(request: NextRequest) {
  try {
    // Quick database ping
    await prisma.$queryRaw`SELECT 1`
    
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    return new NextResponse(null, { status: 503 })
  }
}

/**
 * Check database health and connectivity
 */
async function checkDatabaseHealth(): Promise<ServiceStatus> {
  const startTime = Date.now()
  
  try {
    // Test basic connectivity
    await prisma.$queryRaw`SELECT 1`
    
    // Test a simple query to ensure database is responsive
    const schoolCount = await prisma.school.count()
    
    const responseTime = Date.now() - startTime
    
    return {
      status: responseTime < 1000 ? 'up' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Database connection failed'
    }
  }
}

/**
 * Check authentication service health
 */
async function checkAuthenticationHealth(): Promise<ServiceStatus> {
  const startTime = Date.now()
  
  try {
    // Test user table accessibility
    const userCount = await prisma.user.count({
      take: 1
    })
    
    const responseTime = Date.now() - startTime
    
    return {
      status: responseTime < 500 ? 'up' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Authentication service unavailable'
    }
  }
}

/**
 * Check marks management service health
 */
async function checkMarksManagementHealth(): Promise<ServiceStatus> {
  const startTime = Date.now()
  
  try {
    // Test marks-related tables
    const [caCount, examCount] = await Promise.all([
      prisma.cAEntry.count({ take: 1 }),
      prisma.examEntry.count({ take: 1 })
    ])
    
    const responseTime = Date.now() - startTime
    
    return {
      status: responseTime < 1000 ? 'up' : 'degraded',
      responseTime,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Marks management service unavailable'
    }
  }
}

/**
 * Check file storage health (placeholder for future file storage integration)
 */
async function checkFileStorageHealth(): Promise<ServiceStatus> {
  const startTime = Date.now()
  
  try {
    // For now, just return healthy since we don't have file storage yet
    // In the future, this would check S3, local storage, etc.
    
    const responseTime = Date.now() - startTime
    
    return {
      status: 'up',
      responseTime,
      lastChecked: new Date().toISOString()
    }
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'File storage service unavailable'
    }
  }
}

/**
 * Determine overall system status based on individual service statuses
 */
function determineOverallStatus(services: HealthCheckResponse['services']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(services).map(service => service.status)
  
  // If any critical service is down, system is unhealthy
  if (services.database.status === 'down' || services.authentication.status === 'down') {
    return 'unhealthy'
  }
  
  // If any service is down or degraded, system is degraded
  if (statuses.includes('down') || statuses.includes('degraded')) {
    return 'degraded'
  }
  
  // All services are up
  return 'healthy'
}