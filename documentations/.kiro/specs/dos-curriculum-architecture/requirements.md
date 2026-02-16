# DoS Module - New Curriculum Architecture Requirements

## 1. PURPOSE OF THE DoS MODULE

The Director of Studies module exists to guarantee academic integrity, curriculum compliance, and fair reporting under the new curriculum. It manages the complete academic truth of a learner, not just exams or marks.

## 2. CORE SYSTEM LOGIC

The system operates on 3 academic data streams:
- **Continuous Assessment (20%)**
- **End-of-Term / End-of-Year Exams (80%)**
- **Curriculum & Timetable Structure**

All DoS operations are a controlled merge of these three streams. No stream can exist independently.

## 3. USER ROLES & PERMISSIONS

### Director of Studies (Main Role)
**Responsibilities:**
- Approves curriculum structure per class
- Approves assessment plans
- Monitors teacher assessment behavior
- Validates exam results
- Controls weighting rules (80/20 split)
- Approves and locks report cards
- Oversees promotion decisions
- Owns timetable approval

**Power Level:** High but not absolute

### Subject Teachers (Connected Role)
- Enter continuous assessments
- Set and mark exams (where allowed)
- Upload assessment evidence
- Cannot finalize reports
- Cannot alter weighting

### Class Teachers (Connected Role)
- View learner academic summaries
- Add remarks
- Cannot change marks

### Head Teacher / Admin (Observer + Override)
- Views reports
- Can override promotions with justification
- Cannot edit raw assessments

## 4. FUNCTIONAL REQUIREMENTS

### 4.1 Continuous Assessment System (20%)
- Multiple assessments per term per subject
- Assessment types: test, assignment, project, practical
- Each assessment has: type, date, maximum score, contribution weight
- System enforces 20% maximum total
- Missing assessments flagged
- DoS can lock CA entry at deadline

### 4.2 Exam System (80%)
- Exams created per subject, per class
- Marks entry/import capability
- Optional moderation
- 80% contribution to final score
- DoS lock prevents post-verification edits
- Late entries logged

### 4.3 Final Score Merge Logic
**For each student, per subject:**
- CA total → scaled to 20%
- Exam mark → scaled to 80%
- System calculates: final numeric score, grade, descriptor
- Fully automated once locked
- DoS can detect anomalies and block suspicious results

### 4.4 Report Card Generation
**Contains:**
- Student bio details
- Subject-by-subject breakdown (CA 20%, Exam 80%, Final score, Grade)
- Teacher remarks
- Class teacher remark
- DoS academic comment
- Promotion recommendation
- Term attendance summary

**Rules:**
- Generated only if CA + Exam present + DoS approval
- No partial reports
- PDF format with school branding
- Watermark until official release
- Read-only once released

### 4.5 Timetable Generation
**Inputs:**
- Subjects per class
- Periods per week
- Teachers assigned
- Room availability
- Subject constraints

**Outputs:**
- Class, teacher, and room timetables
- DoS approval required
- Change logging

### 4.6 Promotion & Transition Logic
**Evaluates:**
- Final subject scores
- Core subject pass rules
- Minimum subject count passed

**Provides:**
- Promotion/retake/repeat recommendations
- DoS override with justification
- Lock promotion decisions

## 5. TECHNICAL REQUIREMENTS

### 5.1 Data Models
- Assessment records with proper weighting
- Exam management with moderation support
- Score calculation engine
- Report generation system
- Timetable management
- Promotion logic engine

### 5.2 Security & Access Control
- Role-based permissions
- Audit trails for all changes
- Lock mechanisms for finalized data
- Override justification requirements

### 5.3 Integration Points
- Student management system
- Teacher management
- School administration
- Parent/guardian portals

## 6. SUCCESS CRITERIA

The DoS module will be considered successful when:
- Academic integrity is maintained through proper controls
- Curriculum compliance is enforced automatically
- Report generation is accurate and tamper-proof
- Timetable management is efficient and conflict-free
- Promotion decisions are data-driven and auditable
- The system becomes curriculum-aware and DoS-respected