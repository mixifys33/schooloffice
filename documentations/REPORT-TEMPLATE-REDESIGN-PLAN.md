# Report Card Template System - User-Friendly Redesign

**Date**: 2026-02-14  
**Status**: 📋 **PLANNING**

## Current Problem

The current template system requires users to write HTML code, which is:

- ❌ Too technical for school administrators
- ❌ Error-prone (one mistake breaks the template)
- ❌ No preview before using
- ❌ No guidance on what to include

## What Templates Actually Do

Templates control the **visual layout** of report cards when printed as PDF:

- School header (logo, name, address)
- Student information section
- Subjects table with scores
- Teacher comments
- Signatures section
- Footer

**Think of it like**: A Microsoft Word template for report cards - the layout is fixed, data fills in automatically.

## New Solution: Pre-Built Templates + Simple Customization

### 1. Pre-Built Templates (Included with System)

**Template 1: Classic Uganda Primary**

- Traditional layout used by most Ugandan primary schools
- School logo at top center
- Student info in table format
- Subjects in rows with CA, Exam, Total columns
- Class teacher and Head teacher comment boxes
- Signature lines at bottom

**Template 2: Modern Colorful**

- Colorful header with school colors
- Student photo section
- Subjects grouped by category
- Performance graphs
- Modern fonts and spacing

**Template 3: Compact**

- Fits more on one page
- Smaller fonts
- Condensed layout
- Good for schools with many subjects

**Template 4: Detailed**

- Two-page layout
- Page 1: Academic performance
- Page 2: Co-curricular activities, attendance, remarks
- Detailed breakdown of CA activities

### 2. Simple Customization (No HTML Required)

Users can customize these fields ONLY:

**School Information**:

- School name
- School motto
- School address
- School phone/email
- School logo (upload image)

**Colors & Branding**:

- Primary color (for headers)
- Secondary color (for borders)
- Font style (dropdown: Arial, Times New Roman, etc.)

**Content Sections** (Enable/Disable):

- [ ] Show school logo
- [ ] Show student photo
- [ ] Show attendance summary
- [ ] Show class teacher comment
- [ ] Show head teacher comment
- [ ] Show parent signature line
- [ ] Show performance graph

**Grading Display**:

- Show letter grades (A, B, C)
- Show grade points (4.0, 3.5)
- Show percentages (85%)
- Show all three

### 3. Template Preview

Before using a template, users can:

- See a **sample report card** with dummy data
- Download PDF preview
- Compare different templates side-by-side

### 4. Template Selection Workflow

**Step 1: Choose Base Template**

```
┌─────────────────────────────────────────┐
│  Select Report Card Template           │
├─────────────────────────────────────────┤
│                                         │
│  [Preview]  Classic Uganda Primary      │
│  ✓ Most popular                         │
│  ✓ Traditional layout                   │
│  ✓ Used by 500+ schools                 │
│                                         │
│  [Preview]  Modern Colorful             │
│  ✓ Eye-catching design                  │
│  ✓ Includes graphs                      │
│                                         │
│  [Preview]  Compact                     │
│  ✓ Fits on one page                     │
│  ✓ Good for many subjects               │
│                                         │
└─────────────────────────────────────────┘
```

**Step 2: Customize (Simple Form)**

```
┌─────────────────────────────────────────┐
│  Customize Template                     │
├─────────────────────────────────────────┤
│                                         │
│  School Name: [Rwenzori Valley PS    ] │
│  School Motto: [Excellence in All    ] │
│  School Address: [Fort Portal, Uganda] │
│                                         │
│  School Logo: [Upload Image]           │
│                                         │
│  Primary Color: [🎨 Blue]              │
│  Secondary Color: [🎨 Gray]            │
│                                         │
│  Show Sections:                         │
│  ☑ School Logo                          │
│  ☑ Student Photo                        │
│  ☑ Attendance Summary                   │
│  ☑ Class Teacher Comment                │
│  ☑ Head Teacher Comment                 │
│                                         │
│  [Preview Template] [Save Template]     │
└─────────────────────────────────────────┘
```

**Step 3: Preview & Save**

```
┌─────────────────────────────────────────┐
│  Template Preview                       │
├─────────────────────────────────────────┤
│                                         │
│  [PDF Preview with Sample Data]         │
│                                         │
│  Student: John Doe (Sample)             │
│  Class: P.7                             │
│  Subjects: Math, English, Science...    │
│                                         │
│  ✓ Looks good!                          │
│                                         │
│  [← Back] [Save & Use This Template]   │
└─────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Create Pre-Built Templates (Backend)

1. Create 4 HTML templates with placeholders
2. Store in database as system templates (cannot be deleted)
3. Add template seeding script for new schools

### Phase 2: Simple Customization UI (Frontend)

1. Replace HTML editor with simple form
2. Add image upload for school logo
3. Add color pickers
4. Add checkboxes for sections

### Phase 3: Template Preview

1. Generate sample PDF with dummy data
2. Show preview in modal
3. Allow download of preview

### Phase 4: Template Variables System

Templates use simple variables like:

- `{{school.name}}` - School name
- `{{student.name}}` - Student name
- `{{student.class}}` - Student class
- `{{subjects}}` - Loop through subjects
- `{{term.name}}` - Term name

**Users never see these** - they're hidden in the pre-built templates.

## Benefits

1. ✅ **No HTML knowledge required** - Simple form fields only
2. ✅ **Can't break the template** - Pre-built layouts are tested
3. ✅ **Preview before using** - See what it looks like
4. ✅ **Quick setup** - Choose template, customize, done
5. ✅ **Professional results** - Designed by developers, customized by users

## Migration Strategy

For existing schools with custom templates:

1. Keep their custom templates (mark as "Custom")
2. Offer to migrate to pre-built templates
3. Show comparison: "Your custom template vs. Classic Uganda Primary"

## Next Steps

1. Create 4 pre-built HTML templates
2. Update template creation UI to simple form
3. Add template preview functionality
4. Add template seeding for new schools
5. Test with real school administrators

---

**Goal**: Make report card templates as easy as uploading a school logo and clicking "Use Template"
