/**
 * SMS Service
 * Handles sending SMS messages via Africa's Talking
 * 
 * This service is used by:
 * - Manual fee reminders
 * - Automated fee reminders
 * - Other notification systems
 */

import AfricasTalking from 'africastalking';

// Initialize Africa's Talking
const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY || '',
  username: process.env.AFRICASTALKING_USERNAME || 'sandbox',
});

const sms = africastalking.SMS;

export interface SMSResult {
  success: boolean;
  messageId?: string;
  status?: string;
  cost?: string;
  error?: string;
}

interface SMSOptions {
  to: string[];
  message: string;
  from?: string;
}

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Sleep utility for retry delays
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send SMS to a single recipient with retry logic
 * @param to Phone number in international format (e.g., +256700000000)
 * @param message Message content (max 160 chars for single SMS)
 * @param retryOptions Retry configuration
 * @returns Result with success status and message ID
 */
export async function sendSMS(
  to: string, 
  message: string,
  retryOptions: RetryOptions = {}
): Promise<SMSResult> {
  const {
    maxRetries = 3,
    retryDelay = 2000,
    backoffMultiplier = 2
  } = retryOptions;

  let lastError: string = '';
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      // Validate inputs
      if (!to || !message) {
        return {
          success: false,
          error: 'Phone number and message are required'
        };
      }

      // Ensure phone number starts with +
      const phoneNumber = to.startsWith('+') ? to : `+${to}`;

      // Check if we're in sandbox mode
      const isSandbox = process.env.AFRICASTALKING_ENVIRONMENT === 'sandbox';

      // Prepare SMS options
      const options: SMSOptions = {
        to: [phoneNumber],
        message: message,
      };

      // Only add sender ID in production
      if (!isSandbox && process.env.AFRICASTALKING_SENDER_ID) {
        options.from = process.env.AFRICASTALKING_SENDER_ID;
      }

      const attemptLog = attempt > 0 ? ` (Attempt ${attempt + 1}/${maxRetries + 1})` : '';
      console.log(`[SMS] Sending to ${phoneNumber} (${isSandbox ? 'SANDBOX' : 'PRODUCTION'})${attemptLog}`);

      // Send SMS
      const result = await sms.send(options);

      // Check if send was successful
      if (result.SMSMessageData && result.SMSMessageData.Recipients) {
        const recipient = result.SMSMessageData.Recipients[0];
        
        if (recipient.status === 'Success' || recipient.statusCode === 101) {
          console.log(`[SMS] Success: ${recipient.messageId}${attemptLog}`);
          return {
            success: true,
            messageId: recipient.messageId,
            status: recipient.status,
            cost: recipient.cost
          };
        } else {
          lastError = recipient.status || 'SMS send failed';
          console.error(`[SMS] Failed: ${lastError}${attemptLog}`);
          
          // If this is not the last attempt, retry
          if (attempt < maxRetries) {
            const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
            console.log(`[SMS] Retrying in ${delay}ms...`);
            await sleep(delay);
            attempt++;
            continue;
          }
          
          return {
            success: false,
            error: lastError
          };
        }
      }

      lastError = 'Invalid response from SMS gateway';
      
      // Retry on invalid response
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
        console.log(`[SMS] Invalid response, retrying in ${delay}ms...`);
        await sleep(delay);
        attempt++;
        continue;
      }

      return {
        success: false,
        error: lastError
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SMS] Error (Attempt ${attempt + 1}/${maxRetries + 1}):`, error);
      
      // If this is not the last attempt, retry
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(backoffMultiplier, attempt);
        console.log(`[SMS] Retrying in ${delay}ms...`);
        await sleep(delay);
        attempt++;
        continue;
      }
      
      return {
        success: false,
        error: lastError
      };
    }
  }

  return {
    success: false,
    error: lastError || 'Max retries exceeded'
  };
}

/**
 * Send SMS to multiple recipients with retry logic
 * @param recipients Array of phone numbers
 * @param message Message content
 * @param retryOptions Retry configuration for each SMS
 * @returns Results for each recipient
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string,
  retryOptions?: RetryOptions
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {
  const results: SMSResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendSMS(recipient, message, retryOptions);
    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Add small delay to avoid rate limiting
    await sleep(100);
  }

  return { sent, failed, results };
}

/**
 * Validate phone number format
 * @param phone Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Uganda phone number format: +256XXXXXXXXX (12 digits total)
  // Also accept without + prefix
  const ugandaPattern = /^(\+?256|0)[37]\d{8}$/;
  return ugandaPattern.test(phone);
}

/**
 * Format phone number to international format
 * @param phone Phone number to format
 * @returns Formatted phone number with + prefix
 */
export function formatPhoneNumber(phone: string): string {
  // Remove spaces and dashes
  let cleaned = phone.replace(/[\s-]/g, '');
  
  // If starts with 0, replace with +256
  if (cleaned.startsWith('0')) {
    cleaned = '+256' + cleaned.substring(1);
  }
  
  // If doesn't start with +, add it
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
}

/**
 * Check SMS service status
 * @returns Service status information
 */
export async function checkSMSServiceStatus(): Promise<{
  available: boolean;
  environment: string;
  configured: boolean;
}> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const environment = process.env.AFRICASTALKING_ENVIRONMENT || 'sandbox';

  return {
    available: !!(apiKey && username),
    environment,
    configured: !!(apiKey && username)
  };
}
