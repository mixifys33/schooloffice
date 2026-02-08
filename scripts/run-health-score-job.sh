#!/bin/bash

###############################################################################
# Health Score Calculation Job Runner
#
# This script runs the health score calculation job and logs the output.
#
# Usage:
#   ./scripts/run-health-score-job.sh
#
# System Cron Setup:
#   1. Make this script executable:
#      chmod +x scripts/run-health-score-job.sh
#
#   2. Edit crontab:
#      crontab -e
#
#   3. Add this line to run daily at 2:00 AM:
#      0 2 * * * /path/to/project/scripts/run-health-score-job.sh
#
# Requirements: 4.8 - Background job for daily health score calculation
###############################################################################

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Project root is one level up from scripts directory
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Log directory
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"

# Log file with date
LOG_FILE="$LOG_DIR/health-score-job-$(date +%Y-%m-%d).log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Start job
log "=========================================="
log "Starting health score calculation job"
log "Project directory: $PROJECT_DIR"
log "=========================================="

# Change to project directory
cd "$PROJECT_DIR" || {
    log "ERROR: Failed to change to project directory"
    exit 1
}

# Load environment variables if .env file exists
if [ -f .env ]; then
    log "Loading environment variables from .env"
    export $(grep -v '^#' .env | xargs)
fi

# Run the job
log "Executing health score calculation..."

npx ts-node --compiler-options '{"module":"CommonJS"}' src/jobs/health-score-calculator.ts >> "$LOG_FILE" 2>&1
EXIT_CODE=$?

# Check exit code
if [ $EXIT_CODE -eq 0 ]; then
    log "Job completed successfully"
else
    log "ERROR: Job failed with exit code $EXIT_CODE"
fi

log "=========================================="
log "Job finished"
log "=========================================="

# Clean up old log files (keep last 30 days)
find "$LOG_DIR" -name "health-score-job-*.log" -mtime +30 -delete

exit $EXIT_CODE
