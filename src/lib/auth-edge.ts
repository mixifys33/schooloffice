/**
 * NextAuth.js Configuration for Edge Runtime
 * This is a lightweight version that doesn't use Prisma directly
 * Used by middleware for session validation only
 */
import NextAuth from 'next-auth'
import { Role, LicenseType } from '@/types/enums'

// Extend the built-in session types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      role: Role
      roles?: Role[]
      activeRole?: Role
      schoolId: string
      schoolName?: string
      licenseType?: LicenseType
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    role: Role
    roles?: Role[]
    activeRole?: Role
    schoolId: string
    schoolName?: string
    licenseType?: LicenseType
  }
}

// Edge-compatible auth configuration (no database calls)
export const { auth } = NextAuth({
  providers: [], // No providers needed for session validation
  callbacks: {
    async jwt({ token }) {
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          id: token.id as string,
          email: token.email as string,
          role: token.role as Role,
          schoolId: token.schoolId as string,
          schoolName: token.schoolName as string | undefined,
          licenseType: token.licenseType as LicenseType | undefined,
        }
      }
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
})
