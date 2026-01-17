"use client";

import { Check, X } from "lucide-react";
import { HOMEPAGE_CONTENT } from "./content";

export function TargetAudienceSection() {
  const { title, goodFit, notGoodFit } = HOMEPAGE_CONTENT.targetAudience;

  return (
    <section
      className="w-full py-12 md:py-24"
      data-testid="target-audience-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl">
            {title}
          </h2>
          <div className="grid gap-8 mt-8 sm:grid-cols-2 max-w-4xl w-full">
            <div
              className="p-6 rounded-lg bg-green-50 border border-green-200"
              data-testid="good-fit-column"
            >
              <h3 className="text-lg font-semibold text-green-900 mb-4">
                Good fit
              </h3>
              <ul className="space-y-3 text-left">
                {goodFit.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3"
                    data-testid="good-fit-item"
                  >
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-green-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div
              className="p-6 rounded-lg bg-slate-50 border border-slate-200"
              data-testid="not-good-fit-column"
            >
              <h3 className="text-lg font-semibold text-slate-700 mb-4">
                Not a good fit
              </h3>
              <ul className="space-y-3 text-left">
                {notGoodFit.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3"
                    data-testid="not-good-fit-item"
                  >
                    <X className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
