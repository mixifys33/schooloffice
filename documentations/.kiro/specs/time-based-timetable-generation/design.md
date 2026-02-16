# Time-Based Timetable System - Design Document

**Spec**: time-based-timetable-generation  
**Status**: In Progress  
**Created**: 2026-02-13  
**Updated**: 2026-02-13

---

## 1. System Architecture

### 1.1 Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    DoS Timetable Interface                   │
├─────────────────────────────────────────────────────────────┤
│  Configuration Panel  │  Timetable Grid  │  Subject Dialog  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  Config API  │  Timetable API  │  Teacher Code API          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic                            │
├─────────────────────────────────────────────────────────────┤
│  Time Slot Calculator  │  Conflict Detector  │  Validator   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  TimetableConfiguration  │  DoSTimetableEntry  │  Staff     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Design

### 2.1 New Model: TimetableConfiguration

```prisma
model TimetableConfiguration {
  id                    String   @id @default(auto()) @map("_id") @db.ObjectId
  schoolId              String   @db.ObjectId
  school                School   @relation(fields: [schoolId], references: [id])

  // Time settings
  startTime             String   // Format: "08:00"
  endTime               String   // Format: "16:00"
  periodDurationMinutes Int      // e.g., 40

  // Special periods (JSON array)
  specialPeriods        Json     @default("[]")
  // Format: [{ name: "Break", startTime: "10:30", endTime: "10:45", daysOfWeek: [1,2,3,4,5] }]

  // Metadata
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  createdBy             String   @db.ObjectId

  @@unique([schoolId])
  @@index([schoolId])
}
```

### 2.2 Updated Model: Staff (Teacher Codes)

```prisma
model Staff {
  // ... existing fields ...

  teacherCode           String?  // 5-character unique code (e.g., "JD001")

  @@unique([schoolId, teacherCode])
  @@index([schoolId, teacherCode])
}
```

### 2.3 Updated Model: DoSTimetableEntry (Time-Based)

```prisma
model DoSTimetableEntry {
  // ... existing fields ...

  // Time-based fields (NEW)
  startTime             String?  // Format: "08:00"
  endTime               String?  // Format: "08:40"

  // Special period support (NEW)
  isSpecialPeriod       Boolean  @default(false)
  specialPeriodName     String?

  // Keep period for backward compatibility
  period                Int      // 1-8 (legacy)

  @@index([timetableId, startTime])
}
```

---

## 3. Time Slot Calculation Algorithm

### 3.1 Input Parameters

- `startTime`: School start time (e.g., "08:00")
- `endTime`: School end time (e.g., "16:00")
- `periodDurationMinutes`: Duration of each period (e.g., 40)
- `specialPeriods`: Array of special periods with times and days

### 3.2 Calculation Steps

```typescript
function calculateTimeSlots(
  config: TimetableConfiguration,
  dayOfWeek: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // 1. Parse start and end times
  const startMinutes = parseTime(config.startTime); // e.g., 480 (8:00 AM)
  const endMinutes = parseTime(config.endTime); // e.g., 960 (4:00 PM)

  // 2. Get special periods for this day
  const daySpecialPeriods = config.specialPeriods
    .filter((sp) => sp.daysOfWeek.includes(dayOfWeek))
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  // 3. Calculate available time segments
  let currentTime = startMinutes;
  let periodNumber = 1;

  for (const specialPeriod of daySpecialPeriods) {
    const spStart = parseTime(specialPeriod.startTime);
    const spEnd = parseTime(specialPeriod.endTime);

    // Add teaching slots before special period
    while (currentTime + config.periodDurationMinutes <= spStart) {
      slots.push({
        period: periodNumber++,
        startTime: formatTime(currentTime),
        endTime: formatTime(currentTime + config.periodDurationMinutes),
        isSpecialPeriod: false,
        isAssignable: true,
      });
      currentTime += config.periodDurationMinutes;
    }

    // Add special period slot
    slots.push({
      period: periodNumber++,
      startTime: specialPeriod.startTime,
      endTime: specialPeriod.endTime,
      isSpecialPeriod: true,
      specialPeriodName: specialPeriod.name,
      isAssignable: false,
    });
    currentTime = spEnd;
  }

  // 4. Add remaining teaching slots after last special period
  while (currentTime + config.periodDurationMinutes <= endMinutes) {
    slots.push({
      period: periodNumber++,
      startTime: formatTime(currentTime),
      endTime: formatTime(currentTime + config.periodDurationMinutes),
      isSpecialPeriod: false,
      isAssignable: true,
    });
    currentTime += config.periodDurationMinutes;
  }

  // 5. Handle fractional period (round up)
  if (currentTime < endMinutes) {
    const remainingMinutes = endMinutes - currentTime;
    if (remainingMinutes >= 15) {
      // Minimum period duration
      slots.push({
        period: periodNumber++,
        startTime: formatTime(currentTime),
        endTime: formatTime(endMinutes),
        isSpecialPeriod: false,
        isAssignable: true,
      });
    }
  }

  return slots;
}
```

### 3.3 Helper Functions

```typescript
// Parse "HH:MM" to minutes since midnight
function parseTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Format minutes since midnight to "HH:MM"
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Format time range for display
function formatTimeRange(
  startTime: string,
  endTime: string,
  use12Hour: boolean = false,
): string {
  if (use12Hour) {
    return `${format12Hour(startTime)}-${format12Hour(endTime)}`;
  }
  return `${startTime}-${endTime}`;
}

function format12Hour(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
```

---

## 4. Teacher Code Generation

### 4.1 Code Format

- **Length**: 5 characters
- **Pattern**: `[A-Z]{2}[0-9]{3}` (e.g., "JD001", "SM042")
- **Uniqueness**: Per school

### 4.2 Generation Algorithm

```typescript
async function generateTeacherCode(
  teacherName: string,
  schoolId: string,
): Promise<string> {
  // 1. Extract initials from name
  const nameParts = teacherName.trim().split(/\s+/);
  let initials = "";

  if (nameParts.length >= 2) {
    // First and last name initials
    initials = nameParts[0][0] + nameParts[nameParts.length - 1][0];
  } else {
    // Single name - use first two letters
    initials = teacherName.substring(0, 2);
  }
  initials = initials.toUpperCase();

  // 2. Find next available number
  let number = 1;
  let code = "";
  let attempts = 0;
  const maxAttempts = 1000;

  while (attempts < maxAttempts) {
    code = `${initials}${number.toString().padStart(3, "0")}`;

    // Check if code exists
    const existing = await prisma.staff.findFirst({
      where: { schoolId, teacherCode: code },
    });

    if (!existing) {
      return code; // Found unique code
    }

    number++;
    attempts++;
  }

  // 3. Fallback: Random code if all initials+numbers exhausted
  return generateRandomCode(schoolId);
}

async function generateRandomCode(schoolId: string): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";

  for (let attempt = 0; attempt < 100; attempt++) {
    const code =
      chars[Math.floor(Math.random() * chars.length)] +
      chars[Math.floor(Math.random() * chars.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      digits[Math.floor(Math.random() * digits.length)] +
      digits[Math.floor(Math.random() * digits.length)];

    const existing = await prisma.staff.findFirst({
      where: { schoolId, teacherCode: code },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error("Failed to generate unique teacher code after 100 attempts");
}
```

---

## 5. UI Component Design

### 5.1 Configuration Panel (Collapsible)

```tsx
<Card className="mb-6">
  <CardHeader className="cursor-pointer" onClick={() => setConfigExpanded(!configExpanded)}>
    <div className="flex items-center justify-between">
      <CardTitle>School Timetable Rules</CardTitle>
      {configExpanded ? <ChevronUp /> : <ChevronDown />}
    </div>
  </CardHeader>

  {configExpanded && (
    <CardContent>
      {/* Configuration Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>School Start Time</Label>
          <Input type="time" value={startTime} onChange={...} />
        </div>
        <div>
          <Label>School End Time</Label>
          <Input type="time" value={endTime} onChange={...} />
        </div>
        <div>
          <Label>Period Duration (minutes)</Label>
          <Input type="number" min="15" value={periodDuration} onChange={...} />
        </div>
      </div>

      {/* Special Periods */}
      <div className="mt-4">
        <Label>Special Periods (Break, Lunch, etc.)</Label>
        {specialPeriods.map((sp, idx) => (
          <div key={idx} className="flex gap-2 mt-2">
            <Input placeholder="Name" value={sp.name} />
            <Input type="time" value={sp.startTime} />
            <Input type="time" value={sp.endTime} />
            <Select value={sp.daysOfWeek}>
              <SelectItem value="1,2,3,4,5">Mon-Fri</SelectItem>
              <SelectItem value="1,2,3,4">Mon-Thu</SelectItem>
            </Select>
            <Button variant="ghost" onClick={() => removeSpecialPeriod(idx)}>
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={addSpecialPeriod}>
          <Plus /> Add Special Period
        </Button>
      </div>

      {/* Preview */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Generated Time Slots Preview</h4>
        <div className="grid grid-cols-5 gap-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, dayIdx) => (
            <div key={dayIdx}>
              <div className="font-medium text-sm mb-1">{day}</div>
              {calculateTimeSlots(config, dayIdx + 1).map((slot, idx) => (
                <div key={idx} className={`text-xs p-1 mb-1 rounded ${
                  slot.isSpecialPeriod ? 'bg-yellow-100' : 'bg-blue-100'
                }`}>
                  {slot.isSpecialPeriod ? slot.specialPeriodName : formatTimeRange(slot.startTime, slot.endTime)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <Button className="mt-4" onClick={saveConfiguration}>
        <Save /> Save Rules
      </Button>
    </CardContent>
  )}
</Card>
```

### 5.2 Time-Based Timetable Grid

```tsx
<table className="w-full border-collapse">
  <thead>
    <tr>
      <th className="sticky top-0 bg-white border p-2">Time</th>
      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
        <th key={day} className="sticky top-0 bg-white border p-2">
          {day}
        </th>
      ))}
    </tr>
  </thead>
  <tbody>
    {timeSlots.map((slot, idx) => (
      <tr key={idx}>
        <td
          className={`border p-2 text-sm font-medium ${
            slot.isSpecialPeriod ? "bg-yellow-50" : "bg-gray-50"
          }`}
        >
          {slot.isSpecialPeriod ? (
            <div>
              <div className="font-bold">{slot.specialPeriodName}</div>
              <div className="text-xs">
                {formatTimeRange(slot.startTime, slot.endTime)}
              </div>
            </div>
          ) : (
            formatTimeRange(slot.startTime, slot.endTime)
          )}
        </td>
        {[1, 2, 3, 4, 5].map((day) => {
          const entry = getEntryForSlot(day, slot.startTime);
          return (
            <td
              key={day}
              className={`border p-2 ${
                slot.isSpecialPeriod
                  ? "bg-yellow-50 cursor-not-allowed"
                  : !entry
                    ? "cursor-pointer hover:bg-gray-50"
                    : ""
              }`}
              onClick={() =>
                !slot.isSpecialPeriod && !entry && openAddDialog(day, slot)
              }
            >
              {entry ? (
                <div className="text-center">
                  <div className="font-bold text-blue-600">
                    {entry.subjectCode}
                  </div>
                  <div className="text-xs text-gray-600">
                    {entry.teacherCode}
                  </div>
                  {entry.room && (
                    <div className="text-xs text-gray-500">{entry.room}</div>
                  )}
                </div>
              ) : slot.isSpecialPeriod ? (
                <div className="text-center text-gray-400 text-xs">—</div>
              ) : (
                <div className="text-center text-gray-400 text-xs">+</div>
              )}
            </td>
          );
        })}
      </tr>
    ))}
  </tbody>
</table>
```

---

## 6. API Endpoints

### 6.1 Configuration API

```
GET    /api/dos/timetable/config              - Fetch configuration
POST   /api/dos/timetable/config              - Save configuration
POST   /api/dos/timetable/config/generate-slots - Generate time slots preview
```

### 6.2 Teacher Code API

```
POST   /api/dos/teachers/generate-codes       - Generate codes for all teachers
POST   /api/dos/teachers/[id]/generate-code   - Generate code for one teacher
```

### 6.3 Enhanced Timetable API

```
GET    /api/dos/timetable/[id]                - Fetch with time-based entries
POST   /api/dos/timetable/[id]/entries        - Add entry (time-based validation)
```

---

## 7. Validation Rules

### 7.1 Configuration Validation

```typescript
function validateConfiguration(
  config: TimetableConfiguration,
): ValidationResult {
  const errors: string[] = [];

  // 1. Start time before end time
  if (parseTime(config.startTime) >= parseTime(config.endTime)) {
    errors.push("Start time must be before end time");
  }

  // 2. Period duration minimum
  if (config.periodDurationMinutes < 15) {
    errors.push("Period duration must be at least 15 minutes");
  }

  // 3. Special periods within school hours
  for (const sp of config.specialPeriods) {
    const spStart = parseTime(sp.startTime);
    const spEnd = parseTime(sp.endTime);
    const schoolStart = parseTime(config.startTime);
    const schoolEnd = parseTime(config.endTime);

    if (spStart < schoolStart || spEnd > schoolEnd) {
      errors.push(
        `Special period "${sp.name}" times must be within school hours`,
      );
    }

    if (spStart >= spEnd) {
      errors.push(
        `Special period "${sp.name}" start time must be before end time`,
      );
    }
  }

  // 4. Special periods don't overlap
  const sortedPeriods = [...config.specialPeriods].sort(
    (a, b) => parseTime(a.startTime) - parseTime(b.startTime),
  );

  for (let i = 0; i < sortedPeriods.length - 1; i++) {
    const current = sortedPeriods[i];
    const next = sortedPeriods[i + 1];

    if (parseTime(current.endTime) > parseTime(next.startTime)) {
      errors.push(
        `Special periods "${current.name}" and "${next.name}" overlap`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

---

## 8. Migration Strategy

### 8.1 Backward Compatibility

- Keep `period` field in DoSTimetableEntry for old timetables
- Add `startTime`/`endTime` fields for new timetables
- Display migration notice when old timetables detected

### 8.2 Migration Notice UI

```tsx
{
  hasOldTimetables && (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <p className="font-medium">Timetable System Updated</p>
        <p className="text-sm mt-1">
          Your existing timetables use numbered periods (Period 1, Period 2,
          etc.). New timetables will use actual times (8:00-8:40, 8:40-9:20,
          etc.).
        </p>
        <p className="text-sm mt-2">
          Old timetables will remain viewable in read-only mode. To use the new
          time-based system, please create new timetables.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={archiveOldTimetables}
        >
          Archive Old Timetables
        </Button>
      </AlertDescription>
    </Alert>
  );
}
```

---

## 9. Performance Optimizations

### 9.1 Database Indexes

```prisma
@@index([schoolId, teacherCode])
@@index([timetableId, startTime])
@@index([schoolId, isActive])
```

### 9.2 Query Optimizations

- Use `select` to fetch only needed fields
- Implement pagination for large teacher/subject lists
- Cache configuration in memory (invalidate on update)

### 9.3 Frontend Optimizations

- Lazy load timetable grid rows
- Debounce configuration preview updates
- Use React.memo for grid cells

---

## 10. Logging Strategy

All operations will include comprehensive logging:

```typescript
console.log("🔧 [Timetable Config] Calculating time slots...");
console.log("📊 [Timetable Config] Total available time: 420 minutes");
console.log("📊 [Timetable Config] Number of slots: 8");
console.log("✅ [Timetable Config] Generated 8 time slots");
console.log("🔧 [Teacher Code] Generating code for teacher: John Doe");
console.log("✅ [Teacher Code] Assigned code: JD001");
console.log("🔧 [Timetable Entry] Adding subject MATH at 08:00-08:40");
console.log("✅ [Timetable Entry] Entry created successfully");
console.log(
  "❌ [Timetable Entry] Conflict detected: Teacher already teaching at this time",
);
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

- Time slot calculation with various configurations
- Teacher code generation uniqueness
- Validation rules

### 11.2 Integration Tests

- Configuration save and retrieve
- Timetable entry creation with conflicts
- Migration from old to new system

### 11.3 Property-Based Tests

- Time slot generation always produces valid slots
- Teacher codes are always unique within school
- Special periods never overlap

---

**Status**: Design Complete - Ready for Implementation
