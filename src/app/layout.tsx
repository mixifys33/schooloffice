import type { Metadata } from 'next'
import { Rethink_Sans } from 'next/font/google'
import './globals.css'
import { ToastProvider, SessionProvider, ThemeProvider } from '@/components/providers'

const inter = Rethink_Sans({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SchoolOffice.academy',
  description: 'A comprehensive school management system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>){ 
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system">
          <SessionProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}