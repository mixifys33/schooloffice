# School Website Management System - Production Setup Guide

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Security Configuration](#security-configuration)
5. [Database Setup](#database-setup)
6. [Admin Interface Setup](#admin-interface-setup)
7. [Public Website Setup](#public-website-setup)
8. [API Security](#api-security)
9. [Deployment Guide](#deployment-guide)
10. [Security Best Practices](#security-best-practices)
11. [Performance Optimization](#performance-optimization)
12. [Monitoring & Logging](#monitoring--logging)
13. [Backup & Recovery](#backup--recovery)
14. [Troubleshooting](#troubleshooting)
15. [Maintenance & Updates](#maintenance--updates)

---

## System Overview

This is a production-ready, secure website management system designed for educational institutions. The system follows industry best practices for security, performance, and scalability.

### Key Features

- **Multi-tenant Architecture**: Complete data isolation between schools
- **Role-Based Access Control (RBAC)**: Granular permission management
- **Content Management System**: Dynamic pages, news, events, galleries
- **SEO Optimization**: Meta tags, sitemaps, structured data
- **Responsive Design**: Mobile-first, accessible interface
- **Security-First Design**: Input validation, XSS protection, CSRF tokens
- **Performance Optimized**: Caching, CDN integration, lazy loading
- **Audit Logging**: Track all administrative actions

### Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│  Admin Portal   │────────▶│   Admin API      │
│  (Authenticated)│         │  (Protected)     │
└─────────────────┘         └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │    Database      │
                            │   (MongoDB)      │
                            └──────────────────┘
                                     │
                                     ▼
┌─────────────────┐         ┌──────────────────┐
│ Public Website  │────────▶│   Public API     │
│  (Read-Only)    │         │  (Rate Limited)  │
└─────────────────┘         └──────────────────┘
```

### System Components

#### 1. Database Layer

**Location**: `prisma/schema.prisma`

Core models for website management:

- `WebsiteSettings` - Configuration, theme, branding
- `WebsitePage` - Dynamic pages with hierarchy
- `PageSection` - Modular content blocks
- `WebsiteNews` - News and blog articles
- `WebsiteEvent` - Events calendar
- `WebsiteGallery` & `WebsiteGalleryImage` - Photo galleries
- `WebsiteTestimonial` - User testimonials
- `WebsiteTeamMember` - Staff profiles
- `WebsiteContactSubmission` - Contact form data
- `WebsiteMedia` - Media library
- `WebsiteMenuItem` - Navigation menus

#### 2. Admin API Layer

**Location**: `src/app/api/website/`

Authenticated endpoints with:

- JWT/Session-based authentication
- Input validation and sanitization
- Rate limiting
- Audit logging

#### 3. Public API Layer

**Location**: `src/app/api/public/website/`

Public-facing endpoints with:

- Read-only access
- Aggressive rate limiting
- Response caching
- Published content only

---

## Prerequisites

### Required Software

| Software | Minimum Version | Recommended Version |
| -------- | --------------- | ------------------- |
| Node.js  | 18.17.0         | 20.x LTS            |
| npm      | 9.x             | 10.x                |
| MongoDB  | 5.0             | 7.0                 |
| Git      | 2.30            | Latest              |

### Required Knowledge

- Next.js 14+ and React 18+
- TypeScript basics
- REST API concepts
- MongoDB/Prisma ORM
- Authentication (NextAuth.js)
- Basic security principles

### Access Requirements

✅ Admin access to school management system
✅ Database connection with appropriate permissions
✅ Cloud storage account (ImageKit, Cloudinary, or AWS S3)
✅ Domain name with DNS management access
✅ SSL/TLS certificate (Let's Encrypt recommended)
✅ Email service for notifications (SendGrid, AWS SES, etc.)

### Security Checklist

Before proceeding, ensure:

- [ ] Firewall configured to allow only necessary ports
- [ ] Database has strong authentication enabled
- [ ] Backup system is in place and tested
- [ ] Monitoring/alerting system configured
- [ ] Incident response plan documented

---

## Initial Setup

### Step 1: Environment Configuration

**⚠️ CRITICAL SECURITY NOTE**: Never commit `.env` files to version control. Add them to `.gitignore`.

Create `.env.local` for development and use secure secret management for production:

```bash
# ===========================================
# DATABASE CONFIGURATION
# ===========================================
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority"

# ===========================================
# AUTHENTICATION
# ===========================================
# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your_generated_secret_here"
NEXTAUTH_URL="https://your-domain.com"

# Session configuration
SESSION_MAX_AGE="86400" # 24 hours in seconds

# ===========================================
# MEDIA STORAGE (Choose one provider)
# ===========================================
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY="your_public_key"
IMAGEKIT_PRIVATE_KEY="your_private_key"
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your_id"

# OR Cloudinary Configuration
# CLOUDINARY_CLOUD_NAME="your_cloud_name"
# CLOUDINARY_API_KEY="your_api_key"
# CLOUDINARY_API_SECRET="your_api_secret"

# OR AWS S3 Configuration
# AWS_ACCESS_KEY_ID="your_access_key"
# AWS_SECRET_ACCESS_KEY="your_secret_key"
# AWS_REGION="us-east-1"
# AWS_S3_BUCKET="your-bucket-name"

# ===========================================
# EMAIL CONFIGURATION
# ===========================================
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="apikey"
SMTP_PASSWORD="your_sendgrid_api_key"
SMTP_FROM="noreply@your-school.com"
```

# ===========================================

# SECURITY SETTINGS

# ===========================================

# Allowed origins for CORS (comma-separated)

ALLOWED_ORIGINS="https://your-domain.com,https://www.your-domain.com"

# Rate limiting

RATE_LIMIT_MAX="100" # requests per window
RATE_LIMIT_WINDOW="900000" # 15 minutes in milliseconds

# File upload limits

MAX_FILE_SIZE="5242880" # 5MB in bytes
ALLOWED_FILE_TYPES="image/jpeg,image/png,image/webp,application/pdf"

# ===========================================

# PUBLIC WEBSITE CONFIGURATION

# ===========================================

NEXT_PUBLIC_WEBSITE_URL="https://www.your-school.com"
NEXT_PUBLIC_API_URL="https://admin.your-school.com"

# ===========================================

# MONITORING & LOGGING

# ===========================================

# Optional: Sentry for error tracking

# SENTRY_DSN="your_sentry_dsn"

# Optional: Analytics

# NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"

# ===========================================

# FEATURE FLAGS

# ===========================================

ENABLE_CONTACT_FORM="true"
ENABLE_EVENT_REGISTRATION="true"
ENABLE_NEWSLETTER="true"

````

### Step 2: Generate Secure Secrets

**Generate NEXTAUTH_SECRET**:
```bash
openssl rand -base64 32
````

**Generate API Keys** (if needed):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Password Requirements**:

- Minimum 32 characters for secrets
- Use different secrets for dev/staging/production
- Rotate secrets every 90 days
- Store production secrets in AWS Secrets Manager, Azure Key Vault, or similar

### Step 3: Secure .gitignore Configuration

Ensure your `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Secrets and keys
*.pem
*.key
*.cert
secrets/
config/secrets.json

# Database
*.db
*.sqlite

# Logs
logs/
*.log
npm-debug.log*
```

# Backup files

_.backup
_.bak

# OS files

.DS_Store
Thumbs.db

````

---

## Security Configuration

### Authentication Setup

The system uses NextAuth.js for authentication. Ensure proper configuration:

**File**: `src/lib/auth.ts` (example structure)

```typescript
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { role: true }
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        // Check if user has admin role
        if (!user.role?.name.includes('ADMIN')) {
          throw new Error('Unauthorized access');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.name
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    }
  }
};
````

### Input Validation & Sanitization

Create a validation utility:

**File**: `src/lib/validation.ts`

```typescript
import { z } from "zod";
import DOMPurify from "isomorphic-dompurify";

// Schema for website settings
export const websiteSettingsSchema = z.object({
  siteName: z.string().min(1).max(100),
  tagline: z.string().max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  logo: z.string().url().optional(),
  favicon: z.string().url().optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().max(255).optional(),
});

// Schema for page creation
export const pageSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  content: z.string(),
  metaDescription: z.string().max(160).optional(),
  isPublished: z.boolean().default(false),
});

// Sanitize HTML content
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "blockquote",
      "code",
      "pre",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
    ALLOW_DATA_ATTR: false,
  });
}

// Validate file uploads
export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || "5242880");
  const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(",") || [];

  if (file.size > maxSize) {
    return { valid: false, error: "File size exceeds limit" };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "File type not allowed" };
  }

  return { valid: true };
}
```

### Rate Limiting

Implement rate limiting for API endpoints:

**File**: `src/lib/rate-limit.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

const rateLimit = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(
  request: NextRequest,
  maxRequests: number = 100,
  windowMs: number = 900000, // 15 minutes
): NextResponse | null {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();
  const record = rateLimit.get(ip);

  if (!record || now > record.resetTime) {
    rateLimit.set(ip, { count: 1, resetTime: now + windowMs });
    return null;
  }

  if (record.count >= maxRequests) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  record.count++;
  return null;
}
```

---

## Database Setup

### Pre-Migration Checklist

Before making any database changes:

- [ ] Create a full database backup
- [ ] Test migration in development environment
- [ ] Review all schema changes
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window (if needed)
- [ ] Notify team members

### Step 1: Backup Database

**MongoDB Atlas**:

```bash
# Create on-demand backup via Atlas UI or CLI
mongodump --uri="your_connection_string" --out=./backup-$(date +%Y%m%d)
```

**Self-hosted MongoDB**:

```bash
mongodump --host=localhost --port=27017 --db=your_database --out=./backup
```

### Step 2: Review Schema Changes

```bash
# View what will change
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script
```

### Step 3: Generate Prisma Client

```bash
# Generate TypeScript types and Prisma Client
npm run db:generate

# Or manually
npx prisma generate
```

### Step 4: Push Schema to Database

**Development Environment**:

```bash
# Push schema without creating migration files
npm run db:push

# Or manually
npx prisma db push
```

**Production Environment**:

```bash
# Create and apply migration
npx prisma migrate deploy
```

### Step 5: Verify Changes

```bash
# Open Prisma Studio to inspect database
npx prisma studio
```

### Step 6: Seed Initial Data (Optional)

Create a seed script for default settings:

**File**: `prisma/seed.ts`

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create default website settings
  const defaultSettings = await prisma.websiteSettings.upsert({
    where: { schoolId: "your_school_id" },
    update: {},
    create: {
      schoolId: "your_school_id",
      siteName: "School Name",
      primaryColor: "#1e40af",
      secondaryColor: "#64748b",
      isPublished: false,
    },
  });

  console.log("Seed data created:", defaultSettings);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:

```bash
npx prisma db seed
```

### Rollback Procedure

If something goes wrong:

```bash
# 1. Stop the application
pm2 stop your-app

# 2. Restore from backup
mongorestore --uri="your_connection_string" ./backup

# 3. Regenerate Prisma Client with old schema
git checkout HEAD~1 prisma/schema.prisma
npx prisma generate

# 4. Restart application
pm2 start your-app
```

---

## Admin Interface Setup

### Step 1: Install Required Dependencies

```bash
# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-tabs
npm install @radix-ui/react-toast

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Rich text editor
npm install @tiptap/react @tiptap/starter-kit

# Date picker
npm install react-datepicker
npm install -D @types/react-datepicker

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable

# Icons
npm install lucide-react

# Image optimization
npm install sharp
```

### Step 2: Add Navigation Link

Update your admin sidebar to include website management:

**File**: `src/components/layout/AdminSidebar.tsx`

```typescript
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Globe, Settings, FileText, Calendar, Image, Users } from 'lucide-react';

export default function AdminSidebar() {
  const { data: session } = useSession();

  // Only show to authorized users
  if (!session?.user?.role?.includes('ADMIN')) {
    return null;
  }

  return (
    <nav className="space-y-1">
      {/* Other navigation items */}

      {/* Website Management Section */}
      <div className="pt-4">
        <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Website
        </h3>
        <div className="mt-2 space-y-1">
          <Link
            href="/school-admin/website"
            className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            <Globe className="mr-3 h-5 w-5" />
            Dashboard
          </Link>

          <Link
            href="/school-admin/website/settings"
            className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            <Settings className="mr-3 h-5 w-5" />
            Settings
          </Link>

          <Link
            href="/school-admin/website/pages"
            className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            <FileText className="mr-3 h-5 w-5" />
            Pages
          </Link>

          <Link
            href="/school-admin/website/news"
            className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            <FileText className="mr-3 h-5 w-5" />
            News
          </Link>

          <Link
            href="/school-admin/website/events"
            className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            <Calendar className="mr-3 h-5 w-5" />
            Events
          </Link>

          <Link
            href="/school-admin/website/gallery"
            className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            <Image className="mr-3 h-5 w-5" />
            Gallery
          </Link>

          <Link
            href="/school-admin/website/team"
            className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
          >
            <Users className="mr-3 h-5 w-5" />
            Team
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

### Step 3: Create Admin Pages

The following admin pages need to be created. Each should include:

- Authentication check
- Role-based access control
- Input validation
- Error handling
- Loading states
- Success/error notifications

#### Required Admin Pages:

1. **Dashboard** (`/school-admin/website/page.tsx`)
   - Overview statistics
   - Recent activity
   - Quick actions
   - Publishing status

2. **Settings** (`/school-admin/website/settings/page.tsx`)
   - Site name and tagline
   - Theme colors
   - Logo and favicon upload
   - SEO settings
   - Social media links

3. **Pages Management** (`/school-admin/website/pages/page.tsx`)
   - List all pages
   - Create/edit/delete pages
   - Page builder with drag-and-drop sections
   - SEO settings per page
   - Publish/unpublish toggle

4. **News Management** (`/school-admin/website/news/page.tsx`)
   - List all articles
   - Create/edit/delete articles
   - Rich text editor
   - Featured image upload
   - Categories and tags
   - Publish scheduling

5. **Events Management** (`/school-admin/website/events/page.tsx`)
   - List all events
   - Create/edit/delete events
   - Date/time picker
   - Location information
   - Registration settings
   - Capacity limits

6. **Gallery Management** (`/school-admin/website/gallery/page.tsx`)
   - Create albums
   - Upload multiple images
   - Drag-and-drop ordering
   - Image captions
   - Album visibility settings

7. **Team Members** (`/school-admin/website/team/page.tsx`)
   - Add/edit staff profiles
   - Photo upload
   - Bio and credentials
   - Social media links
   - Display order

8. **Media Library** (`/school-admin/website/media/page.tsx`)
   - Upload files
   - Browse/search media
   - File details
   - Delete files
   - Usage tracking

9. **Contact Submissions** (`/school-admin/website/contact/page.tsx`)
   - View submissions
   - Mark as read/unread
   - Reply functionality
   - Export to CSV
   - Spam filtering

### Step 4: Implement Authentication Middleware

Create middleware to protect admin routes:

**File**: `src/middleware.ts`

```typescript
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith(
      "/school-admin/website",
    );

    if (isAdminRoute && !token?.role?.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: ["/school-admin/website/:path*"],
};
```

---

## Public Website Setup

### Architecture Decision

The public website should be a separate Next.js application for:

- **Security**: Complete isolation from admin system
- **Performance**: Optimized for public traffic
- **Scalability**: Independent scaling
- **Deployment**: Separate deployment pipeline

### Step 1: Create Public Website Project

```bash
# Create new Next.js project
npx create-next-app@latest school-public-website

# Navigate to project
cd school-public-website

# Install dependencies
npm install
```

### Step 2: Project Structure

```
school-public-website/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (Homepage)
│   │   ├── [slug]/page.tsx (Dynamic pages)
│   │   ├── news/
│   │   │   ├── page.tsx (News list)
│   │   │   └── [slug]/page.tsx (Single article)
│   │   ├── events/
│   │   │   ├── page.tsx (Events list)
│   │   │   └── [id]/page.tsx (Single event)
│   │   ├── gallery/
│   │   │   ├── page.tsx (Gallery list)
│   │   │   └── [id]/page.tsx (Single album)
│   │   ├── team/page.tsx
│   │   ├── contact/page.tsx
│   │   └── api/
│   │       └── contact/route.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Navigation.tsx
│   │   ├── sections/
│   │   │   ├── HeroSection.tsx
│   │   │   ├── TextSection.tsx
│   │   │   ├── ImageSection.tsx
│   │   │   ├── GallerySection.tsx
│   │   │   └── CTASection.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   ├── lib/
│   │   ├── api.ts (API client)
│   │   ├── cache.ts (Caching utilities)
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── public/
│   ├── images/
│   └── fonts/
├── .env.local
├── next.config.js
└── package.json
```

### Step 3: API Client

Create a secure API client:

**File**: `src/lib/api.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const SCHOOL_CODE = process.env.NEXT_PUBLIC_SCHOOL_CODE;

if (!API_URL || !SCHOOL_CODE) {
  throw new Error("Missing required environment variables");
}

class APIClient {
  private baseURL: string;
  private schoolCode: string;

  constructor() {
    this.baseURL = API_URL;
    this.schoolCode = SCHOOL_CODE;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}/api/public/website/${this.schoolCode}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      next: {
        revalidate: 3600, // Cache for 1 hour
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async getSettings() {
    return this.fetch("/settings");
  }

  async getPages() {
    return this.fetch("/pages");
  }

  async getPage(slug: string) {
    return this.fetch(`/pages/${slug}`);
  }

  async getNews(page: number = 1, limit: number = 10) {
    return this.fetch(`/news?page=${page}&limit=${limit}`);
  }

  async getNewsArticle(slug: string) {
    return this.fetch(`/news/${slug}`);
  }

  async getEvents() {
    return this.fetch("/events");
  }

  async getEvent(id: string) {
    return this.fetch(`/events/${id}`);
  }

  async getGalleries() {
    return this.fetch("/galleries");
  }

  async getGallery(id: string) {
    return this.fetch(`/galleries/${id}`);
  }

  async getTeamMembers() {
    return this.fetch("/team");
  }

  async submitContact(data: any) {
    return this.fetch("/contact", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const api = new APIClient();
```

### Step 4: Environment Configuration

**File**: `.env.local`

```bash
# API Configuration
NEXT_PUBLIC_API_URL=https://admin.your-school.com
NEXT_PUBLIC_SCHOOL_CODE=your_school_code

# Site Configuration
NEXT_PUBLIC_SITE_NAME=Your School Name
NEXT_PUBLIC_SITE_URL=https://www.your-school.com

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Feature Flags
NEXT_PUBLIC_ENABLE_CONTACT_FORM=true
NEXT_PUBLIC_ENABLE_EVENT_REGISTRATION=true
```

### Step 5: Next.js Configuration

**File**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "ik.imagekit.io", // ImageKit
      "res.cloudinary.com", // Cloudinary
      "s3.amazonaws.com", // AWS S3
    ],
    formats: ["image/avif", "image/webp"],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "https://admin.your-school.com",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## API Security

### Public API Endpoints

Create secure public-facing endpoints in your main application:

**File**: `src/app/api/public/website/[schoolCode]/settings/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimiter } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: { schoolCode: string } },
) {
  // Apply rate limiting
  const rateLimitResponse = rateLimiter(request, 100, 900000);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate school code format
    if (!/^[a-zA-Z0-9-]+$/.test(params.schoolCode)) {
      return NextResponse.json(
        { error: "Invalid school code" },
        { status: 400 },
      );
    }

    // Fetch school and settings
    const school = await prisma.school.findUnique({
      where: { code: params.schoolCode },
      include: {
        websiteSettings: {
          select: {
            // Only return public fields
            siteName: true,
            tagline: true,
            primaryColor: true,
            secondaryColor: true,
            logo: true,
            favicon: true,
            metaDescription: true,
            metaKeywords: true,
            isPublished: true,
            // Exclude sensitive fields
            // schoolId: false,
            // createdAt: false,
            // updatedAt: false,
          },
        },
      },
    });

    // Check if website is published
    if (!school || !school.websiteSettings?.isPublished) {
      return NextResponse.json(
        { error: "Website not found or not published" },
        { status: 404 },
      );
    }

    // Return settings with cache headers
    return NextResponse.json(school.websiteSettings, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Error fetching website settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**File**: `src/app/api/public/website/[schoolCode]/pages/[slug]/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimiter } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: { schoolCode: string; slug: string } },
) {
  const rateLimitResponse = rateLimiter(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const school = await prisma.school.findUnique({
      where: { code: params.schoolCode },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const page = await prisma.websitePage.findFirst({
      where: {
        schoolId: school.id,
        slug: params.slug,
        isPublished: true, // Only published pages
      },
      include: {
        sections: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("Error fetching page:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### CORS Configuration

Configure CORS for public API:

**File**: `src/middleware.ts` (add to existing middleware)

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Only apply CORS to public API routes
  if (request.nextUrl.pathname.startsWith("/api/public")) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];
    const origin = request.headers.get("origin");

    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, OPTIONS",
      );
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
      response.headers.set("Access-Control-Max-Age", "86400");
    }
  }

  return response;
}

export const config = {
  matcher: "/api/public/:path*",
};
```

---

## Deployment Guide

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database backup created
- [ ] SSL certificate installed
- [ ] DNS records configured
- [ ] Security headers implemented
- [ ] Rate limiting enabled
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Monitoring setup (Uptime, performance)
- [ ] Load testing completed
- [ ] Security audit performed

### Deployment Options

#### Option 1: Vercel (Recommended for Next.js)

**Admin System**:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Environment Variables**:

- Add all `.env` variables in Vercel dashboard
- Use Vercel's secret management for sensitive data

**Public Website**:

```bash
cd school-public-website
vercel --prod
```

#### Option 2: AWS (EC2 + RDS)

**Setup**:

```bash
# Install PM2 for process management
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start npm --name "school-admin" -- start
pm2 start npm --name "school-website" -- start

# Save PM2 configuration
pm2 save
pm2 startup
```

**Nginx Configuration**:

```nginx
# Admin system
server {
    listen 443 ssl http2;
    server_name admin.your-school.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Public website
server {
    listen 443 ssl http2;
    server_name www.your-school.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Option 3: Docker Deployment

**Dockerfile** (Admin System):
```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  admin:
    build: ./school-admin
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
    restart: unless-stopped
    depends_on:
      - mongodb

  website:
    build: ./school-website
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
      - NEXT_PUBLIC_SCHOOL_CODE=${NEXT_PUBLIC_SCHOOL_CODE}
    restart: unless-stopped

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - admin
      - website
    restart: unless-stopped

volumes:
  mongodb_data:
```

Deploy:
```bash
docker-compose up -d
```

### DNS Configuration

**Admin System** (admin.your-school.com):
```
Type: A
Name: admin
Value: Your server IP
TTL: 3600
```

**Public Website** (www.your-school.com):
```
Type: A
Name: www
Value: Your server IP
TTL: 3600

Type: A
Name: @
Value: Your server IP
TTL: 3600
```

### SSL Certificate Setup

**Using Let's Encrypt (Free)**:
```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d admin.your-school.com -d www.your-school.com

# Auto-renewal (runs twice daily)
sudo certbot renew --dry-run
```

---

## Security Best Practices

### 1. Authentication & Authorization

✅ Use strong password policies (min 12 characters, complexity requirements)
✅ Implement multi-factor authentication (MFA) for admin accounts
✅ Use JWT tokens with short expiration times (15-30 minutes)
✅ Implement refresh token rotation
✅ Log all authentication attempts
✅ Implement account lockout after failed attempts
✅ Use secure session management

### 2. Input Validation

✅ Validate all user inputs on both client and server
✅ Use schema validation (Zod, Yup)
✅ Sanitize HTML content to prevent XSS
✅ Implement CSRF protection
✅ Validate file uploads (type, size, content)
✅ Use parameterized queries (Prisma handles this)

### 3. Data Protection

✅ Encrypt sensitive data at rest
✅ Use HTTPS for all communications
✅ Implement proper CORS policies
✅ Don't expose sensitive data in API responses
✅ Use environment variables for secrets
✅ Implement data retention policies
✅ Regular security audits

### 4. API Security

✅ Implement rate limiting
✅ Use API versioning
✅ Validate request origins
✅ Implement request signing for sensitive operations
✅ Log all API requests
✅ Monitor for suspicious activity
✅ Implement IP whitelisting for admin APIs

### 5. File Upload Security

```typescript
// Example secure file upload handler
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

export async function handleFileUpload(file: File) {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type');
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large');
  }

  // Generate secure filename
  const ext = file.name.split('.').pop();
  const filename = `${randomBytes(16).toString('hex')}.${ext}`;

  // Validate file content (check magic numbers)
  const buffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(buffer);
  
  // Check JPEG magic number
  if (file.type === 'image/jpeg') {
    if (uint8Array[0] !== 0xFF || uint8Array[1] !== 0xD8) {
      throw new Error('Invalid JPEG file');
    }
  }

  // Check PNG magic number
  if (file.type === 'image/png') {
    if (uint8Array[0] !== 0x89 || uint8Array[1] !== 0x50) {
      throw new Error('Invalid PNG file');
    }
  }

  // Upload to secure storage (ImageKit, S3, etc.)
  // Don't store files in public directory
  
  return { filename, url: `https://cdn.your-school.com/${filename}` };
}
```
