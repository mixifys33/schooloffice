# Implementation Plan: SMS Reminder Cooldown Timer

## Overview

This implementation adds a 10-day cooldown timer to the SMS reminder button in the financial summary component. The feature prevents spam by disabling the button after sending reminders and displaying a countdown showing when reminders can be sent again. The implementation follows a client-server architecture with database persistence, backend validation, and real-time frontend countdown updates.

## Tasks

- [x] 1. Add database schema field for last reminder timestamp
  - Add `lastReminderSent` field to School model in `prisma/schema.prisma`
  - Field type: `DateTime?` (nullable)
  - Run Prisma migration: `npx prisma migrate dev --name add-last-reminder-sent`
  - Generate Prisma client: `npx prisma generate`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Implement backend cooldown validation logic
  - [x] 2.1 Create cooldown utility functions
    - Create `src/lib/cooldown-utils.ts` with constants and validation functions
    - Implement `isCooldownActive(lastReminderSent: Date | null): boolean`
    - Implement `getRemainingCooldown(lastReminderSent: Date)` returning days, hours, nextAvailableAt
    - Implement `validateTimestamp(timestamp: Date | null): Date | null` for data integrity
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]\* 2.2 Write property test for cooldown validation
    - **Property 1: Timestamp Persistence**
    - **Property 3: Remaining Cooldown Calculation**
    - **Property 4: Cooldown Expiration Detection**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 2.1, 2.3, 2.4**
  - [ ]\* 2.3 Write unit tests for cooldown utility functions
    - Test `isCooldownActive()` with null, recent, and expired timestamps
    - Test `getRemainingCooldown()` with edge cases (exactly 10 days, boundary conditions)
    - Test `validateTimestamp()` with invalid data (future dates, null)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. Update GET /api/finance/summary endpoint
  - [x] 3.1 Modify API route to include lastReminderSent in response
    - Update `src/app/api/finance/summary/route.ts`
    - Fetch `lastReminderSent` from school record
    - Add field to FinancialSummaryData response type
    - Validate timestamp before returning (handle corrupted data)
    - _Requirements: 1.4_
  - [ ]\* 3.2 Write integration test for summary endpoint
    - Test response includes `lastReminderSent` field
    - Test with null timestamp (first-time case)
    - Test with valid timestamp
    - _Requirements: 1.4_

- [ ] 4. Update POST /api/bursar/send-reminders endpoint
  - [x] 4.1 Add cooldown validation to send-reminders API
    - Update `src/app/api/bursar/send-reminders/route.ts`
    - Check cooldown status before sending reminders
    - Return 429 (Too Many Requests) if cooldown is active
    - Include remaining time in error response
    - Update `lastReminderSent` timestamp on successful send
    - Ensure atomic operation (only update timestamp if SMS send succeeds)
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 4.3, 5.3_
  - [ ]\* 4.2 Write property test for send-reminders endpoint
    - **Property 9: Send Operation After Expiration**
    - **Property 11: Cooldown Round Trip**
    - **Validates: Requirements 1.1, 2.2, 2.3, 4.3, 5.3**
  - [ ]\* 4.3 Write integration test for cooldown enforcement
    - Test successful send updates timestamp
    - Test immediate retry returns 429 error
    - Test error response includes remaining time
    - Test concurrent send attempts (only first succeeds)
    - _Requirements: 1.1, 4.3_

- [ ] 5. Checkpoint - Ensure backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement frontend cooldown calculation logic
  - [x] 6.1 Create frontend cooldown utilities
    - Create `src/lib/cooldown-client-utils.ts` with constants
    - Implement `calculateCooldownState(lastReminderSent: string | null): CooldownState`
    - Implement `getButtonText(cooldownState: CooldownState): string`
    - Define CooldownState interface (isActive, remainingDays, remainingHours, lastReminderSent)
    - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3, 4.1, 5.1, 6.1_
  - [ ]\* 6.2 Write property test for frontend cooldown calculations
    - **Property 2: Elapsed Time Calculation**
    - **Property 5: Button Text During Active Cooldown**
    - **Property 7: Button Text After Cooldown Expires**
    - **Property 10: Timezone-Agnostic Calculations**
    - **Validates: Requirements 2.1, 3.1, 3.2, 3.3, 4.1, 5.1, 6.4**
  - [ ]\* 6.3 Write unit tests for frontend utilities
    - Test `calculateCooldownState()` with various timestamps
    - Test `getButtonText()` with different cooldown states
    - Test null/undefined handling
    - Test timezone handling
    - _Requirements: 2.1, 2.3, 3.1, 3.2, 3.3, 6.4_

- [ ] 7. Update FinancialSummary component with cooldown UI
  - [x] 7.1 Add cooldown state management to component
    - Update `src/components/ui/financial-summary.tsx`
    - Add state for cooldown (isActive, remainingDays, remainingHours)
    - Fetch `lastReminderSent` from API on component mount
    - Calculate initial cooldown state from API response
    - _Requirements: 1.4, 6.1_
  - [x] 7.2 Implement countdown timer with periodic updates
    - Add `useEffect` with `setInterval` to update countdown every 60 seconds
    - Recalculate cooldown state on each interval
    - Clean up interval on component unmount
    - Update button state when countdown reaches zero
    - _Requirements: 3.5, 6.2, 6.3_
  - [x] 7.3 Update button rendering logic
    - Conditionally disable button based on cooldown state
    - Update button text using `getButtonText()` function
    - Show "Send Reminders" when cooldown is inactive
    - Show "Reminders sent\nNext available in X days, Y hours" during cooldown
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1, 5.2_
  - [x] 7.4 Add error handling and loading states
    - Display error message if API fetch fails
    - Show retry button on error
    - Handle network failures gracefully
    - Refresh cooldown state after successful send
    - _Requirements: 1.4, 4.3, 5.3_
  - [ ]\* 7.5 Write component integration tests
    - **Property 6: Button Disabled During Cooldown**
    - **Property 8: Button Enabled After Cooldown Expires**
    - **Validates: Requirements 3.4, 4.2, 5.2, 6.3**
  - [ ]\* 7.6 Write component unit tests
    - Test component renders with null timestamp (initial state)
    - Test component renders with active cooldown
    - Test component renders with expired cooldown
    - Test countdown updates every minute
    - Test button state changes when cooldown expires
    - Test error handling
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 5.1, 5.2, 6.2, 6.3_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The cooldown period is 10 days (configurable via constant)
- All timestamps stored in UTC, calculations are timezone-agnostic
- Backend validates cooldown to prevent client-side bypass
- Frontend countdown updates every 60 seconds to reduce CPU usage
