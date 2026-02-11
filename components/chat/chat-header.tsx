"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, ShieldCheck, MoreVertical, Ban, Flag, Package2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { blockUser } from "@/lib/actions/block";
import { reportThread } from "@/lib/actions/report";
import type { ThreadDetail } from "@/lib/data/chat";

const REPORT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Obtěžovanie" },
  { value: "scam", label: "Podvod" },
  { value: "inappropriate_content", label: "Nevhodný obsah" },
  { value: "other", label: "Iné" },
];

type ChatHeaderProps = {
  thread: ThreadDetail;
};

export function ChatHeader({ thread }: ChatHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("other");
  const [reportDetails, setReportDetails] = useState("");
  const [reportState, setReportState] = useState<"idle" | "success" | "error">("idle");
  const [blocking, setBlocking] = useState(false);

  const handleBlock = async () => {
    setMenuOpen(false);
    setBlocking(true);
    const result = await blockUser(thread.other_user.id);
    setBlocking(false);
    if (result.ok) router.push("/inbox");
  };

  const handleReportSubmit = async () => {
    const result = await reportThread(thread.id, reportReason, reportDetails || undefined);
    if (result.ok) {
      setReportState("success");
      setTimeout(() => {
        setReportOpen(false);
        setReportState("idle");
      }, 1500);
    } else {
      setReportState("error");
    }
  };
  const name = thread.other_user.display_name?.trim() || "Používateľ";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-30 flex flex-col border-b backdrop-blur">
      <div className="flex h-14 items-center gap-2 px-2">
        <Link
          href="/inbox"
          className="text-muted-foreground hover:text-foreground flex size-11 items-center justify-center rounded-full transition-colors"
          aria-label="Späť do správ"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <Link
          href={`/profile/${thread.other_user.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <Avatar size="default">
            {thread.other_user.avatar_url ? (
              <AvatarImage src={thread.other_user.avatar_url} alt={name} />
            ) : null}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold truncate text-sm">{name}</p>
            {thread.other_user.phone_verified && (
              <p className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                <ShieldCheck className="size-3" aria-hidden />
                Overené
              </p>
            )}
          </div>
        </Link>

        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Možnosti"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="size-5" />
          </Button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div className="border-input bg-background absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border py-1 shadow-lg">
                <button
                  type="button"
                  className="hover:bg-muted flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm"
                  onClick={handleBlock}
                  disabled={blocking}
                >
                  <Ban className="size-4" aria-hidden />
                  Zablokovať
                </button>
                <button
                  type="button"
                  className="hover:bg-muted flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                >
                  <Flag className="size-4" aria-hidden />
                  Nahlásiť konverzáciu
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nahlásiť konverzáciu</DialogTitle>
            <DialogDescription>
              Popíšte dôvod nahlásenia.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="text-sm font-medium" htmlFor="chat-report-reason">
              Dôvod
            </label>
            <select
              id="chat-report-reason"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="border-input bg-background h-11 w-full rounded-md border px-3 py-2 text-sm"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium" htmlFor="chat-report-details">
              Detail (voliteľné)
            </label>
            <textarea
              id="chat-report-details"
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Popis problému…"
              rows={3}
              className="border-input bg-background w-full resize-y rounded-md border px-3 py-2 text-sm"
            />
            {reportState === "success" && (
              <p className="text-sm text-emerald-600">Nahlásenie odoslané.</p>
            )}
            {reportState === "error" && (
              <p className="text-destructive text-sm">Chyba pri odoslaní.</p>
            )}
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleReportSubmit}>Odoslať nahlásenie</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context card with link */}
      {thread.context_card.type !== "direct" && (
        <Link
          href={thread.context_card.href}
          className="border-t bg-muted/30 flex min-h-14 items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/50"
        >
          {thread.context_card.type === "listing" && (
            <div className="size-11 shrink-0 overflow-hidden rounded bg-muted">
              {thread.context_card.image_url ? (
                <img
                  src={thread.context_card.image_url}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <div className="text-muted-foreground flex size-full items-center justify-center">
                  <Package2 className="size-4" aria-hidden />
                </div>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {thread.context_card.type === "listing"
                ? thread.context_card.title
                : thread.context_card.plant_name}
            </p>
            <p className="text-muted-foreground text-xs">
              {thread.context_card.type === "listing"
                ? thread.context_card.price ?? "Aukcia / Dohodou"
                : thread.context_card.budget_label}
            </p>
          </div>
        </Link>
      )}
    </header>
  );
}
