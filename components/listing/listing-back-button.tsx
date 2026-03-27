"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type ListingBackButtonProps = {
  className?: string;
};

export function ListingBackButton({ className }: ListingBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        "flex size-[44px] items-center justify-center text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.55)]",
        className
      )}
      aria-label="Späť"
    >
      <ArrowLeft className="size-6" aria-hidden />
    </button>
  );
}
