"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "error";

type ToastProps = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  className?: string;
};

function Toast({ title, description, variant = "default", className }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-lg border px-4 py-3 shadow-lg",
        variant === "success" && "border-primary/30 bg-primary/10 text-primary",
        variant === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
        variant === "default" && "border-border bg-background",
        className
      )}
    >
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
    </div>
  );
}

export { Toast };
export type { ToastVariant };
