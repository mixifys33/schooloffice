# Bursar Section: Design, Architecture, and Capabilities

## Overview
This document details the design, architecture, and current capabilities of the Bursar section of the application, along with a critical architectural inconsistency identified during the investigation.

## Frontend Design & Architecture
*   **Main Component:** `src/components/bursar/bursar-dashboard.tsx`
*   **Purpose:** Provides a comprehensive overview of financial metrics for the school.
*   **Features:**
    *   Displays key financial data (revenue, expenses, collection rates, outstanding fees).
    *   Visualizes data using charts for better understanding.
    *   Includes placeholders for quick actions such as recording payments and generating invoices.
*   **Data Source:** Fetches financial metrics from the backend API endpoint `/api/bursar/metrics`.

## Backend Design & Architecture
*   **API Root:** `src/app/api/bursar/`
*   **Dashboard Metrics Endpoint:** `GET /api/bursar/dashboard` (implemented in `src/app/api/bursar/dashboard/route.ts`)
*   **Data Flow:** The `GET /api/bursar/dashboard` endpoint orchestrates calls to two primary services to aggregate the necessary financial data:

    1.  **`BursarService` (`src/services/bursar.service.ts`)**
        *   **Role:** Provides high-level, school-wide financial metrics.
        *   **Functionality:** Calculates total revenue, expenses, collection rates, and financial alerts.
        *   **Data Sources:** Directly queries and aggregates data from the `Payment`, `Invoice`, `Expense`, and `BudgetCategory` models as defined in `prisma/schema.prisma`. This service offers a 'macro' view of the school's finances.

    2.  **`StudentAccountService` (`src/services/student-account.service.ts`)**
        *   **Role:** Provides student-centric financial summaries.
        *   **Functionality:** Aggregates data from `StudentAccount` records to calculate totals for fees, payments, and outstanding balances. This service offers a 'micro' or per-student financial view.

## Current Capabilities
*   **Comprehensive Financial Overview:** Presents a holistic view of the school's financial health through aggregated metrics.
*   **Data Visualization:** Enhances data comprehension with chart-based representations of financial information.
*   **Core Financial Operations:** Supports (or has placeholders for) essential actions like recording payments and generating invoices.
*   **Dual-Perspective Metrics:** Offers both school-wide aggregated financial data and individual student account summaries.

## Critical Architectural Inconsistency
A significant discrepancy has been identified between the `StudentAccount` model as defined in `prisma/schema.prisma` and its operational usage within `src/services/student-account.service.ts`.

*   **`prisma/schema.prisma` Definition:** The `StudentAccount` model in the schema implies uniqueness per student *per school* (keyed by `studentId` and `schoolId`).
*   **`StudentAccountService` Usage:** The service code in `src/services/student-account.service.ts` assumes a `StudentAccount` is unique per student *per term* (using a `studentId_termId` key).

**Impact:** This inconsistency suggests that the `prisma/schema.prisma` file is outdated and does not accurately reflect the current application logic being used in the `StudentAccountService`. The service-level code appears to implement the intended behavior, meaning the database schema needs to be updated to align with the application's operational model for student accounts. This misalignment could lead to data integrity issues or unexpected behavior if not resolved.