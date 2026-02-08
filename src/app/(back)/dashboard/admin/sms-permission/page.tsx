import { AdminSMSPermissionManager } from '@/components/admin/sms-permission-manager'

export default function AdminSMSPermissionPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">SMS Permission Management</h1>
        <p className="text-muted-foreground">
          Generate and manage permission codes for teachers to send SMS messages
        </p>
      </div>
      
      <AdminSMSPermissionManager />
    </div>
  )
}