"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { InboxThreadPreview } from "@/lib/data/inbox";
import type { SellerAuctionListing, BidderAuctionListing } from "@/lib/data/auction-bids";
import { InboxThreadRow } from "@/components/chat/inbox-thread-row";
import { InboxRealtimeSync } from "@/components/chat/inbox-realtime-sync";
import { AuctionBidsList } from "@/components/chat/auction-bids-list";

type TabId = "active" | "auctions" | "resolved";

type InboxTabsProps = {
  threads: InboxThreadPreview[];
  sellerAuctionListings?: SellerAuctionListing[];
  bidderAuctionListings?: BidderAuctionListing[];
};

export function InboxTabs({
  threads,
  sellerAuctionListings = [],
  bidderAuctionListings = [],
}: InboxTabsProps) {
  const [tab, setTab] = useState<TabId>("active");

  const activeThreads = threads.filter((t) => !t.order_delivered_at);
  const resolvedThreads = threads.filter((t) => t.order_delivered_at);

  const showAuctionsTab = sellerAuctionListings.length > 0 || bidderAuctionListings.length > 0;
  const totalBids =
    sellerAuctionListings.reduce((sum, l) => sum + l.bids.length, 0)
    + bidderAuctionListings.length;

  const tabs: { id: TabId; label: string; count: number; show: boolean }[] = [
    { id: "active", label: "Aktívne", count: activeThreads.length, show: true },
    { id: "auctions", label: "Aukcie", count: totalBids, show: showAuctionsTab },
    { id: "resolved", label: "Vyriešené", count: resolvedThreads.length, show: true },
  ];

  const visibleTabs = tabs.filter((t) => t.show);

  if (threads.length === 0 && sellerAuctionListings.length === 0 && bidderAuctionListings.length === 0) {
    return (
      <div className="space-y-4 pb-24">
        <h1 className="text-lg font-semibold">Správy</h1>
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Zatiaľ nemáte žiadne konverzácie.
          </p>
          <p className="text-muted-foreground text-xs">
            Napíšte predajcovi z inzerátu alebo odošlite ponuku na požiadavku
            „Hľadám".
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <InboxRealtimeSync threadIds={threads.map((t) => t.id)} />

      <h1 className="text-lg font-semibold">Správy</h1>

      <div
        role="tablist"
        aria-label="Typ konverzácií"
        className="flex rounded-lg border bg-muted/50 p-0.5"
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
              "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              tab === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Aktívne */}
      <div
        id="inbox-panel-active"
        role="tabpanel"
        aria-labelledby="tab-active"
        hidden={tab !== "active"}
      >
        {tab === "active" && (
          <>
            {activeThreads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-muted-foreground text-sm">
                  Žiadne aktívne konverzácie.
                </p>
                <p className="text-muted-foreground text-xs">
                  Napíšte predajcovi z inzerátu alebo odošlite ponuku na požiadavku
                  „Hľadám".
                </p>
              </div>
            ) : (
              <ul className="space-y-2" role="list">
                {activeThreads.map((thread) => (
                  <li key={thread.id}>
                    <InboxThreadRow thread={thread} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* Aukcie */}
      {showAuctionsTab && (
        <div
          id="inbox-panel-auctions"
          role="tabpanel"
          aria-labelledby="tab-auctions"
          hidden={tab !== "auctions"}
        >
          {tab === "auctions" && (
            <AuctionBidsList
              sellerListings={sellerAuctionListings}
              bidderListings={bidderAuctionListings}
            />
          )}
        </div>
      )}

      {/* Vyriešené */}
      <div
        id="inbox-panel-resolved"
        role="tabpanel"
        aria-labelledby="tab-resolved"
        hidden={tab !== "resolved"}
      >
        {tab === "resolved" && (
          <>
            {resolvedThreads.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-muted-foreground text-sm">
                  Zatiaľ nemáte vyriešené objednávky.
                </p>
                <p className="text-muted-foreground text-xs">
                  Tu sa zobrazia konverzácie, v ktorých kupujúci potvrdil doručenie.
                </p>
              </div>
            ) : (
              <ul className="space-y-2" role="list">
                {resolvedThreads.map((thread) => (
                  <li key={thread.id}>
                    <InboxThreadRow thread={thread} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
