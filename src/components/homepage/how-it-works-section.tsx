"use client";

import { HOMEPAGE_CONTENT } from "./content";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import "@/styles/homepage-animations.css";

export function HowItWorksSection() {
  const { title, steps } = HOMEPAGE_CONTENT.howItWorks;
  const { ref, isVisible } = useScrollAnimation();

  return (
    <section
      ref={ref}
      className="w-full py-12 md:py-24 bg-muted/50"
      data-testid="how-it-works-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2
            className={`text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl ${
              isVisible ? "section-fade-in" : "section-animate"
            }`}
          >
            {title}
          </h2>
          <div className="grid gap-8 mt-8 max-w-3xl w-full relative">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connecting line between steps */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute left-5 top-12 w-0.5 h-8 bg-gradient-to-b from-primary to-primary/30 ${
                      isVisible ? "section-fade-in" : "section-animate"
                    } section-stagger-${index + 2}`}
                  />
                )}
                <div
                  className={`flex items-start gap-4 text-left p-4 rounded-lg border border-transparent step-highlight ${
                    isVisible ? "section-slide-right" : "section-animate"
                  } section-stagger-${index + 1}`}
                  data-testid="how-it-works-step"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full badge-gradient text-white flex items-center justify-center font-bold text-lg badge-pulse shadow-lg">
                    {step.number}
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p
                      className={`text-sm text-muted-foreground ${
                        isVisible ? "section-fade-in" : "section-animate"
                      } section-stagger-${index + 2}`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
