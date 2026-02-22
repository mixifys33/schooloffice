# Print and Export Features - Defaulters Page

This document describes all the print and export capabilities implemented for the Fee Defaulters page.

## Installation

First, install the required dependencies:

```bash
npm install html2canvas
```

Note: `jspdf` is already installed in the project.

## Features Implemented

### 1. Print Capabilities

#### A. Print Current List

- **Description**: Prints the filtered/sorted defaulter list as currently displayed
- **Features**:
  - Includes summary statistics at the top
  - Professional formatting with school branding
  - Landscape orientation for better table display
  - Print-optimized CSS (removes buttons, adjusts colors)
  - Page breaks for better readability
- **How to Use**: Click "Print" → "Print Current List"
- **Component**: `PrintDefaulterList`

#### B. Print Reminder Letters

- **Description**: Bulk print personalized reminder letters for all filtered defaulters
- **Features**:
  - Professional letterhead format
  - Personalized with student/parent names
  - Shows outstanding balance and payment deadline
  - Payment details table
  - Professional signature section
  - Each letter on a separate page
- **How to Use**: Click "Print" → "Print Reminder Letters"
- **Component**: `PrintReminderLetters`

#### C. Print Summary Report

- **Description**: Executive summary with charts and analysis
- **Features**:
  - Key metrics dashboard
  - Class-wise breakdown table
  - Severity analysis with visual bars
  - Student type breakdown (Day/Boarding)
  - Top 10 defaulters list
  - Recommendations section
- **How to Use**: Click "Print" → "Print Summary Report"
- **Component**: `PrintSummaryReport`

#### D. Print Individual Student Statement

- **Description**: Detailed statement for a single student
- **Features**:
  - Student and parent information
  - Fee summary with outstanding balance
  - Complete payment history
  - Running balance calculation
  - Professional formatting
- **How to Use**: (Can be triggered from individual student actions)
- **Component**: `PrintStudentStatement`

### 2. Export Capabilities

#### A. Excel/CSV Export

- **Description**: Export filtered defaulter list to Excel/CSV format
- **Features**:
  - All columns included (name, class, balance, contact info, etc.)
  - Properly formatted currency and dates
  - Can be opened in Excel, Google Sheets, etc.
  - Useful for further analysis or mail merge
  - Filename includes current date
- **How to Use**: Click "Export" → "Export to Excel/CSV"
- **Function**: `handleExportExcel()`

#### B. PDF Downloads

##### Download List PDF

- **Description**: Professional PDF of the current defaulter list
- **Features**:
  - Landscape orientation
  - Same content as print list
  - Downloadable file
- **How to Use**: Click "Export" → "Download List PDF"

##### Download Summary PDF

- **Description**: Executive summary report as PDF
- **Features**:
  - Portrait orientation
  - Charts and analysis
  - Professional formatting
- **How to Use**: Click "Export" → "Download Summary PDF"

##### Download Reminder Letters PDF

- **Description**: All reminder letters in one PDF file
- **Features**:
  - Portrait orientation
  - All letters included
  - Ready to print or email
- **How to Use**: Click "Export" → "Download Reminder Letters PDF"

## Technical Implementation

### File Structure

```
src/
├── lib/
│   ├── export-utils.ts          # Export utilities (CSV, Excel, Print)
│   └── pdf-utils.ts              # PDF generation utilities
├── components/
│   └── bursar/
│       ├── print-defaulter-list.tsx
│       ├── print-reminder-letters.tsx
│       ├── print-student-statement.tsx
│       └── print-summary-report.tsx
└── app/(back)/dashboard/bursar/
    └── defaulters/
        └── page.tsx              # Main page with all functionality
```

### Key Functions

#### Export Utils (`src/lib/export-utils.ts`)

- `convertToCSV()` - Convert data to CSV format
- `downloadCSV()` - Download CSV file
- `downloadExcel()` - Download Excel file
- `formatCurrencyForExport()` - Format currency for export
- `formatDateForExport()` - Format date for export
- `triggerPrint()` - Trigger browser print dialog
- `generatePrintHTML()` - Generate print-friendly HTML
- `openPrintPreview()` - Open print preview in new window

#### PDF Utils (`src/lib/pdf-utils.ts`)

- `generatePDFFromElement()` - Generate PDF from HTML element
- `generatePDFFromHTML()` - Generate PDF from HTML string
- `checkPDFLibraries()` - Check if PDF libraries are available

### Print Components

All print components are hidden by default (`className="hidden print:block"`) and only shown when printing or generating PDFs.

#### PrintDefaulterList

- Props: `defaulters`, `schoolName`, `termName`, `academicYear`, `totalOutstanding`, `highRisk`, `critical`
- Orientation: Landscape
- Features: Summary stats, full table with all columns

#### PrintReminderLetters

- Props: `defaulters`, `schoolName`, `schoolAddress`, `schoolPhone`, `schoolEmail`, `termName`, `paymentDeadline`
- Orientation: Portrait
- Features: Professional letterhead, personalized content, payment details

#### PrintStudentStatement

- Props: `student`, `payments`, `schoolName`, `schoolAddress`, `schoolPhone`, `schoolEmail`, `termName`, `academicYear`
- Orientation: Portrait
- Features: Student info, fee summary, payment history

#### PrintSummaryReport

- Props: `defaulters`, `schoolName`, `termName`, `academicYear`, `totalOutstanding`, `highRisk`, `critical`
- Orientation: Portrait
- Features: Key metrics, class breakdown, severity analysis, top 10 defaulters

## Customization

### School Information

To customize school information in print documents, update the props passed to print components in `page.tsx`:

```typescript
<PrintDefaulterList
  schoolName="Your School Name"
  termName="Term 1"
  academicYear="2024/2025"
  // ... other props
/>
```

### Styling

Print styles are defined within each component using:

- Inline `<style jsx>` tags for print-specific CSS
- Tailwind classes with `print:` prefix
- `@media print` queries

### Payment Deadline

Update the payment deadline in reminder letters:

```typescript
<PrintReminderLetters
  paymentDeadline="31st March 2025"
  // ... other props
/>
```

## Browser Compatibility

- **Print**: Works in all modern browsers
- **PDF Generation**: Requires modern browsers with Canvas API support
- **Excel/CSV Export**: Works in all browsers

## Troubleshooting

### PDF Generation Issues

If PDF generation fails:

1. Check browser console for errors
2. Ensure `html2canvas` and `jspdf` are installed
3. Try reducing the amount of data (filter to fewer defaulters)
4. Check if the element ID exists in the DOM

### Print Styling Issues

If print output doesn't look correct:

1. Check browser print preview
2. Ensure print-specific CSS is loading
3. Try different browsers
4. Check page margins in print settings

### Excel Export Issues

If Excel export doesn't work:

1. Check browser console for errors
2. Ensure data is properly formatted
3. Try with fewer records first
4. Check if pop-up blockers are interfering

## Future Enhancements

Potential improvements:

1. Add QR codes for payment links
2. Implement scheduled reports (auto-generate and email)
3. Add custom template editor
4. Support for multiple languages
5. Watermarks and security features
6. Batch processing for large datasets
7. Email integration for sending reports directly

## Support 

For issues or questions, contact the development team or refer to the main project documentation.
