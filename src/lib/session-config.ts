/**
 * Session Configuration
 * Centralized configuration for session management
 * Requirements: 7.6
 */

/**
 * Session timeout configuration
 */
export const SESSION_CONFIG = {
  /**
   * Maximum session lifetime in seconds (24 hours)
   * After this time, the session will expire regardless of activity
   */
  maxAge: 24 * 60 * 60, // 24 hours

  /**
   * Session update interval in seconds (1 hour)
   * How often the session token is refreshed
   */
  updateAge: 60 * 60, // 1 hour

  /**
   * Inactivity timeout in milliseconds (2 hours)
   * If no activity for this duration, require re-authentication
   * Requirements: 7.6 - Require re-authentication after inactivity period
   */
  inactivityTimeoutMs: 2 * 60 * 60 * 1000, // 2 hours
} as const

/**
 * Get session max age in seconds
 */
export function getSessionMaxAge(): number {
  return SESSION_CONFIG.maxAge
}

/**
 * Get session update age in seconds
 */
export function getSessionUpdateAge(): number {
  return SESSION_CONFIG.updateAge
}

/**
 * Get inactivity timeout in milliseconds
 */
export function getInactivityTimeoutMs(): number {
  return SESSION_CONFIG.inactivityTimeoutMs
}

/**
 * Check if a session has expired due to inactivity
 * @param lastActivityTimestamp - Timestamp of last activity
 * @returns true if session has expired due to inactivity
 */
export function isSessionInactive(lastActivityTimestamp: number): boolean {
  return Date.now() - lastActivityTimestamp > SESSION_CONFIG.inactivityTimeoutMs
}
