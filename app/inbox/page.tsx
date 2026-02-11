import { requireUser } from "@/lib/auth";
import { getInboxThreads } from "@/lib/data/inbox";
import { InboxTabs } from "@/components/chat/inbox-tabs";

export default async function InboxPage() {
  const user = await requireUser("/inbox");

  const threads = await getInboxThreads(user.id);

  return <InboxTabs threads={threads} />;
}
