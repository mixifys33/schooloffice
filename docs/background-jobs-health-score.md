# Health Score Background Job Documentation

## Overview

The health score background job calculates health scores for all schools on a daily basis. This job is part of the Super Admin Schools Control Center feature and implements Requirement 4.8.

## Architecture

### Components

1. **Health Score Service** (`src/services/health-score.service.ts`)
   - Contains the core business logic for calculating health scores
   - Provides `calculateAllHealthScores()` method that processes all active schools

2. **Health Score Calculator Job** (`src/jobs/health-score-calculator.ts`)
   - Wrapper script that executes the health score calculation
   - Provides error handling and logging
   - Can be run standalone or via scheduler

3. **Job Scheduler** (`src/jobs/scheduler.ts`)
   - Optional scheduler using node-cron
   - Manages scheduled execution of background jobs
   - Configurable schedule and timezone

## Running the Job

### Option 1: Manual Execution (Recommended for Testing)

Run the job manually using ts-node:

```bash
npx ts-node src/jobs/health-score-calculator.ts
```

Or add a script to `package.json`:

```json
{
  "scripts": {
    "job:health-scores": "ts-node src/jobs/health-score-calculator.ts"
  }
}
```

Then run:

```bash
npm run job:health-scores
```

### Option 2: Using Node-Cron Scheduler

1. **Install node-cron:**

```bash
npm install node-cron
npm install --save-dev @types/node-cron
```

2. **Start the scheduler:**

Run the scheduler as a standalone process:

```bash
npx ts-node src/jobs/scheduler.ts
```

Or integrate into your application startup (e.g., in `src/app/api/cron/route.ts` or server startup):

```typescript
import { startScheduler } from "@/jobs/scheduler";

// In your application startup
startScheduler();
```

3. **Configure the schedule:**

Edit `src/jobs/scheduler.ts` to change the schedule. Default is daily at 2:00 AM Africa/Kampala timezone:

```typescript
const healthScoreJob = cron.schedule(
  "0 2 * * *", // Cron expression
  async () => {
    await runHealthScoreCalculation();
  },
  {
    timezone: "Africa/Kampala",
  },
);
```

### Option 3: System Cron (Production Recommended)

For production deployments, use system cron for reliability:

1. **Create a shell script** (`scripts/run-health-score-job.sh`):

```bash
#!/bin/bash
cd /path/to/your/project
npx ts-node src/jobs/health-score-calculator.ts >> /var/log/health-score-job.log 2>&1
```

2. **Make it executable:**

```bash
chmod +x scripts/run-health-score-job.sh
```

3. **Add to crontab:**

```bash
crontab -e
```

Add this line to run daily at 2:00 AM:

```
0 2 * * * /path/to/your/project/scripts/run-health-score-job.sh
```

### Option 4: Vercel Cron Jobs

If deploying to Vercel, use Vercel Cron Jobs:

1. **Create API route** (`src/app/api/cron/health-scores/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { runHealthScoreCalculation } from "@/jobs/health-score-calculator";

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runHealthScoreCalculation();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      {
        error: "Job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
```

2. **Add to `vercel.json`:**

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

3. **Set environment variable:**

Add `CRON_SECRET` to your Vercel environment variables.

## Job Behavior

### What the Job Does

1. Fetches all active schools from the database
2. For each school:
   - Calculates activity score (based on last admin login)
   - Calculates data completeness score (based on populated fields)
   - Calculates SMS engagement score (based on usage ratio)
   - Calculates payment discipline score (based on payment status)
   - Calculates growth score (based on enrollment trend)
   - Computes total health score (0-100)
   - Saves the health score to the database
3. Logs progress and any errors
4. Continues processing remaining schools even if one fails

### Error Handling

- **Individual School Failures**: If calculation fails for one school, the job logs the error and continues with other schools
- **Complete Job Failure**: If the job fails completely, it logs the error and exits with code 1
- **Database Errors**: Caught and logged, allowing retry on next run
- **Timeout Protection**: Each school calculation is independent, preventing cascading failures

### Performance Considerations

- **Processing Time**: Approximately 100-500ms per school (depends on data volume)
- **Database Load**: Uses efficient queries with proper indexing
- **Memory Usage**: Processes schools sequentially to avoid memory issues
- **Recommended Schedule**: Daily at 2:00 AM (low traffic period)

## Monitoring and Logging

### Log Output

The job produces structured logs:

```
[2024-01-15T02:00:00.000Z] Starting health score calculation job...
[2024-01-15T02:00:05.234Z] Health score calculation completed successfully in 5234ms
```

Error logs include:

```
[2024-01-15T02:00:00.000Z] Starting health score calculation job...
[2024-01-15T02:00:03.456Z] Health score calculation failed after 3456ms:
Error name: DatabaseError
Error message: Connection timeout
Error stack: ...
```

### Monitoring Recommendations

1. **Log Aggregation**: Send logs to a centralized logging service (e.g., Datadog, CloudWatch)
2. **Alerting**: Set up alerts for job failures
3. **Metrics**: Track job duration, success rate, and schools processed
4. **Health Checks**: Monitor last successful run timestamp

### Verifying Job Execution

Check the database for recent health score calculations:

```sql
SELECT
  COUNT(*) as total_schools,
  MAX("calculatedAt") as last_calculation,
  AVG("healthScore") as avg_health_score
FROM "SchoolHealthMetrics";
```

## Troubleshooting

### Job Not Running

1. **Check scheduler is started:**

   ```bash
   ps aux | grep scheduler
   ```

2. **Check cron logs:**

   ```bash
   grep CRON /var/log/syslog
   ```

3. **Verify database connection:**
   ```bash
   npx prisma db pull
   ```

### Job Failing

1. **Run manually to see errors:**

   ```bash
   npx ts-node src/jobs/health-score-calculator.ts
   ```

2. **Check database permissions:**
   - Ensure the database user has SELECT and UPDATE permissions
   - Verify SchoolHealthMetrics table exists

3. **Check for missing data:**
   - Some schools may not have required data (students, teachers, etc.)
   - The job should handle this gracefully

### Performance Issues

1. **Too many schools:**
   - Consider batching (process 100 schools at a time)
   - Add progress logging

2. **Slow queries:**
   - Check database indexes
   - Optimize Prisma queries

3. **Memory issues:**
   - Reduce batch size
   - Add memory monitoring

## Configuration

### Environment Variables

No specific environment variables required. The job uses the same database connection as the main application (via Prisma).

### Schedule Configuration

Edit the cron expression in `src/jobs/scheduler.ts`:

```typescript
// Daily at 2:00 AM
"0 2 * * *";

// Every 6 hours
"0 */6 * * *";

// Every day at 3:30 AM
"30 3 * * *";

// Every Monday at 1:00 AM
"0 1 * * 1";
```

### Timezone Configuration

Change the timezone in `src/jobs/scheduler.ts`:

```typescript
{
  timezone: 'Africa/Kampala',  // Uganda
  // timezone: 'America/New_York',
  // timezone: 'Europe/London',
  // timezone: 'UTC',
}
```

## Testing

### Manual Testing

1. **Run the job:**

   ```bash
   npm run job:health-scores
   ```

2. **Verify results:**
   ```bash
   npx prisma studio
   ```
   Navigate to SchoolHealthMetrics table and check `calculatedAt` timestamps.

### Automated Testing

Unit tests for the health score service are in `tests/unit/services/health-score.service.test.ts`.

To test the job wrapper:

```typescript
import { runHealthScoreCalculation } from "@/jobs/health-score-calculator";

describe("Health Score Calculator Job", () => {
  it("should calculate health scores for all schools", async () => {
    await runHealthScoreCalculation();
    // Verify database was updated
  });
});
```

## Maintenance

### Regular Tasks

1. **Monitor job execution** (daily)
2. **Review error logs** (weekly)
3. **Check performance metrics** (monthly)
4. **Update schedule if needed** (as required)

### Scaling Considerations

As the number of schools grows:

1. **Add batching**: Process schools in batches of 100
2. **Add parallelization**: Use worker threads or queue system
3. **Add progress tracking**: Store job execution metadata
4. **Consider distributed processing**: Use Bull/BullMQ for queue-based processing

## Related Documentation

- [Health Score Service](../src/services/health-score.service.ts)
- [Super Admin Control Center Requirements](.kiro/specs/super-admin-schools-control-center/requirements.md)
- [Super Admin Control Center Design](.kiro/specs/super-admin-schools-control-center/design.md)

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the error logs
3. Contact the development team
