# Timetable Print & Download Implementation

**Date**: 2026-02-14  
**Status**: ✅ **COMPLETE**

## Overview

Added print and download capabilities to the DoS Timetable Management page, allowing users to print timetables or export them as CSV files.

## Features Implemented

### 1. Print Functionality

**Button**:

- Icon-only button with FileText icon
- Tooltip: "Print Timetable"
- Calls `window.print()` to trigger browser print dialog

**Print Styles** (`src/styles/print-timetable.css`):

- Landscape page orientation for better table display
- Hides all UI elements (buttons, navigation, dialogs, alerts)
- Shows only the timetable grid and essential information
- Adds print-only header with timetable name, class, term, and print date
- Optimizes table formatting for print (borders, spacing, font sizes)
- Ensures colors are printed correctly
- Hides action buttons within table cells
- Makes grid full-width when printing

**Print-Specific Classes**:

- `.print-hide` - Hides elements when printing
- `.print-only` - Shows elements only when printing
- `.print-header` - Print-only header with timetable info

**Elements Hidden When Printing**:

- All buttons (Create, Auto-Generate, Print, Download, etc.)
- Timetables list (left sidebar)
- Error/success messages
- Migration notice
- Configuration panel
- Status badges
- Tooltips
- Action buttons in table cells
- Empty slot indicators

**Elements Shown When Printing**:

- Timetable name, class, and term
- Print date
- Complete timetable grid
- Subject codes and teacher codes
- Room numbers
- Legend (if present)

### 2. Download Functionality

**Button**:

- Icon-only button with Download icon
- Tooltip: "Download as CSV"
- Exports timetable as CSV file

**CSV Export Features**:

- Includes timetable metadata (name, class, term, status)
- Appropriate columns for single-class vs school-wide timetables
- Sorts entries by day and period
- Formats time ranges (e.g., "08:00-08:40")
- Handles missing data gracefully
- Downloads as `timetable-{name}-{date}.csv`

**CSV Structure**:

**Single-Class Timetable**:

```csv
Timetable: P.7 Timetable - Term 1
Class: P.7
Term: Term 1
Status: APPROVED

Day,Period,Time,Subject,Teacher,Room
Monday,1,08:00-08:40,Mathematics,John Doe,Room 101
Monday,2,08:40-09:20,English,Jane Smith,Room 102
...
```

**School-Wide Timetable**:

```csv
Timetable: School Master Timetable - Term 1
Class: All Classes
Term: Term 1
Status: APPROVED

Day,Period,Time,Class,Stream,Subject,Teacher,Room
Monday,1,08:00-08:40,P.7,A,Mathematics,John Doe,Room 101
Monday,1,08:00-08:40,P.6,B,English,Jane Smith,Room 102
...
```

## Technical Implementation

### Files Modified

1. **`src/app/(portals)/dos/timetable/page.tsx`**:
   - Added print and download buttons with tooltips
   - Added `handleDownloadTimetable()` function
   - Added print-hide classes to UI elements
   - Added print-only header
   - Imported print stylesheet

2. **`src/styles/print-timetable.css`** (NEW):
   - Complete print stylesheet with media queries
   - Landscape page orientation
   - Element visibility rules
   - Table formatting
   - Color preservation
   - Spacing optimization

### Code Snippets

**Print Button**:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        onClick={() => window.print()}
        className="border-gray-300"
      >
        <FileText className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Print Timetable</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Download Button**:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownloadTimetable()}
        className="border-gray-300"
      >
        <Download className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Download as CSV</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

**Download Handler**:

```typescript
const handleDownloadTimetable = () => {
  if (!selectedTimetable || !entries.length) {
    setError("No timetable data to download");
    return;
  }

  try {
    // Prepare CSV data
    const csvRows: string[] = [];

    // Header
    csvRows.push(`Timetable: ${selectedTimetable.timetableName}`);
    csvRows.push(`Class: ${selectedTimetable.className}`);
    csvRows.push(`Term: ${selectedTimetable.termName}`);
    csvRows.push(`Status: ${selectedTimetable.status}`);
    csvRows.push(""); // Empty line

    // Column headers
    if (selectedTimetable.isSchoolWide) {
      csvRows.push("Day,Period,Time,Class,Stream,Subject,Teacher,Room");
    } else {
      csvRows.push("Day,Period,Time,Subject,Teacher,Room");
    }

    // Sort entries by day and period
    const sortedEntries = [...entries].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.period - b.period;
    });

    // Data rows
    const dayNames = [
      "",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    sortedEntries.forEach((entry) => {
      const dayName = dayNames[entry.dayOfWeek] || `Day ${entry.dayOfWeek}`;
      const time =
        entry.startTime && entry.endTime
          ? `${entry.startTime}-${entry.endTime}`
          : `Period ${entry.period}`;
      const subject = entry.subjectName || "";
      const teacher = entry.teacherName || "";
      const room = entry.room || "";

      if (selectedTimetable.isSchoolWide) {
        const className = entry.className || "";
        const streamName = entry.streamName || "";
        csvRows.push(
          `"${dayName}","${entry.period}","${time}","${className}","${streamName}","${subject}","${teacher}","${room}"`,
        );
      } else {
        csvRows.push(
          `"${dayName}","${entry.period}","${time}","${subject}","${teacher}","${room}"`,
        );
      }
    });

    // Create CSV content
    const csvContent = csvRows.join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `timetable-${selectedTimetable.timetableName.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessMessage("Timetable downloaded successfully");
  } catch (err) {
    console.error("Error downloading timetable:", err);
    setError("Failed to download timetable");
  }
};
```

**Print-Only Header**:

```tsx
{
  /* Print-only header */
}
<div className="print-only print-header">
  <h1 className="text-2xl font-bold mb-2">
    {selectedTimetable?.timetableName || "Timetable"}
  </h1>
  <p className="text-lg">
    {selectedTimetable?.className} • {selectedTimetable?.termName}
  </p>
  <p className="text-sm text-gray-600 mt-1">
    Printed on: {new Date().toLocaleDateString()}
  </p>
</div>;
```

## User Experience

### Print Workflow

1. User selects a timetable from the list
2. User clicks the Print button (FileText icon)
3. Browser print dialog opens
4. Print preview shows:
   - Timetable name, class, and term at the top
   - Print date
   - Clean timetable grid without UI clutter
   - Landscape orientation for better readability
5. User can print or save as PDF

### Download Workflow

1. User selects a timetable from the list
2. User clicks the Download button (Download icon)
3. CSV file downloads automatically
4. Filename format: `timetable-{name}-{date}.csv`
5. Success message appears: "Timetable downloaded successfully"

## Benefits

1. **Print-Friendly**: Clean, professional print output without UI clutter
2. **Data Export**: CSV format for use in Excel, Google Sheets, or other tools
3. **Archival**: Easy to save timetables for records
4. **Sharing**: Can print or email timetables to teachers/parents
5. **Backup**: CSV export provides data backup
6. **Analysis**: CSV data can be analyzed in spreadsheet software

## Future Enhancements

1. **PDF Export**: Direct PDF generation with custom formatting
2. **Print Templates**: Multiple print layouts (compact, detailed, weekly view)
3. **Batch Export**: Export multiple timetables at once
4. **Email Integration**: Send timetables directly via email
5. **QR Codes**: Add QR codes to printed timetables for digital access
6. **Custom Branding**: Add school logo and branding to prints
7. **Teacher Schedules**: Export individual teacher schedules
8. **Room Schedules**: Export room utilization schedules

## Testing Checklist

- [x] Print button appears and is clickable
- [x] Download button appears and is clickable
- [x] Print preview shows clean layout
- [x] Print preview hides UI elements
- [x] Print preview shows timetable grid
- [x] Print preview shows print date
- [x] CSV download works for single-class timetables
- [x] CSV download works for school-wide timetables
- [x] CSV includes all required columns
- [x] CSV data is properly formatted
- [x] Filename is descriptive and includes date
- [x] Success message appears after download
- [x] Error handling works for empty timetables
- [x] Tooltips show on button hover
- [x] Buttons are icon-only with proper sizing
- [x] Print styles work in different browsers

## Browser Compatibility

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

## Status

✅ **COMPLETE** - Print and download functionality fully implemented and tested

---

**Version**: 1.0  
**Last Updated**: 2026-02-14
