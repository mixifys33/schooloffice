# Financial Overview Print & Export Guide

## Overview

The Financial Overview page now has comprehensive print and export capabilities with proper formatting and school branding.

## Features Implemented

### 1. Print Functionality

- **Button**: "Print" button in the header
- **School Branding**: Automatically includes school name, code, address, phone, and email
- **Formatted Output**: Maintains table structure, colors, and layout
- **Professional Layout**: Landscape orientation with proper margins
- **Auto-Print**: Opens print dialog automatically

### 2. Export to PDF

- **Format**: Landscape A4 with proper margins
- **Content**:
  - School header with full details
  - Financial summary with metrics
  - Complete student outstanding fees table
  - Footer with generation timestamp
- **Styling**: Professional colors, proper table formatting
- **File Naming**: `Financial_Overview_[Term]_[Date].pdf`

### 3. Export to Excel

- **Multiple Sheets**:
  - Summary sheet with financial metrics
  - Outstanding Fees sheet with detailed student data
  - Report Info sheet with metadata
- **Formatting**: Proper column widths, headers, and data types
- **File Naming**: `Financial_Overview_[Term]_[Date].xlsx`

## How to Use

### Print

1. Click the "Print" button in the header
2. A new window opens with formatted content
3. Print dialog appears automatically
4. Select your printer and print

### Export

1. Click the "Export" dropdown button
2. Choose either:
   - "Export as PDF" - for sharing and archiving
   - "Export as Excel" - for data analysis and manipulation

## Technical Details

### Files Modified

1. **src/app/(back)/dashboard/school-admin/financial-overview/page.tsx**
   - Added print and export handlers
   - Integrated school info fetching
   - Added export dropdown menu
   - Wrapped content in printable container

2. **src/lib/print-export-utils.ts**
   - Enhanced print styles for better formatting
   - Fixed TypeScript issues
   - Improved PDF generation with proper headers
   - Enhanced Excel export with multiple sheets

3. **src/app/globals.css**
   - Added comprehensive print media queries
   - Ensured proper page breaks
   - Maintained table formatting in print
   - Preserved colors with print-color-adjust

### Format Preservation

#### Tables

- ✅ Borders maintained
- ✅ Header colors preserved
- ✅ Alternating row colors
- ✅ Proper column alignment
- ✅ Page breaks handled correctly

#### Colors

- ✅ Green for positive values (paid amounts)
- ✅ Red for negative values (outstanding balances)
- ✅ Blue for headers
- ✅ All colors preserved in PDF and print

#### Layout

- ✅ Grid layout for stat cards
- ✅ Responsive tables
- ✅ Proper spacing and margins
- ✅ Professional typography

### School Branding

The system automatically fetches school information from `/api/settings/school` including:

- School name
- School code
- Address
- Phone number
- Email address
- Logo (if available)

This information is displayed prominently in all printed and exported documents.

## Browser Compatibility

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Print preview may vary slightly by browser

## Tips for Best Results

### Printing

- Use landscape orientation for best results
- Ensure "Background graphics" is enabled in print settings
- Use "Save as PDF" in print dialog for digital archiving

### PDF Export

- Files are automatically downloaded
- No additional software needed
- Maintains exact formatting

### Excel Export

- Open in Microsoft Excel, Google Sheets, or LibreOffice
- All data is editable
- Formulas can be added for further analysis
- Multiple sheets for organized data

## Troubleshooting

### Print button not working

- Check if popups are blocked in your browser
- Allow popups for this site

### Colors not showing in print

- Enable "Background graphics" in print settings
- Use "Print using system dialog" option

### Export buttons disabled

- Ensure data has loaded completely
- Check browser console for errors
- Refresh the page and try again

## Future Enhancements (Optional)

- Add logo to printed documents
- Custom date range filtering
- Additional export formats (CSV, Word)
- Email report directly from the page
- Schedule automatic report generation
- Watermark for draft reports

## Support

If you encounter any issues:

1. Check browser console for errors
2. Ensure all dependencies are installed
3. Verify API endpoints are accessible
4. Test with different browsers

---

**Last Updated**: February 2026
**Version**: 1.0
