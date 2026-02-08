"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HOMEPAGE_CONTENT } from "./content";

export function HeroSection() {
  const { headline, subtext, primaryCTA, secondaryCTA } = HOMEPAGE_CONTENT.hero;

  return (
    <section
      className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      data-testid="hero-section"
    >
      <div className="container px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Content */}
          <div className="flex flex-col justify-center space-y-6 text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-[3.5rem] lg:leading-[1.1] text-[var(--text-primary)] dark:text-[var(--white-pure)]">
              {headline}
            </h1>
            <p className="max-w-[540px] text-[var(--text-secondary)] dark:text-[var(--text-muted)] text-lg md:text-xl leading-relaxed mx-auto lg:mx-0">
              {subtext}
            </p>
            <div className="flex flex-col gap-3 min-[400px]:flex-row justify-center lg:justify-start pt-2">
              <Button asChild size="lg" className="bg-[var(--info-dark)] hover:bg-[var(--info-dark)] text-[var(--white-pure)] px-8 py-6 text-base font-semibold shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/25 transition-all">
                <Link href={primaryCTA.href}>{primaryCTA.label}</Link>
              </Button>
              <Button asChild variant="link" size="lg" className="text-[var(--info-dark)] dark:text-[var(--chart-blue)] font-medium">
                <Link href={secondaryCTA.href}>{secondaryCTA.label}</Link>
              </Button>
            </div>
          </div>

          {/* Dashboard Preview - Professional mockup */}
          <div className="flex items-center justify-center lg:justify-end">
            <div
              className="relative w-full max-w-[520px] bg-[var(--bg-main)] dark:bg-slate-900 rounded-xl shadow-2xl shadow-slate-900/10 dark:shadow-black/30 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden"
              data-testid="dashboard-preview"
            >
              {/* Dashboard Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800 dark:bg-slate-950 text-[var(--white-pure)]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[var(--bg-main)]/10 flex items-center justify-center text-xs font-bold">G</div>
                  <span className="text-sm font-medium">Greenhill Academy</span>
                  <span className="text-xs text-[var(--text-muted)] ml-1">| Term 2 - 2024</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6z"/></svg>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/></svg>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[var(--success)] flex items-center justify-center text-xs font-bold text-[var(--white-pure)]">JK</div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
                <div className="p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wide">Total Students</div>
                  <div className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-0.5">1850</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wide">Pending Fees</div>
                  <div className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-0.5">ugx 12,450,000</div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wide">New Messages</div>
                  <div className="text-xl font-bold text-[var(--text-primary)] dark:text-[var(--white-pure)] mt-0.5 flex items-center justify-center gap-1">3 <span className="w-2 h-2 rounded-full bg-[var(--success)]"></span></div>
                </div>
                <div className="p-3 text-center">
                  <div className="text-[10px] text-[var(--text-muted)] dark:text-[var(--text-muted)] uppercase tracking-wide">Report Sent</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <svg className="w-4 h-4 text-[var(--success)]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                    <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">Sent to Parents</span>
                  </div>
                </div>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-2 gap-4 p-4">
                {/* Fee Balance Summary */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-3">Fee Balance Summary</div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">S.4:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="w-3/4 h-full bg-[var(--accent-primary)] rounded-full"></div>
                        </div>
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">ugx 4,598,000</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">S.3:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="w-1/2 h-full bg-[var(--accent-primary)] rounded-full"></div>
                        </div>
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">ugx 560,200</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)] dark:text-[var(--text-muted)]">S.6:</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="w-1/3 h-full bg-[var(--accent-primary)] rounded-full"></div>
                        </div>
                        <span className="text-[var(--text-primary)] dark:text-[var(--text-secondary)] font-medium">ugx 1,922,000</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-lg font-bold text-[var(--chart-yellow)] dark:text-[var(--warning)]">78</span>
                    <span className="text-xs text-[var(--text-muted)] dark:text-[var(--text-muted)] ml-1">Overdue Payments</span>
                  </div>
                </div>

                {/* Recent Communications */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                  <div className="text-xs font-semibold text-[var(--text-primary)] dark:text-[var(--text-secondary)] mb-3">Recent Communications</div>
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--success-light)] dark:bg-[var(--success-dark)]/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-[var(--chart-green)] dark:text-[var(--success)]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-secondary)] truncate">Exam Results <span className="font-normal text-[var(--text-muted)]">sent via WhatsApp</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--info-light)] dark:bg-[var(--info-dark)]/30 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-[var(--chart-blue)] dark:text-[var(--chart-blue)]" fill="currentColor" viewBox="0 0 20 20"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/></svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-secondary)] truncate">Fee Reminder <span className="font-normal text-[var(--text-muted)]">sent via SMS</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-[var(--text-secondary)] dark:text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[var(--text-primary)] dark:text-[var(--text-secondary)] truncate">School Newsletter <span className="font-normal text-[var(--text-muted)]">sent via Email</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
