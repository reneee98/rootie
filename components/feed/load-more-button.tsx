"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LoadMoreButton({ hasMore = true }: { hasMore?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const rawPage = Number(searchParams.get("page") || "1");
  const currentPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) params.delete("page");
    else params.set("page", String(page));
    startTransition(() => {
      router.push(params.size > 0 ? `/?${params.toString()}` : "/");
    });
  };

  return (
    <div className="flex justify-center gap-2 py-4">
      {currentPage > 1 ? (
        <Button variant="outline" disabled={isPending} className="flex-1" onClick={() => navigateToPage(currentPage - 1)}>
          Predchádzajúce
        </Button>
      ) : null}
      {hasMore ? (
      <Button
        variant="outline"
        onClick={() => navigateToPage(currentPage + 1)}
        disabled={isPending}
        className="flex-1"
      >
        {isPending ? "Načítavam…" : "Ďalšie inzeráty"}
      </Button>
      ) : null}
    </div>
  );
}
