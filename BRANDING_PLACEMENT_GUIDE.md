# SchoolOffice Branding Placement Guide

## Visual Layout Reference

### 📄 PDF Export Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                    Powered by SchoolOffice (8pt) │ ← Top Right
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                        SCHOOL NAME (18pt bold)                   │ ← Centered
│                      School Code: SCH001 (10pt)                  │ ← Centered
│                    123 Main Street, City (10pt)                  │ ← Centered
│                  +256-XXX-XXXX | email@school.com                │ ← Centered
│                                                                   │
│                    Financial Overview (14pt bold)                │ ← Centered
│                  Term 1 - Academic Year 2024 (10pt)              │ ← Centered
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Financial Summary                                                │
│  ┌──────────────────────┬─────────────────┐                     │
│  │ Total Expected       │ UGX 10,000,000  │                     │
│  │ Total Collected      │ UGX 8,500,000   │                     │
│  │ Total Outstanding    │ UGX 1,500,000   │                     │
│  │ Collection Rate      │ 85.0%           │                     │
│  └──────────────────────┴─────────────────┘                     │
│                                                                   │
│  Students with Outstanding Fees (15)                             │
│  ┌────────┬───────┬──────────┬──────────┬─────────────┬────┐   │
│  │ Student│ Class │ Total Due│   Paid   │ Outstanding │... │   │
│  ├────────┼───────┼──────────┼──────────┼─────────────┼────┤   │
│  │ John   │ P.5A  │ 500,000  │ 400,000  │ 100,000     │... │   │
│  └────────┴───────┴──────────┴──────────┴─────────────┴────┘   │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Generated on 22 February 2026, 14:30 | Page 1 of 2              │
│                                              SchoolOffice (7pt)  │ ← Bottom Right
└─────────────────────────────────────────────────────────────────┘
```

### 🖨️ Print Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                    Powered by SchoolOffice (9pt) │ ← Top Right
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                        SCHOOL NAME (24pt bold)                   │
│                      School Code: SCH001 (11pt)                  │
│                    123 Main Street, City (11pt)                  │
│                  +256-XXX-XXXX | email@school.com                │
│                                                                   │
│                    Financial Overview (16pt bold)                │
│                  Term 1 - Academic Year 2024 (12pt)              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Same content as PDF with proper table formatting]              │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ Generated on 22 February 2026, 14:30          SchoolOffice (8pt)│
└─────────────────────────────────────────────────────────────────┘
```

### 📊 Excel Export Layout

#### Summary Sheet:

```
┌─────────────────────────────────────────┐
│ A                    │ B                │
├──────────────────────┼──────────────────┤
│ SCHOOL NAME          │                  │ ← Row 1
│ Financial Overview   │                  │ ← Row 2
│ Term 1 - 2024        │                  │ ← Row 3
│                      │                  │
│ Financial Summary    │                  │ ← Row 5
│ Metric               │ Value            │ ← Row 6 (Header)
│ Total Expected       │ 10000000         │
│ Total Collected      │ 8500000          │
│ Total Outstanding    │ 1500000          │
│ Collection Rate      │ 85.0%            │
│                      │                  │
│ Students with Outstanding Fees (15)     │
│                      │                  │
│                      │                  │
│ Generated by SchoolOffice               │ ← Bottom
└─────────────────────────────────────────┘
```

#### Report Info Sheet:

```
┌─────────────────────────────────────────┐
│ A                    │ B                │
├──────────────────────┼──────────────────┤
│ Report Information   │                  │
│ Generated On         │ 22 Feb 2026...   │
│ School               │ SCHOOL NAME      │
│ School Code          │ SCH001           │
│ Term                 │ Term 1 - 2024    │
│                      │                  │
│ Generated by SchoolOffice               │ ← Bottom
└─────────────────────────────────────────┘
```

### 💻 On-Screen Display

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back                                                            │
│                                                                   │
│ Financial Overview                                                │ ← H1
│ School Name Here                                                  │ ← Small gray text
│ Term 1 - Academic Year 2024                                       │ ← Secondary text
│                                                                   │
│ [Refresh] [Print] [Export ▼]                                     │ ← Buttons
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [Financial Summary Cards]                                        │
│  [Outstanding Fees Table]                                         │
│  [Information Notice]                                             │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                  Powered by SchoolOffice                          │ ← Bottom center
│                     (small gray text)                             │
└─────────────────────────────────────────────────────────────────┘
```

## Color Specifications

### SchoolOffice Branding Colors:

| Location         | Color           | Hex     | RGB         | Opacity |
| ---------------- | --------------- | ------- | ----------- | ------- |
| PDF Top Right    | Light Gray      | #999999 | 153,153,153 | 100%    |
| PDF Bottom Right | Very Light Gray | #BBBBBB | 187,187,187 | 100%    |
| Print Header     | Light Gray      | #999999 | 153,153,153 | 100%    |
| Print Footer     | Light Gray      | #BBBBBB | 187,187,187 | 100%    |
| Screen Display   | Muted           | CSS var | -           | -       |

### School Branding Colors:

| Element     | Color            | Weight |
| ----------- | ---------------- | ------ |
| School Name | Black (#000)     | Bold   |
| School Code | Dark Gray (#333) | Normal |
| Address     | Dark Gray (#333) | Normal |
| Contact     | Dark Gray (#333) | Normal |

## Font Sizes

### PDF Export:

- SchoolOffice branding: 7-8pt
- School name: 18pt bold
- School details: 10pt
- Report title: 14pt bold
- Report subtitle: 10pt
- Body text: 9-10pt

### Print Output:

- SchoolOffice branding: 8-9pt
- School name: 24pt bold
- School details: 11pt
- Report title: 16pt bold
- Report subtitle: 12pt
- Body text: 11pt

### Excel Export:

- Default Excel font sizes
- Bold for headers
- Normal for data

### On-Screen:

- H1: Responsive (Tailwind classes)
- School name: text-xs (12px)
- Branding: text-xs (12px)

## Positioning Rules

### Top Right (PDF/Print):

- 10-15mm from right edge
- 10mm from top edge
- Right-aligned text
- Light gray color

### Bottom Right (PDF):

- 15mm from right edge
- 10mm from bottom edge
- Right-aligned text
- Very light gray color

### Bottom Center (Screen):

- Centered horizontally
- 16px padding top/bottom
- Muted text color
- Hidden in print

### Split Footer (Print):

- Left: Generation timestamp
- Right: SchoolOffice branding
- Flexbox layout
- 8px font size

## CSS Classes Used

```css
/* Hide in print */
.no-print {
  display: none !important;
}

/* Muted text */
text-[var(--text-muted)]

/* Secondary text */
text-[var(--text-secondary)]

/* Small text */
text-xs (12px)
```

## Accessibility Notes

- SchoolOffice branding is decorative, not essential
- School name is prominently displayed for screen readers
- Color contrast maintained for readability
- Font sizes meet minimum requirements
- Print styles preserve structure

## Brand Guidelines Compliance

✅ **Non-Intrusive**: Branding doesn't compete with school identity
✅ **Subtle**: Light colors and small fonts
✅ **Strategic**: Corners and edges only
✅ **Professional**: Consistent placement across formats
✅ **Respectful**: School branding always takes priority

---

**Last Updated**: February 2026
**Version**: 1.0
