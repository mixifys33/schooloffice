'use client'

/**
 * Admin Profile Page
 * Allows admins to view and edit their profile information with security verification
 * Requirements: Profile management, security verification for sensitive changes
 */

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  Key,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  schoolId?: string
  school?: {
    name: string
    code: string
  }
  createdAt: string
  lastLogin?: string
}

interface SecurityVerification {
  currentPassword: string
  newPassword?: string
  confirmPassword?: string
}

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
  })
  
  // Security verification state
  const [showSecurityDialog, setShowSecurityDialog] = useState(false)
  const [securityForm, setSecurityForm] = useState<SecurityVerification>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })
  const [pendingChanges, setPendingChanges] = useState<any>(null)
  const [changeType, setChangeType] = useState<'profile' | 'password'>('profile')

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')

      const data = await response.json()
      setProfile(data.profile)
      setEditForm({
        name: data.profile.name || '',
        phone: data.profile.phone || '',
      })
      setError(null)
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleEditToggle = () => {
    if (editing) {
      // Reset form when canceling
      setEditForm({
        name: profile?.name || '',
        phone: profile?.phone || '',
      })
    }
    setEditing(!editing)
    setError(null)
    setSuccess(null)
  }

  const handleSaveProfile = () => {
    // Check if there are any changes
    const hasChanges = editForm.name !== profile?.name || editForm.phone !== profile?.phone
    
    if (!hasChanges) {
      setEditing(false)
      return
    }

    // Require security verification for profile changes
    setPendingChanges(editForm)
    setChangeType('profile')
    setShowSecurityDialog(true)
  }

  const handlePasswordChange = () => {
    setChangeType('password')
    setShowSecurityDialog(true)
  }

  const handleSecurityVerification = async () => {
    try {
      setSaving(true)
      setError(null)

      // Validate security form
      if (!securityForm.currentPassword) {
        setError('Current password is required')
        return
      }

      let updateData: any = {
        currentPassword: securityForm.currentPassword,
      }

      if (changeType === 'profile' && pendingChanges) {
        updateData = { ...updateData, ...pendingChanges }
      } else if (changeType === 'password') {
        if (!securityForm.newPassword || !securityForm.confirmPassword) {
          setError('New password and confirmation are required')
          return
        }
        if (securityForm.newPassword !== securityForm.confirmPassword) {
          setError('New passwords do not match')
          return
        }
        if (securityForm.newPassword.length < 8) {
          setError('New password must be at least 8 characters long')
          return
        }
        updateData.newPassword = securityForm.newPassword
      }

      const response = await fetch('/api/admin/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update profile')
      }

      // Update local state
      if (changeType === 'profile') {
        setProfile(result.profile)
        setEditing(false)
        setSuccess('Profile updated successfully')
      } else {
        setSuccess('Password changed successfully')
      }

      // Update session if name changed
      if (changeType === 'profile' && pendingChanges.name !== profile?.name) {
        await updateSession({
          ...session,
          user: {
            ...session?.user,
            name: pendingChanges.name,
          }
        })
      }

      // Reset forms
      setSecurityForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPendingChanges(null)
      setShowSecurityDialog(false)
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setError(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-[var(--chart-red)]">
              <AlertTriangle className="h-4 w-4" />
              <span>{error || 'Failed to load profile'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account information and security settings
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Shield className="h-3 w-3" />
          {formatRole(profile.role)}
        </Badge>
      </div>

      {error && (
        <Card className="border-[var(--danger-light)] bg-[var(--danger-light)] dark:border-[var(--danger-dark)] dark:bg-[var(--danger-dark)]/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-[var(--chart-red)] dark:text-[var(--danger)]">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-[var(--success-light)] bg-[var(--success-light)] dark:border-[var(--success-dark)] dark:bg-[var(--success-dark)]/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-[var(--chart-green)] dark:text-[var(--success)]">
              <CheckCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile Information</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
                <Button
                  variant={editing ? "outline" : "default"}
                  size="sm"
                  onClick={handleEditToggle}
                >
                  {editing ? (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  {editing ? (
                    <Input
                      id="name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-sm bg-muted p-2 rounded-md">{profile.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm bg-muted p-2 rounded-md flex-1">{profile.email}</p>
                    <Lock className="h-4 w-4 text-muted-foreground" title="Email cannot be changed" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  {editing ? (
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-sm bg-muted p-2 rounded-md">{profile.phone || 'Not provided'}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm bg-muted p-2 rounded-md flex-1">{formatRole(profile.role)}</p>
                    <Lock className="h-4 w-4 text-muted-foreground" title="Role cannot be changed" />
                  </div>
                </div>

                {profile.school && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>School</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm bg-muted p-2 rounded-md flex-1">
                        {profile.school.name} ({profile.school.code})
                      </p>
                      <Lock className="h-4 w-4 text-muted-foreground" title="School cannot be changed" />
                    </div>
                  </div>
                )}
              </div>

              {editing && (
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                </div>
              )}

              <div className="border-t pt-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <strong>Account Created:</strong> {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                  {profile.lastLogin && (
                    <div>
                      <strong>Last Login:</strong> {new Date(profile.lastLogin).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-md">
                  <div>
                    <h3 className="font-medium">Password</h3>
                    <p className="text-sm text-muted-foreground">
                      Change your account password
                    </p>
                  </div>
                  <Button variant="outline" onClick={handlePasswordChange}>
                    <Key className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                </div>

                <div className="p-4 border rounded-md bg-muted/50">
                  <h3 className="font-medium mb-2">Security Notice</h3>
                  <p className="text-sm text-muted-foreground">
                    All profile changes require password verification for security. 
                    Make sure to use a strong password and keep your account information up to date.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Security Verification Dialog */}
      <ConfirmationDialog
        open={showSecurityDialog}
        onOpenChange={setShowSecurityDialog}
        title="Security Verification Required"
        description={
          changeType === 'profile' 
            ? "Please enter your current password to confirm profile changes."
            : "Please enter your current password and new password."
        }
        confirmText={saving ? "Verifying..." : "Confirm"}
        cancelText="Cancel"
        onConfirm={handleSecurityVerification}
        confirmDisabled={saving || !securityForm.currentPassword}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={securityForm.currentPassword}
                onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                placeholder="Enter your current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
              >
                {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {changeType === 'password' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords.new ? "text" : "password"}
                    value={securityForm.newPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  >
                    {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPasswords.confirm ? "text" : "password"}
                    value={securityForm.confirmPassword}
                    onChange={(e) => setSecurityForm({ ...securityForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  >
                    {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </ConfirmationDialog>
    </div>
  )
}