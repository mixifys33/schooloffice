# Credit Balance System - Complete Implementation

## Overview

A comprehensive credit balance management system for handling student overpayments, tracking credits across terms, and processing refunds.

## Database Schema Changes

### 1. Student Model

- Added `creditBalance` field (Float, default: 0) to track overpayments

### 2. New Models Created

#### CreditTransaction

Tracks all credit balance movements:

- `amount`: Positive for credit added, negative for credit used
- `type`: OVERPAYMENT, REFUND, APPLIED_TO_INVOICE, ADJUSTMENT
- `description`: Human-readable description
- Links to payment, invoice, or refund
- Tracks `balanceBefore` and `balanceAfter`

#### RefundRequest

Manages refund workflow:

- `status`: PENDING, APPROVED, REJECTED, PROCESSED
- Tracks requester, reviewer, and processor
- Records payment method and reference for processed refunds
- Includes reason and review notes

## API Endpoints

### 1. `/api/bursar/credits` (GET)

- Lists all students with credit balances > 0
- Returns recent transactions for each student
- Provides summary statistics

### 2. `/api/bursar/refunds` (GET, POST)

- GET: List refund requests (filterable by status)
- POST: Create new refund request

### 3. `/api/bursar/refunds/[id]/process` (POST)

- Approve or reject refund requests
- For approvals: deducts from credit balance, records transaction
- Requires payment method and reference for approvals

### 4. `/api/bursar/payments/record` (Enhanced)

- Detects overpayments automatically
- Adds overpayment to student credit balance
- Creates credit transaction record
- Includes overpayment info in response

## Frontend Pages

### 1. Credit Balances Page (`/dashboard/bursar/credits`)

Features:

- Summary stats (total students with credits, total amount)
- Table of all students with credit balances
- Recent transactions for each student
- Quick link to request refund

### 2. Refund Requests Page (`/dashboard/bursar/refunds`)

Features:

- Filter by status (All, Pending, Processed, Rejected)
- Process refunds with approval workflow
- Record payment method and reference
- Add review notes

### 3. Enhanced Payment Recording

- Automatic overpayment detection
- Alert shown to bursar when overpayment occurs
- Credit automatically added to student balance

## Navigation

Added to Bursar sidebar:

- Credit Balances
- Refund Requests

## Workflow

### Overpayment Scenario:

1. Bursar records payment exceeding balance
2. System detects overpayment
3. Excess amount added to student `creditBalance`
4. Credit transaction created (type: OVERPAYMENT)
5. Alert shown to bursar
6. Payment notes include overpayment info

### Refund Scenario:

1. Bursar creates refund request from Credits page
2. Request status: PENDING
3. Authorized person reviews request
4. If approved:
   - Deducts from student credit balance
   - Creates credit transaction (type: REFUND)
   - Records payment method and reference
   - Status: PROCESSED
5. If rejected:
   - Status: REJECTED
   - Review notes recorded

### Future Term Application:

When creating invoice for next term:

1. Check student credit balance
2. If credit > 0, apply to new invoice
3. Create credit transaction (type: APPLIED_TO_INVOICE)
4. Reduce credit balance accordingly

## Security & Audit

- All credit transactions logged with creator
- Refund requests track requester, reviewer, processor
- Immutable audit trail
- Balance before/after tracked for every transaction

## Benefits

1. **Transparency**: Complete audit trail of all credit movements
2. **Automation**: Overpayments automatically detected and credited
3. **Control**: Approval workflow for refunds
4. **Reporting**: Easy to see all students with credits
5. **Accuracy**: Balance tracking prevents errors
6. **Flexibility**: Credits can be applied to future terms or refunded

## Testing Checklist

- [ ] Record payment with overpayment
- [ ] Verify credit balance updated
- [ ] View credit balances page
- [ ] Create refund request
- [ ] Approve refund request
- [ ] Reject refund request
- [ ] Verify credit deducted after refund
- [ ] Check all transactions recorded correctly

## Database Migration Required

Run: `npx prisma db push` to apply schema changes
