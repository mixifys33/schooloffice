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

/**
 * Send SMS to a single recipient
 * @param to Phone number in international format (e.g., +256700000000)
 * @param message Message content (max 160 chars for single SMS)
 * @returns Result with success status and message ID
 */
export async function sendSMS(to: string, message: string): Promise<SMSResult> {
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

    console.log(`[SMS] Sending to ${phoneNumber} (${isSandbox ? 'SANDBOX' : 'PRODUCTION'})`);

    // Send SMS
    const result = await sms.send(options);

    // Check if send was successful
    if (result.SMSMessageData && result.SMSMessageData.Recipients) {
      const recipient = result.SMSMessageData.Recipients[0];
      
      if (recipient.status === 'Success' || recipient.statusCode === 101) {
        console.log(`[SMS] Success: ${recipient.messageId}`);
        return {
          success: true,
          messageId: recipient.messageId,
          status: recipient.status,
          cost: recipient.cost
        };
      } else {
        console.error(`[SMS] Failed: ${recipient.status}`);
        return {
          success: false,
          error: recipient.status || 'SMS send failed'
        };
      }
    }

    return {
      success: false,
      error: 'Invalid response from SMS gateway'
    };
  } catch (error) {
    console.error('[SMS] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send SMS to multiple recipients
 * @param recipients Array of phone numbers
 * @param message Message content
 * @returns Results for each recipient
 */
export async function sendBulkSMS(
  recipients: string[],
  message: string
): Promise<{ sent: number; failed: number; results: SMSResult[] }> {
  const results: SMSResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const result = await sendSMS(recipient, message);
    results.push(result);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
    }

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
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
