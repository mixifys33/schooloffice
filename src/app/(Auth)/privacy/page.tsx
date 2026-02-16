'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen w-full bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] py-4 sm:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[var(--bg-main)] dark:bg-[var(--bg-main)] rounded-lg shadow-sm border border-[var(--border-default)] dark:border-[var(--border-strong)] p-4 sm:p-6 lg:p-10">
          
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm lg:text-base text-[var(--text-muted)] dark:text-[var(--text-muted)]">
              Last Updated: February 15, 2026
            </p>
          </div>

          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            
            <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-8 lg:self-start">
              <nav className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3">
                  Contents
                </p>
                <a href="#intro" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  1. Introduction
                </a>
                <a href="#collect" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  2. Information We Collect
                </a>
                <a href="#use" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  3. How We Use Data
                </a>
                <a href="#sharing" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  4. Data Sharing
                </a>
                <a href="#security" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  5. Data Security
                </a>
                <a href="#rights" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  6. Your Rights
                </a>
                <a href="#children" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  7. Children&apos;s Privacy
                </a>
                <a href="#ai" className="block text-sm text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] py-1">
                  8. AI & Machine Learning
                </a>
              </nav>
            </aside>

            <div className="lg:col-span-9 space-y-6 sm:space-y-8 lg:space-y-10">
              
              <section id="intro">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  1. Introduction
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>
                    SchoolOffice.academy (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
                  </p>
                </div>
              </section>

              <section id="collect">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  2. Information We Collect
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">2.1 School Information</p>
                    <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 lg:ml-8">
                      <li>School name, type, and registration details</li>
                      <li>School code (permanent identifier)</li>
                      <li>Contact information and school logo</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">2.2 Student Information</p>
                    <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 lg:ml-8">
                      <li>Personal details and contact information</li>
                      <li>Academic records (grades, assessments, attendance)</li>
                      <li>Health information (if provided)</li>
                      <li>Photographs and documents</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">2.3 Parent/Guardian & Staff Information</p>
                    <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 lg:ml-8">
                      <li>Contact information and account credentials</li>
                      <li>Professional qualifications (staff)</li>
                      <li>Communication preferences</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="use">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  3. How We Use Your Information
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>We use collected information to provide and maintain the Platform, process assessments, track attendance, manage fees, facilitate communication, and improve our services.</p>
                </div>
              </section>

              <section id="sharing">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  4. Data Sharing and Disclosure
                </h2>
                <div className="space-y-4 sm:space-y-5 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>Information is shared among authorized users within your school based on their roles. We may share data with service providers (cloud hosting, SMS gateways) who are contractually obligated to protect your data.</p>
                  <div className="bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded-md p-4 sm:p-6 border-l-4 border-[var(--chart-blue)]">
                    <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">Important</p>
                    <p>We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
                  </div>
                </div>
              </section>

              <section id="security">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  5. Data Storage and Security
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>Your data is stored on secure cloud servers using MongoDB Atlas. Data is encrypted in transit and at rest. We implement industry-standard security measures including encryption, secure authentication, and regular security audits.</p>
                  <p>We retain your data for as long as your account is active. After termination, data is retained for 30 days for export, then permanently deleted.</p>
                </div>
              </section>

              <section id="rights">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  6. Your Rights and Choices
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>You have the right to:</p>
                  <ul className="list-disc list-inside space-y-2 sm:space-y-3 ml-4 sm:ml-6 lg:ml-8">
                    <li>Access and update your personal information</li>
                    <li>Request a copy of your data in a portable format</li>
                    <li>Request deletion of your data (subject to legal requirements)</li>
                    <li>Opt out of non-essential communications</li>
                    <li>Review and modify your children&apos;s information (for parents)</li>
                  </ul>
                </div>
              </section>

              <section id="children">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  7. Children&apos;s Privacy
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>The Platform processes information about students, including minors. We rely on schools to obtain necessary parental consent. Parents have the right to review, modify, or delete their children&apos;s information.</p>
                </div>
              </section>

              <section id="ai">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  8. AI and Machine Learning (Future)
                </h2>
                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base lg:text-lg leading-relaxed text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                  <p>If AI features are implemented, your data may be used to train and improve AI models. We will provide separate notice and obtain consent before implementing AI features. AI outputs will be suggestions only and require human oversight.</p>
                </div>
              </section>

              <section className="pt-6 sm:pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-3 sm:mb-4">
                  Contact Us
                </h2>
                <div className="bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded-md p-4 sm:p-6 space-y-2">
                  <p className="font-semibold text-sm sm:text-base text-[var(--text-primary)] dark:text-[var(--white-pure)]">SchoolOffice.academy</p>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Email: privacy@schooloffice.academy</p>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Support: support@schooloffice.academy</p>
                </div>
              </section>

              <section className="pt-6 sm:pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-strong)]">
                <div className="bg-[var(--bg-surface)] dark:bg-[var(--bg-surface)] rounded-md p-4 sm:p-6 border-l-4 border-[var(--chart-blue)]">
                  <p className="font-semibold text-sm sm:text-base text-[var(--text-primary)] dark:text-[var(--white-pure)] mb-2">
                    Privacy Commitment
                  </p>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
                    We are committed to protecting your privacy and handling your data responsibly. Your trust is important to us.
                  </p>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8 border-t border-[var(--border-default)] dark:border-[var(--border-strong)] grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Link href="/register" className="w-full">
              <Button variant="outline" size="touch" className="w-full text-sm sm:text-base">
                Back to Registration
              </Button>
            </Link>
            <Link href="/terms" className="w-full">
              <Button variant="outline" size="touch" className="w-full text-sm sm:text-base">
                View Terms of Service
              </Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button size="touch" className="w-full text-sm sm:text-base">
                Proceed to Login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
