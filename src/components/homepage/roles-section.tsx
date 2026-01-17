"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { HOMEPAGE_CONTENT } from "./content";

export function RolesSection() {
  const { title, roles } = HOMEPAGE_CONTENT.roles;

  return (
    <section
      className="w-full py-12 md:py-24"
      data-testid="roles-section"
    >
      <div className="container px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="text-2xl font-bold tracking-tighter sm:text-3xl md:text-4xl">
            {title}
          </h2>
          <div className="grid gap-6 mt-8 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl w-full">
            {roles.map((role, index) => (
              <Card key={index} data-testid="role-card">
                <CardHeader>
                  <CardTitle>{role.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-left">
                    {role.responsibilities.map((responsibility, respIndex) => (
                      <li
                        key={respIndex}
                        className="text-sm text-muted-foreground"
                      >
                        {responsibility}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
