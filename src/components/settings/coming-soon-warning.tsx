'use client'

import React from 'react'
import { AlertTriangle, Clock, Wrench } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertBanner } from '@/components/ui/alert-banner'

interface ComingSoonWarningProps {
  title: string
  description: string
  features: string[]
  estimatedCompletion?: string
}

/**
 * Coming Soon Warning Component
 * Honest communication about incomplete features
 * Better than fake functionality that doesn't work
 */
export function ComingSoonWarning({ 
  title, 
  description, 
  features, 
  estimatedCompletion 
}: ComingSoonWarningProps) {
  return (
    <div className="space-y-6">
      <AlertBanner
        type="warning"
        title="Feature Under Development"
        message={`${title} is currently being developed. The settings shown below are not yet functional.`}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <Wrench className="h-6 w-6 text-[var(--chart-yellow)]" />
            <div>
              <CardTitle className="flex items-center space-x-2">
                <span>{title}</span>
                <span className="text-sm bg-[var(--warning-light)] text-[var(--warning-dark)] px-2 py-1 rounded-full">
                  Coming Soon
                </span>
              </CardTitle>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-[var(--text-primary)] mb-2">Planned Features:</h4>
              <ul className="space-y-1">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm text-[var(--text-secondary)]">
                    <Clock className="h-3 w-3 text-[var(--warning)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {estimatedCompletion && (
              <div className="bg-[var(--warning-light)] border border-[var(--warning-light)] rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-[var(--chart-yellow)]" />
                  <span className="text-sm font-medium text-[var(--warning-dark)]">
                    Estimated Completion: {estimatedCompletion}
                  </span>
                </div>
              </div>
            )}

            <div className="bg-[var(--info-light)] border border-[var(--info-light)] rounded-lg p-3">
              <p className="text-sm text-[var(--info-dark)]">
                <strong>Why show this?</strong> We believe in honest communication. 
                Rather than showing fake settings that don't work, we're transparent 
                about what's coming and when you can expect it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}