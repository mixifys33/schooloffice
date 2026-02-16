# Role-Based Access Control Audit

**Date**: 2026-02-10  
**Status**: ⚠️ **PARTIAL PROTECTION** - Needs Enhancement

---

## Current State

### ✅ What's Working

**1. Main Dashboard Layout** (`src/app/(back)/dashboard/layout.tsx`)

- ✅ Checks authentication via NextAuth session
- ✅ Redirects unauthenticated users to `/login`
- ✅ Shows role-specific navigation based on user role
- ✅ Filters navigation items by role (DoS, Class Teacher, Teacher, Admin)

**2. Middleware** (`middleware.ts`)

- ✅ Protects Super Admin routes (`/super-admin`, `/dashboard/super-admin`, `/api/super-admin`)
- ✅ Verifies SUPER_ADMIN role
- ✅ Logs authentication failures
- ✅ Returns 401/403 for unauthorized access

**3. Auth System** (`src/lib/auth.ts`)

- ✅ School-first authentication
- ✅ Multi-role support (User roles + Staff roles)
- ✅ Session management with JWT
- ✅ Role-based dashboard routing via `getDashboardPath()`

### ⚠️ What's Missing

**Individual Section Layouts Have NO Role Verification:**

1. **DoS Layout** (`src/app/(back)/dashboard/dos/layout.tsx`)
   - ❌ No authentication check
   - ❌ No role verification
   - ❌ Anyone with a session can access

2. **Class Teacher Layout** (`src/app/(back)/dashboard/class-teacher/layout.tsx`)
   - ❌ No authentication check
   - ❌ No role verification
   - ❌ Anyone with a session can access

3. **Teacher Layout** (`src/app/(back)/dashboard/teacher/layout.tsx`)
   - ❌ No authentication check
   - ❌ No role verification
   - ❌ Anyone with a session can access

4. **Parent Layout** (`src/app/(back)/dashboard/parent/layout.tsx`)
   - ❌ No authentication check
   - ❌ No role verification
   - ❌ Anyone with a session can access

5. **Student Layout** (`src/app/(back)/dashboard/student/layout.tsx`)
   - ❌ No authentication check
   - ❌ No role verification
   - ❌ Anyone with a session can access

---

## Security Risk

### Current Vulnerability:

Any authenticated user can manually navigate to any dashboard section by typing the URL:

- A **Teacher** can access `/dashboard/dos` (DoS portal)
- A **Student** can access `/dashboard/class-teacher` (Class Teacher portal)
- A **Parent** can access `/dashboard/bursar` (Bursar portal)

### Why This Happens:

The main dashboard layout shows/hides navigation based on role, but **doesn't prevent direct URL access**. The individual section layouts don't verify the user has the required role.

---

## Required Roles for Each Section

### DoS Portal (`/dashboard/dos/*`)

**Allowed Roles**:

- `Role.SCHOOL_ADMIN`
- `Role.DEPUTY`
- `StaffRole.DOS`

### Class Teacher Portal (`/dashboard/class-teacher/*`)

**Allowed Roles**:

- `StaffRole.CLASS_TEACHER`
- `Role.SCHOOL_ADMIN` (for oversight)
- `Role.DEPUTY` (for oversight)

### Teacher Portal (`/dashboard/teacher/*`)

**Allowed Roles**:

- `Role.TEACHER`
- `StaffRole.CLASS_TEACHER` (class teachers are also teachers)
- `Role.SCHOOL_ADMIN` (for oversight)
- `Role.DEPUTY` (for oversight)

### Parent Portal (`/dashboard/parent/*`)

**Allowed Roles**:

- `Role.PARENT`

### Student Portal (`/dashboard/student/*`)

**Allowed Roles**:

- `Role.STUDENT`

### Bursar Portal (`/dashboard/bursar/*`)

**Allowed Roles**:

- `StaffRole.BURSAR`
- `Role.SCHOOL_ADMIN` (for oversight)
- `Role.DEPUTY` (for oversight)

---

## Solution: Add Role Guards to Each Layout

### Option 1: Middleware Expansion (Recommended)

Expand `middleware.ts` to protect all dashboard sections:

```typescript
// middleware.ts
const ROLE_ROUTES = {
  "/dashboard/dos": [Role.SCHOOL_ADMIN, Role.DEPUTY, StaffRole.DOS],
  "/dashboard/class-teacher": [
    StaffRole.CLASS_TEACHER,
    Role.SCHOOL_ADMIN,
    Role.DEPUTY,
  ],
  "/dashboard/teacher": [
    Role.TEACHER,
    StaffRole.CLASS_TEACHER,
    Role.SCHOOL_ADMIN,
    Role.DEPUTY,
  ],
  "/dashboard/parent": [Role.PARENT],
  "/dashboard/student": [Role.STUDENT],
  "/dashboard/bursar": [StaffRole.BURSAR, Role.SCHOOL_ADMIN, Role.DEPUTY],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.id) {
    // Redirect to login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check role-based access
  for (const [route, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(route)) {
      const userRole = token.activeRole || token.role;
      if (!allowedRoles.includes(userRole)) {
        return NextResponse.redirect(
          new URL("/dashboard/access-denied", request.url),
        );
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/dos/:path*",
    "/dashboard/class-teacher/:path*",
    "/dashboard/teacher/:path*",
    "/dashboard/parent/:path*",
    "/dashboard/student/:path*",
    "/dashboard/bursar/:path*",
    "/super-admin/:path*",
  ],
};
```

### Option 2: Layout-Level Guards

Add role verification to each layout file:

```typescript
// Example: src/app/(back)/dashboard/dos/layout.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Role, StaffRole } from '@/types/enums'

export default function DoSLayout({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/login')
      return
    }

    const userRole = session.user.activeRole || session.user.role
    const allowedRoles = [Role.SCHOOL_ADMIN, Role.DEPUTY, StaffRole.DOS]

    if (!allowedRoles.includes(userRole)) {
      router.push('/dashboard/access-denied')
    }
  }, [session, status, router])

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (!session?.user) {
    return null
  }

  // Render layout
  return (
    <div>
      {/* Layout content */}
      {children}
    </div>
  )
}
```

---

## Recommendation

**Use Option 1 (Middleware Expansion)** because:

1. ✅ Centralized security logic
2. ✅ Runs on server-side (more secure)
3. ✅ Prevents unauthorized API calls
4. ✅ Easier to maintain
5. ✅ Better performance (no client-side checks)

**Option 2 (Layout Guards)** as backup:

- Use if middleware can't handle complex role logic
- Provides additional client-side protection
- Good for user experience (immediate feedback)

---

## Implementation Priority

### Phase 1: Critical (Immediate)

1. ✅ Expand middleware to protect all dashboard sections
2. ✅ Test role-based access for each portal
3. ✅ Verify access denied redirects work

### Phase 2: Enhancement (Next)

1. ⚠️ Add layout-level guards as secondary protection
2. ⚠️ Add role verification to API endpoints
3. ⚠️ Add audit logging for unauthorized access attempts

### Phase 3: Testing (Final)

1. ⚠️ Test each role can only access their sections
2. ⚠️ Test direct URL navigation is blocked
3. ⚠️ Test API endpoints reject unauthorized requests

---

## Current Answer to Your Question

**Q: Are pages in their respective sections and accessible by the respective role that has access to them?**

**A: PARTIALLY**

✅ **YES** - Pages are in correct sections (`/dashboard/dos`, `/dashboard/class-teacher`, etc.)  
✅ **YES** - Navigation shows only relevant links based on role  
❌ **NO** - Direct URL access is NOT blocked by role  
❌ **NO** - Anyone with a session can access any section by typing the URL

**Security Status**: ⚠️ **NEEDS IMMEDIATE FIX** - Middleware expansion required

---

**Next Step**: Implement middleware expansion to add role-based access control to all dashboard sections.
