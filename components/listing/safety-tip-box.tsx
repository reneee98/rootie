"use client";

import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function SafetyTipBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20",
        className
      )}
      role="note"
    >
      <div className="flex gap-3">
        <ShieldAlert
          className="text-amber-600 dark:text-amber-500 size-5 shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="text-amber-900 dark:text-amber-100 text-sm">
          <p className="font-medium">Bezpečný obchod</p>
          <p className="mt-0.5 text-amber-800 dark:text-amber-200/90">
            Neplaťte vopred neznámym predajcom. Odporúčame osobné odovzdanie alebo overeného predajcu.
          </p>
        </div>
      </div>
    </div>
  );
}
