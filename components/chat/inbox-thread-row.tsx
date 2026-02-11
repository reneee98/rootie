import Link from "next/link";
import { ShieldCheck, ArrowLeftRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { InboxThreadPreview } from "@/lib/data/inbox";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type InboxThreadRowProps = {
  thread: InboxThreadPreview;
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

export function InboxThreadRow({ thread }: InboxThreadRowProps) {
  const name = thread.other_user.display_name?.trim() || "Používateľ";
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

  const timeLabel = thread.last_message_at
    ? formatDateTime(thread.last_message_at)
    : null;
  const statusPill = getOrderStatusPill(thread.order_status);

  return (
    <Link
      href={`/chat/${thread.id}`}
      className={cn(
        "focus-visible:ring-ring flex gap-3 rounded-lg border bg-card p-3 outline-none transition-colors hover:bg-accent/50 focus-visible:ring-2"
      )}
      aria-label={
        thread.context_preview.type === "listing"
          ? `Konverzácia s ${name}, ohľadom ${thread.context_preview.title}`
          : thread.context_preview.type === "wanted"
            ? `Konverzácia s ${name}, ohľadom ${thread.context_preview.plant_name}`
            : `Konverzácia s ${name}`
      }
    >
      <div className="relative shrink-0">
        <Avatar size="lg">
          {thread.other_user.avatar_url ? (
            <AvatarImage src={thread.other_user.avatar_url} alt={name} />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {thread.unread_count > 0 && (
          <span
            className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-w-[1.25rem] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold"
            aria-label={`${thread.unread_count} neprečítaných`}
          >
            {thread.unread_count > 99 ? "99+" : thread.unread_count}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold truncate text-sm">{name}</span>
          {thread.other_user.phone_verified && (
            <ShieldCheck
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-label="Overené"
            />
          )}
        </div>

        {/* Context: which listing/wanted — seller sees "Ohľadom: [kvetina]" */}
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {thread.context_preview.type === "listing" && (
            <>
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
              <span className="shrink-0">Ohľadom:</span>
              <span className="truncate font-medium text-foreground/90">
                {thread.context_preview.title}
              </span>
              {thread.context_preview.price && (
                <span className="shrink-0">{thread.context_preview.price}</span>
              )}
            </>
          )}
          {thread.context_preview.type === "wanted" && (
            <>
              <ArrowLeftRight className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{thread.context_preview.plant_name}</span>
              <span className="shrink-0">{thread.context_preview.budget_label}</span>
            </>
          )}
          {thread.context_preview.type === "direct" && (
            <span>Priama konverzácia</span>
          )}
        </div>

        {thread.last_message_preview && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {thread.last_message_preview}
          </p>
        )}

        {timeLabel && (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {timeLabel}
          </p>
        )}
      </div>

      {/* Optional: small listing/wanted thumbnail */}
      {thread.context_preview.type === "listing" &&
        thread.context_preview.image_url && (
          <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
            <img
              src={thread.context_preview.image_url}
              alt=""
              className="size-full object-cover"
            />
          </div>
        )}
    </Link>
  );
}
