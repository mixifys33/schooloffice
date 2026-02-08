/**
 * Cleanup Job for Expired Teacher SMS Permission Codes
 * Runs periodically to remove expired/used codes from the database
 */

import { teacherSMSPermissionService } from '@/services/teacher-sms-permission.service'

export async function cleanupExpiredPermissionCodes() {
  try {
    console.log('Starting cleanup of expired permission codes...')
    
    // Clean up codes older than 30 days
    const deletedCount = await teacherSMSPermissionService.cleanupExpiredCodes(30)
    
    console.log(`Cleaned up ${deletedCount} expired permission codes`)
    
    return {
      success: true,
      deletedCount,
      message: `Successfully cleaned up ${deletedCount} expired permission codes`
    }
  } catch (error) {
    console.error('Error cleaning up expired permission codes:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Export for use in cron jobs or manual cleanup
export default cleanupExpiredPermissionCodes