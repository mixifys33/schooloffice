# Finance Summary StudentAccount Fix - Bugfix Design

## Overview

The finance summary API returns incorrect payment data (totalCollected = 0, collectionRate = 0%) when no current term is set. The bug occurs in the `getFinanceDashboardSummary` function in `src/services/finance.service.ts` at lines 832-870. When no current term exists, the function sets `currentTermId` to null/undefined (line 840), then queries StudentAccount records with `termId: null` (line 843), which returns no results. However, the StudentAccount table already contains accurate aggregated payment data in the `totalPaid` field that should be used regardless of term status.

The fix requires modifying the query logic to handle the case when no current term is set, allowing the function to aggregate financial data across all terms using the existing StudentAccount.totalPaid values.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when no current term is set (all terms have `isCurrent: false` or no terms match the date range)
