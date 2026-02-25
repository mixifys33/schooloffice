"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <img 
              src="/images/schooloffice.png" 
              alt="SchoolOffice Logo" 
              className="h-10 w-10"
            />
            <span className="hidden font-bold sm:inline-block text-lg">
              SchoolOffice
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-3">
          <nav className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" size="default" className="text-base">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button 
                variant="outline" 
                size="default"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground font-medium text-base"
              >
                Register Your School
              </Button>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
} 