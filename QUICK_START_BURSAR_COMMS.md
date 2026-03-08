# Quick Start: Bursar Communications

## 5-Minute Setup

### Step 1: Database Migration (2 minutes)

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Initialize settings for all schools
npx tsx scripts/setup-bursar-communications.ts
```

### Step 2: Environment Variables (1 minute)

Add to `.env`:

```env
CRON_SECRET=change-this-to-random-string
```

### Step 3: Test Manual Reminders (2 minutes)

1. Go to http://localhost:3000/dashboard/bursar/communications/reminders
2. You should see the defaulters list (if you have any)
3. Select a student
4. Click "Send to X"
5. Check console logs for "Would send SMS" message

✅ **Manual reminders are now working!**

## Optional: Enable Automation

### Quick Automation Test

1. Go to "Automation Settings" tab
2. Enable automation toggle
3. Set frequency to "daily"
4. Set time to current time + 5 minutes
5. Click "Save Settings"
6. Click "Test Now" to verify it works
7. Check console logs

### Production Automation (Choose One)

#### Option A: Vercel Cron (Easiest)

Create `vercel.json`:

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

Deploy to Vercel. Done!

#### Option B: GitHub Actions (Free)

Create `.github/workflows/fee-reminders.yml`:

```yaml
name: Fee Reminders
on:
  schedule:
    - cron: "0 * * * *"
jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST https://your-domain.com/api/cron/fee-reminders \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add `CRON_SECRET` to GitHub secrets. Done!

#### Option C: Cron-job.org (External)

1. Go to https://cron-job.org
2. Create free account
3. Add new cron job:
   - URL: `https://your-domain.com/api/cron/fee-reminders`
   - Schedule: Every hour
   - Add header: `Authorization: Bearer your-cron-secret`
4. Save. Done!

## SMS Integration (Optional)

### Africa's Talking (Recommended for Uganda)

```bash
npm install africastalking
```

Add to `.env`:

```env
AFRICASTALKING_API_KEY=your-key
AFRICASTALKING_USERNAME=your-username
SMS_SENDER_ID=your-sender-id
```

Create `src/services/sms.service.ts`:

```typescript
import AfricasTalking from "africastalking";

const at = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY!,
  username: process.env.AFRICASTALKING_USERNAME!,
});

export async function sendSMS(to: string, message: string) {
  const result = await at.SMS.send({ to: [to], message });
  return {
    success: true,
    messageId: result.SMSMessageData.Recipients[0].messageId,
  };
}
```

Update API routes - replace:

```typescript
console.log(`Sending SMS to ${phone}: ${message}`);
```

With:

```typescript
await sendSMS(phone, message);
```

Done!

## Verification Checklist

- [ ] Database migration completed
- [ ] Can access communications page
- [ ] Defaulters list shows data
- [ ] Can send manual reminders
- [ ] Automation settings save successfully
- [ ] Test automation works
- [ ] Cron job configured (if using automation)
- [ ] SMS integration working (if configured)

## Troubleshooting

### No defaulters showing?

```bash
# Run student account initialization
npx tsx scripts/initialize-student-accounts.ts
```

### Automation not running?

1. Check cron is configured
2. Verify `CRON_SECRET` is set
3. Check automation is enabled in UI
4. Review logs for errors

### SMS not sending?

1. Verify SMS credentials in `.env`
2. Check SMS service has credit
3. Test SMS service directly
4. Review error logs

## Next Steps

1. ✅ System is working
2. Configure automation schedule
3. Customize message templates
4. Monitor notification logs
5. Review analytics

## Support

- Full setup guide: `BURSAR_COMMUNICATIONS_SETUP.md`
- Complete documentation: `BURSAR_COMMUNICATIONS_COMPLETE.md`
- Check logs in: `FinanceNotificationLog` table

## That's It!

You now have a fully functional fee reminder system with both manual and automated capabilities. 🎉
