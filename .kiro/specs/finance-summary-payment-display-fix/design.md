# Finance Summary Payment Display Fix - Bugfix Design

## Overview

The finance summary displays incorrect payment data (totalCollected = 0, collectionRate = 0%) because the `getFinanceDashboardSummary` function in `src/services/finance.service.ts` queries both student accounts and payments without filtering by `termId`. This causes the function to aggregate financial data across ALL terms instead of just the current term, resulting in incorrect calculations when student accounts and payments exist for multiple terms.

The fix requires adding `termId` filters to both the `StudentAccount` query (line 14) and the `Payment` query (line 24) to ensure only data for the current term is retrieved and aggregated.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when querying financial data without filtering by termId
- **Property (P)**: The desired behavior - financial summaries should only include data for the specified term
- **Preservation**: Existing query behavior for students, fee structures, sorting, and error handling that must remain unchanged
- **getFinanceDashboardSummary**: The function in `src/services/finance.service.ts` that retrieves and aggregates financial data for the dashboard
- **StudentAccount**: The database model that tracks individual student financial status per term (has termId field)
- **Payment**: The database model that records payment transactions (has termId field)
- **termId**: The identifier for the academic term that scopes financial data

## Bug Details

### Fault Condition

The bug manifests when the `getFinanceDashboardSummary` function queries the database for financial data. The function is missing `termId` filters in two critical queries, causing it to aggregate data across all terms instead of just the current term.

**Formal Specification:**

```
FUNCTION isBugCondition(query)
  INPUT: query of type DatabaseQuery
  OUTPUT: boolean

  RETURN (query.model == 'StudentAccount' OR query.model == 'Payment')
         AND query.where.schoolId IS SET
         AND query.where.termId IS NOT SET
         AND currentTermId IS DEFINED
END FUNCTION
```

### Examples

- **StudentAccount Query (Line 14)**: `prisma.studentAccount.findMany({ where: { schoolId } })` retrieves accounts for ALL terms, not just the current term. If a student has accounts for Term 1 (balance: 5000) and Term 2 (balance: 3000), both are included in calculations.

- **Payment Query (Line 24)**: `prisma.payment.findMany({ where: { schoolId, status: 'CONFIRMED' } })` retrieves payments for ALL terms. If payments were made in Term 1 but we're viewing Term 2 data, Term 1 payments are incorrectly included.

- **Aggregation Impact**: When calculating `totalCollected`, the function sums `totalPaid` from all StudentAccount records across all terms, resulting in inflated or incorrect totals.

- **Edge Case**: When viewing a new term with no payments yet, the function may show payments from previous terms, making it appear that the current term has collections when it doesn't.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Student filtering by schoolId and status must continue to work correctly
- Fee structure lookup by classId and termId must remain unchanged
- Sorting of unpaid students by balance (highest first) and limiting to top 50 must remain unchanged
- Graceful handling when no payments exist for a term (returning zero values without errors)
- Graceful handling when current term cannot be determined (returning empty data structure)

**Scope:**
All query logic that does NOT involve StudentAccount or Payment aggregation should be completely unaffected by this fix. This includes:

- Term lookup logic (lines 3-8)
- Student relationship includes (class, stream)
- Payment relationship includes (student, receipt)
- Calculation formulas (collectionRate, balance sorting)
- Response mapping and formatting

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing termId Filter in StudentAccount Query**: Line 14 queries `prisma.studentAccount.findMany({ where: { schoolId } })` without including `termId` in the where clause, even though `currentTermId` is determined on lines 3-8.

2. **Missing termId Filter in Payment Query**: Line 24 queries `prisma.payment.findMany({ where: { schoolId, status: 'CONFIRMED' } })` without including `termId`, causing recent payments from all terms to be retrieved.

3. **Schema Design Supports Fix**: Both `StudentAccount` and `Payment` models have `termId` fields with proper indexes, so adding the filter is straightforward and won't impact performance.

4. **Scope Confusion**: The function determines `currentTermId` but only uses it implicitly through the term lookup logic, not explicitly in the financial data queries.

## Correctness Properties

Property 1: Fault Condition - Term-Scoped Financial Data

_For any_ query where financial data is being retrieved (StudentAccount or Payment) and a termId is available, the fixed function SHALL include termId in the where clause to ensure only data for the specified term is retrieved and aggregated in the financial summary.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Financial Query Behavior

_For any_ query that does NOT involve StudentAccount or Payment aggregation (term lookup, relationship includes, sorting logic, error handling), the fixed function SHALL produce exactly the same behavior as the original function, preserving all existing functionality for non-financial queries.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/services/finance.service.ts`

**Function**: `getFinanceDashboardSummary`

**Specific Changes**:

1. **Add termId Filter to StudentAccount Query (Line 14)**:
   - Change: `where: { schoolId }`
   - To: `where: { schoolId, termId: currentTermId }`
   - Rationale: Ensures only student accounts for the current term are retrieved

2. **Add termId Filter to Payment Query (Line 24)**:
   - Change: `where: { schoolId, status: 'CONFIRMED' }`
   - To: `where: { schoolId, termId: currentTermId, status: 'CONFIRMED' }`
   - Rationale: Ensures only payments for the current term are included in recent payments list

3. **Handle Undefined termId Gracefully**:
   - If `currentTermId` is undefined (no current term found), the queries should return empty results
   - This preserves the existing behavior documented in requirement 3.5

4. **No Changes to Aggregation Logic**:
   - The reduce operations (lines 16-21) remain unchanged
   - The filtering logic (paidStudents, partialStudents, unpaidStudents) remains unchanged
   - The sorting and slicing logic (line 26) remains unchanged

5. **No Changes to Response Mapping**:
   - The response structure and field mapping (lines 28-48) remain unchanged

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Create test data with multiple terms and payments, then call `getFinanceDashboardSummary` on the UNFIXED code to observe incorrect aggregation across terms.

**Test Cases**:

1. **Multi-Term Student Account Test**: Create a student with accounts in Term 1 (totalPaid: 5000) and Term 2 (totalPaid: 3000), query for Term 2, expect totalCollected to incorrectly show 8000 instead of 3000 (will fail on unfixed code)

2. **Cross-Term Payment Test**: Create payments in Term 1, query for Term 2, expect recentPayments to incorrectly include Term 1 payments (will fail on unfixed code)

3. **Zero Payment Term Test**: Create a new term with no payments, query for that term, expect totalCollected to incorrectly show payments from previous terms (will fail on unfixed code)

4. **Collection Rate Calculation Test**: With multi-term data, expect collectionRate to be incorrectly calculated using cross-term aggregation (will fail on unfixed code)

**Expected Counterexamples**:

- Financial totals include data from multiple terms instead of just the queried term
- Possible causes: missing termId filter in StudentAccount query, missing termId filter in Payment query

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**

```
FOR ALL query WHERE isBugCondition(query) DO
  result := getFinanceDashboardSummary_fixed(schoolId, termId)
  ASSERT result.totalCollected == sumOfPaymentsForTermOnly(termId)
  ASSERT result.totalExpected == sumOfFeesForTermOnly(termId)
  ASSERT result.recentPayments.all(p => p.termId == termId)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**

```
FOR ALL query WHERE NOT isBugCondition(query) DO
  ASSERT getFinanceDashboardSummary_original(schoolId, termId) =
         getFinanceDashboardSummary_fixed(schoolId, termId)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:

- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for term lookup, relationship includes, sorting, and error handling, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Term Lookup Preservation**: Observe that term lookup by date range works correctly on unfixed code, then verify this continues after fix
2. **Relationship Include Preservation**: Observe that student.class and student.stream are correctly included on unfixed code, then verify this continues after fix
3. **Sorting Preservation**: Observe that topDefaulters are sorted by balance (highest first) on unfixed code, then verify this continues after fix
4. **Error Handling Preservation**: Observe that undefined termId returns empty data gracefully on unfixed code, then verify this continues after fix

### Unit Tests

- Test StudentAccount query with termId filter returns only accounts for specified term
- Test Payment query with termId filter returns only payments for specified term
- Test aggregation calculations with single-term data produce correct totals
- Test edge case where termId is undefined returns empty results gracefully

### Property-Based Tests

- Generate random multi-term financial data and verify queries only return data for specified term
- Generate random payment configurations and verify preservation of relationship includes
- Test that all aggregation formulas produce consistent results across many scenarios

### Integration Tests

- Test full dashboard flow with multi-term data and verify correct term-scoped display
- Test switching between terms and verify financial data updates correctly
- Test that visual feedback shows correct totals for each term independently
