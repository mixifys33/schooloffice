'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

/**
 * Terms of Service Page - Fully Responsive
 * Mobile: Single column, compact spacing
 * Tablet: Wider content, better spacing
 * Desktop: Maximum width with optimal reading experience
 */

export default function TermsPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] py-4 sm:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4 sm:p-6 lg:p-10">
          
          {/* Header */}
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Terms of Service
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              Last Updated: February 15, 2026
            </p>
          </div>

          {/* Content - Two column layout on large screens */}
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            
            {/* Table of Contents - Sticky sidebar on large screens */}
            <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-8 lg:self-start">
              <nav className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3">
                  Contents
                </p>
                <a href="#acceptance" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  1. Acceptance of Terms
                </a>
                <a href="#service" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  2. Service Description
                </a>
                <a href="#accounts" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  3. User Accounts
                </a>
                <a href="#data" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  4. Data Ownership
                </a>
                <a href="#use" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  5. Acceptable Use
                </a>
                <a href="#sms" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  6. SMS Services
                </a>
                <a href="#payment" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  7. Payment & Fees
                </a>
                <a href="#academic" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  8. Academic Data
                </a>
                <a href="#privacy" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  9. Privacy & Security
                </a>
                <a href="#ai" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  10. AI Features
                </a>
                <a href="#ip" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  11. Intellectual Property
                </a>
                <a href="#liability" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  12. Limitation of Liability
                </a>
              </nav>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-9 space-y-6 sm:space-y-8 lg:space-y-10">
              
              {/* Section 1 */}
              <section id="acceptance">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  1. Acceptance of Terms
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>
                    By accessing or using SchoolOffice.academy (&ldquo;the Platform&rdquo;, &ldquo;Service&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;), 
                    you agree to be bound by these Terms of Service and all applicable laws and regulations.
                  </p>
                  <p>
                    If you do not agree with any part of these terms, you must not use the Platform.
                  </p>
                </div>
              </section>

              {/* Section 2 */}
              <section id="service">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  2. Service Description
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>SchoolOffice.academy is a comprehensive school management system that provides:</p>
                  <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 lg:ml-8">
                    <li>Student information management and enrollment tracking</li>
                    <li>Academic assessment tools (CA, exams, grading systems)</li>
                    <li>Attendance monitoring and reporting</li>
                    <li>Fee management and payment processing</li>
                    <li>SMS communication services</li>
                    <li>Report card generation and distribution</li>
                    <li>Timetable and curriculum management</li>
                    <li>Teacher and staff management</li>
                    <li>Parent portal and communication tools</li>
                    <li>Document storage and management</li>
                    <li>Analytics and performance tracking</li>
                    <li>Future AI-powered features (subject to separate disclosure)</li>
                  </ul>
                </div>
              </section>

              {/* Section 3 */}
              <section id="accounts">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  3. User Accounts and Registration
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">3.1 School Registration</p>
                    <p>Schools must provide accurate information during registration. The school code chosen during registration is permanent and cannot be changed.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">3.2 Account Security</p>
                    <p>You are responsible for maintaining the confidentiality of your account credentials.</p>
                  </div>
                </div>
              </section>

              {/* Section 4 */}
              <section id="data">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  4. Data Ownership and Responsibility
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">4.1 Your Data</p>
                    <p>You retain ownership of all data you input into the Platform. We act as a data processor on your behalf.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">4.2 Data Accuracy</p>
                    <p>You are solely responsible for the accuracy, quality, and legality of the data you provide.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">4.3 Data Protection Compliance</p>
                    <p>You acknowledge that you are responsible for complying with all applicable data protection laws and regulations.</p>
                  </div>
                </div>
              </section>

              {/* Section 5 */}
              <section id="use">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  5. Acceptable Use Policy
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>You agree not to:</p>
                  <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 lg:ml-8">
                    <li>Use the Platform for any unlawful purpose</li>
                    <li>Upload or transmit viruses or malicious code</li>
                    <li>Attempt to gain unauthorized access</li>
                    <li>Interfere with the Platform&apos;s operation</li>
                    <li>Use automated systems without permission</li>
                    <li>Collect or harvest personal information of other users</li>
                  </ul>
                </div>
              </section>

              {/* Section 6 - SMS */}
              <section id="sms">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  6. SMS Communication Services
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">6.1 SMS Credits</p>
                    <p>SMS services require pre-purchased credits. Schools are responsible for monitoring their SMS credit balance.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">6.2 Content Responsibility</p>
                    <p>You are solely responsible for the content of SMS messages sent through the Platform.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">6.3 Recipient Consent</p>
                    <p>You must obtain proper consent from recipients before sending SMS messages.</p>
                  </div>
                </div>
              </section>

              {/* Section 7 - Payment */}
              <section id="payment">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  7. Payment and Fees
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">7.1 Subscription Plans</p>
                    <p>Access to the Platform may require a paid subscription. Subscription plans and pricing are subject to change with notice.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">7.2 Payment Processing</p>
                    <p>The Platform includes fee management tools. We are not responsible for actual payment collection or disputes.</p>
                  </div>
                </div>
              </section>

              {/* Section 8 - Academic */}
              <section id="academic">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  8. Academic Data and Assessments
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>The Platform provides tools for continuous assessment, examinations, grading, and report card generation. Schools are responsible for the accuracy of all academic data entered.</p>
                </div>
              </section>

              {/* Section 9 - Privacy */}
              <section id="privacy">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  9. Privacy and Data Security
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>
                    Our collection and use of personal information is governed by our{' '}
                    <Link href="/privacy" className="text-[var(--chart-blue)] hover:underline font-medium">
                      Privacy Policy
                    </Link>
                    . We implement industry-standard security measures to protect your data.
                  </p>
                </div>
              </section>

              {/* Section 10 - AI */}
              <section id="ai">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  10. Artificial Intelligence and Automated Features
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">10.1 AI-Powered Features (Future)</p>
                    <p>The Platform may incorporate artificial intelligence features including automated grading assistance, predictive analytics, and intelligent reporting.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">10.2 AI Limitations</p>
                    <p>AI-generated outputs are provided as suggestions only. Human oversight and verification are required for all critical decisions.</p>
                  </div>
                </div>
              </section>

              {/* Section 11 - IP */}
              <section id="ip">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  11. Intellectual Property
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>The Platform and all its content is owned by SchoolOffice.academy and protected by intellectual property laws. We grant you a limited license to use the Platform for your school&apos;s internal operations only.</p>
                </div>
              </section>

              {/* Section 12 - Liability */}
              <section id="liability">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  12. Limitation of Liability
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <div className="bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded-md p-4 sm:p-6 border-l-4 border-[var(--chart-red)]">
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">Disclaimer of Warranties</p>
                    <p className="uppercase text-xs sm:text-sm">
                      THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES OF ANY KIND. WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.
                    </p>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section className="pt-6 sm:pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  Contact Us
                </h2>
                <div className="bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded-md p-4 sm:p-6 space-y-2">
                  <p className="font-semibold text-sm sm:text-base text-[var(--text-primary)] dark:text-[var(--white-pure)]">
                    SchoolOffice.academy
                  </p>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Email: legal@schooloffice.academy</p>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Support: support@schooloffice.academy</p>
                </div>
              </section>

              {/* Acknowledgment */}
              <section className="pt-6 sm:pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <div className="bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded-md p-4 sm:p-6 border-l-4 border-[var(--chart-blue)]">
                  <p className="font-semibold text-sm sm:text-base text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                    Acknowledgment
                  </p>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    BY USING SCHOOLOFFICE.ACADEMY, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
                  </p>
                </div>
              </section>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link href="/register" className="flex-1">
                <Button variant="outline" size="touch" className="w-full text-sm sm:text-base">
                  Back to Registration
                </Button>
              </Link>
              <Link href="/privacy" className="flex-1">
                <Button variant="outline" size="touch" className="w-full text-sm sm:text-base">
                  View Privacy Policy
                </Button>
              </Link>
              <Link href="/login" className="flex-1">
                <Button size="touch" className="w-full text-sm sm:text-base">
                  Proceed to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
