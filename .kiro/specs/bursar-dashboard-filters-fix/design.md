# Bursar Dashboard Filters Fix - Bugfix Design

## Overview

The bursar dashboard period filter dropdown displays four options ("Current Term", "Current Month", "Last 30 Days", "Current Year"), but only "Current Term" functions correctly. The three date-based filter options are non-functional because the API endpoints (`/api/bursar/dashboard/metrics`, `/api/bursar/dashboard/recent-payments`, `/api/bursar/dashboard/top-defaulters`) receive the `period` parameter but ignore it, only filtering by `termId`. This fix will implement date-based filtering logic for the three non-functional period options while preserving the existing term-based filtering behavior.

The fix approach is minimal and surgical: add date range calculation logic based on the `period` parameter, then apply those date ranges to the existing Prisma queries using the `receivedAt` field for payments and `expenseDate` field for expenses. The term-based filtering logic remains completely unchanged.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when period parameter is "current-month", "last-30-days", or "current-year"
- **Property (P)**: The desired behavior when date-based periods are selected - data should be filtered by the appropriate date range
- **Preservation**: Existing term-based filtering behavior that must remain unchanged
- **receivedAt**: The DateTime field in the Payment model that records when a payment was received
- **expenseDate**: The DateTime field in the Expense model that records when an expense occurred
- **period parameter**: The query parameter sent to API endpoints indicating which time period to filter by (values: "current-term", "current-month", "last-30-days", "current-year")
- **Date Range Filter**: A Prisma where clause that filters records based on date fields falling within a calculated start and end date

## Bug Details

### Fault Condition

The bug manifests when the API endpoints receive a `period` parameter with value "current-month", "last-30-days", or "current-year". The endpoints extract the parameter but never use it to construct date-based where clauses for the Prisma queries. Instead, they only apply `termId`-based filtering, causing all three date-based period options to display identical data to "Current Term".

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input of type { period: string, termId: string | null }
  OUTPUT: boolean

  RETURN input.period IN ['current-month', 'last-30-days', 'current-year']
         AND dateRangeFilterNotApplied(input.period)
         AND onlyTermIdFilteringUsed(input.termId)
END FUNCTION
```

### Examples

- **Current Month Selection**: User selects "Current Month" on December 15, 2024. Expected: Show only payments/expenses from December 1-31, 2024. Actual: Shows all payments/expenses from the current term (e.g., September-December 2024).

- **Last 30 Days Selection**: User selects "Last 30 Days" on December 15, 2024. Expected: Show only payments/expenses from November 15 - December 15, 2024. Actual: Shows all payments/expenses from the current term.

- **Current Year Selection**: User selects "Current Year" on December 15, 2024. Expected: Show only payments/expenses from January 1 - December 31, 2024. Actual: Shows all payments/expenses from the current term.

- **Edge Case - Current Term**: User selects "Current Term". Expected: Continue to filter by termId as it currently does. Actual: Works correctly (no bug).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Term-based filtering ("Current Term" option) must continue to work exactly as before using `termId`
- The fallback behavior when no records exist for a specific `termId` must remain unchanged (falls back to school-wide filtering)
- Default period selection on dashboard load must remain "Current Term"
- The `useEffect` dependency on `selectedPeriod` that triggers data refetch must continue to work
- Error messages when no active term is configured must remain unchanged
- All response data structures and field names must remain identical

**Scope:**
All inputs where `period` equals "current-term" or is not provided should be completely unaffected by this fix. This includes:

- The existing `termId`-based where clause construction logic
- The existing payment count check before applying term filter
- The existing student account query logic
- All existing response formatting and data transformation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing Date Range Calculation**: The endpoints extract the `period` parameter but never calculate corresponding date ranges (start date and end date) based on the period value.

2. **Missing Date Filter Application**: Even though the Payment model has a `receivedAt` field and the Expense model has an `expenseDate` field (both indexed for performance), the where clauses never include date range conditions using these fields.

3. **Incomplete Conditional Logic**: The endpoints have conditional logic for `termId` filtering but lack parallel conditional logic for date-based filtering when period is not "current-term".

4. **Top Defaulters Calculation Issue**: The `/api/bursar/dashboard/top-defaulters` endpoint queries `StudentAccount` records which don't have date fields, so it needs to recalculate balances from payments and fee structures within the date range rather than using pre-calculated account balances.

## Correctness Properties

Property 1: Fault Condition - Date-Based Period Filtering

_For any_ API request where the period parameter is "current-month", "last-30-days", or "current-year", the fixed endpoints SHALL calculate the appropriate date range and filter payments by `receivedAt` field and expenses by `expenseDate` field to include only records within that date range, producing metrics, payment lists, and defaulter calculations based solely on data from the specified period.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**

Property 2: Preservation - Term-Based Filtering Behavior

_For any_ API request where the period parameter is "current-term" or not provided, the fixed endpoints SHALL produce exactly the same results as the original endpoints, preserving the existing term-based filtering logic, fallback behavior, and all response data structures.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**Files to Modify**:

1. `src/app/api/bursar/dashboard/metrics/route.ts`
2. `src/app/api/bursar/dashboard/recent-payments/route.ts`
3. `src/app/api/bursar/dashboard/top-defaulters/route.ts`

**Specific Changes**:

1. **Add Date Range Calculation Helper**: Create a helper function (can be inline or extracted) that calculates start and end dates based on period value:
   - "current-month": Start = first day of current month, End = last day of current month
   - "last-30-days": Start = 30 days ago from today, End = today
   - "current-year": Start = January 1 of current year, End = December 31 of current year
   - "current-term": Return null (no date filtering needed)

2. **Modify Payment Where Clause in metrics/route.ts**: After the existing `termId` conditional logic, add date range filtering:
   - If period is not "current-term" and date range is calculated, add `receivedAt: { gte: startDate, lte: endDate }` to the where clause
   - Apply this to the payment aggregate query for revenue calculation

3. **Modify Expense Where Clause in metrics/route.ts**: Add date range filtering to expense queries:
   - If period is not "current-term" and date range is calculated, add `expenseDate: { gte: startDate, lte: endDate }` to the where clause
   - Apply this to the expense aggregate query

4. **Modify Student Payments Include in metrics/route.ts**: Update the payments include clause in the student query:
   - Add date range filter to the nested payments where clause when period is not "current-term"
   - This ensures balance calculations only consider payments within the date range

5. **Modify Fee Structure Query in metrics/route.ts**: When using date-based filtering, fee structures should not be filtered by termId:
   - Skip fee structure filtering entirely for date-based periods (or fetch all active fee structures)
   - This is because date ranges don't align with term boundaries

6. **Modify Payment Query in recent-payments/route.ts**: Add date range filtering:
   - If period is not "current-term", add `receivedAt: { gte: startDate, lte: endDate }` to the payment where clause
   - This filters the recent payments list to the selected date range

7. **Recalculate Defaulters in top-defaulters/route.ts**: Instead of querying StudentAccount (which has pre-calculated balances), recalculate balances for date-based periods:
   - Query all active students
   - For each student, sum payments within the date range
   - Calculate expected fees (may need to prorate or use all active fee structures)
   - Calculate balance = expected - paid
   - Filter to students with positive balance
   - Sort by balance descending and take top N

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that date-based period selections return the same data as term-based filtering.

**Test Plan**: Write tests that call the API endpoints with different period parameters and compare the results. Run these tests on the UNFIXED code to observe that "current-month", "last-30-days", and "current-year" return identical data to "current-term".

**Test Cases**:

1. **Current Month Returns Term Data**: Call `/api/bursar/dashboard/metrics?period=current-month` and verify it returns the same metrics as `period=current-term` (will fail on unfixed code - should be different)
2. **Last 30 Days Returns Term Data**: Call `/api/bursar/dashboard/metrics?period=last-30-days` and verify it returns the same metrics as `period=current-term` (will fail on unfixed code - should be different)
3. **Current Year Returns Term Data**: Call `/api/bursar/dashboard/metrics?period=current-year` and verify it returns the same metrics as `period=current-term` (will fail on unfixed code - should be different)
4. **Recent Payments Ignores Period**: Call `/api/bursar/dashboard/recent-payments?period=current-month` and verify payment dates may fall outside current month (will fail on unfixed code)

**Expected Counterexamples**:

- Metrics for "current-month" match metrics for "current-term" exactly, even when current month is shorter than current term
- Recent payments list includes payments from outside the selected date range
- Possible root cause confirmed: No date filtering logic exists in the code

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (date-based period parameters), the fixed endpoints produce the expected date-filtered behavior.

**Pseudocode:**

```
FOR ALL period IN ['current-month', 'last-30-days', 'current-year'] DO
  dateRange := calculateDateRange(period)
  result := callEndpoint_fixed(period)
  ASSERT allPaymentsInResult.receivedAt BETWEEN dateRange.start AND dateRange.end
  ASSERT allExpensesInResult.expenseDate BETWEEN dateRange.start AND dateRange.end
  ASSERT metricsCalculatedFromDateRangeDataOnly(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (period = "current-term" or not provided), the fixed endpoints produce the same results as the original endpoints.

**Pseudocode:**

```
FOR ALL input WHERE input.period IN ['current-term', null, undefined] DO
  ASSERT callEndpoint_original(input) = callEndpoint_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across different termId values
- It catches edge cases like missing termId, invalid termId, or terms with no data
- It provides strong guarantees that term-based filtering behavior is unchanged

**Test Plan**: Capture the current behavior of term-based filtering on UNFIXED code, then write property-based tests to verify this exact behavior continues after the fix.

**Test Cases**:

1. **Current Term Preservation**: Call endpoints with `period=current-term` on both unfixed and fixed code, verify identical responses
2. **Default Period Preservation**: Call endpoints without period parameter on both unfixed and fixed code, verify identical responses
3. **Fallback Behavior Preservation**: Call endpoints with termId that has no data, verify fallback to school-wide filtering still works
4. **Response Structure Preservation**: Verify all response fields, data types, and structures remain identical for term-based filtering

### Unit Tests

- Test date range calculation function for each period type (current-month, last-30-days, current-year)
- Test edge cases: month boundaries, year boundaries, leap years
- Test that date filters are correctly added to Prisma where clauses
- Test that term-based filtering logic path is not modified
- Test metrics calculation with date-filtered data
- Test defaulter recalculation logic for date-based periods

### Property-Based Tests

- Generate random dates and verify "current-month" always returns data from the same calendar month
- Generate random dates and verify "last-30-days" always returns data from exactly 30 days prior
- Generate random dates and verify "current-year" always returns data from January 1 to December 31 of current year
- Generate random termId values and verify term-based filtering produces identical results before and after fix
- Generate random combinations of period and termId to verify correct filtering logic is applied

### Integration Tests

- Test full dashboard flow: load dashboard, select "Current Month", verify all three endpoints return month-filtered data
- Test switching between periods: select "Current Term", then "Last 30 Days", verify data changes appropriately
- Test with real database: seed payments across multiple months/terms, verify each period filter returns correct subset
- Test performance: verify date-indexed queries perform efficiently with large datasets
- Test edge case: select "Current Month" when current month has no data, verify empty results (not fallback to term data)
