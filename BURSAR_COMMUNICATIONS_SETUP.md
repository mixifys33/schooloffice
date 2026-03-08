# Bursar Communications Setup Guide

## Overview

The bursar communications system provides both manual and automated fee reminder capabilities.

## Features

### 1. Manual Reminders

- Send fee reminders to selected defaulters
- Filter by class, balance amount, and search
- Customize message templates with variables
- Track sent messages in notification logs

### 2. Automated Reminders

- Schedule automatic reminders (daily, weekly, biweekly, monthly)
- Set minimum balance threshold
- Configure day and time for sending
- Independent scheduler runs automatically
- Test automation before enabling

## Database Setup

### Step 1: Run Prisma Migration

```bash
# Generate Prisma client with new model
npx prisma generate

# Push schema changes to database
npx prisma db push
```

The migration adds the `FeeReminderAutomation` model to track automation settings per school.

### Step 2: Verify Schema

Check that the following model exists in your database:

```prisma
model FeeReminderAutomation {
  id           String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId     String   @unique @db.ObjectId
  enabled      Boolean  @default(false)
  frequency    String   @default("weekly")
  dayOfWeek    Int?
  dayOfMonth   Int?
  time         String   @default("09:00")
  minBalance   Float    @default(10000)
  lastRun      DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
}
```

## Automation Setup

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/fee-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

Set environment variable in Vercel:

```
CRON_SECRET=your-secure-random-string
```

### Option 2: External Cron Service

Use services like:

- **Cron-job.org**: Free cron service
- **EasyCron**: Reliable cron service
- **GitHub Actions**: Free for public repos

Example GitHub Actions workflow (`.github/workflows/fee-reminders.yml`):

```yaml
name: Fee Reminders Cron

on:
  schedule:
    - cron: "0 * * * *" # Every hour
  workflow_dispatch: # Allow manual trigger

jobs:
  run-cron:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Fee Reminders
        run: |
          curl -X POST https://your-domain.com/api/cron/fee-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: Node-Cron (For self-hosted)

If running on your own server, you can use the existing scheduler in `src/jobs/scheduler.ts`.

Add to the scheduler:

```typescript
// Fee reminder automation job
// Runs every hour
const feeReminderJob = cron.schedule(
  "0 * * * *",
  async () => {
    try {
      await fetch("http://localhost:3000/api/cron/fee-reminders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });
    } catch (error) {
      console.error("Fee reminder automation job failed:", error);
    }
  },
  {
    timezone: "Africa/Kampala",
  },
);

jobs.set("fee-reminder-automation", feeReminderJob);
feeReminderJob.start();
```

## SMS Integration

The system currently logs messages but doesn't send actual SMS. To integrate with an SMS provider:

### 1. Choose an SMS Provider

- **Africa's Talking** (Recommended for Uganda)
- **Twilio**
- **Vonage (Nexmo)**

### 2. Install SDK

```bash
npm install africastalking  # or your chosen provider
```

### 3. Create SMS Service

Create `src/services/sms.service.ts`:

```typescript
import AfricasTalking from "africastalking";

const africastalking = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY!,
  username: process.env.AFRICASTALKING_USERNAME!,
});

const sms = africastalking.SMS;

export async function sendSMS(to: string, message: string) {
  try {
    const result = await sms.send({
      to: [to],
      message,
      from: process.env.SMS_SENDER_ID,
    });

    return {
      success: true,
      messageId: result.SMSMessageData.Recipients[0].messageId,
      status: result.SMSMessageData.Recipients[0].status,
    };
  } catch (error) {
    console.error("SMS send error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### 4. Update API Routes

In `src/app/api/bursar/communications/send-reminders/route.ts` and `src/app/api/cron/fee-reminders/route.ts`, replace:

```typescript
// TODO: Integrate with actual SMS service
console.log(`Sending SMS to ${guardian.phone}: ${personalizedMessage}`);
```

With:

```typescript
import { sendSMS } from "@/services/sms.service";

const smsResult = await sendSMS(guardian.phone, personalizedMessage);

if (!smsResult.success) {
  throw new Error(smsResult.error);
}
```

## Environment Variables

Add to your `.env` file:

```env
# Cron Security
CRON_SECRET=your-secure-random-string-here

# SMS Provider (Africa's Talking example)
AFRICASTALKING_API_KEY=your-api-key
AFRICASTALKING_USERNAME=your-username
SMS_SENDER_ID=your-sender-id
```

## Usage

### For Bursars

1. **Navigate to Communications**
   - Go to Bursar Dashboard → Communications → Reminders

2. **Manual Reminders**
   - View list of defaulters
   - Filter by class, balance, or search
   - Select students to remind
   - Customize message
   - Click "Send to X" button

3. **Automation Setup**
   - Switch to "Automation Settings" tab
   - Enable automation toggle
   - Set frequency (daily, weekly, biweekly, monthly)
   - Choose day and time
   - Set minimum balance threshold
   - Click "Save Settings"
   - Use "Test Now" to verify before enabling

### For Administrators

1. **Monitor Automation**
   - Check cron logs in your deployment platform
   - Review `FinanceNotificationLog` table for sent messages
   - Monitor `FeeReminderAutomation.lastRun` field

2. **Troubleshooting**
   - Verify cron is running: Check deployment logs
   - Check automation settings: Ensure `enabled = true`
   - Verify active term exists
   - Check student accounts have balances above threshold
   - Ensure guardians have phone numbers

## Testing

### Test Manual Reminders

1. Create test student with outstanding balance
2. Ensure guardian has phone number
3. Go to Communications → Reminders
4. Select student and send reminder
5. Check `FinanceNotificationLog` table

### Test Automation

1. Configure automation settings
2. Click "Test Now" button
3. Review results
4. Check notification logs
5. Enable automation when satisfied

### Test Cron Job

```bash
# Local testing
curl -X POST http://localhost:3000/api/cron/fee-reminders \
  -H "Authorization: Bearer your-cron-secret"

# Production testing
curl -X POST https://your-domain.com/api/cron/fee-reminders \
  -H "Authorization: Bearer your-cron-secret"
```

## Security Considerations

1. **Cron Secret**: Use a strong, random string for `CRON_SECRET`
2. **SMS Credentials**: Never commit API keys to version control
3. **Rate Limiting**: Consider implementing rate limits on manual sends
4. **Guardian Privacy**: Ensure phone numbers are validated and consent is obtained
5. **Message Content**: Review messages for compliance with local regulations

## Monitoring

### Key Metrics to Track

1. **Delivery Rate**: Percentage of successfully sent messages
2. **Response Rate**: How many guardians respond/pay after reminders
3. **Automation Runs**: Frequency and success of automated runs
4. **Error Rate**: Failed sends and reasons

### Database Queries

```sql
-- Check automation status
db.FeeReminderAutomation.find({ enabled: true })

-- Recent notifications
db.FinanceNotificationLog.find({
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
}).sort({ createdAt: -1 })

-- Delivery statistics
db.FinanceNotificationLog.aggregate([
  { $group: {
    _id: "$status",
    count: { $sum: 1 }
  }}
])
```

## Troubleshooting

### Automation Not Running

1. Check cron is configured and running
2. Verify `CRON_SECRET` environment variable
3. Check automation is enabled in settings
4. Verify time/day configuration matches current time
5. Check logs for errors

### Messages Not Sending

1. Verify SMS service credentials
2. Check guardian phone numbers are valid
3. Ensure SMS service has credit/balance
4. Review error logs in `FinanceNotificationLog`
5. Test SMS service directly

### No Defaulters Showing

1. Run student account initialization script
2. Verify fee structures are configured
3. Check payments are recorded correctly
4. Ensure balances are calculated properly

## Support

For issues or questions:

1. Check application logs
2. Review database records
3. Test with small batch first
4. Contact system administrator

## Future Enhancements

- [ ] WhatsApp integration
- [ ] Email reminders
- [ ] SMS delivery reports
- [ ] Response tracking
- [ ] Payment link generation
- [ ] Multi-language support
- [ ] Template management
- [ ] A/B testing for messages
- [ ] Analytics dashboard
