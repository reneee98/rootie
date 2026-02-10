"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState } from "react";

import { Ban, MessageCircle, Flag, Star } from "lucide-react";

import { blockUser } from "@/lib/actions/block";
import { getOrCreateDirectThreadFormAction } from "@/lib/actions/direct-thread";
import {
  reportUserFormAction,
  type ReportFormState,
} from "@/lib/actions/report";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ProfileActionsProps = {
  profileUserId: string;
  isOwnProfile: boolean;
  isBlocked: boolean;
  isAuthenticated: boolean;
  reviewableCount?: number;
};

export function ProfileActions({
  profileUserId,
  isOwnProfile,
  isBlocked,
  isAuthenticated,
  reviewableCount = 0,
}: ProfileActionsProps) {
  const router = useRouter();
  const [blockPending, setBlockPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportState, reportFormAction] = useActionState<ReportFormState | null, FormData>(
    (prev, formData) => reportUserFormAction(prev, formData),
    null
  );

  const handleBlock = useCallback(async () => {
    setBlockPending(true);
    const result = await blockUser(profileUserId);
    setBlockPending(false);
    if (result.ok) {
      router.refresh();
    }
  }, [profileUserId, router]);

  useEffect(() => {
    if (reportState?.ok === true) {
      setReportOpen(false);
    }
  }, [reportState]);

  if (isOwnProfile) {
    return (
      <Button asChild variant="default" className="w-full sm:w-auto">
        <Link href="/me">Môj účet</Link>
      </Button>
    );
  }

  if (isBlocked) {
    return (
      <p className="text-muted-foreground text-sm">
        Tento používateľ je zablokovaný. Nepridávajte mu správy.
      </p>
    );
  }

  const reasons = [
    "spam",
    "harassment",
    "scam",
    "inappropriate_content",
    "other",
  ] as const;

  const loginHref = `/login?next=${encodeURIComponent("/profile/" + profileUserId)}`;

  const messageButton = isAuthenticated ? (
    <form action={getOrCreateDirectThreadFormAction} className="contents">
      <input type="hidden" name="targetUserId" value={profileUserId} />
      <Button type="submit" variant="default" className="w-full sm:w-auto" size="lg">
        <MessageCircle className="size-4" aria-hidden />
        Správa
      </Button>
    </form>
  ) : (
    <Button asChild variant="default" className="w-full sm:w-auto" size="lg">
      <Link href={loginHref}>
        <MessageCircle className="size-4" aria-hidden />
        Správa
      </Link>
    </Button>
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {messageButton}

      {reviewableCount > 0 && (
        <Button asChild variant="secondary" size="lg" className="gap-1.5">
          <Link href={`/review?sellerId=${profileUserId}`}>
            <Star className="size-4" aria-hidden />
            Napísať recenziu
          </Link>
        </Button>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={blockPending || !isAuthenticated}
          onClick={handleBlock}
          aria-label="Zablokovať používateľa"
          title={!isAuthenticated ? "Prihláste sa" : undefined}
        >
          <Ban className="size-4" aria-hidden />
          {blockPending ? "Blokujem\u2026" : "Zablokovať"}
        </Button>

        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={!isAuthenticated}
              aria-label="Nahlásiť používateľa"
              title={!isAuthenticated ? "Prihláste sa" : undefined}
            >
              <Flag className="size-4" aria-hidden />
              Nahlásiť
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nahlásiť používateľa</DialogTitle>
              <DialogDescription>
                Popíšte dôvod nahlásenia. Tím to skontroluje.
              </DialogDescription>
            </DialogHeader>
            <form
              action={reportFormAction}
              className="flex flex-col gap-4"
              id="report-form"
            >
              <label className="text-sm font-medium" htmlFor="report-reason">
                Dôvod
              </label>
              <select
                id="report-reason"
                name="reason"
                className="border-input bg-background focus-visible:ring-ring flex h-11 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-2"
                required
              >
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r === "spam" && "Spam"}
                    {r === "harassment" && "Obtěžovanie"}
                    {r === "scam" && "Podvod"}
                    {r === "inappropriate_content" && "Nevhodný obsah"}
                    {r === "other" && "Iné"}
                  </option>
                ))}
              </select>
              <label className="text-sm font-medium" htmlFor="report-details">
                Detail (voliteľné)
              </label>
              <textarea
                id="report-details"
                name="details"
                placeholder="Popis problému\u2026"
                rows={3}
                className="border-input focus-visible:ring-ring w-full min-w-0 resize-y rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] md:text-sm"
              />
              {reportState?.ok === false && (
                <p className="text-destructive text-sm">{reportState.error}</p>
              )}
              {reportState?.ok === true && (
                <p className="text-emerald-600 text-sm">
                  Nahlásenie bolo odoslané.
                </p>
              )}
            </form>
            <DialogFooter showCloseButton>
              <Button type="submit" form="report-form">
                Odoslať nahlásenie
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
