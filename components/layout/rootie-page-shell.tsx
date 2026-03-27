import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type RootiePageShellProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  children: ReactNode;
};

export function RootiePageShell({
  title,
  description,
  eyebrow,
  actions,
  className,
  headerClassName,
  contentClassName,
  children,
}: RootiePageShellProps) {
  return (
    <div className={cn("rootie-page", className)}>
      <header className={cn("rootie-page-header space-y-1.5", headerClassName)}>
        {eyebrow ? <p className="rootie-page-eyebrow">{eyebrow}</p> : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1 className="rootie-page-title">{title}</h1>
            {description ? (
              <p className="rootie-page-description">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </header>

      <div className={cn("space-y-4", contentClassName)}>{children}</div>
    </div>
  );
}
