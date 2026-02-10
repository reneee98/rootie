"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Trash2,
  AlertTriangle,
  Ban,
  Loader2,
} from "lucide-react";
import {
  resolveReport,
  removeListingFromReport,
  warnUserFromReport,
  banUserFromReport,
} from "@/lib/actions/moderation";
import { Button } from "@/components/ui/button";
import type { ReportTargetType } from "@/lib/data/reports";

type ReportActionsProps = {
  reportId: string;
  targetType: ReportTargetType;
  subjectUserId: string | null;
};

export function ReportActions({
  reportId,
  targetType,
  subjectUserId,
}: ReportActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>
  ) => {
    setError(null);
    setLoading(reportId);
    try {
      const result = await action();
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading === reportId;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1"
        disabled={isLoading}
        onClick={() => handleAction(() => resolveReport(reportId))}
        aria-label="Označiť ako vyriešené"
      >
        {isLoading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <Check className="size-3.5" aria-hidden />
        )}
        Vyriešiť
      </Button>

      {targetType === "listing" && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-destructive hover:text-destructive"
          disabled={isLoading}
          onClick={() => handleAction(() => removeListingFromReport(reportId))}
          aria-label="Odstrániť inzerát"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Odstrániť inzerát
        </Button>
      )}

      {subjectUserId && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1"
            disabled={isLoading}
            onClick={() => handleAction(() => warnUserFromReport(reportId))}
            aria-label="Upozorniť používateľa"
          >
            <AlertTriangle className="size-3.5" aria-hidden />
            Upozorniť
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-destructive hover:text-destructive"
            disabled={isLoading}
            onClick={() => handleAction(() => banUserFromReport(reportId))}
            aria-label="Zablokovať používateľa"
          >
            <Ban className="size-3.5" aria-hidden />
            Zablokovať
          </Button>
        </>
      )}

      {error && (
        <p className="w-full text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
