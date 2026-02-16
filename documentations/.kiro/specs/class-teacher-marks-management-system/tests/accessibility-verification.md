# Accessibility Verification Checklist

## Teacher Marks Management System

**Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7**

### WCAG 2.1 AA Compliance

#### ✅ 1. Keyboard Navigation (21.3)

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order follows logical reading order
- [ ] Focus indicators are clearly visible
- [ ] No keyboard traps exist
- [ ] Escape key closes modals and dialogs
- [ ] Enter/Space activates buttons and links
- [ ] Arrow keys navigate within components (tables, dropdowns)

**Test Steps:**

1. Navigate entire marks entry interface using only Tab key
2. Verify all buttons, inputs, and links are reachable
3. Test form submission using Enter key
4. Test modal/dialog closure using Escape key
5. Verify focus returns to trigger element after modal close

#### ✅ 2. ARIA Labels and Semantic HTML (21.2)

- [ ] All form inputs have associated labels
- [ ] Buttons have descriptive aria-labels
- [ ] Tables use proper semantic markup (thead, tbody, th, td)
- [ ] Headings follow hierarchical structure (h1 → h2 → h3)
- [ ] Landmarks are properly defined (nav, main, aside)
- [ ] Dynamic content changes are announced (aria-live)
- [ ] Error messages are associated with form fields (aria-describedby)

**Test Steps:**

1. Inspect HTML structure for semantic elements
2. Verify all interactive elements have accessible names
3. Check heading hierarchy with browser dev tools
4. Test with screen reader (NVDA/JAWS/VoiceOver)

#### ✅ 3. Color Contrast Ratios (21.4)

- [ ] Text has minimum 4.5:1 contrast ratio
- [ ] Large text (18pt+) has minimum 3:1 contrast ratio
- [ ] Interactive elements have sufficient contrast
- [ ] Focus indicators have minimum 3:1 contrast
- [ ] Error states use color + text/icons (not color alone)

**Test Steps:**

1. Use browser contrast checker extension
2. Verify all text meets minimum contrast requirements
3. Test with color blindness simulator
4. Verify error states are distinguishable without color

**Contrast Requirements:**

- Normal text: 4.5:1
- Large text (18pt/14pt bold): 3:1
- UI components: 3:1
- Focus indicators: 3:1

#### ✅ 4. Screen Reader Support (21.5)

- [ ] All content is readable by screen readers
- [ ] Form fields announce labels and validation errors
- [ ] Tables announce headers and data relationships
- [ ] Dynamic updates are announced (aria-live regions)
- [ ] Loading states are announced
- [ ] Success/error messages are announced

**Test Steps:**

1. Navigate with NVDA (Windows) or VoiceOver (Mac)
2. Verify all content is announced correctly
3. Test form submission and error handling
4. Verify table navigation announces headers
5. Test dynamic content updates

#### ✅ 5. Focus Management (21.6)

- [ ] Focus indicators are clearly visible (2px outline minimum)
- [ ] Focus order is logical and predictable
- [ ] Focus is trapped within modals
- [ ] Focus returns to trigger after modal close
- [ ] Skip links allow bypassing navigation
- [ ] Focus is not lost during dynamic updates

**Test Steps:**

1. Tab through entire interface
2. Verify focus indicators are visible on all elements
3. Test modal focus trapping
4. Verify focus restoration after modal close
5. Test skip links functionality

#### ✅ 6. Form Accessibility

- [ ] All inputs have visible labels
- [ ] Required fields are clearly marked
- [ ] Validation errors are announced and associated with fields
- [ ] Error messages are descriptive and actionable
- [ ] Success messages are announced
- [ ] Autocomplete attributes are used where appropriate

**Test Steps:**

1. Submit form with errors
2. Verify error messages are announced by screen reader
3. Verify error messages are associated with fields
4. Test form completion with keyboard only
5. Verify success messages are announced

#### ✅ 7. Table Accessibility

- [ ] Tables use proper semantic markup
- [ ] Column headers are marked with `<th scope="col">`
- [ ] Row headers are marked with `<th scope="row">` where applicable
- [ ] Complex tables use aria-describedby for additional context
- [ ] Table captions describe table purpose
- [ ] Sortable columns announce sort state

**Test Steps:**

1. Navigate table with screen reader
2. Verify headers are announced for each cell
3. Test column sorting with keyboard
4. Verify sort state is announced

### Automated Testing Tools

#### Recommended Tools:

1. **axe DevTools** - Browser extension for automated accessibility testing
2. **WAVE** - Web accessibility evaluation tool
3. **Lighthouse** - Chrome DevTools accessibility audit
4. **Pa11y** - Automated accessibility testing CLI tool

#### Running Automated Tests:

```bash
# Install Pa11y
npm install -g pa11y

# Test marks entry page
pa11y http://localhost:3000/dashboard/teacher/students

# Test with specific WCAG level
pa11y --standard WCAG2AA http://localhost:3000/dashboard/teacher/students

# Generate HTML report
pa11y --reporter html http://localhost:3000/dashboard/teacher/students > accessibility-report.html
```

### Manual Testing Checklist

#### Browser Testing:

- [ ] Chrome + NVDA (Windows)
- [ ] Firefox + NVDA (Windows)
- [ ] Safari + VoiceOver (Mac)
- [ ] Edge + Narrator (Windows)

#### Device Testing:

- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

#### Keyboard-Only Testing:

- [ ] Complete entire marks entry workflow using only keyboard
- [ ] Navigate progressive filters
- [ ] Enter marks in table
- [ ] Submit batch save
- [ ] Handle validation errors
- [ ] View grade calculations

### Common Accessibility Issues to Avoid

❌ **Don't:**

- Use color alone to convey information
- Create keyboard traps
- Use non-semantic HTML (divs for buttons)
- Forget to announce dynamic content changes
- Use insufficient color contrast
- Hide focus indicators
- Use placeholder text as labels

✅ **Do:**

- Use semantic HTML elements
- Provide text alternatives for visual information
- Ensure keyboard accessibility
- Use ARIA attributes appropriately
- Maintain logical focus order
- Announce dynamic changes
- Provide clear error messages

### Accessibility Testing Results

**Date:** ******\_******
**Tester:** ******\_******

| Requirement         | Status          | Notes |
| ------------------- | --------------- | ----- |
| Keyboard Navigation | ⬜ Pass ⬜ Fail |       |
| ARIA Labels         | ⬜ Pass ⬜ Fail |       |
| Color Contrast      | ⬜ Pass ⬜ Fail |       |
| Screen Reader       | ⬜ Pass ⬜ Fail |       |
| Focus Management    | ⬜ Pass ⬜ Fail |       |
| Form Accessibility  | ⬜ Pass ⬜ Fail |       |
| Table Accessibility | ⬜ Pass ⬜ Fail |       |

**Overall Result:** ⬜ Pass ⬜ Fail

**Issues Found:**

1. ***
2. ***
3. ***

**Recommendations:**

1. ***
2. ***
3. ***
