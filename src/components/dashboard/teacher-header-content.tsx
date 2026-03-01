'use client'

import React, { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { User, Calendar, BookOpen, LogOut, AlertCircle, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

/**
 * Teacher Header Content Component
 * Compact version for main header - displays teacher context inline
 */

interface TeacherContextData {
  teacherId: string
  teacherName: string
  roleName: string
  currentTerm: {
    id: string
    name: string
    startDate: string
    endDate: string
  } | null
  academicYear: {
    id: string
    name: string
  } | null
  contextError: string | null
}

export function TeacherHeaderContent() {
  const [context, setContext] = useState<TeacherContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchContext() {
      try {
        const response = await fetch('/api/teacher/context')
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData.details || errorData.error || 'Failed to fetch context'
          setError(errorMessage)
          return
        }
        const data = await response.json()
        setContext(data.context)
        setError(null)
      } catch (err) {
        const errorMessage = 'Unable to load context'
        console.error('Error fetching teacher context:', err)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchContext()
  }, [])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    )
  }

  // Error state
  if (error || !context) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    )
  }

  const hasContextError = !!context.contextError

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* Teacher Info - Compact on mobile, expanded on desktop */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            "flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm transition-colors",
            hasContextError 
              ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
              : "hover:bg-gray-100 dark:hover:bg-gray-800"
          )}
        >
          <User className="h-4 w-4 flex-shrink-0" />
          <span className="hidden md:inline font-medium truncate max-w-[150px]">
            {context.teacherName}
          </span>
          <span className="md:hidden font-medium">
            {context.teacherName.split(' ')[0]}
          </span>
          <ChevronDown className="h-3 w-3 flex-shrink-0" />
        </button>

        {/* Dropdown with full context */}
        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
              <div className="p-4 space-y-3">
                {/* Teacher Name */}
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <div className="font-medium text-sm">{context.teacherName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{context.roleName}</div>
                  </div>
                </div>

                {/* Academic Year */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  {context.academicYear ? (
                    <span>{context.academicYear.name}</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      No Academic Year
                    </span>
                  )}
                </div>

                {/* Current Term */}
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  {context.currentTerm ? (
                    <span>{context.currentTerm.name}</span>
                  ) : (
                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      No Active Term
                    </span>
                  )}
                </div>

                {/* Context Error */}
                {hasContextError && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                      <AlertCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span>{context.contextError}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-md text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Logout"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  )
}
