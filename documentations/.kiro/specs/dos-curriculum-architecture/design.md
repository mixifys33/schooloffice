# DoS Module - System Design

## 1. ARCHITECTURE OVERVIEW

The DoS module follows a three-stream architecture where all academic data flows through controlled merge points.

## 2. DATABASE SCHEMA DESIGN

### Core Academic Tables
- curriculum_subjects: Subject definitions per class
- assessment_plans: CA framework (20% allocation)
- continuous_assessments: Individual CA records
- exams: Exam definitions and management
- exam_results: Individual exam scores
- final_scores: Merged CA + Exam results
- report_cards: Generated academic reports
- timetables: Schedule management
- promotion_decisions: Academic progression records

### Key Relationships
- Students → Multiple Subjects → Multiple Assessments + Exams
- DoS Controls → All Academic Data Streams
- Teachers → Subject-specific Data Entry
- Reports → Read-only Academic Truth

## 3. COMPONENT ARCHITECTURE

### Frontend Components Structure
```
src/app/(back)/dashboard/dos/
├── layout.tsx                    # DoS dashboard layout
├── page.tsx                     # DoS overview dashboard
├── curriculum/
│   ├── subjects/page.tsx        # Subject management
│   └── timetable/page.tsx       # Timetable generation
├── assessments/
│   ├── continuous/page.tsx      # CA management
│   ├── exams/page.tsx          # Exam management
│   └── reports/page.tsx        # Assessment reports
├── reports/
│   ├── generation/page.tsx     # Report card creation
│   └── approval/page.tsx       # Report approval workflow
└── promotion/
    └── decisions/page.tsx      # Promotion management
```

### Service Layer Architecture
```
src/services/dos/
├── curriculum.service.ts        # Subject & timetable logic
├── assessment.service.ts        # CA management
├── exam.service.ts             # Exam management
├── score-calculation.service.ts # 20/80 merge logic
├── report-generation.service.ts # Report card creation
└── promotion.service.ts        # Academic progression
```

## 4. CORE BUSINESS LOGIC

### Score Calculation Engine
```typescript
interface ScoreCalculation {
  continuousAssessment: {
    totalScore: number;
    maxScore: number;
    percentage: number; // Always scales to 20%
  };
  examScore: {
    score: number;
    maxScore: number;
    percentage: number; // Always scales to 80%
  };
  finalScore: number; // Out of 100
  grade: string;
  descriptor: string;
}
```

### Assessment Workflow
1. DoS creates assessment plan (within 20% allocation)
2. Teachers enter individual assessments
3. System validates total doesn't exceed 20%
4. DoS reviews and locks CA totals
5. Exam scores entered and locked
6. System calculates final merged scores
7. DoS approves for report generation

## 5. SECURITY & PERMISSIONS

### Role-Based Access Control
- DoS: Full control over academic data
- Subject Teachers: Subject-specific entry only
- Class Teachers: Read access + remarks
- Admin: Override capabilities with audit trail

### Data Integrity Controls
- Lock mechanisms prevent post-approval changes
- Audit trails for all modifications
- Validation rules enforce business logic
- Override justifications required for exceptions

## 6. INTEGRATION POINTS

### Internal Systems
- Student Management: Academic records
- Teacher Management: Subject assignments
- School Administration: Reporting oversight
- Communication Hub: Parent notifications

### External Outputs
- PDF Report Cards: Official academic documents
- Promotion Lists: Academic progression data
- Timetables: Schedule distribution
- Assessment Analytics: Performance insights