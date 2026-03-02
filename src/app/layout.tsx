import type { Metadata } from 'next'
import { Rethink_Sans } from 'next/font/google'
import './globals.css'
import '../styles/themes.css'
import { ToastProvider, SessionProvider, StaffOnboardingProvider, ErrorBoundary } from '@/components/providers'
import { ThemeProvider } from '@/components/providers/theme-provider'
// Import error handler to catch unhandled rejections
import '@/lib/error-handler'

const inter = Rethink_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800']
})

export const metadata: Metadata = {
  title: 'SchoolOffice.academy - Complete School Management System',
  description: 'A comprehensive school management system for modern educational institutions. Manage students, teachers, attendance, grades, fees, and more.',
  keywords: ['school management system', 'education software', 'student management', 'teacher portal', 'school administration', 'attendance tracking', 'grade management'],
  authors: [{ name: 'SchoolOffice' }],
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: "VMGlVQ3ZFf0j0_g1hFF4rHuLU1jjuIPX-WoGcUkQKWM",
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://schooloffice.academy',
    siteName: 'SchoolOffice.academy',
    title: 'SchoolOffice.academy - Complete School Management System',
    description: 'A comprehensive school management system for modern educational institutions. Manage students, teachers, attendance, grades, fees, and more.',
    images: [
      {
        url: '/images/schooloffice.png',
        width: 1200,
        height: 630,
        alt: 'SchoolOffice.academy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SchoolOffice.academy - Complete School Management System',
    description: 'A comprehensive school management system for modern educational institutions.',
    images: ['/images/schooloffice.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '32x32 48x48 64x64', type: 'image/png' },
      { url: '/images/schooloffice.png', sizes: '192x192 256x256 512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  other: {
    'msapplication-TileImage': '/images/schooloffice.png',
    'msapplication-TileColor': 'var(--chart-blue)',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>){ 
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ErrorBoundary>
          <ToastProvider>
            <ThemeProvider>
              <SessionProvider>
                <StaffOnboardingProvider>
                  {children}
                </StaffOnboardingProvider>
              </SessionProvider>
            </ThemeProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}