'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Zap
} from 'lucide-react';

interface SMSTestResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
  deliveryStatus?: 'sent' | 'delivered' | 'failed';
  timestamp: string;
}

interface SMSLiveTesterProps {
  templateKey?: string;
  templateContent?: string;
  sampleData?: Record<string, string>;
}

export function SMSLiveTester({ 
  templateKey, 
  templateContent = '',
  sampleData = {}
}: SMSLiveTesterProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customMessage, setCustomMessage] = useState(templateContent);
  const [sending, setSending] = useState(false);
  const [testResult, setTestResult] = useState<SMSTestResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const renderMessage = (content: string, data: Record<string, string>) => {
    let rendered = content;
    Object.entries(data).forEach(([key, value]) => {
      rendered = rendered.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return rendered;
  };

  const validatePhoneNumber = (phone: string) => {
    // Uganda phone number validation
    const ugandaPattern = /^(\+256|0)(7[0-9]{8}|3[0-9]{8})$/;
    return ugandaPattern.test(phone.replace(/\s/g, ''));
  };

  const sendTestSMS = async () => {
    if (!phoneNumber.trim()) {
      setTestResult({
        success: false,
        error: 'Please enter a phone number',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setTestResult({
        success: false,
        error: 'Please enter a valid Uganda phone number (e.g., +256700123456 or 0700123456)',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const messageToSend = customMessage || renderMessage(templateContent, sampleData);
    
    if (!messageToSend.trim()) {
      setTestResult({
        success: false,
        error: 'Message content is empty',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      setSending(true);
      setTestResult(null);

      const response = await fetch('/api/sms/test-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          message: messageToSend,
          templateKey: templateKey || 'TEST',
          isTest: true
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          messageId: result.messageId,
          cost: result.cost,
          deliveryStatus: 'sent',
          timestamp: new Date().toISOString()
        });

        // Check delivery status after 5 seconds
        setTimeout(async () => {
          try {
            const statusResponse = await fetch(`/api/sms/delivery-status/${result.messageId}`);
            const statusResult = await statusResponse.json();
            
            setTestResult(prev => prev ? {
              ...prev,
              deliveryStatus: statusResult.status
            } : null);
          } catch (error) {
            console.error('Error checking delivery status:', error);
          }
        }, 5000);

      } else {
        setTestResult({
          success: false,
          error: result.error || 'Failed to send SMS',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      setTestResult({
        success: false,
        error: 'Network error. Please check your connection and try again.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setSending(false);
    }
  };

  const getDeliveryStatusIcon = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-[var(--chart-green)]" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-[var(--chart-red)]" />;
      case 'sent':
        return <Clock className="h-4 w-4 text-[var(--chart-blue)]" />;
      default:
        return <Smartphone className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  const getDeliveryStatusText = (status?: string) => {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'failed':
        return 'Failed';
      case 'sent':
        return 'Sent (checking delivery...)';
      default:
        return 'Unknown';
    }
  };

  const messagePreview = customMessage || renderMessage(templateContent, sampleData);
  const characterCount = messagePreview.length;
  const smsUnits = Math.ceil(characterCount / 160);
  const estimatedCost = smsUnits * 45; // UGX 45 per SMS unit

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Zap className="h-5 w-5 mr-2 text-[var(--warning)]" />
          Live SMS Testing
        </h3>
        <Badge variant="outline" className="text-[var(--chart-yellow)] border-[var(--warning-light)]">
          Demo Mode
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Phone Number Input */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Test Phone Number
          </label>
          <div className="flex space-x-2">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+256700123456 or 0700123456"
              className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
            />
            <Button
              onClick={sendTestSMS}
              disabled={sending || !phoneNumber.trim()}
              className="px-6"
            >
              {sending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Test
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Enter your own phone number to receive the test SMS
          </p>
        </div>

        {/* Message Preview */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-[var(--text-primary)]">
              Message Preview
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
          </div>
          
          {showAdvanced ? (
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
              placeholder="Enter custom message..."
            />
          ) : (
            <div className="bg-[var(--bg-surface)] border rounded-md p-3">
              <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
                {messagePreview || 'No message content'}
              </p>
            </div>
          )}
          
          <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
            <span>
              {characterCount}/160 characters • {smsUnits} SMS unit{smsUnits !== 1 ? 's' : ''}
            </span>
            <span className="font-medium">
              Cost: UGX {estimatedCost}
            </span>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${
            testResult.success 
              ? 'bg-[var(--success-light)] border-[var(--success-light)]' 
              : 'bg-[var(--danger-light)] border-[var(--danger-light)]'
          }`}>
            <div className="flex items-start space-x-3">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-[var(--chart-green)] mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-[var(--chart-red)] mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium ${
                  testResult.success ? 'text-[var(--success-dark)]' : 'text-[var(--danger-dark)]'
                }`}>
                  {testResult.success ? 'SMS Sent Successfully!' : 'SMS Failed'}
                </h4>
                
                {testResult.success ? (
                  <div className="mt-2 space-y-1 text-sm text-[var(--chart-green)]">
                    {testResult.messageId && (
                      <p>Message ID: <code className="bg-[var(--success-light)] px-1 rounded">{testResult.messageId}</code></p>
                    )}
                    {testResult.cost && (
                      <p>Cost: UGX {testResult.cost}</p>
                    )}
                    {testResult.deliveryStatus && (
                      <div className="flex items-center space-x-2">
                        {getDeliveryStatusIcon(testResult.deliveryStatus)}
                        <span>Status: {getDeliveryStatusText(testResult.deliveryStatus)}</span>
                      </div>
                    )}
                    <p className="text-xs text-[var(--chart-green)]">
                      Check your phone for the message. It should arrive within 30 seconds.
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-[var(--chart-red)]">
                    {testResult.error}
                  </p>
                )}
                
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {new Date(testResult.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Important Notes */}
        <div className="bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg p-4">
          <h4 className="font-medium text-[var(--info-dark)] mb-2">Important Notes:</h4>
          <ul className="text-sm text-[var(--accent-hover)] space-y-1">
            <li>• Test SMS will be sent to the actual phone number</li>
            <li>• Each test SMS costs UGX {estimatedCost} from your SMS balance</li>
            <li>• Use this feature sparingly during demos</li>
            <li>• Delivery confirmation may take up to 30 seconds</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}