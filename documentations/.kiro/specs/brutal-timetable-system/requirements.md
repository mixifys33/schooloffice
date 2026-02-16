# Brutal Timetable System - Requirements

## Purpose

Build a constraint-solving timetable system that puts the right teacher, in the right class, teaching the right subject, at the right time, without conflicts. Everything else is decoration.

## Authority Structure

- **DoS**: Absolute authority. Only DoS can edit, approve, publish
- **Others**: View-only consumption based on role
- **No teacher editing**: If teachers can edit, system is garbage

## Core Requirements

### 1. Configuration Layer (90% of failures prevented here)

- **School Time Structure**: Start/end times, periods per day, breaks, duration
- **Subject Period Requirements**: Periods per week, double periods, practical vs theory, new curriculum compliance
- **Teacher Constraints**: Subject eligibility, max periods, unavailable times, multiple class capability
- **Room Constraints**: Lab requirements, capacity, shared rooms, subject restrictions

### 2. Constraint Engine (The Brain)

- **Hard Constraints**: Never break - teacher clashes, room clashes, subject period counts, teacher qualifications
- **Soft Constraints**: Optimize - subject spread, teacher balance, morning preferences
- **Scoring System**: Every solution gets quality score, not just pass/fail

### 3. Generation Engine (Not Manual Dragging)

- Real constraint solver, not slot shuffling
- Multiple attempts with scoring
- Best solution selection
- Draft creation with version 1

### 4. Conflict Intelligence (Visual Screaming)

- Detect: Teacher clash, missing periods, room overuse, teacher overload
- Show: Conflict type, who affected, suggested fixes
- Resolve: Impact scoring, automatic suggestions, DoS confirmation required

### 5. Approval Workflow (Documents, Not Screens)

- States: Draft → Reviewed → Approved → Published → Archived
- Only DoS can approve/publish/unpublish
- Approval locks timetable, creates audit record

### 6. Versioning & History (Non-Negotiable)

- Every change creates new version
- Timestamp, author, reason for change
- Version comparison capability
- Audit trail for ministry inspections

### 7. Publishing & Access Control

- Role-based viewing: Teacher (own lessons), Class teacher (class view), Students (read-only)
- Publishing triggers notifications
- Secure, expirable download links

### 8. Integration Spine

- Connects to: Attendance, Exams, Continuous Assessment, Teacher workload, Report cards
- Timetable is the spine everything attaches to

### 9. Analytics & Insights

- Teacher load distribution
- Subject balance per class
- Room utilization
- Term comparisons
- DoS must be able to answer: "Who is overloaded?" "Which class is under-served?"

### 10. Failure Mode Handling

- Teacher resignation mid-term
- Emergency regeneration
- Partial class suspension
- Subject removal
- Term rollover

## Success Criteria

If the system cannot:

- Avoid teacher clashes
- Respect subject periods per week
- Respect new curriculum subject groupings
- Handle electives
- Be regenerated without destroying history

Then it's not a timetable system. It's a drawing tool.

## Technical Requirements

- Constraint solver algorithm (not manual dragging)
- Version control system
- Conflict detection with intelligence
- Role-based access control
- Audit logging
- PDF generation
- Secure link generation
- Real-time conflict validation
- Quality scoring system
