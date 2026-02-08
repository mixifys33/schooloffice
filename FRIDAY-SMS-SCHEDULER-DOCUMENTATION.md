# Guaranteed Friday Fee Reminders System

## Overview
This system implements a guaranteed SMS notification that runs every Friday at 7:45 PM server-local time, independent of the daily cron jobs. It includes explicit override rules that allow the system to send reminders even when automation is disabled.

## Key Features

### 1. Independent Scheduler
- Runs every Friday at 19:45 (7:45 PM) server time
- Independent of the daily automation cron job
- Uses Vercel Cron with schedule: `"45 19 * * 5"` (7:45 PM every Friday)

### 2. Explicit Override Rules
The system supports multiple levels of automation control:

- `enableAutomatedReminders`: Standard daily automation (default: false)
- `fridayOverrideEnabled`: Allow Friday reminders when daily automation is disabled (default: false) 
- `enableGuaranteedFridayReminders`: Specific setting for guaranteed Friday reminders (default: false)
- `forceRun`: Parameter to bypass all checks for manual testing

### 3. Safety Mechanisms
- Validates payment milestones (must total 100%)
- Respects grace periods
- Implements anti-spam controls (max reminders, minimum intervals)
- Validates phone numbers
- Maintains audit logs

### 4. Database Changes
Added to `FinanceSettings` model:
- `fridayOverrideEnabled`: Boolean field to allow Friday reminders when automation is disabled
- `lastFridayRunAt`: DateTime field to track when Friday automation last ran

## Implementation Details

### API Endpoint
- Path: `/api/automation/friday-fee-reminders`
- Methods: GET (cron), POST (manual)
- Security: Protected by CRON_SECRET environment variable

### Service Method
- `runGuaranteedFridayFeeReminders(schoolId, dryRun = false, forceRun = false)`
- Contains all the same safety checks as the daily automation
- Logs all activities to `FinanceNotificationLog` and `AuditLog`

### Message Content
The Friday reminders use a slightly different message to emphasize the weekly nature:
> "Dear Parent, our records show that [Student Name] ([Class]) has paid [X]% of the required [Y]% fees for [Term]. Balance: UGX [Amount]. Please clear by Week [Z]. This is an urgent reminder sent weekly."

## Override Logic

The system follows this decision tree:

1. If `enableAutomatedReminders` is true → Run normally
2. Else if `fridayOverrideEnabled` is true → Run despite automation being disabled
3. Else if `enableGuaranteedFridayReminders` is true → Run as guaranteed reminder
4. Else if `forceRun` is true → Run regardless of settings (for manual triggers)
5. Otherwise → Skip execution

## Testing

Unit tests are available in `tests/unit/friday-fee-reminders.test.ts` covering:
- Normal execution when automation is enabled
- Execution when Friday override is enabled
- Execution when guaranteed Friday is enabled
- Proper skipping when all features are disabled
- Dry run functionality
- Milestone validation
- Missing term handling

## Deployment

The system requires:
1. Update to `vercel.json` to add the Friday cron job
2. Database migration to add new fields to FinanceSettings
3. CRON_SECRET environment variable for security

## Audit Trail

All Friday reminder activities are logged with:
- Source marked as 'FRIDAY_GUARANTEED' in metadata
- Separate audit log entries with action 'GUARANTEED_FRIDAY_FEE_REMINDERS'
- Detailed information about sent messages in FinanceNotificationLog