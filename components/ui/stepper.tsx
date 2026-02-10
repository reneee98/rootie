"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepperProps = {
  steps: { label: string }[];
  currentStep: number;
  className?: string;
};

function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Kroky" className={cn("w-full", className)}>
      <ol className="flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <li
              key={step.label}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="flex w-full items-center">
                {index > 0 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    isCurrent &&
                      "border-primary bg-background text-primary",
                    !isCompleted &&
                      !isCurrent &&
                      "border-input bg-background text-muted-foreground"
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <Check className="size-4" aria-hidden />
                  ) : (
                    stepNumber
                  )}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 flex-1",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Stepper };
