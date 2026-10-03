import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowLeftRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { InboxThreadPreview } from "@/lib/data/inbox";
import { cn } from "@/lib/utils";

type InboxThreadRowProps = {
  thread: InboxThreadPreview;
  className?: string;
};

function getOrderStatusPill(orderStatus: InboxThreadPreview["order_status"]) {
  if (!orderStatus) return null;

  if (orderStatus === "delivered") {
    return {
      label: "Doručené",
      className: "bg-emerald-100 text-emerald-700",
    };
  }

  if (orderStatus === "shipped") {
    return {
      label: "Odoslané",
      className: "bg-blue-100 text-blue-700",
    };
  }

  if (orderStatus === "price_accepted" || orderStatus === "address_provided") {
    return {
      label: "Rezervované",
      className: "bg-amber-100 text-amber-700",
    };
  }

  return {
    label: "Ponuka",
    className: "bg-muted text-muted-foreground",
  };
}

export function InboxThreadRow({ thread, className }: InboxThreadRowProps) {
  const name = thread.other_user.display_name?.trim() || "Používateľ";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const timeLabel = formatInboxTime(thread.last_message_at);
  const statusPill = getOrderStatusPill(thread.order_status);
  const hasUnread = thread.unread_count > 0;
  const contextLabel =
    thread.context_preview.type === "listing"
      ? thread.context_preview.title
      : thread.context_preview.type === "wanted"
        ? `Hľadám: ${thread.context_preview.plant_name}`
        : "Priama konverzácia";

  return (
    <Link
      href={`/chat/${thread.id}`}
      className={cn(
        "focus-visible:ring-ring flex items-start gap-3 px-3 py-3 outline-none transition-colors hover:bg-[#f6f2e8] focus-visible:ring-2",
        className
      )}
      aria-label={
        thread.context_preview.type === "listing"
          ? `Konverzácia s ${name}, ohľadom ${thread.context_preview.title}`
          : thread.context_preview.type === "wanted"
            ? `Konverzácia s ${name}, ohľadom ${thread.context_preview.plant_name}`
            : `Konverzácia s ${name}`
      }
    >
      <div className="relative mt-0.5 shrink-0">
        <Avatar size="lg">
          {thread.other_user.avatar_url ? (
            <AvatarImage src={thread.other_user.avatar_url} alt={name} />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {thread.unread_count > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex min-w-[1.25rem] items-center justify-center rounded-full bg-[#4f5826] px-1 py-0.5 text-[10px] font-bold text-white"
            aria-label={`${thread.unread_count} neprečítaných`}
          >
            {thread.unread_count > 99 ? "99+" : thread.unread_count}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "truncate text-[14px] font-medium leading-[18px] text-[#232711]",
                  hasUnread && "font-semibold"
                )}
              >
                {name}
              </span>
              {thread.other_user.phone_verified ? (
                <ShieldCheck className="size-3.5 shrink-0 text-[#878379]" aria-label="Overené" />
              ) : null}
            </div>
            <p className="mt-0.5 truncate text-[12px] leading-[16px] text-[#67635c]">{contextLabel}</p>
          </div>
          <div className="shrink-0 text-right">
            {timeLabel ? (
              <p className="text-[11px] leading-[14px] text-[#878379]">{timeLabel}</p>
            ) : null}
          </div>
        </div>

        {thread.last_message_preview ? (
          <p
            className={cn(
              "mt-1 truncate text-[12px] leading-[16px]",
              hasUnread ? "text-[#232711]" : "text-[#878379]"
            )}
          >
            {thread.last_message_preview}
          </p>
        ) : null}

        <div className="mt-1 flex items-center gap-1.5 text-[11px] leading-[14px] text-[#878379]">
          {thread.context_preview.type === "wanted" ? (
            <ArrowLeftRight className="size-3 shrink-0" aria-hidden />
          ) : null}
          {statusPill ? (
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                statusPill.className
              )}
            >
              {statusPill.label}
            </span>
          ) : null}
          {thread.context_preview.type === "listing" && thread.context_preview.price ? (
            <span className="shrink-0">{thread.context_preview.price}</span>
          ) : null}
          {thread.context_preview.type === "wanted" ? (
            <span className="shrink-0">{thread.context_preview.budget_label}</span>
          ) : null}
        </div>
      </div>

      {thread.context_preview.type === "listing" &&
        thread.context_preview.image_url && (
          <div className="relative mt-0.5 size-12 shrink-0 overflow-hidden rounded-[10px] bg-muted">
            <Image fill src={thread.context_preview.image_url} alt="" className="object-cover" />
          </div>
        )}
    </Link>
  );
}

function formatInboxTime(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat("sk-SK", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat("sk-SK", {
    day: "numeric",
    month: sameYear ? "short" : "numeric",
    ...(sameYear ? {} : { year: "numeric" as const }),
  }).format(date);
}
