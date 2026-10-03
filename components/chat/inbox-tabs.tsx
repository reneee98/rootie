"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxThreadPreview } from "@/lib/data/inbox";
import { InboxThreadRow } from "@/components/chat/inbox-thread-row";
import { InboxRealtimeSync } from "@/components/chat/inbox-realtime-sync";

type TabId = "active" | "resolved";

type InboxTabsProps = {
  threads: InboxThreadPreview[];
};

export function InboxTabs({ threads }: InboxTabsProps) {
  const [tab, setTab] = useState<TabId>("active");
  const [query, setQuery] = useState("");

  const activeThreads = useMemo(
    () =>
      threads.filter(
        (t) => t.order_status !== "delivered" && t.order_status !== "cancelled"
      ),
    [threads]
  );
  const resolvedThreads = useMemo(
    () =>
      threads.filter(
        (t) => t.order_status === "delivered" || t.order_status === "cancelled"
      ),
    [threads]
  );

  const tabs: { id: TabId; label: string; count: number; show: boolean }[] = [
    { id: "active", label: "Aktívne", count: activeThreads.length, show: true },
    { id: "resolved", label: "Archív", count: resolvedThreads.length, show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);
  const queryValue = query.trim().toLowerCase();
  const filteredActive = activeThreads.filter((t) => matchesQuery(t, queryValue));
  const filteredResolved = resolvedThreads.filter((t) => matchesQuery(t, queryValue));
  const shownThreads = tab === "active" ? filteredActive : filteredResolved;

  if (threads.length === 0) {
    return (
      <div className="space-y-3 pb-24">
        <InboxRealtimeSync />
        <header className="px-1 pt-1">
          <h1 className="text-[28px] font-semibold leading-[1.1] text-[#232711]">Správy</h1>
          <p className="mt-1 text-[14px] leading-[18px] text-[#67635c]">
            Konverzácie o kúpe, výmene a ponukách.
          </p>
        </header>
        <div className="rootie-surface rounded-[18px] px-5 py-14 text-center">
          <p className="text-[15px] font-medium text-[#232711]">
            Zatiaľ tu nič nie je.
          </p>
          <p className="mt-1 text-[13px] leading-[18px] text-[#67635c]">
            Keď niekomu napíšete alebo pošlete ponuku, konverzácia sa zobrazí tu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24">
      <InboxRealtimeSync />

      <header className="px-1 pt-1">
        <h1 className="text-[28px] font-semibold leading-[1.1] text-[#232711]">Správy</h1>
        <p className="mt-1 text-[14px] leading-[18px] text-[#67635c]">
          Sledujte všetky konverzácie na jednom mieste.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Typ konverzácií"
        className="grid grid-cols-2 rounded-[18px] border border-[#e9e2d1] bg-[#f1ece1] p-1"
      >
        {visibleTabs.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={`inbox-panel-${id}`}
            id={`tab-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-[14px] px-3 py-2 text-[14px] font-medium transition-colors",
              tab === id
                ? "bg-[#4f5826] text-white shadow-sm"
                : "text-[#67635c] hover:text-[#232711]"
            )}
          >
            {label}
            {count > 0 && (
              <span className={cn("ml-1.5 text-[12px]", tab === id ? "text-white/90" : "text-[#67635c]")}>
                ({count})
              </span>
            )}
          </button>
        ))}
      </div>

      <label className="rootie-surface flex min-h-[46px] items-center gap-2 rounded-[18px] px-3">
        <Search className="size-4 text-[#878379]" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hľadať v správach"
          className="search-no-native-cancel flex-1 bg-transparent text-[14px] text-[#232711] outline-none placeholder:text-[#878379]"
          aria-label="Hľadať v správach"
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="flex size-11 items-center justify-center rounded-full text-[#878379] transition-colors hover:bg-[#f1ece1] hover:text-[#232711]"
            aria-label="Vyčistiť vyhľadávanie"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </label>

      <div
        id={`inbox-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
      >
        {shownThreads.length === 0 ? (
          <div className="rootie-surface rounded-[18px] px-5 py-14 text-center">
            <p className="text-[15px] font-medium text-[#232711]">
              {queryValue
                ? "Nenašli sa žiadne správy."
                : tab === "active"
                  ? "Žiadne aktívne konverzácie."
                  : "Archív je zatiaľ prázdny."}
            </p>
            <p className="mt-1 text-[13px] leading-[18px] text-[#67635c]">
              {queryValue
                ? "Skúste iný výraz alebo vymažte vyhľadávanie."
                : tab === "active"
                  ? "Napíšte predajcovi alebo odošlite ponuku na požiadavku."
                  : "Ukončené objednávky a uzavreté konverzácie sa zobrazia tu."}
            </p>
          </div>
        ) : (
          <ul className="rootie-surface divide-y divide-[#e9e2d1] overflow-hidden rounded-[18px]" role="list">
            {shownThreads.map((thread) => (
              <li key={thread.id}>
                <InboxThreadRow thread={thread} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function matchesQuery(thread: InboxThreadPreview, query: string): boolean {
  if (!query) return true;

  const name = thread.other_user.display_name ?? "";
  const preview = thread.last_message_preview ?? "";

  if (thread.context_preview.type === "listing") {
    return [name, preview, thread.context_preview.title, thread.context_preview.price ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  if (thread.context_preview.type === "wanted") {
    return [name, preview, thread.context_preview.plant_name, thread.context_preview.budget_label]
      .join(" ")
      .toLowerCase()
      .includes(query);
  }

  return [name, preview, "priama konverzácia"].join(" ").toLowerCase().includes(query);
}
