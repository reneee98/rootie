import { requireUser } from "@/lib/auth";
import { getInboxThreads } from "@/lib/data/inbox";
import { getSellerAuctionListings, getBidderAuctionListings } from "@/lib/data/auction-bids";
import { InboxTabs } from "@/components/chat/inbox-tabs";

export default async function InboxPage() {
  const user = await requireUser("/inbox");

  const [threads, sellerAuctionListings, bidderAuctionListings] = await Promise.all([
    getInboxThreads(user.id),
    getSellerAuctionListings(user.id),
    getBidderAuctionListings(user.id),
  ]);

  return (
    <InboxTabs
      threads={threads}
      sellerAuctionListings={sellerAuctionListings}
      bidderAuctionListings={bidderAuctionListings}
    />
  );
}
