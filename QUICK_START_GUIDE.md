# Quick Start Guide - Defaulters Page Print & Export

## Installation (One-Time Setup)

1. Run the installation script:
   ```bash
   install-print-dependencies.bat
   ```
2. Restart your development server:
   ```bash
   npm run dev
   ```

## Using the Features

### 🖨️ Print Features

| Feature           | How to Access                  | What You Get                                     |
| ----------------- | ------------------------------ | ------------------------------------------------ |
| **Print List**    | Print → Print Current List     | Filtered defaulter list with summary stats       |
| **Print Letters** | Print → Print Reminder Letters | Personalized letters for all filtered defaulters |
| **Print Summary** | Print → Print Summary Report   | Executive summary with charts and analysis       |

### 📥 Export Features

| Feature          | How to Access                          | File Format | What You Get                        |
| ---------------- | -------------------------------------- | ----------- | ----------------------------------- |
| **Excel Export** | Export → Export to Excel/CSV           | .csv        | Spreadsheet with all defaulter data |
| **List PDF**     | Export → Download List PDF             | .pdf        | PDF of defaulter list (landscape)   |
| **Summary PDF**  | Export → Download Summary PDF          | .pdf        | PDF of executive summary (portrait) |
| **Letters PDF**  | Export → Download Reminder Letters PDF | .pdf        | PDF with all reminder letters       |

### 🔍 Filter & Sort

1. **Class Filter**: Select specific class or "All Classes"
2. **Severity Filter**: Low/Medium/High risk based on days overdue
3. **Student Type**: Day or Boarding students
4. **Balance Range**: Set minimum and maximum balance amounts
5. **Sort By**: Choose field to sort by
6. **Sort Order**: Toggle between ascending/descending
7. **Search**: Type to search by student name, class, or parent name

## Tips & Tricks

### For Best Print Results

- Use Chrome or Edge browser
- Set margins to "Default" in print settings
- Enable "Background graphics" for colored elements
- Use landscape orientation for list, portrait for letters

### For Excel Export

- File opens in Excel, Google Sheets, or any spreadsheet app
- All currency values are properly formatted
- Dates are in DD/MM/YYYY format
- Perfect for mail merge or further analysis

### For PDF Generation

- PDFs are generated client-side (no server needed)
- May take 2-5 seconds for large datasets
- If it fails, try filtering to fewer records
- PDFs are ready to email or print

## Common Workflows

### Workflow 1: Send Reminder Letters

1. Filter defaulters (e.g., High Risk, Class 5)
2. Click Print → Print Reminder Letters
3. Review in print preview
4. Print or save as PDF
5. Distribute to parents

### Workflow 2: Monthly Report for Management

1. Set filters to show all defaulters
2. Click Export → Download Summary PDF
3. Review the executive summary
4. Share with school administration

### Workflow 3: Follow-up on Specific Class

1. Select class from dropdown
2. Set severity to "High Risk"
3. Click Export → Export to Excel/CSV
4. Use spreadsheet for phone calls or emails

### Workflow 4: Parent Meeting Preparation

1. Search for specific student
2. View their details in the table
3. Click Print → Print Student Statement (if implemented)
4. Use statement in parent meeting

## Troubleshooting

### Print Not Working?

- Check if pop-ups are blocked
- Try a different browser
- Ensure print preview loads completely

### PDF Download Fails?

- Check browser console for errors
- Try with fewer records (use filters)
- Ensure html2canvas is installed
- Clear browser cache

### Excel Export Issues?

- Check if download was blocked
- Look in Downloads folder
- Try a different browser
- Disable pop-up blockers

## Keyboard Shortcuts

- **Ctrl+P**: Quick print (after clicking Print button)
- **Ctrl+F**: Search in browser (for finding specific students)
- **Esc**: Close dropdown menus

## Need Help?

1. Check `PRINT_EXPORT_FEATURES.md` for detailed documentation
2. Review `DEFAULTERS_PAGE_COMPLETE.md` for complete feature list
3. Contact IT support if issues persist

## Quick Reference

### File Naming Convention

- Excel: `Defaulters_List_YYYY-MM-DD.csv`
- PDF List: `Defaulters_List_YYYY-MM-DD.pdf`
- PDF Summary: `Defaulters_Summary_YYYY-MM-DD.pdf`
- PDF Letters: `Reminder_Letters_YYYY-MM-DD.pdf`

### Print Orientations

- Defaulter List: **Landscape** (better for tables)
- Reminder Letters: **Portrait** (standard letter format)
- Summary Report: **Portrait** (standard report format)
- Student Statement: **Portrait** (standard statement format)

---

**Last Updated**: February 2025
**Version**: 1.0
**Status**: Production Ready ✅
