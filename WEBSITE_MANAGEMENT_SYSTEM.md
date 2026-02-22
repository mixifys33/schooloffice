# School Website Management System

## Overview

A comprehensive admin-controlled website management system where school administrators can design, customize, and manage their public-facing school website entirely from their dashboard. The website can be hosted separately and will dynamically fetch all content from the school management system database.

## Features

### 1. Admin Dashboard - Website Section

Located at: `/super-admin/website` or `/school-admin/website`

#### 1.1 Website Settings

- Site name, tagline, and branding
- Theme customization (colors, fonts)
- Logo and favicon upload
- Contact information
- Social media links
- SEO settings (meta title, description, keywords)
- Publish/unpublish website

#### 1.2 Page Builder

- Create unlimited pages with drag-and-drop sections
- Pre-built section types:
  - Hero sections
  - Text blocks
  - Image galleries
  - Video embeds
  - Statistics/counters
  - Team members
  - Testimonials
  - FAQ sections
  - Call-to-action buttons
  - Contact forms
  - Maps
  - Custom HTML
- Page hierarchy (parent/child pages)
- SEO settings per page
- Draft/Published status

#### 1.3 Content Management

- **News & Announcements**: Create blog-style posts
- **Events**: Manage school events with dates and registration
- **Gallery**: Upload and organize photos in albums
- **Testimonials**: Collect and display testimonials
- **Team**: Showcase staff and leadership
- **Media Library**: Centralized file management

#### 1.4 Navigation Builder

- Custom menu creation
- Drag-and-drop menu ordering
- Nested menu items
- External links support

#### 1.5 Contact Form Management

- View submissions
- Mark as read/replied
- Email notifications

### 2. Public Website

Separate Next.js application that:

- Fetches all content via API from main system
- Fully responsive design
- SEO optimized
- Fast loading with caching
- Can be hosted on separate domain/subdomain

### 3. API Endpoints

All endpoints under `/api/website/`

- Settings CRUD
- Pages CRUD
- Sections CRUD
- News CRUD
- Events CRUD
- Gallery CRUD
- Testimonials CRUD
- Team CRUD
- Media upload/management
- Contact form submissions
- Public read-only endpoints for website

## Technical Stack

- **Database**: MongoDB (Prisma ORM)
- **Admin Dashboard**: Next.js App Router
- **Public Website**: Next.js (separate app)
- **File Storage**: ImageKit
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI

## Database Schema

See `prisma/schema-website.prisma` for complete schema

## Implementation Steps

### Phase 1: Database & API

1. ✅ Create Prisma schema for website models
2. Add relations to School model
3. Create API endpoints for all CRUD operations
4. Implement file upload for media

### Phase 2: Admin Dashboard

1. Create website management section in admin
2. Build settings page
3. Build page builder with section components
4. Build content management pages
5. Build media library
6. Build navigation builder

### Phase 3: Public Website

1. Setup separate Next.js app
2. Create API client for fetching data
3. Build dynamic page renderer
4. Build section components
5. Implement SEO
6. Add caching strategy

### Phase 4: Integration & Testing

1. Test all CRUD operations
2. Test file uploads
3. Test public website rendering
4. Performance optimization
5. SEO validation

## File Structure

```
src/
├── app/
│   ├── (portals)/
│   │   └── school-admin/
│   │       └── website/
│   │           ├── page.tsx (Dashboard)
│   │           ├── settings/
│   │           ├── pages/
│   │           ├── news/
│   │           ├── events/
│   │           ├── gallery/
│   │           ├── testimonials/
│   │           ├── team/
│   │           ├── media/
│   │           ├── navigation/
│   │           └── contact-submissions/
│   └── api/
│       └── website/
│           ├── settings/
│           ├── pages/
│           ├── sections/
│           ├── news/
│           ├── events/
│           ├── gallery/
│           ├── testimonials/
│           ├── team/
│           ├── media/
│           ├── navigation/
│           └── contact/
└── components/
    └── website/
        ├── admin/
        │   ├── PageBuilder.tsx
        │   ├── SectionEditor.tsx
        │   ├── MediaLibrary.tsx
        │   └── ThemeCustomizer.tsx
        └── public/
            ├── sections/
            │   ├── HeroSection.tsx
            │   ├── TextSection.tsx
            │   ├── GallerySection.tsx
            │   └── ...
            └── layouts/
                ├── Header.tsx
                ├── Footer.tsx
                └── Layout.tsx

school-website/ (Separate App)
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── [slug]/
│   │   ├── news/
│   │   ├── events/
│   │   └── contact/
│   ├── components/
│   └── lib/
│       └── api-client.ts
└── package.json
```

## Usage Flow

1. **Admin logs into school management system**
2. **Navigates to Website section from sidebar**
3. **Configures website settings** (theme, branding, SEO)
4. **Creates pages** using drag-and-drop page builder
5. **Adds content** (news, events, gallery, testimonials)
6. **Customizes navigation** menu
7. **Publishes website**
8. **Public website** automatically reflects all changes
9. **Website can be hosted** on custom domain (e.g., www.schoolname.com)

## Benefits

- ✅ No coding required for admin
- ✅ Complete control over website appearance
- ✅ Real-time updates
- ✅ SEO optimized
- ✅ Mobile responsive
- ✅ Centralized content management
- ✅ Can be hosted anywhere
- ✅ Connects perfectly to main system database
