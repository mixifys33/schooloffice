# Time-Based Timetable System - User Guide

**Version**: 1.0  
**Date**: 2026-02-13  
**For**: Director of Studies (DoS)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Configuration](#configuration)
4. [Creating Timetables](#creating-timetables)
5. [Managing Entries](#managing-entries)
6. [Migration from Old Format](#migration-from-old-format)
7. [Tips & Best Practices](#tips--best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Time-Based Timetable System replaces numbered periods (Period 1, 2, 3) with actual times (08:00-08:40, 08:40-09:20). This makes timetables more intuitive and professional.

### Key Features

- ✅ **Time-based periods**: See actual class times instead of period numbers
- ✅ **Automatic conflict detection**: Prevents teacher/room double-booking
- ✅ **Subject period limits**: Enforces periodsPerWeek from curriculum
- ✅ **Special periods**: Configure breaks, lunch, assembly, etc.
- ✅ **Teacher codes**: Compact display with unique teacher identifiers
- ✅ **Mobile-responsive**: Works on phones, tablets, and desktops
- ✅ **Backward compatible**: Old timetables remain viewable

---

## Getting Started

### Prerequisites

1. You must have DoS (Director of Studies) access
2. Your school must have:
   - Classes configured
   - Terms configured
   - Subjects assigned to classes (DoS Curriculum)
   - Active teachers

### Accessing the System

1. Log in to the system
2. Navigate to **DoS** → **Timetable**
3. You'll see the timetable management page

---

## Configuration

### Step 1: Configure School Timetable Rules

Before creating timetables, configure your school's timing:

1. Click **"School Timetable Rules"** at the top of the page
2. Set the following:
   - **School Start Time**: e.g., 08:00
   - **School End Time**: e.g., 16:00
   - **Period Duration**: e.g., 40 minutes

3. **Add Special Periods** (optional):
   - Click **"Add Special Period"**
   - Enter name (e.g., "Break", "Lunch", "Assembly")
   - Set start and end times
   - Select applicable days (Mon-Fri)
   - Click **"Add"**

4. **Preview Time Slots**:
   - The system automatically calculates time slots
   - Review the preview to ensure it's correct
   - Special periods appear in yellow

5. Click **"Save Rules"**

### Example Configuration

```
School Start Time: 08:00
School End Time: 16:00
Period Duration: 40 minutes

Special Periods:
- Break: 10:30-10:45 (Mon-Fri)
- Lunch: 13:00-14:00 (Mon-Fri)
- Assembly: 08:00-08:30 (Monday only)

Generated Time Slots:
08:00-08:40
08:40-09:20
09:20-10:00
10:00-10:30
10:30-10:45 (Break)
10:45-11:25
... and so on
```

---

## Creating Timetables

### Step 1: Create a New Timetable

1. Click **"Create Timetable"** button
2. Select:
   - **Class**: e.g., P.7
   - **Term**: e.g., Term 1
   - **Name** (optional): Auto-generated if left blank
3. Click **"Create Timetable"**

### Step 2: Add Entries

1. Select the timetable from the list (left side)
2. Click on an empty slot in the grid
3. In the dialog:
   - **Subject**: Select from dropdown (shows periodsPerWeek limit)
   - **Teacher**: Select from dropdown (shows teacher code)
   - **Room** (optional): e.g., "Lab-1", "Room 203"
   - **Double Lesson** (optional): Check if 2 consecutive periods
   - **Notes** (optional): Any additional information
4. Click **"Add Entry"**

### Conflict Detection

The system automatically prevents:

1. **Slot Occupancy**: One subject per slot
2. **Teacher Double-Booking**: Same teacher, same time, different class
3. **Room Double-Booking**: Same room, same time, different class
4. **Subject Period Limit**: Exceeding periodsPerWeek from curriculum

If conflicts are detected, you'll see clear error messages explaining the issue.

### Subject Usage Indicators

Subjects show usage in the dropdown:

- **Gray (0/5)**: Not used yet
- **Orange (3/5)**: Partially used
- **Red (5/5 - Limit reached)**: Cannot add more periods (disabled)

---

## Managing Entries

### Viewing Entries

- **Hover** over any entry to see full details:
  - Subject name
  - Teacher name
  - Room
  - Notes

### Deleting Entries

1. Click the **"Remove"** button on an entry
2. Confirm deletion
3. Entry is removed immediately

### Locking Timetables

Once a timetable is finalized:

1. Select the timetable
2. Click **"Lock"** button
3. Locked timetables cannot be edited (prevents accidental changes)

To unlock: Click **"Unlock"** button

### Approving Timetables

1. Select the timetable
2. Click **"Approve"** button
3. Approved timetables are marked with a green badge

---

## Migration from Old Format

### Understanding the Difference

**Old Format** (Period-Based):

- Period 1, Period 2, Period 3...
- No actual times shown
- Less intuitive

**New Format** (Time-Based):

- 08:00-08:40, 08:40-09:20...
- Actual class times
- Professional and clear

### Migration Notice

If you have old timetables, you'll see a blue notice at the top:

**"📋 Old Timetable Format Detected"**

This notice explains:

- How many old timetables you have
- The difference between formats
- What you can do

### Archiving Old Timetables

To clean up old timetables:

1. Click **"Archive Old Timetables"** in the migration notice
2. All old timetables are moved to archive
3. They remain viewable but cannot be edited
4. They're hidden from the main list

### Viewing Archived Timetables

Archived timetables have:

- **Gray "Archived" badge**
- **Orange "Legacy Format" badge**
- **Warning message** when selected
- **Read-only mode** (cannot edit)

---

## Tips & Best Practices

### 1. Configure Rules First

Always configure school timetable rules before creating timetables. This ensures consistency across all timetables.

### 2. Use Teacher Codes

Teacher codes (e.g., "JD001") make timetables compact and professional. They're automatically generated.

### 3. Plan Subject Distribution

Before adding entries:

- Check periodsPerWeek for each subject
- Plan distribution across the week
- Avoid clustering subjects on one day

### 4. Use Special Periods

Configure breaks, lunch, and assembly as special periods. They:

- Appear in yellow
- Cannot have subjects assigned
- Make timetables more realistic

### 5. Lock Finalized Timetables

Once a timetable is complete and approved:

- Lock it to prevent accidental changes
- Unlock only when updates are needed

### 6. Regular Backups

The system automatically saves all changes, but:

- Approve timetables when finalized
- Lock them for safety
- Keep old timetables archived (not deleted)

---

## Troubleshooting

### Problem: "No subjects found for this class"

**Solution**:

1. Go to **DoS** → **Curriculum**
2. Assign subjects to the class
3. Set periodsPerWeek for each subject
4. Return to timetable and try again

### Problem: "Teacher is already teaching another class at this time"

**Solution**:

- This is a conflict - the teacher is double-booked
- Choose a different time slot or different teacher
- Check the other class's timetable to resolve

### Problem: "Subject has reached its maximum periods per week"

**Solution**:

- The subject has used all its allocated periods
- Check periodsPerWeek in DoS Curriculum
- Increase the limit if needed
- Or remove an existing entry to add a new one

### Problem: "Cannot edit locked timetable"

**Solution**:

1. Select the timetable
2. Click **"Unlock"** button
3. Make your changes
4. Click **"Lock"** again when done

### Problem: "Timetable already exists for this class and term"

**Solution**:

- Each class can have only one timetable per term
- Edit the existing timetable instead
- Or delete it and create a new one

### Problem: Time slots don't match school hours

**Solution**:

1. Open **"School Timetable Rules"**
2. Verify start time, end time, and period duration
3. Check special periods (they reduce available time)
4. Save rules and refresh the page

---

## Keyboard Shortcuts

- **Esc**: Close dialogs
- **Enter**: Submit forms (when focused)
- **Tab**: Navigate between fields

---

## Mobile Usage

The system is fully mobile-responsive:

- **Timetable list**: Scrollable on mobile
- **Grid**: Horizontal scroll for days
- **Dialogs**: Touch-friendly
- **Time ranges**: Compact format on small screens

---

## Support

For technical issues or questions:

1. Check this guide first
2. Review error messages (they're usually clear)
3. Contact your system administrator
4. Check the console logs (for developers)

---

## Glossary

- **DoS**: Director of Studies
- **Period**: A time slot for teaching (e.g., 08:00-08:40)
- **Special Period**: Non-teaching time (break, lunch, assembly)
- **Teacher Code**: Unique identifier for teachers (e.g., "JD001")
- **Subject Code**: Short identifier for subjects (e.g., "MATH", "BIO")
- **periodsPerWeek**: Maximum periods a subject can have per week
- **Conflict**: Scheduling issue (double-booking, limit exceeded)
- **Archived**: Old timetable (read-only, hidden from main list)
- **Legacy Format**: Old period-based timetables (Period 1, 2, 3)

---

**End of User Guide**

For technical documentation, see `TECHNICAL-GUIDE.md`
