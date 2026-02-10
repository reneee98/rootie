import { Euro, ArrowLeftRight, Info } from "lucide-react";
import type { ChatMessage } from "@/lib/data/chat";
import { formatDateTime } from "@/lib/formatters";
import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
};

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const isSystem = message.message_type === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs">
          <Info className="size-3" aria-hidden />
          {message.body}
        </span>
      </div>
    );
  }

  if (message.message_type === "offer_price") {
    const amount = message.metadata?.amount as number | undefined;
    const isCounterOffer = message.metadata?.is_counter_offer === true;
    return (
      <div
        className={cn(
          "flex",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-4 py-2.5",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
            <Euro className="size-3" aria-hidden />
            {isCounterOffer ? "Protiponuka" : "Ponuka ceny"}
          </div>
          <p className="text-lg font-semibold">
            {amount != null ? formatPrice(amount) : message.body}
          </p>
          {message.body && amount != null && (
            <p className="text-xs opacity-80">{message.body}</p>
          )}
          <time className="text-[10px] opacity-70" dateTime={message.created_at}>
            {formatDateTime(message.created_at)}
          </time>
        </div>
      </div>
    );
  }

  if (message.message_type === "offer_swap") {
    return (
      <div
        className={cn(
          "flex",
          isOwn ? "justify-end" : "justify-start"
        )}
      >
        <div
          className={cn(
            "flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-4 py-2.5",
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-muted rounded-bl-md"
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium opacity-90">
            <ArrowLeftRight className="size-3" aria-hidden />
            Ponuka výmeny
          </div>
          <p className="text-sm">{message.body}</p>
          <time className="text-[10px] opacity-70" dateTime={message.created_at}>
            {formatDateTime(message.created_at)}
          </time>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-4 py-2.5",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
        {message.attachments.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.attachments.map((att, i) => (
              <a
                key={i}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="overflow-hidden rounded-lg border border-white/20"
              >
                <img
                  src={att.url}
                  alt=""
                  className="max-h-32 w-auto max-w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
        <time className="text-[10px] opacity-70" dateTime={message.created_at}>
          {formatDateTime(message.created_at)}
        </time>
      </div>
    </div>
  );
}
