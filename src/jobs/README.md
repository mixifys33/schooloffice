# Background Jobs

This directory contains background jobs for the SchoolOffice application.

## Available Jobs

### Health Score Calculator

**File**: `health-score-calculator.ts`

**Purpose**: Calculates health scores for all schools on a daily basis.

**Requirements**: Implements Requirement 4.8 from Super Admin Schools Control Center spec.

**Usage**:

```bash
# Run manually
npm run job:health-scores

# Or directly with ts-node
npx ts-node src/jobs/health-score-calculator.ts
```

**What it does**:

- Fetches all active schools
- Calculates health score components for each school:
  - Activity score (30 points)
  - Data completeness score (20 points)
  - SMS engagement score (20 points)
  - Payment discipline score (20 points)
  - Growth score (10 points)
- Saves results to SchoolHealthMetrics table
- Logs progress and errors

**Error Handling**:

- Continues processing if one school fails
- Logs detailed error information
- Returns non-zero exit code on failure

## Job Scheduler

**File**: `scheduler.ts`

**Purpose**: Manages scheduled execution of background jobs using node-cron.

**Requirements**: Optional - requires `node-cron` package to be installed.

**Usage**:

```bash
# Install node-cron first
npm install node-cron @types/node-cron

# Run the scheduler
npm run job:scheduler

# Or directly with ts-node
npx ts-node src/jobs/scheduler.ts
```

**Configuration**:

- Default schedule: Daily at 2:00 AM Africa/Kampala timezone
- Edit `scheduler.ts` to change schedule or timezone

**Features**:

- Graceful shutdown on SIGINT/SIGTERM
- Job status tracking
- Automatic error recovery

## Deployment Options

### 1. Manual Execution (Development/Testing)

```bash
npm run job:health-scores
```

### 2. Node-Cron Scheduler (Simple Deployments)

```bash
npm install node-cron @types/node-cron
npm run job:scheduler
```

Keep the scheduler running as a background process.

### 3. System Cron (Production - Linux/Unix)

```bash
# Make script executable
chmod +x scripts/run-health-score-job.sh

# Edit crontab
crontab -e

# Add this line (runs daily at 2:00 AM)
0 2 * * * /path/to/project/scripts/run-health-score-job.sh
```

### 4. Vercel Cron Jobs (Vercel Deployments)

1. Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/health-scores",
      "schedule": "0 2 * * *"
    }
  ]
}
```

2. Set `CRON_SECRET` environment variable in Vercel

3. Deploy

The API route at `/api/cron/health-scores` will be called automatically.

### 5. Task Scheduler (Windows)

Use Windows Task Scheduler to run:

```
npx ts-node src/jobs/health-score-calculator.ts
```

## Monitoring

### Logs

Jobs output structured logs with timestamps:

```
[2024-01-15T02:00:00.000Z] Starting health score calculation job...
[2024-01-15T02:00:05.234Z] Health score calculation completed successfully in 5234ms
```

### Verification

Check the database to verify job execution:

```sql
SELECT
  COUNT(*) as total_schools,
  MAX("calculatedAt") as last_calculation,
  AVG("healthScore") as avg_health_score
FROM "SchoolHealthMetrics";
```

### Alerting

Set up alerts for:

- Job failures (exit code != 0)
- Long execution times (> 5 minutes)
- No execution in 25+ hours

## Testing

Unit tests are in `tests/unit/jobs/`:

```bash
npm test tests/unit/jobs/health-score-calculator.test.ts
```

## Adding New Jobs

1. Create a new job file in this directory:

```typescript
// src/jobs/my-new-job.ts
export async function runMyNewJob(): Promise<void> {
  console.log("Starting my new job...");
  try {
    // Job logic here
    console.log("Job completed successfully");
  } catch (error) {
    console.error("Job failed:", error);
    throw error;
  }
}

if (require.main === module) {
  runMyNewJob()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
```

2. Add to scheduler (optional):

```typescript
// src/jobs/scheduler.ts
import { runMyNewJob } from "./my-new-job";

const myJob = cron.schedule("0 3 * * *", async () => {
  await runMyNewJob();
});
```

3. Add npm script:

```json
{
  "scripts": {
    "job:my-new-job": "ts-node src/jobs/my-new-job.ts"
  }
}
```

4. Create tests:

```typescript
// tests/unit/jobs/my-new-job.test.ts
describe("My New Job", () => {
  it("should run successfully", async () => {
    await runMyNewJob();
    // Assertions
  });
});
```

## Documentation

See [docs/background-jobs-health-score.md](../../docs/background-jobs-health-score.md) for detailed documentation.

## Support

For issues or questions:

1. Check the documentation
2. Review error logs
3. Run job manually to debug
4. Contact the development team
