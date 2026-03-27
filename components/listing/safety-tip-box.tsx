"use client";

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function SafetyTipBox({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[14px] bg-[#fefce8] px-3.5 pb-3.5 pt-3.5",
        className
      )}
      role="note"
    >
      <div className="flex gap-2.5">
        <ShieldCheck className="mt-[1px] size-4 shrink-0 text-[#d08700]" aria-hidden />
        <div className="space-y-1.5">
          <p className="text-[14px] font-semibold leading-[18px] text-[#733e0a]">Bezpečný obchod</p>
          <ul className="space-y-1 text-[11.5px] leading-[16px] text-[#894b00]">
            <li className="flex gap-[7px]">
              <span className="text-[#d08700]">•</span>
              <span>Neplaťte vopred neznámym predajcom</span>
            </li>
            <li className="flex gap-[7px]">
              <span className="text-[#d08700]">•</span>
              <span>Odporúčame osobné odovzdanie</span>
            </li>
            <li className="flex gap-[7px]">
              <span className="text-[#d08700]">•</span>
              <span>Skontrolujte rastlinu pred platbou</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
