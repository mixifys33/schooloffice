/**
 * Property Test: SMS Limit Enforcement
 * **Feature: school-office, Property 21: SMS Limit Enforcement**
 * **Validates: Requirements 19.2, 19.3**
 * 
 * For any student, SMS SHALL be sent only if sms_sent_count < sms_limit_per_term;
 * otherwise, the system SHALL fallback to WhatsApp/Email.
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { MessageChannel, PilotType } from '../../src/types/enums'

// ============================================
// SMS LIMITS CONFIGURATION
// ============================================

const SMS_LIMITS: Record<PilotType, number> = {
  [PilotType.FREE]: 2,
  [PilotType.PAID]: 20,
}

// ============================================
// CHANNEL DETERMINATION LOGIC (mirrors communication.service.ts)
// ============================================

interface ChannelDetermination {
  channel: MessageChannel
  smsLimitReached: boolean
  reason: string
}

/**
 * Pure function for channel determination
 * This mirrors the logic in CommunicationService.determineChannelPure
 */
function determineChannel(
  smsSentCount: number,
  smsLimit: number,
  hasWhatsApp: boolean,
  hasEmail: boolean
): ChannelDetermination {
  const smsLimitReached = smsSentCount >= smsLimit

  if (smsLimitReached) {
    if (hasWhatsApp) {
      return { 
        channel: MessageChannel.WHATSAPP, 
        smsLimitReached: true,
        reason: 'SMS limit reached, fallback to WhatsApp'
      }
    }
    if (hasEmail) {
      return { 
        channel: MessageChannel.EMAIL, 
        smsLimitReached: true,
        reason: 'SMS limit reached, fallback to Email'
      }
    }
    // No fallback available, still return EMAIL as last resort
    return { 
      channel: MessageChannel.EMAIL, 
      smsLimitReached: true,
      reason: 'SMS limit reached, no WhatsApp, fallback to Email'
    }
  }

  return { 
    channel: MessageChannel.SMS, 
    smsLimitReached: false,
    reason: 'SMS limit not reached, using SMS'
  }
}

/**
 * Simulates sending a message and incrementing SMS count if SMS is used
 */
function simulateSendMessage(
  smsSentCount: number,
  smsLimit: number,
  hasWhatsApp: boolean,
  hasEmail: boolean
): { newSmsSentCount: number; channelUsed: MessageChannel } {
  const determination = determineChannel(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
  
  // Only increment SMS count if SMS channel is used
  const newSmsSentCount = determination.channel === MessageChannel.SMS 
    ? smsSentCount + 1 
    : smsSentCount

  return {
    newSmsSentCount,
    channelUsed: determination.channel
  }
}

// ============================================
// ARBITRARIES
// ============================================

const pilotTypeArbitrary = fc.constantFrom(...Object.values(PilotType))

const studentSmsStateArbitrary = fc.record({
  pilotType: pilotTypeArbitrary,
  smsSentCount: fc.nat({ max: 25 }),
  hasWhatsApp: fc.boolean(),
  hasEmail: fc.boolean(),
}).map(state => ({
  ...state,
  smsLimit: SMS_LIMITS[state.pilotType]
}))

// ============================================
// PROPERTY TESTS
// ============================================

describe('Property 21: SMS Limit Enforcement', () => {
  /**
   * Property: SMS is used only when count is below limit
   * For any student with sms_sent_count < sms_limit_per_term, 
   * the channel SHALL be SMS
   */
  it('SMS is used when count is below limit', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.boolean(),
        fc.boolean(),
        (pilotType, hasWhatsApp, hasEmail) => {
          const smsLimit = SMS_LIMITS[pilotType]
          // Generate a count that is strictly below the limit
          const smsSentCount = Math.floor(Math.random() * smsLimit)
          
          const result = determineChannel(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
          
          return result.channel === MessageChannel.SMS && 
                 result.smsLimitReached === false
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: SMS is NOT used when count equals or exceeds limit
   * For any student with sms_sent_count >= sms_limit_per_term,
   * the channel SHALL NOT be SMS
   */
  it('SMS is NOT used when count equals or exceeds limit', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.nat({ max: 10 }), // Additional count above limit
        fc.boolean(),
        fc.boolean(),
        (pilotType, extraCount, hasWhatsApp, hasEmail) => {
          const smsLimit = SMS_LIMITS[pilotType]
          const smsSentCount = smsLimit + extraCount // At or above limit
          
          const result = determineChannel(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
          
          return result.channel !== MessageChannel.SMS && 
                 result.smsLimitReached === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: WhatsApp is preferred fallback when available
   * For any student at SMS limit with WhatsApp available,
   * the channel SHALL be WhatsApp
   */
  it('WhatsApp is preferred fallback when SMS limit reached', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.nat({ max: 10 }),
        (pilotType, extraCount) => {
          const smsLimit = SMS_LIMITS[pilotType]
          const smsSentCount = smsLimit + extraCount
          
          const result = determineChannel(smsSentCount, smsLimit, true, true)
          
          return result.channel === MessageChannel.WHATSAPP
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Email is used when WhatsApp unavailable
   * For any student at SMS limit without WhatsApp,
   * the channel SHALL be Email
   */
  it('Email is used when SMS limit reached and no WhatsApp', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.nat({ max: 10 }),
        (pilotType, extraCount) => {
          const smsLimit = SMS_LIMITS[pilotType]
          const smsSentCount = smsLimit + extraCount
          
          const result = determineChannel(smsSentCount, smsLimit, false, true)
          
          return result.channel === MessageChannel.EMAIL
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Email is last resort when no channels available
   * For any student at SMS limit with no WhatsApp or Email,
   * the channel SHALL still be Email (as last resort)
   */
  it('Email is last resort when no other channels available', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.nat({ max: 10 }),
        (pilotType, extraCount) => {
          const smsLimit = SMS_LIMITS[pilotType]
          const smsSentCount = smsLimit + extraCount
          
          const result = determineChannel(smsSentCount, smsLimit, false, false)
          
          return result.channel === MessageChannel.EMAIL &&
                 result.smsLimitReached === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: SMS count increments only when SMS is used
   * For any message send, SMS count SHALL increment only if SMS channel is used
   */
  it('SMS count increments only when SMS channel is used', () => {
    fc.assert(
      fc.property(
        studentSmsStateArbitrary,
        (state) => {
          const { smsSentCount, smsLimit, hasWhatsApp, hasEmail } = state
          
          const result = simulateSendMessage(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
          
          if (result.channelUsed === MessageChannel.SMS) {
            return result.newSmsSentCount === smsSentCount + 1
          } else {
            return result.newSmsSentCount === smsSentCount
          }
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: SMS count never exceeds limit through normal sending
   * For any sequence of message sends, SMS count SHALL not exceed limit
   * (because fallback kicks in at limit)
   */
  it('SMS count never exceeds limit through normal sending', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.nat({ max: 30 }), // Number of messages to send
        fc.boolean(),
        fc.boolean(),
        (pilotType, messageCount, hasWhatsApp, hasEmail) => {
          const smsLimit = SMS_LIMITS[pilotType]
          let smsSentCount = 0
          
          for (let i = 0; i < messageCount; i++) {
            const result = simulateSendMessage(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
            smsSentCount = result.newSmsSentCount
          }
          
          // SMS count should never exceed the limit
          return smsSentCount <= smsLimit
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Exactly at limit triggers fallback
   * For any student with sms_sent_count exactly equal to sms_limit_per_term,
   * the system SHALL use fallback channel
   */
  it('exactly at limit triggers fallback', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.boolean(),
        fc.boolean(),
        (pilotType, hasWhatsApp, hasEmail) => {
          const smsLimit = SMS_LIMITS[pilotType]
          const smsSentCount = smsLimit // Exactly at limit
          
          const result = determineChannel(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
          
          return result.channel !== MessageChannel.SMS &&
                 result.smsLimitReached === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: One below limit still uses SMS
   * For any student with sms_sent_count = sms_limit_per_term - 1,
   * the system SHALL still use SMS
   */
  it('one below limit still uses SMS', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.boolean(),
        fc.boolean(),
        (pilotType, hasWhatsApp, hasEmail) => {
          const smsLimit = SMS_LIMITS[pilotType]
          const smsSentCount = smsLimit - 1 // One below limit
          
          const result = determineChannel(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
          
          return result.channel === MessageChannel.SMS &&
                 result.smsLimitReached === false
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: FREE students get fallback after 2 SMS
   * For any FREE student, after sending 2 SMS, subsequent messages SHALL use fallback
   */
  it('FREE students get fallback after 2 SMS', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (hasWhatsApp, hasEmail) => {
          const smsLimit = SMS_LIMITS[PilotType.FREE] // 2
          
          // After 2 SMS sent
          const result = determineChannel(2, smsLimit, hasWhatsApp, hasEmail)
          
          return result.channel !== MessageChannel.SMS &&
                 result.smsLimitReached === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: PAID students get fallback after 20 SMS
   * For any PAID student, after sending 20 SMS, subsequent messages SHALL use fallback
   */
  it('PAID students get fallback after 20 SMS', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (hasWhatsApp, hasEmail) => {
          const smsLimit = SMS_LIMITS[PilotType.PAID] // 20
          
          // After 20 SMS sent
          const result = determineChannel(20, smsLimit, hasWhatsApp, hasEmail)
          
          return result.channel !== MessageChannel.SMS &&
                 result.smsLimitReached === true
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Fallback chain priority is WhatsApp > Email
   * For any student at SMS limit, WhatsApp SHALL be preferred over Email
   */
  it('fallback chain priority is WhatsApp over Email', () => {
    fc.assert(
      fc.property(
        pilotTypeArbitrary,
        fc.nat({ max: 10 }),
        (pilotType, extraCount) => {
          const smsLimit = SMS_LIMITS[pilotType]
          const smsSentCount = smsLimit + extraCount
          
          const withBoth = determineChannel(smsSentCount, smsLimit, true, true)
          const withOnlyEmail = determineChannel(smsSentCount, smsLimit, false, true)
          
          return withBoth.channel === MessageChannel.WHATSAPP &&
                 withOnlyEmail.channel === MessageChannel.EMAIL
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property: Channel determination is deterministic
   * For any given state, the channel determination SHALL always return the same result
   */
  it('channel determination is deterministic', () => {
    fc.assert(
      fc.property(
        studentSmsStateArbitrary,
        (state) => {
          const { smsSentCount, smsLimit, hasWhatsApp, hasEmail } = state
          
          const result1 = determineChannel(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
          const result2 = determineChannel(smsSentCount, smsLimit, hasWhatsApp, hasEmail)
          
          return result1.channel === result2.channel &&
                 result1.smsLimitReached === result2.smsLimitReached
        }
      ),
      { numRuns: 20 }
    )
  })
})
