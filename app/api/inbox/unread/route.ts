import { getUser } from "@/lib/auth";
import { getHasUnreadInbox } from "@/lib/data/inbox";

export async function GET() {
  const user = await getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const hasUnread = await getHasUnreadInbox(user.id);

  return Response.json(
    { hasUnread },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
