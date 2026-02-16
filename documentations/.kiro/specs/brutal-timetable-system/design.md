# Brutal Timetable System - Design

## System Architecture

### Layer 1: Configuration Layer

**Purpose**: Prevent 90% of failures before generation starts

#### Components:

1. **School Time Structure Manager**
   - Global time settings (start/end, periods, breaks)
   - Change triggers complete regeneration
   - DoS-only configuration

2. **Subject Period Requirements Manager**
   - Per-subject period counts
   - New curriculum compliance flags
   - Practical vs theory requirements
   - Project block requirements

3. **Teacher Constraint Manager**
   - Subject eligibility matrix
   - Workload limits (daily/weekly)
   - Availability windows
   - Multi-class capability flags

4. **Room Constraint Manager**
   - Lab requirements per subject
   - Capacity limits
   - Shared room scheduling
   - Equipment availability

### Layer 2: Constraint Engine (The Brain)

**Purpose**: Intelligent constraint solving, not random placement

#### Hard Constraints (Never Break):

- Teacher cannot be in two places at once
- Class cannot have two subjects simultaneously
- Room cannot host two classes at once
- Subject period count must be met exactly
- Teacher must be qualified for subject

#### Soft Constraints (Optimize):

- Spread subjects evenly across week
- Avoid same subject twice in row
- Balance teacher workload
- Prefer morning for heavy subjects
- Optimize room utilization

#### Scoring Algorithm:

```
Quality Score = (Hard Constraints Met * 100) +
                (Soft Constraint Score * Weight)

Where:
- Hard Constraints Met = 0 or 1 (binary)
- Soft Constraint Score = 0-100 per constraint
- Weight = Configuration-based weighting
```

### Layer 3: Generation Engine

**Purpose**: Real constraint solving, not manual dragging

#### Algorithm Flow:

1. Load all constraints and requirements
2. Generate required slot list
3. Use constraint satisfaction algorithm:
   - Backtracking with forward checking
   - Constraint propagation
   - Heuristic ordering (most constrained first)
4. Score each complete solution
5. Return best scoring solution as Draft v1

#### Generation Settings:

- Max attempts (default: 1000)
- Max time (default: 30 seconds)
- Min acceptable quality (default: 70%)
- Target quality (default: 85%)

### Layer 4: Conflict Intelligence

**Purpose**: Visual screaming when problems exist

#### Conflict Types:

- **TEACHER_CLASH**: Teacher in multiple places
- **ROOM_CLASH**: Room double-booked
- **MISSING_PERIODS**: Subject under-scheduled
- **TEACHER_OVERLOAD**: Teacher over daily/weekly limits
- **CONSTRAINT_VIOLATION**: Soft constraint broken

#### Conflict Resolution:

- Automatic suggestion generation
- Impact scoring (1-10 scale)
- Multiple resolution options
- DoS confirmation required

#### Resolution Actions:

- Move lesson to different time
- Swap lessons between slots
- Change teacher assignment
- Change room assignment
- Split double periods

### Layer 5: Approval Workflow

**Purpose**: Document control, not screen control

#### States:

- **DRAFT**: Editable, conflicts allowed
- **REVIEWED**: DoS has reviewed, ready for approval
- **APPROVED**: Locked, no conflicts, ready to publish
- **PUBLISHED**: Live, notifications sent, read-only
- **ARCHIVED**: Historical record, comparison purposes

#### Transitions:

- Only DoS can: Draft → Reviewed → Approved → Published
- Only DoS can: Published → Approved (unpublish)
- System can: Any → Archived (term rollover)

### Layer 6: Versioning System

**Purpose**: Complete audit trail and history

#### Version Record:

```typescript
interface TimetableVersion {
  id: string;
  version: number;
  status: TimetableStatus;
  changedBy: string;
  changeReason: string;
  changesFrom: string; // Previous version ID
  changesSummary: {
    slotsAdded: number;
    slotsRemoved: number;
    slotsModified: number;
    conflictsResolved: number;
  };
  qualityScore: number;
  createdAt: Date;
}
```

#### Version Operations:

- Compare versions side-by-side
- Rollback to previous version
- Export version history
- Audit trail for ministry inspections

## Database Schema Extensions

### New Tables Required:

1. **timetable_configurations** - DoS configuration settings
2. **subject_period_requirements** - New curriculum requirements
3. **teacher_subject_eligibility** - Who can teach what
4. **room_constraints** - Lab and capacity requirements
5. **timetable_versions** - Complete version history
6. **conflict_resolutions** - Resolution suggestions and outcomes
7. **timetable_publications** - Publication audit log

### Enhanced Tables:

1. **timetable_conflicts** - Add resolution suggestions
2. **timetable_slots** - Add constraint validation flags
3. **timetable_analytics** - Add quality metrics

## API Design

### Configuration APIs:

- `POST /api/dos/timetable/config/time-structure`
- `POST /api/dos/timetable/config/subject-requirements`
- `POST /api/dos/timetable/config/teacher-constraints`
- `POST /api/dos/timetable/config/room-constraints`

### Generation APIs:

- `POST /api/dos/timetable/generate` - Start generation
- `GET /api/dos/timetable/generate/status` - Check progress
- `POST /api/dos/timetable/regenerate` - Regenerate from existing

### Management APIs:

- `POST /api/dos/timetable/{id}/approve`
- `POST /api/dos/timetable/{id}/publish`
- `POST /api/dos/timetable/{id}/unpublish`
- `GET /api/dos/timetable/{id}/versions`
- `POST /api/dos/timetable/{id}/rollback`

### Conflict APIs:

- `GET /api/dos/timetable/{id}/conflicts`
- `POST /api/dos/timetable/{id}/conflicts/resolve`
- `POST /api/dos/timetable/{id}/conflicts/auto-resolve`

### Access Control APIs:

- `GET /api/teacher/timetable` - Teacher's personal timetable
- `GET /api/class/{id}/timetable` - Class timetable
- `GET /api/timetable/{id}/download` - Secure download links

## UI Component Architecture

### DoS Control Center:

1. **Configuration Dashboard** - All constraint setup
2. **Generation Interface** - Start/monitor generation
3. **Conflict Resolution Panel** - Visual conflict management
4. **Approval Workflow** - Review and approve timetables
5. **Analytics Dashboard** - Quality metrics and insights
6. **Version History** - Compare and rollback versions

### Consumption Interfaces:

1. **Teacher View** - Personal timetable only
2. **Class View** - Class-specific timetable
3. **Print/Export** - PDF generation with secure links
4. **Mobile View** - Responsive timetable display

## Integration Points

### Attendance System:

- Timetable provides lesson schedule
- Attendance records link to timetable slots
- Absence detection uses timetable data

### Assessment System:

- Continuous assessment uses teacher-class assignments
- Exam scheduling uses timetable constraints
- Report cards use subject-teacher linkages

### Communication System:

- Timetable changes trigger notifications
- Teacher workload alerts use timetable data
- Parent notifications include timetable links

## Quality Assurance

### Validation Rules:

- All hard constraints must pass
- Minimum quality score must be met
- No critical conflicts allowed in approved state
- Version history must be complete

### Testing Strategy:

- Constraint solver unit tests
- Conflict detection integration tests
- Load testing with real school data
- User acceptance testing with DoS users

### Performance Requirements:

- Generation: < 30 seconds for typical school
- Conflict detection: < 2 seconds
- Version comparison: < 5 seconds
- PDF generation: < 10 seconds

## Failure Handling

### Generation Failures:

- Insufficient teachers for subjects
- Over-constrained requirements
- Impossible constraint combinations
- Timeout during generation

### Runtime Failures:

- Teacher resignation mid-term
- Room unavailability
- Subject removal
- Class size changes

### Recovery Procedures:

- Emergency regeneration mode
- Partial timetable approval
- Temporary constraint relaxation
- Manual override capabilities (DoS only)

This design ensures the timetable system is infrastructure, not a toy.
