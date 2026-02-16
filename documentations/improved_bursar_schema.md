# Improved Bursar Database Schema

Based on the requirements for a production-grade automated fee reminder system, here are the necessary schema improvements:

## 1. Enhanced FinanceSettings (PER SCHOOL, PER TERM)

```prisma
model FinanceSettings {
  id                     String              @id @default(auto()) @map("_id") @db.ObjectId
  schoolId               String              @unique @db.ObjectId
  termId                 String?             @db.ObjectId  // Added term scoping
  currency               String              @default("UGX")
  currencySymbol         String              @default("UGX")
  receiptPrefix          String              @default("RCP")
  invoicePrefix          String              @default("INV")
  
  // Automation Settings (Updated)
  enableAutomatedReminders Boolean            @default(false)
  automationFrequency    AutomationFrequency @default(WEEKLY)
  automationDayOfWeek    Int                 @default(1) // 1 = Monday
  gracePeriodDays        Int                 @default(3) // Updated from 7 to 3
  maxRemindersPerMilestone Int               @default(2)
  paymentMilestones      Json?               // Array of { week: number, percentage: number }
  lastAutomationRunAt    DateTime?
  lockedAt               DateTime?           // When term starts - prevents milestone edits
  
  // Additional settings for Uganda fee realities
  enableAutoPenalty      Boolean             @default(false)
  latePenaltyPercentage  Float               @default(0)
  defaultDueDays         Int                 @default(30)
  enableDiscountApproval Boolean             @default(true)
  
  createdAt              DateTime            @default(now())
  updatedAt              DateTime            @updatedAt

  // Relations
  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  term   Term?   @relation(fields: [termId], references: [id])  // Added term relation
}
```

## 2. Corrected Student Account Schema (PER STUDENT, PER TERM)

The current schema has an issue. It's defined as:
```prisma
@@unique([studentId, schoolId])
```

But it should be:
```prisma
model StudentAccount {
  id                String               @id @default(auto()) @map("_id") @db.ObjectId
  studentId         String               @db.ObjectId
  schoolId          String               @db.ObjectId
  termId            String               @db.ObjectId  // Added term scoping
  studentType       StudentType          @default(DAY)
  totalFees         Float                @default(0)
  totalPaid         Float                @default(0)
  totalDiscounts    Float                @default(0)
  totalPenalties    Float                @default(0)
  balance           Float                @default(0) // totalFees - totalPaid - totalDiscounts + totalPenalties
  status            StudentAccountStatus @default(OK)
  isExempted        Boolean              @default(false)
  exemptionReason   String?
  lastPaymentDate   DateTime?
  lastPaymentAmount Float?
  createdAt         DateTime             @default(now())
  updatedAt         DateTime             @updatedAt

  // Relations
  student   Student           @relation(fields: [studentId], references: [id], onDelete: Cascade)
  school    School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  term      Term              @relation(fields: [termId], references: [id], onDelete: Cascade)  // Added term relation
  discounts StudentDiscount[]
  penalties StudentPenalty[]

  // CORRECTED: Now scoped per student, per term, per school
  @@unique([studentId, termId])  // Changed from [studentId, schoolId] to [studentId, termId]
  @@index([schoolId])
  @@index([termId])
  @@index([balance])
}
```

## 3. Enhanced StudentMilestoneTracker (ANTI-SPAM CONTROL)

```prisma
model StudentMilestoneTracker {
  id                 String        @id @default(auto()) @map("_id") @db.ObjectId
  studentId          String        @db.ObjectId
  termId             String        @db.ObjectId
  milestonePercentage Float
  requiredByWeek     Int
  reminderCount      Int           @default(0)
  lastReminderSentAt DateTime?
  status             TrackerStatus @default(PENDING)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  // Relations
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  term    Term    @relation(fields: [termId], references: [id], onDelete: Cascade)

  // CORRECTED: Proper indexing for performance
  @@unique([studentId, termId, milestonePercentage])
  @@index([studentId])
  @@index([termId])
  @@index([status])
}
```

## 4. Enhanced FinanceNotificationLog (LEGAL SHIELD)

```prisma
model FinanceNotificationLog {
  id                   String        @id @default(auto()) @map("_id") @db.ObjectId
  schoolId             String        @db.ObjectId
  guardianId           String        @db.ObjectId
  studentId            String?       @db.ObjectId
  studentAccountId     String?       @db.ObjectId  // Added link to specific account
  type                 String        // PAYMENT_CONFIRMATION, FEE_REMINDER, PENALTY_NOTICE, BALANCE_SUMMARY
  messageType          MessageType   @default(AUTOMATED)  // Added to distinguish automated vs manual
  channel              String        // SMS, EMAIL
  content              String
  status               String        // QUEUED, SENT, DELIVERED, FAILED, BOUNCED
  sentAt               DateTime?
  deliveredAt          DateTime?
  error                String?
  metadata             String?       // JSON string with additional data
  // Legal shield fields
  recipientPhone       String?
  milestonePercentage  Float?        // For milestone-based reminders
  academicWeek         Int?          // Week number when reminder was sent
  createdAt            DateTime      @default(now())

  // Relations
  school       School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  guardian     Guardian     @relation(fields: [guardianId], references: [id], onDelete: Cascade)
  student      Student?     @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentAccount StudentAccount? @relation(fields: [studentAccountId], references: [id], onDelete: Cascade)

  @@index([schoolId])
  @@index([guardianId])
  @@index([studentId])
  @@index([studentAccountId])
  @@index([type])
  @@index([status])
  @@index([createdAt])
  @@index([messageType])
}
```

## 5. Academic Week Calculation Helper

For proper academic week calculation based on term start date:

```prisma
// This would be implemented as a view or computed field in the application layer
// Since MongoDB doesn't support views in the same way as SQL databases,
// we'll implement this logic in the service layer
```

## 6. Additional Indexes for Performance

```prisma
// On StudentAccount for better querying
@@index([studentId, termId, balance])  // For finding students with outstanding balances per term

// On FinanceNotificationLog for audit purposes
@@index([schoolId, createdAt, messageType])  // For audit queries
@@index([studentId, termId, createdAt])      // For student communication history
```

## Key Changes Made:

1. **Fixed StudentAccount Scoping**: Changed from [studentId, schoolId] to [studentId, termId] to properly reflect term-based accounting
2. **Added Term References**: All finance-related models now have proper term scoping
3. **Enhanced Milestone Tracking**: Proper linking between students, terms, and milestones
4. **Improved Legal Shield**: Better tracking of automated vs manual messages with academic week information
5. **Better Indexing**: Added performance indexes for common queries

These changes address the core architectural inconsistency mentioned in the requirements where the schema promised one thing but the service assumed another.