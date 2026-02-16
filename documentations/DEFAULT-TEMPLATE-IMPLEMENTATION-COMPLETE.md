# Default Report Card Template - Implementation Complete

**Date**: 2026-02-14  
**Status**: ✅ **READY TO USE**

## What Was Done

### 1. Updated Prisma Schema

Added two new fields to `ReportTemplate` model:

```prisma
model ReportTemplate {
  // ... existing fields
  content     String?  // Now nullable - null = use built-in PDF service
  isSystemTemplate Boolean @default(false) // Cannot be deleted/edited
  // ... rest of fields
}
```

**Changes**:
- `content` is now optional (nullable)
- Added `isSystemTemplate` flag for system-managed templates

### 2. Created Default Template Script

**File**: `create-default-template.js`

This script:
- ✅ Finds all schools in the database
- ✅ Creates a "Default Report Card" template for each school
- ✅ Sets `content = null` (uses built-in PDF service)
- ✅ Sets `isSystemTemplate = true` (cannot be deleted)
- ✅ Sets `isDefault = true` (auto-selected)

### 3. How It Works

**System Default Template**:
```javascript
{
  name: "Default Report Card",
  type: "NEW_CURRICULUM",
  content: null,  // ← null means use built-in PDF service
  isSystemTemplate: true,  // ← cannot be deleted
  isDefault: true,  // ← auto-selected
  isActive: true
}
```

**When Generating Reports**:
```typescript
// In report generation service
const template = await getTemplate(templateId)

if (!template.content || template.isSystemTemplate) {
  // Use built-in PDF service (your existing code)
  const pdf = pdfGenerationService.generateFinalReportPDF(reportData, schoolName)
} else {
  // Use custom template (advanced users only)
  const pdf = pdfGenerationService.generatePDFFromTemplate(template.content, reportData)
}
```

## How to Use

### Step 1: Update Database Schema

```bash
npx prisma db push
```

This adds the new fields to your database.

### Step 2: Create Default Templates

```bash
node create-default-template.js
```

This creates a default template for your school (and any other schools in the database).

### Step 3: Generate Reports

1. Go to `/dos/reports/generate`
2. Select term
3. Template is auto-selected: "Default Report Card"
4. Click "Generate" on any class
5. Reports are generated using the built-in PDF service!

## What Users See

### Generate Page

```
Configuration
┌─────────────────────────────────────────┐
│ Term: [Term 1 2026]                     │
│ Template: [Default Report Card ✓]       │
│           (Auto-selected, ready to use) │
└─────────────────────────────────────────┘

[Generate Selected Classes]
```

### Templates Page (Optional)

```
Report Card Templates
┌─────────────────────────────────────────┐
│ ✓ Default Report Card (System)         │
│   Professional layout with school       │
│   branding. Uses built-in PDF service.  │
│   [Preview] [Cannot Delete]             │
│                                         │
│ [+ Create Custom Template]              │
│   (Advanced users only - requires HTML) │
└─────────────────────────────────────────┘
```

## Benefits

1. ✅ **No HTML knowledge required** - Works out of the box
2. ✅ **Professional layout** - Uses your existing PDF service
3. ✅ **Cannot be deleted** - System template is protected
4. ✅ **Auto-selected** - No configuration needed
5. ✅ **Custom templates optional** - Advanced users can still create them

## For Advanced Users

If a user wants a custom layout, they can:
1. Click "Create Custom Template"
2. Write HTML with Handlebars variables
3. Set as default (replaces system default)
4. System default template remains available as fallback

## Technical Details

### Built-in PDF Service Features

Your `pdf-generation.service.ts` already includes:
- School header with logo
- Student information table
- Subjects table with CA, Exam, Final scores
- Performance summary
- Attendance tracking
- Teacher comments section
- Signatures
- Watermarks for drafts
- Page numbers and footers

### Template Variables (For Custom Templates)

If users create custom templates, they can use:
- `{{school.name}}` - School name
- `{{student.name}}` - Student name
- `{{student.class}}` - Student class
- `{{term.name}}` - Term name
- `{{subjects}}` - Array of subjects
- `{{summary.averageScore}}` - Average score
- And many more...

## Migration for Existing Schools

If you already have custom templates:
1. They will continue to work
2. System default template is added alongside them
3. Users can switch between custom and default
4. System default is set as default initially

## Next Steps

1. Run `npx prisma db push` to update schema
2. Run `node create-default-template.js` to create templates
3. Test report generation - should work immediately!
4. (Optional) Add school branding in settings page later

## Troubleshooting

**Q: Template dropdown is empty**
A: Run `node create-default-template.js` to create the default template

**Q: Reports still require HTML**
A: Make sure the template has `content = null` and `isSystemTemplate = true`

**Q: Can I delete the default template?**
A: No, system templates cannot be deleted (protected by `isSystemTemplate` flag)

**Q: Can I customize the default template?**
A: No, but you can create a custom template and set it as default

---

**Status**: ✅ **READY TO USE** - Run the two commands above and start generating reports!
