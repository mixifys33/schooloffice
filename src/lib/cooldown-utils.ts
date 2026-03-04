/**
 * SMS Reminder Cooldown Utilities
 * Handles cooldown period validation and calculation for SMS reminders
 */

// ============================================
// CONSTANTS
// ============================================

export const COOLDOWN_DAYS = 10;
export const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000; // 10 days in milliseconds

// ============================================
// TYPES
// ============================================

export interface RemainingCooldown {
  days: number;
  hours: number;
  nextAvailableAt: Date;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if cooldown period is currently active
 * @param lastReminderSent - Timestamp of last reminder batch sent (null if never sent)
 * @returns true if cooldown is active, false otherwise
 */
export function isCooldownActive(lastReminderSent: Date | null): boolean {
  if (!lastReminderSent) return false;

  const now = new Date();
  const elapsed = now.getTime() - lastReminderSent.getTime();

  return elapsed < COOLDOWN_MS;
}

/**
 * Calculate remaining cooldown time
 * @param lastReminderSent - Timestamp of last reminder batch sent
 * @returns Object with days, hours, and next available timestamp
 */
export function getRemainingCooldown(lastReminderSent: Date): RemainingCooldown {
  const now = new Date();
  const elapsed = now.getTime() - lastReminderSent.getTime();
  const remaining = COOLDOWN_MS - elapsed;

  if (remaining <= 0) {
    return { days: 0, hours: 0, nextAvailableAt: now };
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const nextAvailableAt = new Date(lastReminderSent.getTime() + COOLDOWN_MS);

  return { days, hours, nextAvailableAt };
}

/**
 * Validate timestamp for data integrity
 * @param timestamp - Timestamp to validate
 * @returns Validated timestamp or null if invalid
 */
export function validateTimestamp(timestamp: Date | null): Date | null {
  if (!timestamp) return null;

  const now = new Date();
  
  // Check if timestamp is in the future (invalid data)
  if (timestamp.getTime() > now.getTime()) {
    console.error('[Cooldown] Invalid timestamp: future date detected', timestamp);
    return null; // Treat as no cooldown
  }

  return timestamp;
}
