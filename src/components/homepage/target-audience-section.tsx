"use client";

import { Check, X } from "lucide-react";
import { HOMEPAGE_CONTENT } from "./content";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import "@/styles/homepage-animations.css";

export function TargetAudienceSection() {
  const { title, goodFit, notGoodFit } = HOMEPAGE_CONTENT.targetAudience;
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className="w-full py-12 md:py-24"
      data-testid="target-audience-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className={`text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl ${isVisible ? 'section-fade-in' : 'section-animate'}`}>
            {title}
          </h2>
          <div className="grid gap-8 mt-8 sm:grid-cols-2 max-w-4xl w-full">
            {/* Good Fit Column - Slide in from left with green gradient accents */}
            <div
              className={`p-6 rounded-lg bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-shadow duration-300 ${isVisible ? 'section-slide-right' : 'section-animate'}`}
              data-testid="good-fit-column"
            >
              <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent">
                Good fit
              </h3>
              <ul className="space-y-3 text-left">
                {goodFit.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-md audience-item-hover hover:bg-green-100/50 dark:hover:bg-green-900/20"
                    data-testid="good-fit-item"
                  >
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0 icon-scale-hover" />
                    <span className="text-sm text-green-900 dark:text-green-100">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Not Good Fit Column - Slide in from right with neutral gray styling */}
            <div
              className={`p-6 rounded-lg bg-muted/50 border shadow-md hover:shadow-lg transition-shadow duration-300 ${isVisible ? 'section-slide-left section-stagger-1' : 'section-animate'}`}
              data-testid="not-good-fit-column"
            >
              <h3 className="text-lg font-semibold mb-4">
                Not a good fit
              </h3>
              <ul className="space-y-3 text-left">
                {notGoodFit.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-2 rounded-md audience-item-hover hover:bg-muted"
                    data-testid="not-good-fit-item"
                  >
                    <X className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0 icon-scale-hover" />
                    <span className="text-sm text-muted-foreground">{item}</span>
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
