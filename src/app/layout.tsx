import type { Metadata } from 'next'
import { Rethink_Sans } from 'next/font/google'
import './globals.css'
import '../styles/themes.css'
import { ToastProvider, SessionProvider, StaffOnboardingProvider } from '@/components/providers'
import { ThemeProvider } from '@/components/providers/theme-provider'
// Import error handler to catch unhandled rejections
import '@/lib/error-handler'

const inter = Rethink_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800']
})

export const metadata: Metadata = {
  title: 'SchoolOffice.academy',
  description: 'A comprehensive school management system',
  manifest: '/manifest.json',
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
        <ToastProvider>
          <ThemeProvider>
            <SessionProvider>
              <StaffOnboardingProvider>
                {children}
              </StaffOnboardingProvider>
            </SessionProvider>
          </ThemeProvider>
        </ToastProvider>
      </body>
    </html>
  )
}