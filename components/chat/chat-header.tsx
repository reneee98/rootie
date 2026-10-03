"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
  { value: "harassment", label: "Obťažovanie" },
  { value: "scam", label: "Podvod" },
  { value: "inappropriate_content", label: "Nevhodný obsah" },
  { value: "other", label: "Iné" },
];

type ChatHeaderProps = {
  thread: ThreadDetail;
  readOnly?: boolean;
};

export function ChatHeader({ thread, readOnly = false }: ChatHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("other");
  const [reportDetails, setReportDetails] = useState("");
  const [reportState, setReportState] = useState<"idle" | "success" | "error">("idle");
  const [blocking, setBlocking] = useState(false);
  const [reportPending, setReportPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  const handleBlock = async () => {
    if (pendingRef.current || readOnly) return;
    pendingRef.current = true;
    setMenuOpen(false);
    setBlocking(true);
    setActionError(null);
    try {
      const result = await blockUser(thread.other_user.id);
      if (result.ok) {
        router.push("/inbox");
        router.refresh();
      } else setActionError(result.error);
    } catch {
      setActionError("Používateľa sa nepodarilo zablokovať. Skúste to znova.");
    } finally {
      setBlocking(false);
      pendingRef.current = false;
    }
  };

  const handleReportSubmit = async () => {
    if (pendingRef.current || readOnly) return;
    pendingRef.current = true;
    setReportPending(true);
    try {
      const result = await reportThread(thread.id, reportReason, reportDetails || undefined);
      setReportState(result.ok ? "success" : "error");
    } catch {
      setReportState("error");
    } finally {
      setReportPending(false);
      pendingRef.current = false;
    }
  };
  const name = thread.other_user.display_name?.trim() || "Používateľ";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-[#e9e2d1] bg-[#f8f4eb]/95 backdrop-blur supports-[backdrop-filter]:bg-[#f8f4eb]/90">
      <div className="flex h-14 items-center gap-2 px-2.5">
        <Link
          href="/inbox"
          className="flex size-11 items-center justify-center rounded-full text-[#67635c] transition-colors hover:bg-[#f1ece1] hover:text-[#232711]"
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
            <p className="truncate text-[14px] font-semibold leading-[18px] text-[#232711]">{name}</p>
            {thread.other_user.phone_verified && (
              <p className="flex items-center gap-0.5 text-[10px] text-[#878379]">
                <ShieldCheck className="size-3" aria-hidden />
                Overené
              </p>
            )}
          </div>
        </Link>

        {!readOnly && <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 rounded-full text-[#67635c] hover:bg-[#f1ece1] hover:text-[#232711]"
            disabled={blocking}
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
              <div className="rootie-surface absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-[14px] py-1">
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#232711] hover:bg-[#f1ece1]"
                  onClick={handleBlock}
                  disabled={blocking}
                >
                  <Ban className="size-4" aria-hidden />
                  Zablokovať
                </button>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#232711] hover:bg-[#f1ece1]"
                  onClick={() => {
                    setMenuOpen(false);
                    setReportState("idle");
                    setReportOpen(true);
                  }}
                >
                  <Flag className="size-4" aria-hidden />
                  Nahlásiť konverzáciu
                </button>
              </div>
            </>
          )}
        </div>}
      </div>

      {actionError && <p role="alert" className="px-3 pb-2 text-sm text-destructive">{actionError}</p>}
      <Dialog open={reportOpen} onOpenChange={(open) => { if (!reportPending) setReportOpen(open); }}>
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
              className="rootie-field"
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
              maxLength={2000}
              className="rootie-textarea"
            />
            {reportState === "success" && (
              <p role="status" className="text-sm text-emerald-600">Nahlásenie odoslané.</p>
            )}
            {reportState === "error" && (
              <p role="alert" className="text-destructive text-sm">Chyba pri odoslaní.</p>
            )}
          </div>
          <DialogFooter showCloseButton>
            <Button onClick={handleReportSubmit} disabled={reportPending || reportState === "success"}>
              {reportPending ? "Odosielam…" : "Odoslať nahlásenie"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context card with link */}
      {thread.context_card.type !== "direct" && (
        <Link
          href={thread.context_card.href}
          className="flex min-h-14 items-center gap-3 border-t border-[#e9e2d1] bg-[#f4efe3] px-3 py-2 transition-colors hover:bg-[#eee8da]"
        >
          {thread.context_card.type === "listing" && (
            <div className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-[#e9e2d1]">
              {thread.context_card.image_url ? (
                <Image fill src={thread.context_card.image_url} alt="" className="object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-[#878379]">
                  <Package2 className="size-4" aria-hidden />
                </div>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold leading-[17px] text-[#232711]">
              {thread.context_card.type === "listing"
                ? thread.context_card.title
                : thread.context_card.plant_name}
            </p>
            <p className="text-[11px] leading-[15px] text-[#67635c]">
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
