"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className
      )}
    >
      {icon && (
        <div className="text-muted-foreground [&_svg]:size-12" aria-hidden>
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h2 className="rootie-h3 text-foreground">{title}</h2>
        {description && (
          <p className="rootie-caption max-w-sm">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export { EmptyState };
