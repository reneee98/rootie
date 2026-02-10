"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";

export function LoadMoreButton() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentPage = Number(searchParams.get("page") || "1");

  const handleLoadMore = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(currentPage + 1));
    startTransition(() => {
      router.push(`/?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex justify-center py-4">
      <Button
        variant="outline"
        onClick={handleLoadMore}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? "Načítavam…" : "Načítať ďalšie"}
      </Button>
    </div>
  );
}
