# Database Architecture Overview

This document provides an overview of the core database models that power our comprehensive school management system. The architecture is designed to handle multi-tenant operations while maintaining data integrity and security.

## Core Academic Models

### Subject Management

Our subject model supports comprehensive academic program management across different education levels.

```prisma
model Subject {
  id             String     @id @default(auto()) @map("_id") @db.ObjectId
  schoolId       String     @db.ObjectId
  name           String     // Subject name (e.g., Mathematics, English)
  code           String     // Short identifier (e.g., MTH, ENG)
  educationLevel SchoolType // PRIMARY or SECONDARY
  isActive       Boolean    @default(true)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  // Comprehensive relationship management
  school                    School
  classSubjects             ClassSubject[]
  staffSubjects             StaffSubject[]
  assessmentRecords         AssessmentRecord[]
  scheduleEntries           ScheduleEntry[]
  curriculumMappings        CurriculumMapping[]
  performanceAnalytics      PerformanceAnalytic[]
  @@unique([schoolId, code])
  @@index([schoolId, isActive])
}
```
