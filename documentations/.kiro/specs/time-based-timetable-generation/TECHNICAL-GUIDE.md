# Technical Guide: Time-Based Timetable System

**Version**: 1.0  
**Date**: 2026-02-13  
**Audience**: Developers, System Architects

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Core Services](#core-services)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Time Slot Calculation Algorithm](#time-slot-calculation-algorithm)
7. [Teacher Code Generation Algorithm](#teacher-code-generation-algorithm)
8. [Conflict Detection Logic](#conflict-detection-logic)
9. [Migration Strategy](#migration-strategy)
10. [Performance Considerations](#performance-considerations)

---

## Architecture Overview

The time-based timetable system follows a layered architecture:

```
┌─────────────────────────────────────────┐
│         Frontend (React/Next.js)        │
│  - Timetable Grid Component             │
│  - Configuration Panel                  │
│  - Migration Notice                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         API Layer (Next.js Routes)      │
│  - Configuration API                    │
│  - Timetable CRUD API                   │
│  - Teacher Code API                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Service Layer                   │
│  - Time Slot Calculator                 │
│  - Teacher Code Generator               │
│  - Conflict Detector                    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Data Layer (Prisma)             │
│  - TimetableConfiguration               │
│  - DoSTimetable                         │
│  - DoSTimetableEntry                    │
└─────────────────────────────────────────┘
```

## Database Schema

### TimetableConfiguration Model

Stores school-wide timetable rules.

```prisma
model TimetableConfiguration {
  id                     String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId               String   @unique @db.ObjectId
  startTime              String   // Format: "HH:MM" (24-hour)
  endTime                String   // Format: "HH:MM" (24-hour)
  periodDurationMinutes  Int      // Duration of each teaching period
  specialPeriods         Json     // Array of special periods
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  school School @relation(fields: [schoolId], references: [id], onDelete: Cascade)
}
```

**Special Periods JSON Structure**:

```typescript
interface SpecialPeriod {
  name: string; // e.g., "Break", "Lunch"
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  daysOfWeek: number[]; // 1=Monday, 2=Tuesday, ..., 7=Sunday
}
```

### DoSTimetable Model

Represents a timetable for a specific class and term.

```prisma
model DoSTimetable {
  id            String             @id @default(auto()) @map("_id") @db.ObjectId
  schoolId      String             @db.ObjectId
  classId       String             @db.ObjectId
  termId        String             @db.ObjectId
  timetableName String
  weekCount     Int                @default(1)
  status        DoSTimetableStatus @default(DRAFT)
  dosApproved   Boolean            @default(false)
  dosApprovedBy String?            @db.ObjectId
  dosApprovedAt DateTime?
  isLocked      Boolean            @default(false)
  isTimeBased   Boolean            @default(false) // NEW: true = time-based
  isArchived    Boolean            @default(false) // NEW: true = archived
  createdBy     String             @db.ObjectId
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  // Relations
  school  School              @relation(...)
  class   Class               @relation(...)
  term    Term                @relation(...)
  entries DoSTimetableEntry[]

  @@unique([schoolId, classId, termId])
  @@index([isTimeBased])
  @@index([isArchived])
}
```

### DoSTimetableEntry Model

Represents individual timetable slots.

```prisma
model DoSTimetableEntry {
  id                  String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId            String   @db.ObjectId
  timetableId         String   @db.ObjectId
  curriculumSubjectId String   @db.ObjectId
  teacherId           String   @db.ObjectId
  dayOfWeek           Int      // 1=Monday, 2=Tuesday, ..., 7=Sunday
  period              Int      // Legacy: Period number (1, 2, 3, ...)
  startTime           String?  // NEW: Format: "HH:MM"
  endTime             String?  // NEW: Format: "HH:MM"
  room                String?
  isDoubleLesson      Boolean  @default(false)
  isSpecialPeriod     Boolean  @default(false) // NEW: true for breaks/lunch
  specialPeriodName   String?  // NEW: e.g., "Break", "Lunch"
  notes               String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relations
  school           School              @relation(...)
  timetable        DoSTimetable        @relation(...)
  curriculumSubject DoSCurriculumSubject @relation(...)
  teacher          Staff               @relation(...)

  @@index([timetableId, startTime]) // NEW: Index for time-based queries
}
```

### Staff Model (Teacher Code Addition)

```prisma
model Staff {
  id          String  @id @default(auto()) @map("_id") @db.ObjectId
  teacherCode String? // NEW: Unique 5-character code (e.g., "JD001")
  // ... other fields

  @@index([teacherCode]) // NEW: Index for fast lookups
}
```

---

## Core Services

### 1. Time Slot Calculator Service

**File**: `src/services/timetable-time-slot.service.ts`

**Purpose**: Calculates time slots based on configuration.

**Key Functions**:

```typescript
// Calculate all time slots for a day
calculateTimeSlots(config: TimetableConfiguration): TimeSlot[]

// Parse time string to minutes since midnight
parseTime(timeStr: string): number

// Format minutes to time string
formatTime(minutes: number): string

// Format time range for display
formatTimeRange(startTime: string, endTime: string): string

// Convert to 12-hour format
format12Hour(timeStr: string): string
```

**Algorithm Details**:

1. **Parse Configuration**:
   - Convert startTime and endTime to minutes since midnight
   - Extract special periods from JSON

2. **Calculate Available Time**:

   ```typescript
   totalMinutes = endTime - startTime
   specialPeriodMinutes = sum(specialPeriod.duration for each special period)
   availableMinutes = totalMinutes - specialPeriodMinutes
   ```

3. **Calculate Number of Slots**:

   ```typescript
   numberOfSlots = Math.ceil(availableMinutes / periodDurationMinutes);
   ```

   - Uses `Math.ceil` to round up fractional periods (≥15 minutes becomes a full period)

4. **Generate Time Slots**:
   - Start from school start time
   - For each slot:
     - Check if a special period starts at current time
     - If yes, insert special period slot
     - If no, insert teaching slot with duration = periodDurationMinutes
     - Advance current time

5. **Validation**:
   - Ensure last slot ends at or before school end time
   - Ensure special periods don't overlap
   - Ensure special periods are within school hours

**Example**:

```typescript
// Input
config = {
  startTime: "08:00",
  endTime: "16:00",
  periodDurationMinutes: 40,
  specialPeriods: [
    {
      name: "Break",
      startTime: "10:30",
      endTime: "10:45",
      daysOfWeek: [1, 2, 3, 4, 5],
    },
  ],
};

// Output
slots = [
  { startTime: "08:00", endTime: "08:40", isSpecialPeriod: false },
  { startTime: "08:40", endTime: "09:20", isSpecialPeriod: false },
  { startTime: "09:20", endTime: "10:00", isSpecialPeriod: false },
  { startTime: "10:00", endTime: "10:30", isSpecialPeriod: false },
  {
    startTime: "10:30",
    endTime: "10:45",
    isSpecialPeriod: true,
    name: "Break",
  },
  { startTime: "10:45", endTime: "11:25", isSpecialPeriod: false },
  // ... more slots
];
```

---

### 2. Teacher Code Generator Service

**File**: `src/services/teacher-code-generator.service.ts`

**Purpose**: Generates unique 5-character codes for teachers.

**Key Functions**:

```typescript
// Generate code for a single teacher
generateTeacherCode(
  firstName: string,
  lastName: string,
  schoolId: string
): Promise<string>

// Generate codes for all teachers without codes
generateBulkTeacherCodes(schoolId: string): Promise<{
  generated: number,
  skipped: number,
  failed: number
}>
```

**Algorithm Details**:

1. **Extract Initials**:

   ```typescript
   firstInitial = firstName[0].toUpperCase();
   lastInitial = lastName[0].toUpperCase();
   initials = firstInitial + lastInitial;
   ```

2. **Generate Sequential Number**:
   - Start with 001
   - Query database for existing codes with same initials
   - Find highest number used
   - Increment by 1

3. **Check Uniqueness**:

   ```typescript
   code = initials + sequentialNumber.padStart(3, "0");
   exists = await prisma.staff.findFirst({
     where: { schoolId, teacherCode: code },
   });
   ```

4. **Handle Collisions**:
   - If code exists, increment number and retry
   - If all numbers (001-999) exhausted, use random generation
   - Random format: [A-Z]{2}[0-9]{3}

5. **Fallback Random Generation**:
   ```typescript
   randomCode =
     randomLetter() +
     randomLetter() +
     randomDigit() +
     randomDigit() +
     randomDigit();
   ```

**Example**:

```typescript
// Teacher: John Doe
// First teacher with initials JD
code = "JD001";

// Second teacher: Jane Davis
// Collision with JD001
code = "JD002";

// 1000th teacher with initials JD
// All JD001-JD999 used
code = "XY123"; // Random fallback
```

---

## API Endpoints

### Configuration API

**Base Path**: `/api/dos/timetable/config`

#### GET - Fetch Configuration

**Request**:

```http
GET /api/dos/timetable/config
Authorization: Bearer <session-token>
```

**Response**:

```json
{
  "id": "...",
  "schoolId": "...",
  "startTime": "08:00",
  "endTime": "16:00",
  "periodDurationMinutes": 40,
  "specialPeriods": [
    {
      "name": "Break",
      "startTime": "10:30",
      "endTime": "10:45",
      "daysOfWeek": [1, 2, 3, 4, 5]
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### POST - Save Configuration

**Request**:

```http
POST /api/dos/timetable/config
Content-Type: application/json

{
  "startTime": "08:00",
  "endTime": "16:00",
  "periodDurationMinutes": 40,
  "specialPeriods": [...]
}
```

**Validation**:

- startTime < endTime
- periodDurationMinutes >= 15
- Special periods within school hours
- No overlapping special periods

**Response**:

```json
{
  "message": "Configuration saved successfully",
  "config": { ... }
}
```

**Error Response** (400):

```json
{
  "error": "Validation failed",
  "details": "Start time must be before end time"
}
```

---

#### POST - Generate Time Slots Preview

**Base Path**: `/api/dos/timetable/config/generate-slots`

**Request**:

```http
POST /api/dos/timetable/config/generate-slots
Content-Type: application/json

{
  "startTime": "08:00",
  "endTime": "16:00",
  "periodDurationMinutes": 40,
  "specialPeriods": []
}
```

**Response**:

```json
{
  "slots": [
    {
      "startTime": "08:00",
      "endTime": "08:40",
      "isSpecialPeriod": false,
      "period": 1
    },
    {
      "startTime": "10:30",
      "endTime": "10:45",
      "isSpecialPeriod": true,
      "specialPeriodName": "Break"
    }
  ],
  "totalSlots": 12,
  "teachingSlots": 11,
  "specialPeriodSlots": 1
}
```

---

### Teacher Code API

#### POST - Bulk Generate Codes

**Base Path**: `/api/dos/teachers/generate-codes`

**Request**:

```http
POST /api/dos/teachers/generate-codes
Authorization: Bearer <session-token>
```

**Response**:

```json
{
  "message": "Teacher codes generated successfully",
  "generated": 45,
  "skipped": 5,
  "failed": 0
}
```

#### POST - Generate Single Teacher Code

**Base Path**: `/api/dos/teachers/[id]/generate-code`

**Request**:

```http
POST /api/dos/teachers/abc123/generate-code
Authorization: Bearer <session-token>
```

**Response**:

```json
{
  "message": "Teacher code generated successfully",
  "teacherId": "abc123",
  "teacherCode": "JD001"
}
```

---

### Timetable Entry API

#### POST - Add Entry

**Base Path**: `/api/dos/timetable/[id]/entries`

**Request**:

```http
POST /api/dos/timetable/abc123/entries
Content-Type: application/json

{
  "curriculumSubjectId": "...",
  "teacherId": "...",
  "dayOfWeek": 1,
  "period": 1,
  "startTime": "08:00",
  "endTime": "08:40",
  "room": "Room 101",
  "isDoubleLesson": false,
  "notes": "Optional notes"
}
```

**Conflict Detection**:

- Slot occupancy check
- Teacher double-booking check
- Room double-booking check
- Subject periodsPerWeek limit check

**Response** (Success):

```json
{
  "message": "Entry added successfully",
  "entry": { ... }
}
```

**Response** (Conflict - 409):

```json
{
  "error": "Conflicts detected",
  "conflicts": [
    "Slot already occupied by Mathematics (John Doe)",
    "Teacher is already teaching Science in P.6 at this time"
  ]
}
```

---

## Frontend Components

### 1. Timetable Grid Component

**File**: `src/app/(portals)/dos/timetable/page.tsx`

**Key Features**:

- Time-based period display
- Special period styling (yellow background)
- Subject code + teacher code format
- Hover tooltips with full details
- Sticky header for scrolling
- Mobile-responsive design

**State Management**:

```typescript
const [timetables, setTimetables] = useState<Timetable[]>([]);
const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(
  null,
);
const [config, setConfig] = useState<TimetableConfiguration | null>(null);
const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
```

**Grid Rendering Logic**:

```typescript
// Generate time slots from configuration
const slots = calculateTimeSlots(config)

// Render grid
<table>
  <thead>
    <tr>
      <th>Time</th>
      <th>Monday</th>
      <th>Tuesday</th>
      {/* ... other days */}
    </tr>
  </thead>
  <tbody>
    {slots.map((slot, index) => (
      <tr key={index} className={slot.isSpecialPeriod ? 'bg-yellow-50' : ''}>
        <td>{formatTimeRange(slot.startTime, slot.endTime)}</td>
        {[1, 2, 3, 4, 5].map(day => (
          <td key={day}>
            {renderSlotContent(day, slot)}
          </td>
        ))}
      </tr>
    ))}
  </tbody>
</table>
```

**Slot Content Rendering**:

```typescript
function renderSlotContent(dayOfWeek: number, slot: TimeSlot) {
  // Find entry for this day and time
  const entry = entries.find(e =>
    e.dayOfWeek === dayOfWeek &&
    e.startTime === slot.startTime
  )

  if (!entry) {
    // Empty slot - clickable to add entry
    return (
      <button onClick={() => handleAddEntry(dayOfWeek, slot)}>
        +
      </button>
    )
  }

  // Display subject code and teacher code
  return (
    <div className="relative group">
      <div className="text-sm font-medium">{entry.subjectCode}</div>
      <div className="text-xs text-gray-600">{entry.teacherCode}</div>

      {/* Tooltip on hover */}
      <div className="absolute hidden group-hover:block ...">
        <div>{entry.subjectName}</div>
        <div>{entry.teacherName}</div>
        <div>{entry.room}</div>
        <div>{entry.notes}</div>
      </div>
    </div>
  )
}
```

---

### 2. Configuration Panel Component

**File**: `src/components/dos/timetable-configuration-panel.tsx`

**Key Features**:

- Collapsible panel
- Time pickers for start/end times
- Period duration input
- Special periods management
- Time slots preview
- Save button with validation

**Component Structure**:

```typescript
export function TimetableConfigurationPanel() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [config, setConfig] = useState<ConfigFormData>({
    startTime: '08:00',
    endTime: '16:00',
    periodDurationMinutes: 40,
    specialPeriods: []
  })
  const [preview, setPreview] = useState<TimeSlot[]>([])

  // Auto-generate preview when config changes
  useEffect(() => {
    generatePreview()
  }, [config])

  return (
    <div className="border rounded-lg">
      <button onClick={() => setIsExpanded(!isExpanded)}>
        School Timetable Rules
      </button>

      {isExpanded && (
        <div className="p-4">
          {/* Configuration form */}
          {/* Preview display */}
          {/* Save button */}
        </div>
      )}
    </div>
  )
}
```

---

### 3. Migration Notice Component

**File**: `src/components/dos/timetable-migration-notice.tsx`

**Purpose**: Inform users about old period-based timetables and provide migration path.

**Component Structure**:

```typescript
export function TimetableMigrationNotice({
  oldTimetablesCount
}: {
  oldTimetablesCount: number
}) {
  if (oldTimetablesCount === 0) return null

  return (
    <Alert variant="info">
      <AlertTitle>Old Timetables Detected</AlertTitle>
      <AlertDescription>
        You have {oldTimetablesCount} timetables using the old period-based system.
        These timetables use "Period 1, Period 2" instead of actual times.

        <div className="mt-4">
          <h4>What's Different?</h4>
          <ul>
            <li>Old: Period 1, Period 2, Period 3</li>
            <li>New: 08:00-08:40, 08:40-09:20, 09:20-10:00</li>
          </ul>
        </div>

        <button onClick={handleArchiveOld}>
          Archive Old Timetables
        </button>
      </AlertDescription>
    </Alert>
  )
}
```

---

## Time Slot Calculation Algorithm

### Detailed Walkthrough

**Input**:

```typescript
{
  startTime: "08:00",
  endTime: "16:00",
  periodDurationMinutes: 40,
  specialPeriods: [
    { name: "Break", startTime: "10:30", endTime: "10:45", daysOfWeek: [1,2,3,4,5] },
    { name: "Lunch", startTime: "13:00", endTime: "14:00", daysOfWeek: [1,2,3,4,5] }
  ]
}
```

**Step 1: Parse Times to Minutes**

```typescript
startMinutes = parseTime("08:00") = 8 * 60 = 480
endMinutes = parseTime("16:00") = 16 * 60 = 960
```

**Step 2: Calculate Total Time**

```typescript
totalMinutes = 960 - 480 = 480 minutes (8 hours)
```

**Step 3: Calculate Special Period Duration**

```typescript
breakDuration = parseTime("10:45") - parseTime("10:30") = 15 minutes
lunchDuration = parseTime("14:00") - parseTime("13:00") = 60 minutes
specialPeriodMinutes = 15 + 60 = 75 minutes
```

**Step 4: Calculate Available Teaching Time**

```typescript
availableMinutes = 480 - 75 = 405 minutes
```

**Step 5: Calculate Number of Slots**

```typescript
numberOfSlots = Math.ceil(405 / 40) = Math.ceil(10.125) = 11 slots
```

**Step 6: Generate Time Slots**

```typescript
currentTime = 480 (08:00)
slots = []

// Slot 1: 08:00-08:40
slots.push({ startTime: "08:00", endTime: "08:40", isSpecialPeriod: false })
currentTime = 520 (08:40)

// Slot 2: 08:40-09:20
slots.push({ startTime: "08:40", endTime: "09:20", isSpecialPeriod: false })
currentTime = 560 (09:20)

// ... continue until reaching special period

// Slot 6: 10:30-10:45 (Break)
slots.push({ startTime: "10:30", endTime: "10:45", isSpecialPeriod: true, name: "Break" })
currentTime = 645 (10:45)

// ... continue generating slots
```

**Step 7: Validation**

```typescript
// Ensure last slot ends at or before school end time
lastSlot = slots[slots.length - 1];
if (parseTime(lastSlot.endTime) > endMinutes) {
  throw new Error("Last slot exceeds school end time");
}

// Ensure no overlapping special periods
for (let i = 0; i < specialPeriods.length; i++) {
  for (let j = i + 1; j < specialPeriods.length; j++) {
    if (periodsOverlap(specialPeriods[i], specialPeriods[j])) {
      throw new Error("Special periods overlap");
    }
  }
}
```

**Output**:

```typescript
[
  { startTime: "08:00", endTime: "08:40", isSpecialPeriod: false, period: 1 },
  { startTime: "08:40", endTime: "09:20", isSpecialPeriod: false, period: 2 },
  { startTime: "09:20", endTime: "10:00", isSpecialPeriod: false, period: 3 },
  { startTime: "10:00", endTime: "10:30", isSpecialPeriod: false, period: 4 },
  {
    startTime: "10:30",
    endTime: "10:45",
    isSpecialPeriod: true,
    name: "Break",
  },
  { startTime: "10:45", endTime: "11:25", isSpecialPeriod: false, period: 5 },
  { startTime: "11:25", endTime: "12:05", isSpecialPeriod: false, period: 6 },
  { startTime: "12:05", endTime: "12:45", isSpecialPeriod: false, period: 7 },
  { startTime: "12:45", endTime: "13:00", isSpecialPeriod: false, period: 8 },
  {
    startTime: "13:00",
    endTime: "14:00",
    isSpecialPeriod: true,
    name: "Lunch",
  },
  { startTime: "14:00", endTime: "14:40", isSpecialPeriod: false, period: 9 },
  { startTime: "14:40", endTime: "15:20", isSpecialPeriod: false, period: 10 },
  { startTime: "15:20", endTime: "16:00", isSpecialPeriod: false, period: 11 },
];
```

---

## Teacher Code Generation Algorithm

### Detailed Walkthrough

**Scenario**: Generate code for teacher "John Doe" in school "ABC123"

**Step 1: Extract Initials**

```typescript
firstName = "John";
lastName = "Doe";
firstInitial = "J";
lastInitial = "D";
initials = "JD";
```

**Step 2: Query Existing Codes**

```typescript
existingCodes = await prisma.staff.findMany({
  where: {
    schoolId: "ABC123",
    teacherCode: { startsWith: "JD" },
  },
  select: { teacherCode: true },
});

// Result: ["JD001", "JD002", "JD005"]
```

**Step 3: Find Highest Number**

```typescript
numbers = existingCodes.map((code) => parseInt(code.substring(2)));
// Result: [1, 2, 5]

highestNumber = Math.max(...numbers);
// Result: 5
```

**Step 4: Generate Next Number**

```typescript
nextNumber = highestNumber + 1;
// Result: 6

code = "JD" + nextNumber.toString().padStart(3, "0");
// Result: "JD006"
```

**Step 5: Check Uniqueness**

```typescript
exists = await prisma.staff.findFirst({
  where: {
    schoolId: "ABC123",
    teacherCode: "JD006",
  },
});

if (exists) {
  // Collision detected, retry with next number
  nextNumber++;
  code = "JD" + nextNumber.toString().padStart(3, "0");
}
```

**Step 6: Save Code**

```typescript
await prisma.staff.update({
  where: { id: teacherId },
  data: { teacherCode: "JD006" },
});
```

**Edge Case: All Numbers Exhausted**

```typescript
// If JD001 through JD999 all exist
if (nextNumber > 999) {
  // Fallback to random generation
  code = generateRandomCode();
  // Example: "XY123"
}

function generateRandomCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";

  let code = "";
  code += letters[Math.floor(Math.random() * 26)];
  code += letters[Math.floor(Math.random() * 26)];
  code += digits[Math.floor(Math.random() * 10)];
  code += digits[Math.floor(Math.random() * 10)];
  code += digits[Math.floor(Math.random() * 10)];

  return code;
}
```

---

## Conflict Detection Logic

### 4-Dimensional Conflict Detection

When adding a timetable entry, the system checks for conflicts in 4 dimensions:

#### 1. Slot Occupancy Check

**Purpose**: Ensure the slot is not already occupied in the same timetable.

```typescript
const slotConflict = await prisma.doSTimetableEntry.findFirst({
  where: {
    timetableId,
    dayOfWeek,
    startTime,
  },
  include: {
    curriculumSubject: { include: { subject: true } },
    teacher: true,
  },
});

if (slotConflict) {
  conflicts.push(
    `Slot already occupied by ${slotConflict.curriculumSubject.subject.name} (${slotConflict.teacher.firstName} ${slotConflict.teacher.lastName})`,
  );
}
```

#### 2. Teacher Double-Booking Check

**Purpose**: Ensure the teacher is not teaching another class at the same time.

```typescript
const teacherConflict = await prisma.doSTimetableEntry.findFirst({
  where: {
    teacherId,
    dayOfWeek,
    startTime,
    timetable: {
      termId,
      id: { not: timetableId }, // Different timetable
    },
  },
  include: {
    timetable: { include: { class: true } },
    curriculumSubject: { include: { subject: true } },
  },
});

if (teacherConflict) {
  conflicts.push(
    `Teacher is already teaching ${teacherConflict.curriculumSubject.subject.name} in ${teacherConflict.timetable.class.name} at this time`,
  );
}
```

#### 3. Room Double-Booking Check

**Purpose**: Ensure the room is not occupied by another class at the same time.

```typescript
const roomConflict = await prisma.doSTimetableEntry.findFirst({
  where: {
    room,
    dayOfWeek,
    startTime,
    timetable: {
      termId,
      id: { not: timetableId }, // Different timetable
    },
  },
  include: {
    timetable: { include: { class: true } },
    curriculumSubject: { include: { subject: true } },
  },
});

if (roomConflict) {
  conflicts.push(
    `Room ${room} is already occupied by ${roomConflict.curriculumSubject.subject.name} (${roomConflict.timetable.class.name}) at this time`,
  );
}
```

#### 4. Subject Period Limit Check

**Purpose**: Ensure the subject has not exceeded its periodsPerWeek limit.

```typescript
// Get subject configuration
const curriculumSubject = await prisma.doSCurriculumSubject.findUnique({
  where: { id: curriculumSubjectId },
  select: { periodsPerWeek: true, subject: { select: { name: true } } },
});

// Count existing periods for this subject
const existingPeriods = await prisma.doSTimetableEntry.count({
  where: {
    timetableId,
    curriculumSubjectId,
  },
});

if (existingPeriods >= curriculumSubject.periodsPerWeek) {
  conflicts.push(
    `${curriculumSubject.subject.name} already has ${existingPeriods} periods (max: ${curriculumSubject.periodsPerWeek} per week)`,
  );
}
```

### Conflict Response

If any conflicts are detected, return 409 status with detailed information:

```typescript
if (conflicts.length > 0) {
  console.log("❌ [Timetable Entry] Conflicts detected:", conflicts);
  return NextResponse.json(
    {
      error: "Conflicts detected",
      conflicts,
    },
    { status: 409 },
  );
}
```

---

## Migration Strategy

### Phase 1: Backward Compatibility

**Goal**: Ensure old timetables continue to work without modification.

**Implementation**:

1. **Add isTimeBased Flag**:
   - Default: `false` for existing timetables
   - New timetables: `true`

2. **Conditional Rendering**:

   ```typescript
   if (timetable.isTimeBased) {
     // Render time-based grid
     renderTimeBasedGrid();
   } else {
     // Render period-based grid (legacy)
     renderPeriodBasedGrid();
   }
   ```

3. **API Compatibility**:
   - Accept both `period` and `startTime/endTime` in entry creation
   - Store both values for backward compatibility

### Phase 2: Migration Notice

**Goal**: Inform users about the new system and provide migration path.

**Implementation**:

1. **Detect Old Timetables**:
   ```typescript
   const oldTimetablesCount = await prisma.doSTimetable.count({
     where: {
       schoolId,
       isTimeBased: false,
       isArchived: false,
     },
   })
   ```

2. **Display Migration Notice**:
   - Show alert at top of timetable page
   - Explain differences between old and new systems
   - Provide "Archive Old Timetables" button

3. **Archive Functionality**:
   ```typescript
   // Archive all old timetables
   await prisma.doSTimetable.updateMany({
     where: {
       schoolId,
       isTimeBased: false,
     },
     data: {
       isArchived: true,
     },
   })
   ```

### Phase 3: New Timetable Creation

**Goal**: All new timetables use time-based system.

**Implementation**:

1. **Set isTimeBased Flag**:
   ```typescript
   await prisma.doSTimetable.create({
     data: {
       // ... other fields
       isTimeBased: true, // Always true for new timetables
     },
   })
   ```

2. **Require Configuration**:
   - Check if school has timetable configuration
   - If not, prompt user to configure before creating timetable

3. **Generate Time Slots**:
   - Fetch configuration
   - Calculate time slots
   - Display in grid

---

## Performance Considerations

### Database Indexes

**Critical Indexes**:

```prisma
// DoSTimetable
@@index([schoolId])
@@index([classId])
@@index([termId])
@@index([isTimeBased])
@@index([isArchived])

// DoSTimetableEntry
@@index([timetableId])
@@index([timetableId, startTime])
@@index([teacherId])
@@index([curriculumSubjectId])

// Staff
@@index([schoolId])
@@index([teacherCode])
```

### Query Optimization

**1. Use Selective Field Fetching**:

```typescript
// ❌ Bad: Fetches all fields
const timetables = await prisma.doSTimetable.findMany({
  where: { schoolId },
  include: { entries: true },
})

// ✅ Good: Only fetches needed fields
const timetables = await prisma.doSTimetable.findMany({
  where: { schoolId },
  select: {
    id: true,
    timetableName: true,
    status: true,
    _count: { select: { entries: true } },
  },
})
```


**2. Implement Pagination**:

```typescript
// Teachers dropdown with pagination
const teachers = await prisma.staff.findMany({
  where: { schoolId, status: 'ACTIVE' },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    teacherCode: true,
  },
  skip: (page - 1) * limit,
  take: limit,
  orderBy: { lastName: 'asc' },
})

const total = await prisma.staff.count({
  where: { schoolId, status: 'ACTIVE' },
})

return {
  teachers,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  },
}
```

**3. Add Search Functionality**:

```typescript
// Search teachers by name or code
const teachers = await prisma.staff.findMany({
  where: {
    schoolId,
    status: 'ACTIVE',
    OR: [
      { firstName: { contains: searchQuery, mode: 'insensitive' } },
      { lastName: { contains: searchQuery, mode: 'insensitive' } },
      { teacherCode: { contains: searchQuery, mode: 'insensitive' } },
    ],
  },
})
```

### Frontend Optimization

**1. Use React.memo for Grid Cells**:

```typescript
const TimetableCell = React.memo(({ entry, onClick }: TimetableCellProps) => {
  return (
    <div onClick={onClick}>
      {entry ? (
        <>
          <div>{entry.subjectCode}</div>
          <div>{entry.teacherCode}</div>
        </>
      ) : (
        <button>+</button>
      )}
    </div>
  )
})
```

**2. Debounce Configuration Preview**:

```typescript
const [config, setConfig] = useState<ConfigFormData>({...})
const [preview, setPreview] = useState<TimeSlot[]>([])

// Debounce preview generation
const debouncedGeneratePreview = useMemo(
  () => debounce(() => {
    const slots = calculateTimeSlots(config)
    setPreview(slots)
  }, 500),
  [config]
)

useEffect(() => {
  debouncedGeneratePreview()
}, [config, debouncedGeneratePreview])
```

**3. Lazy Load Grid Rows**:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const rowVirtualizer = useVirtualizer({
  count: timeSlots.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60, // Row height
})

return (
  <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
    <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
      {rowVirtualizer.getVirtualItems().map(virtualRow => (
        <TimetableRow
          key={virtualRow.index}
          slot={timeSlots[virtualRow.index]}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}
        />
      ))}
    </div>
  </div>
)
```

---

## Testing Strategy

### Unit Tests

**Time Slot Calculation**:

```typescript
describe('calculateTimeSlots', () => {
  it('should generate correct number of slots', () => {
    const config = {
      startTime: '08:00',
      endTime: '16:00',
      periodDurationMinutes: 40,
      specialPeriods: [],
    }
    const slots = calculateTimeSlots(config)
    expect(slots).toHaveLength(12)
  })

  it('should insert special periods correctly', () => {
    const config = {
      startTime: '08:00',
      endTime: '16:00',
      periodDurationMinutes: 40,
      specialPeriods: [
        { name: 'Break', startTime: '10:30', endTime: '10:45', daysOfWeek: [1,2,3,4,5] }
      ],
    }
    const slots = calculateTimeSlots(config)
    const breakSlot = slots.find(s => s.specialPeriodName === 'Break')
    expect(breakSlot).toBeDefined()
    expect(breakSlot?.startTime).toBe('10:30')
    expect(breakSlot?.endTime).toBe('10:45')
  })

  it('should round up fractional periods', () => {
    const config = {
      startTime: '08:00',
      endTime: '16:00',
      periodDurationMinutes: 45,
      specialPeriods: [],
    }
    const slots = calculateTimeSlots(config)
    // 480 minutes / 45 = 10.67 → rounds up to 11
    expect(slots).toHaveLength(11)
  })
})
```


**Teacher Code Generation**:

```typescript
describe('generateTeacherCode', () => {
  it('should generate code with initials', () => {
    const code = generateTeacherCode('John', 'Doe', 'school123')
    expect(code).toMatch(/^JD\d{3}$/)
  })

  it('should handle collisions', async () => {
    // Mock existing codes: JD001, JD002
    const code = await generateTeacherCode('Jane', 'Davis', 'school123')
    expect(code).toBe('JD003')
  })

  it('should fallback to random when exhausted', async () => {
    // Mock 999 existing codes: JD001-JD999
    const code = await generateTeacherCode('Jack', 'Daniels', 'school123')
    expect(code).toMatch(/^[A-Z]{2}\d{3}$/)
    expect(code).not.toMatch(/^JD/)
  })
})
```

### Integration Tests

**Configuration Save and Retrieve**:

```typescript
describe('Timetable Configuration API', () => {
  it('should save and retrieve configuration', async () => {
    const config = {
      startTime: '08:00',
      endTime: '16:00',
      periodDurationMinutes: 40,
      specialPeriods: [],
    }

    // Save
    const saveResponse = await fetch('/api/dos/timetable/config', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    expect(saveResponse.status).toBe(200)

    // Retrieve
    const getResponse = await fetch('/api/dos/timetable/config')
    const retrieved = await getResponse.json()
    expect(retrieved.startTime).toBe('08:00')
    expect(retrieved.endTime).toBe('16:00')
  })

  it('should validate configuration', async () => {
    const invalidConfig = {
      startTime: '16:00',
      endTime: '08:00', // Invalid: end before start
      periodDurationMinutes: 40,
      specialPeriods: [],
    }

    const response = await fetch('/api/dos/timetable/config', {
      method: 'POST',
      body: JSON.stringify(invalidConfig),
    })
    expect(response.status).toBe(400)
  })
})
```

**Entry Creation with Conflicts**:

```typescript
describe('Timetable Entry API', () => {
  it('should detect slot occupancy conflict', async () => {
    // Create first entry
    await createEntry({
      timetableId: 'tt123',
      dayOfWeek: 1,
      startTime: '08:00',
      // ... other fields
    })

    // Try to create second entry in same slot
    const response = await createEntry({
      timetableId: 'tt123',
      dayOfWeek: 1,
      startTime: '08:00',
      // ... other fields
    })

    expect(response.status).toBe(409)
    expect(response.body.conflicts).toContain('Slot already occupied')
  })

  it('should detect teacher double-booking', async () => {
    // Create entry for teacher in class A
    await createEntry({
      timetableId: 'ttA',
      teacherId: 'teacher123',
      dayOfWeek: 1,
      startTime: '08:00',
    })

    // Try to create entry for same teacher in class B at same time
    const response = await createEntry({
      timetableId: 'ttB',
      teacherId: 'teacher123',
      dayOfWeek: 1,
      startTime: '08:00',
    })

    expect(response.status).toBe(409)
    expect(response.body.conflicts).toContain('Teacher is already teaching')
  })
})
```


### Property-Based Tests

**Time Slot Generation Properties**:

```typescript
import fc from 'fast-check'

describe('Time Slot Generation Properties', () => {
  it('should always generate at least one slot', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 480, max: 600 }), // startTime (8:00-10:00)
        fc.integer({ min: 900, max: 1080 }), // endTime (15:00-18:00)
        fc.integer({ min: 15, max: 60 }), // periodDuration
        (start, end, duration) => {
          if (start >= end) return true // Skip invalid inputs
          
          const config = {
            startTime: formatTime(start),
            endTime: formatTime(end),
            periodDurationMinutes: duration,
            specialPeriods: [],
          }
          
          const slots = calculateTimeSlots(config)
          return slots.length >= 1
        }
      )
    )
  })

  it('should never have overlapping slots', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 480, max: 600 }),
        fc.integer({ min: 900, max: 1080 }),
        fc.integer({ min: 15, max: 60 }),
        (start, end, duration) => {
          if (start >= end) return true
          
          const config = {
            startTime: formatTime(start),
            endTime: formatTime(end),
            periodDurationMinutes: duration,
            specialPeriods: [],
          }
          
          const slots = calculateTimeSlots(config)
          
          // Check no overlaps
          for (let i = 0; i < slots.length - 1; i++) {
            const current = parseTime(slots[i].endTime)
            const next = parseTime(slots[i + 1].startTime)
            if (current > next) return false // Overlap detected
          }
          
          return true
        }
      )
    )
  })
})
```

**Teacher Code Uniqueness Property**:

```typescript
describe('Teacher Code Uniqueness Property', () => {
  it('should never generate duplicate codes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.string(), fc.string()), { minLength: 10, maxLength: 100 }),
        async (teachers) => {
          const codes = new Set<string>()
          
          for (const [firstName, lastName] of teachers) {
            const code = await generateTeacherCode(firstName, lastName, 'school123')
            if (codes.has(code)) return false // Duplicate detected
            codes.add(code)
          }
          
          return true
        }
      )
    )
  })
})
```

---

## Troubleshooting

### Common Issues

**1. Prisma Client Not Updated**

**Symptom**: TypeScript errors about missing fields (isTimeBased, isArchived, etc.)

**Solution**:
```bash
npx prisma generate
```

**2. Time Slots Not Displaying**

**Symptom**: Grid shows period numbers instead of times

**Solution**:
- Check if timetable configuration exists
- Verify `isTimeBased` flag is true
- Check browser console for errors

**3. Teacher Codes Not Showing**

**Symptom**: Teacher names show instead of codes

**Solution**:
- Run teacher code migration script
- Verify `teacherCode` field is populated
- Check API response includes teacherCode

**4. Conflicts Not Detected**

**Symptom**: Double-bookings allowed

**Solution**:
- Verify database indexes exist
- Check conflict detection logic in API
- Ensure `startTime` is being used for queries

---

## Deployment Checklist

- [ ] Run database migration: `npx prisma db push`
- [ ] Generate Prisma client: `npx prisma generate`
- [ ] Run teacher code migration script for existing teachers
- [ ] Test configuration save/retrieve
- [ ] Test time slot generation
- [ ] Test timetable creation with time-based system
- [ ] Test conflict detection (all 4 dimensions)
- [ ] Verify old timetables still display correctly
- [ ] Test migration notice and archive functionality
- [ ] Performance test with large datasets (>100 teachers, >50 subjects)
- [ ] Mobile responsiveness test
- [ ] Browser compatibility test (Chrome, Firefox, Safari, Edge)

---

## Future Enhancements

1. **Template System**: Copy timetables between classes/terms
2. **Bulk Operations**: Assign multiple periods at once
3. **Auto-Scheduling Algorithm**: Suggest optimal slots based on constraints
4. **Teacher Workload Dashboard**: Visualize periods per week, free periods
5. **Room Utilization Dashboard**: Track room usage patterns
6. **PDF Export**: Generate print-ready timetables
7. **Drag-Drop Interface**: Move entries between slots visually
8. **Conflict Resolution Suggestions**: Suggest alternative slots when conflicts occur
9. **Historical Analytics**: Track timetable changes over time
10. **Mobile App**: Native iOS/Android app for viewing timetables

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-13  
**Maintained By**: Development Team

