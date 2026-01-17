"use client";

import { HOMEPAGE_CONTENT } from "./content";

export function HowItWorksSection() {
  const { title, steps } = HOMEPAGE_CONTENT.howItWorks;

  return (
    <section
      className="w-full py-12 md:py-24 bg-muted/50"
      data-testid="how-it-works-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl">
            {title}
          </h2>
          <div className="grid gap-8 mt-8 max-w-3xl w-full">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-4 text-left"
                data-testid="how-it-works-step"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                  {step.number}
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
