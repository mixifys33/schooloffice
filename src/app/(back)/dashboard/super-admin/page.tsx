import { redirect } from 'next/navigation'

/**
 * Super Admin Root Page
 * Redirects to the dashboard
 */
export default function SuperAdminPage() {
  redirect('/portals/super-admin/dashboard')
}
