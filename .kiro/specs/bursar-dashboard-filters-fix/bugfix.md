# Bugfix Requirements Document

## Introduction

The bursar dashboard at `/dashboard/bursar` displays a period filter dropdown with four options: "Current Term", "Current Month", "Last 30 Days", and "Current Year". While the filter UI is visible and the selected value is tracked in the frontend state, the filter does not actually filter the displayed financial data. The three API endpoints that provide dashboard data (`/api/bursar/dashboard/metrics`, `/api/bursar/dashboard/recent-payments`, and `/api/bursar/dashboard/top-defaulters`) receive the `period` parameter but do not use it to filter data by date ranges. Only the "Current Term" option works because it relies on `termId` filtering, while the other three options that require date-based filtering are non-functional.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user selects "Current Month" from the period filter dropdown THEN the system displays the same data as "Current Term" without applying any month-based date filtering

1.2 WHEN the user selects "Last 30 Days" from the period filter dropdown THEN the system displays the same data as "Current Term" without applying any 30-day date range filtering

1.3 WHEN the user selects "Current Year" from the period filter dropdown THEN the system displays the same data as "Current Term" without applying any year-based date filtering

1.4 WHEN the API endpoint `/api/bursar/dashboard/metrics` receives the `period` parameter THEN the system ignores the parameter and only filters by `termId`

1.5 WHEN the API endpoint `/api/bursar/dashboard/recent-payments` receives the `period` parameter THEN the system ignores the parameter and only filters by `termId`

1.6 WHEN the API endpoint `/api/bursar/dashboard/top-defaulters` receives the `period` parameter THEN the system ignores the parameter and only filters by `termId`

### Expected Behavior (Correct)

2.1 WHEN the user selects "Current Month" from the period filter dropdown THEN the system SHALL filter all financial data (revenue, expenses, payments, defaulters) to show only records from the current calendar month

2.2 WHEN the user selects "Last 30 Days" from the period filter dropdown THEN the system SHALL filter all financial data to show only records from the last 30 days from the current date

2.3 WHEN the user selects "Current Year" from the period filter dropdown THEN the system SHALL filter all financial data to show only records from the current calendar year

2.4 WHEN the API endpoint `/api/bursar/dashboard/metrics` receives `period=current-month` THEN the system SHALL apply date filtering to payments and expenses queries to include only records where the date falls within the current calendar month

2.5 WHEN the API endpoint `/api/bursar/dashboard/metrics` receives `period=last-30-days` THEN the system SHALL apply date filtering to payments and expenses queries to include only records where the date is within the last 30 days from today

2.6 WHEN the API endpoint `/api/bursar/dashboard/metrics` receives `period=current-year` THEN the system SHALL apply date filtering to payments and expenses queries to include only records where the date falls within the current calendar year

2.7 WHEN the API endpoint `/api/bursar/dashboard/recent-payments` receives a `period` parameter other than "current-term" THEN the system SHALL apply the corresponding date range filter to the payments query

2.8 WHEN the API endpoint `/api/bursar/dashboard/top-defaulters` receives a `period` parameter other than "current-term" THEN the system SHALL calculate outstanding balances based on payments and fee structures within the specified date range

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user selects "Current Term" from the period filter dropdown THEN the system SHALL CONTINUE TO filter data by the current term's `termId` as it currently does

3.2 WHEN the API endpoints receive `period=current-term` or no period parameter THEN the system SHALL CONTINUE TO use `termId`-based filtering as the default behavior

3.3 WHEN the user clicks the "Refresh" button THEN the system SHALL CONTINUE TO refetch dashboard data with the currently selected filter

3.4 WHEN the dashboard loads for the first time THEN the system SHALL CONTINUE TO default to "Current Term" as the selected period

3.5 WHEN the user changes the period filter THEN the system SHALL CONTINUE TO trigger a data refetch via the existing `useEffect` dependency on `selectedPeriod`

3.6 WHEN there is no active term configured THEN the system SHALL CONTINUE TO display the appropriate error message about academic setup requirements

3.7 WHEN API endpoints filter by `termId` THEN the system SHALL CONTINUE TO fall back to school-wide filtering if no records exist for that specific term
