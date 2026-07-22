import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { Badge } from "@/components/ui/badge";
import { ONBOARDING_STEPS } from "@/domain/onboarding";

type Props = {
  currentStep?: (typeof ONBOARDING_STEPS)[number]["key"] | "inicio";
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function StepShell({ currentStep, title, description, children, footer }: Props) {
  const stepIndex =
    currentStep === undefined || currentStep === "inicio"
      ? -1
      : ONBOARDING_STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Início" className="inline-flex">
            <Logo variant="full" className="h-8 w-auto text-foreground" />
          </Link>
          <Badge variant="outline" className="gap-1.5 py-1 text-[11px] uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand-accent))]" />
            Onboarding — demo
          </Badge>
        </div>
        {stepIndex >= 0 && (
          <nav
            aria-label="Progresso do onboarding"
            className="mx-auto w-full max-w-4xl px-4 pb-4 sm:px-6"
          >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              {ONBOARDING_STEPS.map((s, i) => {
                const done = i < stepIndex;
                const active = i === stepIndex;
                return (
                  <li key={s.key} className="flex items-center gap-2">
                    <span
                      className={
                        "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : done
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground")
                      }
                      aria-current={active ? "step" : undefined}
                    >
                      {i + 1}
                    </span>
                    <span className={active ? "text-foreground" : ""}>{s.label}</span>
                    {i < ONBOARDING_STEPS.length - 1 && (
                      <span aria-hidden className="mx-1 text-border">·</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {children}
        {footer && <div className="mt-8">{footer}</div>}
      </main>
    </div>
  );
}
