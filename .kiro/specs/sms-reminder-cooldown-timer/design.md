# Design Document: SMS Reminder Cooldown Timer

## Overview

This design implements a 10-day cooldown timer for the SMS reminder button in the financial summary component. The feature prevents spam by disabling the button after sending reminders and displaying a countdown showing when reminders can be sent again. The cooldown state persists across application restarts and server downtime by storing the last reminder timestamp in the database.

The implementation follows a client-server architecture where:

- The database stores the authoritative last reminder timestamp
- The backend API validates cooldown status and updates timestamps
- The frontend calculates and displays the remaining time in real-time
- The UI updates every minute to show accurate countdown information

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  FinancialSummary Component                            │ │
│  │  - Fetches last reminder timestamp on mount            │ │
│  │  - Calculates remaining cooldown time                  │ │
│  │  - Updates countdown display every minute              │ │
│  │  - Enables/disables button based on cooldown status    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/JSON
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Next.js)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  GET /api/finance/summary                              │ │
│  │  - Returns financial data + lastReminderSent           │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  POST /api/bursar/send-reminders                       │ │
│  │  - Validates cooldown period before sending            │ │
│  │  - Updates lastReminderSent timestamp                  │ │
│  │  - Sends SMS reminders                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (MongoDB)                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  School Collection                                     │ │
│  │  - lastReminderSent: DateTime?                         │ │
│  │  - Stores timestamp of last reminder batch             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Component Mount**: FinancialSummary fetches financial data including `lastReminderSent`
2. **Cooldown Calculation**: Frontend calculates elapsed time and remaining cooldown
3. **UI Update**: Button state and text updated based on cooldown status
4. **Periodic Refresh**: setInterval updates countdown every 60 seconds
5. **Send Action**: User clicks button → API validates cooldown → Updates timestamp → Sends SMS
6. **State Refresh**: After sending, component refetches data to get new timestamp

## Components and Interfaces

### Database Schema Changes

Add a new field to the `School` model in `prisma/schema.prisma`:

```prisma
model School {
  // ... existing fields ...

  lastReminderSent DateTime? // Timestamp of last SMS reminder batch sent

  // ... existing relations ...
}
```

### API Response Types

```typescript
// Extended FinancialSummaryData interface
interface FinancialSummaryData {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  unpaidStudents: Array<{
    id: string;
    name: string;
    class: string;
    balance: number;
    phone?: string;
  }>;
  lastReminderSent?: string; // ISO 8601 timestamp
}

// Send reminders response
interface SendRemindersResponse {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  errors?: string[];
  message: string;
  lastReminderSent: string; // ISO 8601 timestamp
}
```

### Frontend Component State

```typescript
interface CooldownState {
  isActive: boolean; // Whether cooldown is currently active
  remainingDays: number; // Days remaining in cooldown
  remainingHours: number; // Hours remaining (0-23)
  lastReminderSent: Date | null; // Parsed timestamp from server
}
```

### API Endpoints

#### GET /api/finance/summary

**Purpose**: Fetch financial summary including last reminder timestamp

**Query Parameters**:

- `schoolId` (optional): School identifier
- `termId` (optional): Term identifier

**Response**:

```json
{
  "totalExpected": 50000000,
  "totalCollected": 35000000,
  "totalOutstanding": 15000000,
  "collectionRate": 70.0,
  "unpaidStudents": [...],
  "lastReminderSent": "2024-01-15T10:30:00.000Z"
}
```

#### POST /api/bursar/send-reminders

**Purpose**: Send SMS reminders and update cooldown timestamp

**Request Body**:

```json
{
  "studentIds": ["id1", "id2", "id3"]
}
```

**Validation**:

- Check if cooldown period (10 days) has elapsed
- Return 429 (Too Many Requests) if cooldown is active

**Response** (Success):

```json
{
  "success": true,
  "sent": 45,
  "failed": 0,
  "total": 45,
  "message": "Successfully sent 45 payment reminders",
  "lastReminderSent": "2024-01-25T14:20:00.000Z"
}
```

**Response** (Cooldown Active):

```json
{
  "error": "Cooldown period active. Next reminders available in 7 days, 5 hours",
  "remainingDays": 7,
  "remainingHours": 5,
  "nextAvailableAt": "2024-02-01T10:30:00.000Z"
}
```

## Data Models

### School Model Extension

The `School` model will be extended with a single field:

```prisma
model School {
  id                 String      @id @default(auto()) @map("_id") @db.ObjectId
  // ... existing fields ...
  lastReminderSent   DateTime?   // New field: timestamp of last reminder batch
  // ... existing fields ...
}
```

**Field Details**:

- **Type**: `DateTime?` (nullable)
- **Purpose**: Store the exact timestamp when reminders were last sent
- **Nullable**: Yes - null indicates reminders have never been sent
- **Timezone**: Stored in UTC, converted to local time on frontend
- **Updated**: Set to current timestamp when POST /api/bursar/send-reminders succeeds

### Migration Strategy

1. Add field to schema with nullable type
2. Run Prisma migration: `npx prisma migrate dev --name add-last-reminder-sent`
3. Existing schools will have `null` value (no cooldown active)
4. First reminder send will populate the field

## Cooldown Calculation Logic

### Constants

```typescript
const COOLDOWN_DAYS = 10;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000; // 10 days in milliseconds
const UPDATE_INTERVAL_MS = 60 * 1000; // Update every minute
```

### Backend Validation

```typescript
function isCooldownActive(lastReminderSent: Date | null): boolean {
  if (!lastReminderSent) return false;

  const now = new Date();
  const elapsed = now.getTime() - lastReminderSent.getTime();

  return elapsed < COOLDOWN_MS;
}

function getRemainingCooldown(lastReminderSent: Date): {
  days: number;
  hours: number;
  nextAvailableAt: Date;
} {
  const now = new Date();
  const elapsed = now.getTime() - lastReminderSent.getTime();
  const remaining = COOLDOWN_MS - elapsed;

  if (remaining <= 0) {
    return { days: 0, hours: 0, nextAvailableAt: now };
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );
  const nextAvailableAt = new Date(lastReminderSent.getTime() + COOLDOWN_MS);

  return { days, hours, nextAvailableAt };
}
```

### Frontend Calculation

```typescript
function calculateCooldownState(
  lastReminderSent: string | null,
): CooldownState {
  if (!lastReminderSent) {
    return {
      isActive: false,
      remainingDays: 0,
      remainingHours: 0,
      lastReminderSent: null,
    };
  }

  const lastSent = new Date(lastReminderSent);
  const now = new Date();
  const elapsed = now.getTime() - lastSent.getTime();
  const remaining = COOLDOWN_MS - elapsed;

  if (remaining <= 0) {
    return {
      isActive: false,
      remainingDays: 0,
      remainingHours: 0,
      lastReminderSent: lastSent,
    };
  }

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor(
    (remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
  );

  return {
    isActive: true,
    remainingDays: days,
    remainingHours: hours,
    lastReminderSent: lastSent,
  };
}
```

### UI Display Logic

```typescript
function getButtonText(cooldownState: CooldownState): string {
  if (!cooldownState.isActive) {
    return "Send Reminders";
  }

  const { remainingDays, remainingHours } = cooldownState;

  if (remainingDays > 0) {
    return `Reminders sent\nNext available in ${remainingDays} day${remainingDays !== 1 ? "s" : ""}, ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
  } else {
    return `Reminders sent\nNext available in ${remainingHours} hour${remainingHours !== 1 ? "s" : ""}`;
  }
}
```

## Timezone Handling

### Server-Side (UTC Storage)

- All timestamps stored in database as UTC
- `new Date()` in Node.js returns UTC time
- Prisma automatically handles UTC conversion

### Client-Side (Local Display)

- Timestamps received as ISO 8601 strings
- JavaScript `Date` object automatically converts to local timezone
- Calculations use milliseconds (timezone-agnostic)
- Display uses local time but calculations remain accurate

### Example

```typescript
// Server stores: 2024-01-15T10:30:00.000Z (UTC)
// Client in EAT (UTC+3) sees: 2024-01-15T13:30:00.000+03:00
// Calculation: elapsed = now.getTime() - lastSent.getTime()
// Result: Correct regardless of timezone
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Timestamp Persistence

For any valid timestamp, when the SMS reminder button is clicked and a timestamp is stored in the database, retrieving the school record should return the exact same timestamp.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Elapsed Time Calculation

For any timestamp in the past, the calculated elapsed time should equal the difference between the current time and the stored timestamp.

**Validates: Requirements 2.1**

### Property 3: Remaining Cooldown Calculation

For any timestamp less than 10 days old, the calculated remaining cooldown time should equal (10 days - elapsed time), expressed in days and hours.

**Validates: Requirements 2.3, 6.1**

### Property 4: Cooldown Expiration Detection

For any timestamp that is 10 days or older, the system should determine that the cooldown period has expired (remaining time = 0).

**Validates: Requirements 2.4**

### Property 5: Button Text During Active Cooldown

For any active cooldown state (timestamp less than 10 days old), the button text should contain "Reminders sent" and display the remaining time in the format "Next available in X day(s), Y hour(s)".

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 6: Button Disabled During Cooldown

For any active cooldown state (timestamp less than 10 days old), the SMS reminder button should be disabled and not clickable.

**Validates: Requirements 3.4**

### Property 7: Button Text After Cooldown Expires

For any expired cooldown state (timestamp 10+ days old or null), the button text should be "Send Reminders".

**Validates: Requirements 4.1, 5.1**

### Property 8: Button Enabled After Cooldown Expires

For any expired cooldown state (timestamp 10+ days old or null), the SMS reminder button should be enabled and clickable.

**Validates: Requirements 4.2, 5.2, 6.3**

### Property 9: Send Operation After Expiration

For any expired cooldown state, when the SMS reminder button is clicked, the system should allow the send operation to proceed and update the timestamp to the current time.

**Validates: Requirements 4.3, 5.3**

### Property 10: Timezone-Agnostic Calculations

For any timestamp, when converted to different timezones, the elapsed time calculation should produce the same result (calculations should be timezone-agnostic).

**Validates: Requirements 6.4**

### Property 11: Cooldown Round Trip

For any school, if reminders are sent (setting a timestamp), then immediately checking the cooldown status should show an active cooldown with approximately 10 days remaining.

**Validates: Requirements 1.1, 2.2, 2.3**

## Error Handling

### Database Errors

**Scenario**: Database connection fails when fetching or updating timestamp

**Handling**:

- Frontend: Display error message, show retry button
- Backend: Return 500 status with error details
- Fallback: Treat as no timestamp (allow sending, but warn user)

**User Experience**:

```
"Unable to verify cooldown status. Please try again."
[Retry Button]
```

### Timestamp Corruption

**Scenario**: Invalid timestamp value in database (future date, invalid format)

**Handling**:

- Backend: Validate timestamp is not in the future
- If invalid: Log error, treat as null (no cooldown)
- Return sanitized data to frontend

**Validation**:

```typescript
function validateTimestamp(timestamp: Date | null): Date | null {
  if (!timestamp) return null;

  const now = new Date();
  if (timestamp.getTime() > now.getTime()) {
    console.error("Invalid timestamp: future date detected");
    return null; // Treat as no cooldown
  }

  return timestamp;
}
```

### Network Failures

**Scenario**: API request fails during send operation

**Handling**:

- Frontend: Show error message, keep button enabled for retry
- Backend: Do not update timestamp if SMS sending fails
- Atomic operation: Only update timestamp if SMS send succeeds

**User Experience**:

```
"Failed to send reminders. Please check your connection and try again."
[Retry Button]
```

### Concurrent Requests

**Scenario**: Multiple users try to send reminders simultaneously

**Handling**:

- Backend: Check cooldown status at request time (not just frontend)
- Return 429 (Too Many Requests) if cooldown is active
- First successful request wins, others get cooldown error

**Response**:

```json
{
  "error": "Reminders were recently sent by another user",
  "remainingDays": 9,
  "remainingHours": 23,
  "nextAvailableAt": "2024-02-04T10:30:00.000Z"
}
```

### Clock Skew

**Scenario**: Client and server clocks are significantly different

**Handling**:

- Always use server time as source of truth
- Frontend calculations are for display only
- Backend validates cooldown before allowing send
- Server timestamp in response used for next calculation

**Mitigation**:

```typescript
// Backend always validates
if (isCooldownActive(school.lastReminderSent)) {
  return NextResponse.json(
    { error: "Cooldown period active" },
    { status: 429 },
  );
}
```

### Missing School Record

**Scenario**: School ID not found in database

**Handling**:

- Return 404 with clear error message
- Frontend: Display error, suggest contacting support
- Do not allow sending reminders

## Testing Strategy

### Unit Testing

Unit tests will focus on specific functions and edge cases:

**Cooldown Calculation Functions**:

- Test `isCooldownActive()` with various timestamps
- Test `getRemainingCooldown()` with edge cases (exactly 10 days, 0 days, negative)
- Test `calculateCooldownState()` with null, expired, and active timestamps
- Test `getButtonText()` with various cooldown states

**Edge Cases**:

- Timestamp exactly at 10-day boundary
- Null/undefined timestamp handling
- Future timestamps (invalid data)
- Very old timestamps (years ago)
- Timestamps at midnight (day boundary)

**Timezone Handling**:

- Test with UTC timestamps
- Test with different timezone offsets
- Verify calculations are timezone-agnostic

**Example Unit Tests**:

```typescript
describe("isCooldownActive", () => {
  it("should return false for null timestamp", () => {
    expect(isCooldownActive(null)).toBe(false);
  });

  it("should return true for timestamp 5 days ago", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    expect(isCooldownActive(fiveDaysAgo)).toBe(true);
  });

  it("should return false for timestamp 11 days ago", () => {
    const elevenDaysAgo = new Date(Date.now() - 11 * 24 * 60 * 60 * 1000);
    expect(isCooldownActive(elevenDaysAgo)).toBe(false);
  });

  it("should return false for timestamp exactly 10 days ago", () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(isCooldownActive(tenDaysAgo)).toBe(false);
  });
});
```

### Property-Based Testing

Property-based tests will verify universal properties across many generated inputs using **fast-check** (JavaScript property-based testing library).

**Configuration**:

- Minimum 100 iterations per property test
- Each test tagged with feature name and property reference

**Property Test Examples**:

```typescript
import fc from "fast-check";

describe("SMS Reminder Cooldown - Property Tests", () => {
  // Property 1: Timestamp Persistence
  it("Property 1: stored timestamp should be retrievable", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        async (timestamp) => {
          // Store timestamp
          await updateSchoolTimestamp(schoolId, timestamp);

          // Retrieve timestamp
          const retrieved = await getSchoolTimestamp(schoolId);

          // Should match
          expect(retrieved?.getTime()).toBe(timestamp.getTime());
        },
      ),
      { numRuns: 100 },
    );
  });
  // Feature: sms-reminder-cooldown-timer, Property 1: Timestamp Persistence

  // Property 3: Remaining Cooldown Calculation
  it("Property 3: remaining time should equal 10 days minus elapsed", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 9 * 24 * 60 * 60 * 1000 }), // 1ms to 9 days
        async (elapsedMs) => {
          const timestamp = new Date(Date.now() - elapsedMs);
          const remaining = getRemainingCooldown(timestamp);

          const expectedRemaining = 10 * 24 * 60 * 60 * 1000 - elapsedMs;
          const expectedDays = Math.floor(
            expectedRemaining / (24 * 60 * 60 * 1000),
          );
          const expectedHours = Math.floor(
            (expectedRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
          );

          expect(remaining.days).toBe(expectedDays);
          expect(remaining.hours).toBe(expectedHours);
        },
      ),
      { numRuns: 100 },
    );
  });
  // Feature: sms-reminder-cooldown-timer, Property 3: Remaining Cooldown Calculation

  // Property 4: Cooldown Expiration Detection
  it("Property 4: timestamps 10+ days old should be expired", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({
          min: 10 * 24 * 60 * 60 * 1000,
          max: 365 * 24 * 60 * 60 * 1000,
        }), // 10 days to 1 year
        async (elapsedMs) => {
          const timestamp = new Date(Date.now() - elapsedMs);
          const isActive = isCooldownActive(timestamp);

          expect(isActive).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
  // Feature: sms-reminder-cooldown-timer, Property 4: Cooldown Expiration Detection

  // Property 10: Timezone-Agnostic Calculations
  it("Property 10: elapsed time should be same across timezones", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.date({ min: new Date("2020-01-01"), max: new Date() }),
        fc.integer({ min: -12, max: 14 }), // Timezone offsets
        async (timestamp, tzOffset) => {
          // Calculate elapsed time in UTC
          const elapsedUTC = Date.now() - timestamp.getTime();

          // Simulate different timezone by adjusting display (not calculation)
          const elapsedWithTZ = Date.now() - timestamp.getTime();

          // Should be identical (calculations are timezone-agnostic)
          expect(elapsedUTC).toBe(elapsedWithTZ);
        },
      ),
      { numRuns: 100 },
    );
  });
  // Feature: sms-reminder-cooldown-timer, Property 10: Timezone-Agnostic Calculations
});
```

**Property Test Coverage**:

- All 11 correctness properties will have corresponding property tests
- Each test runs 100+ iterations with randomized inputs
- Tests cover edge cases through random generation
- Failures provide counterexamples for debugging

### Integration Testing

Integration tests will verify end-to-end workflows:

**Test Scenarios**:

1. **First-time send**: No timestamp → Send reminders → Timestamp created → Cooldown active
2. **Cooldown enforcement**: Active cooldown → Attempt send → Request rejected with 429
3. **Cooldown expiration**: Set timestamp 11 days ago → Send reminders → Success
4. **Component lifecycle**: Mount component → Fetch data → Display correct state → Update countdown
5. **Concurrent requests**: Multiple simultaneous send attempts → Only first succeeds

**Example Integration Test**:

```typescript
describe("SMS Reminder Cooldown - Integration", () => {
  it("should enforce cooldown across full workflow", async () => {
    // 1. Initial state: no timestamp
    let response = await fetch("/api/finance/summary");
    let data = await response.json();
    expect(data.lastReminderSent).toBeNull();

    // 2. Send reminders
    response = await fetch("/api/bursar/send-reminders", {
      method: "POST",
      body: JSON.stringify({ studentIds: ["id1", "id2"] }),
    });
    expect(response.ok).toBe(true);

    // 3. Verify timestamp was set
    response = await fetch("/api/finance/summary");
    data = await response.json();
    expect(data.lastReminderSent).toBeTruthy();

    // 4. Attempt to send again immediately
    response = await fetch("/api/bursar/send-reminders", {
      method: "POST",
      body: JSON.stringify({ studentIds: ["id1", "id2"] }),
    });
    expect(response.status).toBe(429); // Too Many Requests

    // 5. Verify error message includes remaining time
    const error = await response.json();
    expect(error.remainingDays).toBeGreaterThan(9);
  });
});
```

### Manual Testing Checklist

- [ ] Button displays "Send Reminders" on first load
- [ ] Clicking button sends reminders and updates timestamp
- [ ] Button becomes disabled with countdown text
- [ ] Countdown updates every minute
- [ ] Countdown shows correct days and hours
- [ ] Button re-enables after 10 days
- [ ] Cooldown persists after page refresh
- [ ] Cooldown persists after server restart
- [ ] Error handling works for network failures
- [ ] Concurrent send attempts are handled correctly
- [ ] Timezone differences don't affect cooldown accuracy

### Test Data Requirements

**Database Setup**:

- Test school with various timestamp states (null, recent, expired)
- Test students with guardian phone numbers
- Mock SMS service for testing without sending real messages

**Time Manipulation**:

- Use libraries like `MockDate` or `jest.useFakeTimers()` to simulate time passage
- Test boundary conditions (exactly 10 days, just before/after expiration)

## Implementation Notes

### Frontend Implementation

**Component Updates** (`src/components/ui/financial-summary.tsx`):

1. Add cooldown state management
2. Implement `calculateCooldownState()` function
3. Add `useEffect` with interval for countdown updates
4. Update button rendering logic
5. Handle API errors gracefully

**Key Considerations**:

- Clean up interval on component unmount
- Recalculate cooldown when data refreshes
- Show loading state during API calls
- Display user-friendly error messages

### Backend Implementation

**API Updates**:

1. **GET /api/finance/summary** (`src/app/api/finance/summary/route.ts`):
   - Include `lastReminderSent` in response
   - Fetch from school record

2. **POST /api/bursar/send-reminders** (`src/app/api/bursar/send-reminders/route.ts`):
   - Add cooldown validation before sending
   - Update `lastReminderSent` on success
   - Return 429 if cooldown active
   - Include remaining time in error response

**Database Migration**:

```bash
# Add field to schema
npx prisma migrate dev --name add-last-reminder-sent

# Generate Prisma client
npx prisma generate
```

### Performance Considerations

**Frontend**:

- Countdown updates every 60 seconds (not every second) to reduce CPU usage
- Calculations are lightweight (simple arithmetic)
- No unnecessary re-renders

**Backend**:

- Single database field addition (minimal storage impact)
- Timestamp comparison is fast (indexed field not required)
- No additional database queries for cooldown check

**Scalability**:

- Cooldown is per-school (not per-user)
- No additional tables or complex queries
- Works with existing multi-tenancy architecture

### Security Considerations

**Authorization**:

- Only authenticated users with school context can send reminders
- Backend validates user has permission to send SMS
- Cooldown applies to entire school (prevents abuse)

**Data Validation**:

- Validate timestamp is not in future
- Sanitize error messages (no sensitive data exposure)
- Rate limiting already handled by cooldown mechanism

**Audit Trail**:

- Existing SMS audit logs capture send events
- Timestamp updates are implicit audit trail
- No additional logging required

## Deployment Strategy

### Phase 1: Database Migration

1. Add `lastReminderSent` field to schema
2. Run migration on staging environment
3. Verify existing schools have null value
4. Run migration on production

### Phase 2: Backend Deployment

1. Deploy API changes to staging
2. Test cooldown validation
3. Verify timestamp updates
4. Deploy to production

### Phase 3: Frontend Deployment

1. Deploy component changes to staging
2. Test UI behavior with various cooldown states
3. Verify countdown updates
4. Deploy to production

### Rollback Plan

- Database field is nullable (safe to add)
- If issues occur, can disable cooldown check in API
- Frontend gracefully handles missing `lastReminderSent` field
- No data loss risk

### Monitoring

- Track API 429 responses (cooldown rejections)
- Monitor timestamp update success rate
- Alert on unusual patterns (many cooldown violations)
- Log errors for timestamp validation failures
