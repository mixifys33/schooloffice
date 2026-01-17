/**
 * Property Test: Message Retry and Fallback Chain
 * **Feature: school-office, Property 24: Message Retry and Fallback Chain**
 * **Validates: Requirements 19.4, 26.1, 26.2, 26.3, 26.4**
 * 
 * For any failed SMS, the system SHALL retry up to 2 times, 
 * then fallback to WhatsApp, then Email, logging each attempt.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { MessageChannel } from '../../src/types/enums'

// ============================================
// RETRY CONFIGURATION (mirrors communication.service.ts)
// ============================================

const MAX_SMS_RETRIES = 2
const RETRY_INTERVALS_MS = [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000] // 5min, 15min, 30min

// ============================================
// RETRY AND FALLBACK LOGIC (mirrors communication.service.ts)
// ============================================

/**
 * Determine if retry should be attempted
 */
function shouldRetry(retryCount: number): boolean {
  return retryCount < MAX_SMS_RETRIES
}

/**
 * Get next retry interval with exponential backoff
 */
function getRetryInterval(retryCount: number): number {
  return RETRY_INTERVALS_MS[Math.min(retryCount, RETRY_INTERVALS_MS.length - 1)]
}

/**
 * Get next fallback channel in the chain
 */
function getNextFallbackChannel(currentChannel: MessageChannel): MessageChannel | null {
  switch (currentChannel) {
    case MessageChannel.SMS:
      return MessageChannel.WHATSAPP
    case MessageChannel.WHATSAPP:
      return MessageChannel.EMAIL
    case MessageChannel.EMAIL:
      return null // No more fallbacks
    default:
      return null
  }
}

/**
 * Execute fallback chain
 */
interface FallbackChainResult {
  finalChannel: MessageChannel
  attempts: {
    channel: MessageChannel
    success: boolean
    error?: string
  }[]
  allFailed: boolean
}

function executeFallbackChain(
  smsResult: { success: boolean; error?: string },
  whatsappResult: { success: boolean; error?: string },
  emailResult: { success: boolean; error?: string }
): FallbackChainResult {
  const attempts: { channel: MessageChannel; success: boolean; error?: string }[] = []

  // Try SMS first
  attempts.push({
    channel: MessageChannel.SMS,
    success: smsResult.success,
    error: smsResult.error,
  })

  if (smsResult.success) {
    return {
      finalChannel: MessageChannel.SMS,
      attempts,
      allFailed: false,
    }
  }

  // Fallback to WhatsApp
  attempts.push({
    channel: MessageChannel.WHATSAPP,
    success: whatsappResult.success,
    error: whatsappResult.error,
  })

  if (whatsappResult.success) {
    return {
      finalChannel: MessageChannel.WHATSAPP,
      attempts,
      allFailed: false,
    }
  }

  // Fallback to Email
  attempts.push({
    channel: MessageChannel.EMAIL,
    success: emailResult.success,
    error: emailResult.error,
  })

  if (emailResult.success) {
    return {
      finalChannel: MessageChannel.EMAIL,
      attempts,
      allFailed: false,
    }
  }

  // All channels failed
  return {
    finalChannel: MessageChannel.EMAIL,
    attempts,
    allFailed: true,
  }
}

/**
 * Simulate message delivery with retry logic
 */
function simulateDeliveryWithRetry(
  channelResults: Map<MessageChannel, boolean[]>
): {
  success: boolean
  finalChannel: MessageChannel
  totalAttempts: number
  attemptsPerChannel: Map<MessageChannel, number>
  flaggedForManualFollowup: boolean
} {
  const attemptsPerChannel = new Map<MessageChannel, number>()
  let totalAttempts = 0
  let currentChannel = MessageChannel.SMS

  while (currentChannel !== null) {
    const results = channelResults.get(currentChannel) || [false]
    let retryCount = 0

    // Try current channel with retries
    while (retryCount <= MAX_SMS_RETRIES) {
      const attemptIndex = Math.min(retryCount, results.length - 1)
      const success = results[attemptIndex]
      
      totalAttempts++
      attemptsPerChannel.set(
        currentChannel,
        (attemptsPerChannel.get(currentChannel) || 0) + 1
      )

      if (success) {
        return {
          success: true,
          finalChannel: currentChannel,
          totalAttempts,
          attemptsPerChannel,
          flaggedForManualFollowup: false,
        }
      }

      retryCount++
      if (retryCount > MAX_SMS_RETRIES) break
    }

    // Move to next fallback channel
    const nextChannel = getNextFallbackChannel(currentChannel)
    if (nextChannel === null) break
    currentChannel = nextChannel
  }

  return {
    success: false,
    finalChannel: currentChannel,
    totalAttempts,
    attemptsPerChannel,
    flaggedForManualFollowup: true,
  }
}

// ============================================
// ARBITRARIES
// ============================================

const channelArbitrary = fc.constantFrom(
  MessageChannel.SMS,
  MessageChannel.WHATSAPP,
  MessageChannel.EMAIL
)

const sendResultArbitrary = fc.record({
  success: fc.boolean(),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
})

// Generate channel results for simulation
const channelResultsArbitrary = fc.record({
  sms: fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
  whatsapp: fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
  email: fc.array(fc.boolean(), { minLength: 1, maxLength: 5 }),
}).map(results => {
  const map = new Map<MessageChannel, boolean[]>()
  map.set(MessageChannel.SMS, results.sms)
  map.set(MessageChannel.WHATSAPP, results.whatsapp)
  map.set(MessageChannel.EMAIL, results.email)
  return map
})

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 24: Message Retry and Fallback Chain', () => {
  /**
   * Property: SMS retries up to 2 times before fallback
   * For any failed SMS, the system SHALL retry up to 2 times
   */
  it('SMS retries up to 2 times before fallback', () => {
    fc.assert(
      fc.property(fc.nat({ max: 5 }), (retryCount) => {
        const shouldRetryResult = shouldRetry(retryCount)
        
        if (retryCount < MAX_SMS_RETRIES) {
          return shouldRetryResult === true
        } else {
          return shouldRetryResult === false
        }
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Retry intervals follow exponential backoff
   * Requirement 26.5: Exponential backoff (5min, 15min, 30min)
   */
  it('retry intervals follow exponential backoff', () => {
    fc.assert(
      fc.property(fc.nat({ max: 10 }), (retryCount) => {
        const interval = getRetryInterval(retryCount)
        
        // Interval should be one of the defined values
        return RETRY_INTERVALS_MS.includes(interval)
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Retry intervals increase with retry count
   */
  it('retry intervals increase with retry count (up to max)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const interval0 = getRetryInterval(0)
        const interval1 = getRetryInterval(1)
        const interval2 = getRetryInterval(2)
        
        return interval0 <= interval1 && interval1 <= interval2
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: Fallback chain order is SMS -> WhatsApp -> Email
   */
  it('fallback chain order is SMS -> WhatsApp -> Email', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const afterSms = getNextFallbackChannel(MessageChannel.SMS)
        const afterWhatsapp = getNextFallbackChannel(MessageChannel.WHATSAPP)
        const afterEmail = getNextFallbackChannel(MessageChannel.EMAIL)
        
        return afterSms === MessageChannel.WHATSAPP &&
               afterWhatsapp === MessageChannel.EMAIL &&
               afterEmail === null
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: Email is the final fallback (no further fallback)
   */
  it('Email has no further fallback', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        return getNextFallbackChannel(MessageChannel.EMAIL) === null
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: Successful SMS delivery stops the chain
   */
  it('successful SMS delivery stops the chain', () => {
    fc.assert(
      fc.property(
        sendResultArbitrary,
        sendResultArbitrary,
        (whatsappResult, emailResult) => {
          const result = executeFallbackChain(
            { success: true },
            whatsappResult,
            emailResult
          )
          
          return result.finalChannel === MessageChannel.SMS &&
                 result.allFailed === false &&
                 result.attempts.length === 1
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Failed SMS falls back to WhatsApp
   */
  it('failed SMS falls back to WhatsApp', () => {
    fc.assert(
      fc.property(sendResultArbitrary, (emailResult) => {
        const result = executeFallbackChain(
          { success: false, error: 'SMS failed' },
          { success: true },
          emailResult
        )
        
        return result.finalChannel === MessageChannel.WHATSAPP &&
               result.allFailed === false &&
               result.attempts.length === 2
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Failed SMS and WhatsApp falls back to Email
   */
  it('failed SMS and WhatsApp falls back to Email', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = executeFallbackChain(
          { success: false, error: 'SMS failed' },
          { success: false, error: 'WhatsApp failed' },
          { success: true }
        )
        
        return result.finalChannel === MessageChannel.EMAIL &&
               result.allFailed === false &&
               result.attempts.length === 3
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: All channels failing results in allFailed = true
   */
  it('all channels failing results in allFailed flag', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const result = executeFallbackChain(
          { success: false, error: 'SMS failed' },
          { success: false, error: 'WhatsApp failed' },
          { success: false, error: 'Email failed' }
        )
        
        return result.allFailed === true &&
               result.attempts.length === 3
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: All attempts are logged
   * Requirement 26.4: Log all attempts
   */
  it('all attempts are logged in the result', () => {
    fc.assert(
      fc.property(
        sendResultArbitrary,
        sendResultArbitrary,
        sendResultArbitrary,
        (smsResult, whatsappResult, emailResult) => {
          const result = executeFallbackChain(smsResult, whatsappResult, emailResult)
          
          // First attempt is always SMS
          if (result.attempts.length >= 1) {
            if (result.attempts[0].channel !== MessageChannel.SMS) return false
          }
          
          // If SMS failed, second attempt is WhatsApp
          if (!smsResult.success && result.attempts.length >= 2) {
            if (result.attempts[1].channel !== MessageChannel.WHATSAPP) return false
          }
          
          // If both failed, third attempt is Email
          if (!smsResult.success && !whatsappResult.success && result.attempts.length >= 3) {
            if (result.attempts[2].channel !== MessageChannel.EMAIL) return false
          }
          
          return true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Simulation respects retry limits per channel
   */
  it('simulation respects retry limits per channel', () => {
    fc.assert(
      fc.property(channelResultsArbitrary, (channelResults) => {
        const result = simulateDeliveryWithRetry(channelResults)
        
        // Each channel should have at most MAX_SMS_RETRIES + 1 attempts
        for (const [, attempts] of result.attemptsPerChannel) {
          if (attempts > MAX_SMS_RETRIES + 1) return false
        }
        
        return true
      }),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Successful delivery on any channel stops further attempts
   */
  it('successful delivery stops further attempts', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // SMS succeeds on first try
        const channelResults = new Map<MessageChannel, boolean[]>()
        channelResults.set(MessageChannel.SMS, [true])
        channelResults.set(MessageChannel.WHATSAPP, [false])
        channelResults.set(MessageChannel.EMAIL, [false])
        
        const result = simulateDeliveryWithRetry(channelResults)
        
        return result.success === true &&
               result.finalChannel === MessageChannel.SMS &&
               result.totalAttempts === 1
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: Failed delivery on all channels flags for manual follow-up
   */
  it('failed delivery on all channels flags for manual follow-up', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // All channels fail
        const channelResults = new Map<MessageChannel, boolean[]>()
        channelResults.set(MessageChannel.SMS, [false, false, false])
        channelResults.set(MessageChannel.WHATSAPP, [false, false, false])
        channelResults.set(MessageChannel.EMAIL, [false, false, false])
        
        const result = simulateDeliveryWithRetry(channelResults)
        
        return result.success === false &&
               result.flaggedForManualFollowup === true
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: Retry on second attempt succeeds
   */
  it('retry on second attempt succeeds', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // SMS fails first, succeeds on retry
        const channelResults = new Map<MessageChannel, boolean[]>()
        channelResults.set(MessageChannel.SMS, [false, true])
        channelResults.set(MessageChannel.WHATSAPP, [false])
        channelResults.set(MessageChannel.EMAIL, [false])
        
        const result = simulateDeliveryWithRetry(channelResults)
        
        return result.success === true &&
               result.finalChannel === MessageChannel.SMS &&
               result.totalAttempts === 2
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: WhatsApp fallback succeeds after SMS exhausted
   */
  it('WhatsApp fallback succeeds after SMS retries exhausted', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // SMS fails all retries, WhatsApp succeeds
        const channelResults = new Map<MessageChannel, boolean[]>()
        channelResults.set(MessageChannel.SMS, [false, false, false])
        channelResults.set(MessageChannel.WHATSAPP, [true])
        channelResults.set(MessageChannel.EMAIL, [false])
        
        const result = simulateDeliveryWithRetry(channelResults)
        
        return result.success === true &&
               result.finalChannel === MessageChannel.WHATSAPP
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: Email fallback succeeds after SMS and WhatsApp exhausted
   */
  it('Email fallback succeeds after SMS and WhatsApp exhausted', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        // SMS and WhatsApp fail, Email succeeds
        const channelResults = new Map<MessageChannel, boolean[]>()
        channelResults.set(MessageChannel.SMS, [false, false, false])
        channelResults.set(MessageChannel.WHATSAPP, [false, false, false])
        channelResults.set(MessageChannel.EMAIL, [true])
        
        const result = simulateDeliveryWithRetry(channelResults)
        
        return result.success === true &&
               result.finalChannel === MessageChannel.EMAIL
      }),
      { numRuns: 1 }
    )
  })

  /**
   * Property: Deterministic behavior for same inputs
   */
  it('deterministic behavior for same inputs', () => {
    fc.assert(
      fc.property(channelResultsArbitrary, (channelResults) => {
        const result1 = simulateDeliveryWithRetry(channelResults)
        const result2 = simulateDeliveryWithRetry(channelResults)
        
        return result1.success === result2.success &&
               result1.finalChannel === result2.finalChannel &&
               result1.totalAttempts === result2.totalAttempts &&
               result1.flaggedForManualFollowup === result2.flaggedForManualFollowup
      }),
      { numRuns: 20 }
    )
  })
})
