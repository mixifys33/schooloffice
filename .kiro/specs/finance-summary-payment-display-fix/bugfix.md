# Bugfix Requirements Document

## Introduction

The finance summary section in the admin dashboard displays incorrect payment data. Students have made payments that exist in the database, but the finance summary shows that no one has made payments (totalCollected = 0, collectionRate = 0%). This bug prevents administrators from seeing accurate financial information and makes it appear that no revenue has been collected when payments have actually been recorded.

The issue affects the financial overview displayed on the school admin dashboard, which is a critical component for monitoring school finances and outstanding balances.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the finance summary API queries student payments THEN the system fails to include the schoolId filter in the nested payments query

1.2 WHEN payments exist in the database for students THEN the system returns totalCollected = 0 and collectionRate = 0% in the finance summary

1.3 WHEN the admin views the financial overview dashboard THEN the system displays "No payments recorded" even though payment records exist

### Expected Behavior (Correct)

2.1 WHEN the finance summary API queries student payments THEN the system SHALL include schoolId in the payments filter to ensure only payments for the current school are retrieved

2.2 WHEN payments exist in the database for students THEN the system SHALL correctly calculate and return the actual totalCollected amount and accurate collectionRate percentage

2.3 WHEN the admin views the financial overview dashboard THEN the system SHALL display the correct payment totals, collection rates, and outstanding balances based on actual payment data

### Unchanged Behavior (Regression Prevention)

3.1 WHEN querying students by schoolId and status THEN the system SHALL CONTINUE TO filter students correctly by school

3.2 WHEN calculating expected fees from fee structures THEN the system SHALL CONTINUE TO use the correct fee structure lookup by classId and termId

3.3 WHEN displaying unpaid students list THEN the system SHALL CONTINUE TO sort by balance (highest first) and limit to top 50 students

3.4 WHEN no payments exist for a term THEN the system SHALL CONTINUE TO return zero values gracefully without errors

3.5 WHEN the current term cannot be determined THEN the system SHALL CONTINUE TO return empty data structure with zero values
