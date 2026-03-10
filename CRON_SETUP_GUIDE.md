# CRON Secret Setup Guide

## What is CRON_SECRET?

The `CRON_SECRET` is a security token that protects your automated cron job endpoints from unauthorized access. It ensures that only legitimate cron services (like Vercel Cron) can trigger your automated tasks.

## How to Generate CRON_SECRET

### Option 1: Using OpenSSL (Recommended)

```bash
openssl rand -base64 32
```

### Option 2: Using Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Option 3: Using PowerShell (Windows)

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

### Option 4: Online Generator

Visit: https://generate-secret.vercel.app/32

## Setup Instructions

1. Generate a secret using one of the methods above
2. Copy the generated secret
3. Open your `.env` file
4. Add this line:
   ```
   CRON_SECRET="your_generated_secret_here"
   ```
5. Save the file
6. Restart your development server

## Example

```env
# CRON JOBS SECURITY
CRON_SECRET="xK9mP2vL8qR4wN7jT5hG3fD6sA1zC0bV"
```

## How It Works

When Vercel Cron (or any cron service) calls your endpoint, it sends:

```
Authorization: Bearer YOUR_CRON_SECRET
```

Your API checks this header and only processes the request if it matches your `CRON_SECRET`.

## Security Notes

- Never commit your `.env` file to version control
- Keep your CRON_SECRET private
- Use a different secret for production and development
- Rotate the secret periodically for better security

## Testing

After setup, your cron endpoints will be protected:

- `/api/cron/fee-reminders` - Daily fee reminders
- `/api/automation/friday-fee-reminders` - Friday reminders

In development, the security check is relaxed, but in production it's strictly enforced.
