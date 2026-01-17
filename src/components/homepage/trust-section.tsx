"use client";

import { Check } from "lucide-react";
import { HOMEPAGE_CONTENT } from "./content";

export function TrustSection() {
  const { title, points } = HOMEPAGE_CONTENT.trust;

  return (
    <section
      className="w-full py-12 md:py-24 bg-muted/50"
      data-testid="trust-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl">
            {title}
          </h2>
          <ul className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl">
            {points.map((point, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-left p-4 rounded-lg bg-background border"
                data-testid="trust-point"
              >
                <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
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
