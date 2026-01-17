"use client";

import { Shield } from "lucide-react";
import { HOMEPAGE_CONTENT } from "./content";

export function SecuritySection() {
  const { title, points } = HOMEPAGE_CONTENT.security;

  return (
    <section
      className="w-full py-12 md:py-24 bg-slate-50 border-y border-slate-200"
      data-testid="security-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="flex items-center gap-2 text-slate-700">
            <Shield className="h-6 w-6" />
            <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl text-slate-900">
              {title}
            </h2>
          </div>
          <ul className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl">
            {points.map((point, index) => (
              <li
                key={index}
                className="flex items-center gap-3 text-left p-4 rounded-lg bg-white border border-slate-200 shadow-sm"
                data-testid="security-point"
              >
                <div className="h-2 w-2 rounded-full bg-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600 font-medium">
                  {point.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
