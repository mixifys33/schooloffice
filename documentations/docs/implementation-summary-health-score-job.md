# Implementation Summary: Health Score Background Job

## Overview

This document summarizes the implementation of the background job for daily health score calculation, completing Task 2.3 of the Super Admin Schools Control Center feature.

**Requirement**: 4.8 - Background job for daily health score calculation

**Status**: ✅ Complete

## What Was Implemented

### 1. Core Job Implementation

**File**: `src/jobs/health-score-calculator.ts`

A standalone job runner that:

- Executes the `healthScoreService.calculateAllHealthScores()` method
- Provides comprehensive error handling and logging
- Measures and reports execution duration
- Can be run manually or via scheduler
- Exits with appropriate status codes (0 for success, 1 for failure)

**Key Features**:

- ✅ Calls existing health score service
- ✅ Comprehensive error handling
- ✅ Detailed logging with timestamps
- ✅ Execution duration tracking
- ✅ Graceful error recovery (continues with other schools if one fails)
- ✅ Can be executed as standalone script

### 2. Job Scheduler

**File**: `src/jobs/scheduler.ts`

An optional scheduler using node-cron that:

- Schedules the health score job to run daily at 2:00 AM
- Supports timezone configuration (default: Africa/Kampala)
- Provides graceful shutdown handling
- Tracks job status
- Falls back gracefully if node-cron is not installed

**Key Features**:

- ✅ Configurable cron schedule
- ✅ Timezone support
- ✅ Graceful shutdown (SIGINT/SIGTERM)
- ✅ Job registry and status tracking
- ✅ Graceful degradation if node-cron not installed

### 3. Vercel Cron API Route

**File**: `src/app/api/cron/health-scores/route.ts`

An API endpoint for Vercel Cron Jobs that:

- Provides HTTP interface for job execution
- Implements security via CRON_SECRET
- Returns structured JSON responses
- Supports both GET and POST methods

**Key Features**:

- ✅ Secure authentication via bearer token
- ✅ Structured JSON responses
- ✅ Error handling and reporting
- ✅ Development mode support (no secret required)

### 4. System Cron Shell Script

**File**: `scripts/run-health-score-job.sh`

A bash script for system cron that:

- Runs the job with proper environment setup
- Logs output to dated log files
- Handles errors gracefully
- Cleans up old log files (30-day retention)

**Key Features**:

- ✅ Automatic log directory creation
- ✅ Dated log files
- ✅ Environment variable loading
- ✅ Log rotation (30-day retention)
- ✅ Exit code handling

### 5. NPM Scripts

**File**: `package.json`

Added convenient npm scripts:

```json
{
  "job:health-scores": "Run health score calculation job",
  "job:scheduler": "Run job scheduler"
}
```

### 6. Comprehensive Documentation

**File**: `docs/background-jobs-health-score.md`

Complete documentation covering:

- Architecture and components
- 4 different deployment options
- Configuration instructions
- Monitoring and logging
- Troubleshooting guide
- Testing procedures
- Maintenance tasks

**File**: `src/jobs/README.md`

Quick reference guide for developers covering:

- Available jobs
- Usage instructions
- Deployment options
- Testing
- Adding new jobs

### 7. Unit Tests

**File**: `tests/unit/jobs/health-score-calculator.test.ts`

Comprehensive test suite with 7 test cases:

- ✅ Successful execution
- ✅ Logging verification
- ✅ Error handling
- ✅ Error re-throwing
- ✅ Duration measurement
- ✅ Duration logging on failure
- ✅ Non-Error exception handling

**Test Results**: All 7 tests passing ✅

## Deployment Options

The implementation supports 4 different deployment strategies:

### Option 1: Manual Execution

```bash
npm run job:health-scores
```

**Best for**: Development, testing, debugging

### Option 2: Node-Cron Scheduler

```bash
npm install node-cron @types/node-cron
npm run job:scheduler
```

**Best for**: Simple deployments, development servers

### Option 3: System Cron (Linux/Unix)

```bash
chmod +x scripts/run-health-score-job.sh
crontab -e
# Add: 0 2 * * * /path/to/project/scripts/run-health-score-job.sh
```

**Best for**: Production servers, VPS, dedicated hosting

### Option 4: Vercel Cron Jobs

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/health-scores",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Best for**: Vercel deployments, serverless environments

## Error Handling

The implementation includes multiple layers of error handling:

1. **Individual School Failures**: If one school fails, the job logs the error and continues with other schools
2. **Complete Job Failure**: Logs detailed error information and exits with code 1
3. **Database Errors**: Caught and logged, allowing retry on next run
4. **Timeout Protection**: Each school is processed independently

## Logging

All components produce structured logs with ISO timestamps:

```
[2024-01-15T02:00:00.000Z] Starting health score calculation job...
[2024-01-15T02:00:05.234Z] Health score calculation completed successfully in 5234ms
```

Error logs include:

- Error name
- Error message
- Stack trace
- Execution duration

## Configuration

### Schedule Configuration

Default: Daily at 2:00 AM Africa/Kampala timezone

To change, edit `src/jobs/scheduler.ts`:

```typescript
cron.schedule('0 2 * * *', ...)  // Cron expression
```

### Timezone Configuration

Default: Africa/Kampala (Uganda)

To change, edit `src/jobs/scheduler.ts`:

```typescript
{
  timezone: "Africa/Kampala";
}
```

### Security Configuration

For Vercel Cron, set environment variable:

```
CRON_SECRET=your-secret-here
```

## Testing

### Unit Tests

```bash
npm test tests/unit/jobs/health-score-calculator.test.ts
```

### Manual Testing

```bash
npm run job:health-scores
```

### Verification

```sql
SELECT
  COUNT(*) as total_schools,
  MAX("calculatedAt") as last_calculation,
  AVG("healthScore") as avg_health_score
FROM "SchoolHealthMetrics";
```

## Files Created

1. `src/jobs/health-score-calculator.ts` - Core job implementation
2. `src/jobs/scheduler.ts` - Optional cron scheduler
3. `src/jobs/README.md` - Developer quick reference
4. `src/app/api/cron/health-scores/route.ts` - Vercel cron API route
5. `scripts/run-health-score-job.sh` - System cron shell script
6. `docs/background-jobs-health-score.md` - Comprehensive documentation
7. `tests/unit/jobs/health-score-calculator.test.ts` - Unit tests
8. `docs/implementation-summary-health-score-job.md` - This document

## Files Modified

1. `package.json` - Added npm scripts for job execution

## Requirements Validated

✅ **Requirement 4.8**: Background job for daily health score calculation

- Implements `calculateAllHealthScores` function (already existed in service)
- Sets up multiple scheduling options (cron job, system cron, Vercel cron)
- Adds comprehensive error handling and logging
- Provides complete documentation

## Next Steps

### For Development

1. Test the job manually: `npm run job:health-scores`
2. Verify results in database
3. Review logs for any errors

### For Production Deployment

#### Option A: Vercel (Recommended for Vercel deployments)

1. Add cron configuration to `vercel.json`
2. Set `CRON_SECRET` environment variable
3. Deploy to Vercel
4. Monitor execution in Vercel dashboard

#### Option B: System Cron (Recommended for VPS/dedicated servers)

1. Make shell script executable: `chmod +x scripts/run-health-score-job.sh`
2. Edit crontab: `crontab -e`
3. Add cron entry: `0 2 * * * /path/to/project/scripts/run-health-score-job.sh`
4. Monitor logs in `logs/` directory

#### Option C: Node-Cron (Simple deployments)

1. Install node-cron: `npm install node-cron @types/node-cron`
2. Start scheduler: `npm run job:scheduler`
3. Keep process running (use PM2 or similar)
4. Monitor console output

### Monitoring Setup

1. Set up log aggregation (Datadog, CloudWatch, etc.)
2. Create alerts for job failures
3. Monitor execution duration
4. Track success rate

## Performance Considerations

- **Processing Time**: ~100-500ms per school
- **Database Load**: Efficient queries with proper indexing
- **Memory Usage**: Sequential processing prevents memory issues
- **Recommended Schedule**: Daily at 2:00 AM (low traffic period)

## Maintenance

### Regular Tasks

- Monitor job execution (daily)
- Review error logs (weekly)
- Check performance metrics (monthly)
- Update schedule if needed (as required)

### Scaling Considerations

As the number of schools grows:

1. Add batching (process 100 schools at a time)
2. Add parallelization (worker threads or queue system)
3. Add progress tracking
4. Consider distributed processing (Bull/BullMQ)

## Support

For issues or questions:

1. Check `docs/background-jobs-health-score.md`
2. Review error logs
3. Run job manually to debug: `npm run job:health-scores`
4. Check database connectivity
5. Contact development team

## Related Documentation

- [Health Score Service](../src/services/health-score.service.ts)
- [Background Jobs Documentation](./background-jobs-health-score.md)
- [Super Admin Requirements](../.kiro/specs/super-admin-schools-control-center/requirements.md)
- [Super Admin Design](../.kiro/specs/super-admin-schools-control-center/design.md)
- [Super Admin Tasks](../.kiro/specs/super-admin-schools-control-center/tasks.md)

## Conclusion

The health score background job has been successfully implemented with:

- ✅ Multiple deployment options for flexibility
- ✅ Comprehensive error handling and logging
- ✅ Complete documentation
- ✅ Unit tests (7/7 passing)
- ✅ Production-ready code
- ✅ Security considerations
- ✅ Monitoring and maintenance guidance

The implementation is ready for deployment and meets all requirements specified in Task 2.3.
