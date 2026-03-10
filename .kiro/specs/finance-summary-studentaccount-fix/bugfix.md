# Bugfix Requirements Document

## Introduction

The finance summary API in the school admin dashboard displays incorrect payment data when no current term is set (all `isCurrent: false`). The API attempts to query Payment records filtered by `termId`, but when no current term exists, `termId` is null/undefined, causing the query to return no payments. However, the `StudentAccount` table already contains the correct aggregated payment data in the `totalPaid` field, which should be used instead.

This bug prevents administrators from seeing accurate financial information when terms are not properly configured or during transition periods between terms.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN no current term is set (all terms have `isCurrent: false`) THEN the `getFinanceDashboardSummary` function sets `currentTermId` to null/undefined

1.2 WHEN `getFinanceDashboardSummary` queries StudentAccount records with `termId: null/undefined` THEN the system returns empty or incorrect results

1.3 WHEN the school admin dashboard API (`/api/school-admin/dashboard`) calculates finance summary THEN the system correctly uses `StudentAccount.totalPaid` to aggregate payment data

### Expected Behavior (Correct)

2.1 WHEN no current term is set THEN the `getFinanceDashboardSummary` function SHALL query StudentAccount records without requiring a termId filter

2.2 WHEN calculating total collected payments THEN the system SHALL use `StudentAccount.totalPaid` field which contains the correct aggregated payment data

2.3 WHEN the finance summary is requested THEN the system SHALL return accurate `totalCollected` and `collectionRate` values based on StudentAccount data

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a current term is set THEN the system SHALL CONTINUE TO filter StudentAccount records by termId

3.2 WHEN calculating totalExpected THEN the system SHALL CONTINUE TO use `StudentAccount.totalFees`

3.3 WHEN calculating totalOutstanding THEN the system SHALL CONTINUE TO use `StudentAccount.balance`

3.4 WHEN calculating collectionRate THEN the system SHALL CONTINUE TO use the formula `(totalCollected / totalExpected) * 100`

## Bug Condition and Property Specification

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type FinanceSummaryRequest
  OUTPUT: boolean

  // Returns true when no current term is set
  RETURN X.currentTermId = null OR X.currentTermId = undefined
END FUNCTION
```

### Property: Fix Checking

```pascal
// Property: Fix Checking - Finance Summary Without Current Term
FOR ALL X WHERE isBugCondition(X) DO
  result ← getFinanceDashboardSummary'(X.schoolId, X.termId)
  ASSERT result.totalCollected = SUM(StudentAccount.totalPaid WHERE schoolId = X.schoolId)
  ASSERT result.collectionRate = (result.totalCollected / result.totalExpected) * 100
  ASSERT result.totalCollected > 0 WHEN StudentAccount records with totalPaid > 0 exist
END FOR
```

### Property: Preservation Checking

```pascal
// Property: Preservation Checking - Existing Behavior with Current Term
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT getFinanceDashboardSummary(X.schoolId, X.termId) = getFinanceDashboardSummary'(X.schoolId, X.termId)
END FOR
```

This ensures that when a current term IS set, the fixed code behaves identically to the original implementation.

### Key Definitions

- **F**: `getFinanceDashboardSummary` - The original function that fails when no current term is set
- **F'**: `getFinanceDashboardSummary'` - The fixed function that correctly uses StudentAccount.totalPaid regardless of term status
- **Counterexample**: School with StudentAccount records containing `totalPaid > 0` but no current term set (all `isCurrent: false`) returns `totalCollected = 0`
