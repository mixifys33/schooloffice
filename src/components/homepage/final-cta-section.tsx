"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HOMEPAGE_CONTENT } from "./content";

export function FinalCTASection() {
  const { headline, buttonLabel, buttonHref, reassuranceText } =
    HOMEPAGE_CONTENT.finalCTA;

  return (
    <section
      className="w-full py-16 md:py-24 bg-primary"
      data-testid="final-cta-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-6 text-center">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl text-primary-foreground">
            {headline}
          </h2>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-base font-semibold"
          >
            <Link href={buttonHref}>{buttonLabel}</Link>
          </Button>
          <p className="text-sm text-primary-foreground/80">
            {reassuranceText}
          </p>
        </div>
      </div>
    </section>
  );
}
