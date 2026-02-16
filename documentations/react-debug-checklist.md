# React Error Debug Checklist

## Error: "Objects are not valid as a React child (found: object with keys {name})"

### Fixed Issues ✅
- Prisma schema relation fields - RESOLVED
- Report card template editor description field - RESOLVED

### Debugging Steps

1. **Check Browser Console**
   - Open browser dev tools
   - Look for the full error stack trace
   - The stack trace will show the exact component and line causing the issue

2. **Common Patterns to Check**
   ```jsx
   // ❌ Wrong - renders object directly
   {user}
   
   // ✅ Correct - renders object property
   {user.name}
   
   // ❌ Wrong - function returns object
   const getName = () => ({ name: 'John' })
   {getName()}
   
   // ✅ Correct - function returns string
   const getName = () => 'John'
   {getName()}
   ```

3. **Check These Specific Areas**
   - Components that display user names, school names, or any entity with a `name` property
   - Recently modified components
   - Components that fetch data and might receive objects instead of expected strings

4. **Search Patterns**
   ```bash
   # Look for potential object rendering
   grep -r "\{[^}]*[^\.]\w\+[^}]*\}" src/components --include="*.tsx"
   
   # Look for name property usage
   grep -r "\.name" src/components --include="*.tsx"
   ```

5. **Test Specific Components**
   - Try commenting out recently added components
   - Check if error occurs on specific pages/routes

### Most Likely Locations
Based on the error mentioning "object with keys {name}", check:
- User profile components
- School/entity display components  
- Form components that display names
- Dashboard components showing entity information

### Quick Fix Pattern
If you find `{someObject}`, replace with `{someObject?.name || ''}` or the appropriate property.