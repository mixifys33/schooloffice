/**
 * SMS Reminder Cooldown Client Utilities
 * Frontend-specific cooldown calculation and display logic
 */

// ============================================
// CONSTANTS
// ============================================

export const COOLDOWN_DAYS = 10;
export const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000; // 10 days in milliseconds
export const UPDATE_INTERVAL_MS = 60 * 1000; // Update every minute

// ============================================
// TYPES
// ============================================

export interface CooldownState {
  isActive: boolean;
  remainingDays: number;
  remainingHours: number;
  lastReminderSent: Date | null;
}

// ============================================
// CALCULATION FUNCTIONS
// ============================================

/**
 * Calculate cooldown state from last reminder timestamp
 * @param lastReminderSent - ISO 8601 timestamp string or null
 * @returns Cooldown state object
 */
export function calculateCooldownState(lastReminderSent: string | null): CooldownState {
  if (!lastReminderSent) {
    return {
      isActive: false,
      remainingDays: 0,
      remainingHours: 0,
      lastReminderSent: null,
    };
  }

  const lastSent = new Date(lastReminderSent);
  const now = new Date();
  const elapsed = now.getTime() - lastSent.getTime();
  const remaining = COOLDOWN_MS - elapsed;

  if (remaining <= 0) {
    return {
      isActive: false,
      remainingDays: 0,
      remainingHours: 0,
      lastReminderSent: lastSent,
    };
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  return {
    isActive: true,
    remainingDays: days,
    remainingHours: hours,
    lastReminderSent: lastSent,
  };
}

/**
 * Get button text based on cooldown state
 * @param cooldownState - Current cooldown state
 * @returns Button text to display
 */
export function getButtonText(cooldownState: CooldownState): string {
  if (!cooldownState.isActive) {
    return 'Send Reminders';
  }

  const { remainingDays, remainingHours } = cooldownState;

  if (remainingDays > 0) {
    return `Reminders sent - Next available in ${remainingDays} day${remainingDays !== 1 ? 's' : ''}, ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  } else {
    return `Reminders sent - Next available in ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  }
}
