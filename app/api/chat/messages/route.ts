import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { searchParams } = new URL(request.url);
  const threadId = searchParams.get("threadId");
  const before = searchParams.get("before");

  if (!threadId) {
    return new Response(JSON.stringify({ error: "Missing threadId" }), {
      status: 400,
    });
  }

  const supabase = await createSupabaseServerClient();

  const { data: thread } = await supabase
    .from("threads")
    .select("id")
    .eq("id", threadId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .single();

  if (!thread) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  const limit = 50;
  let q = supabase
    .from("messages")
    .select("id, thread_id, sender_id, body, message_type, metadata, attachments, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (before) {
    q = q.lt("created_at", before);
  }

  const { data: rows, error } = await q;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  const list = rows ?? [];
  const hasMore = list.length > limit;
  const slice = hasMore ? list.slice(0, limit) : list;
  const messages = slice.reverse().map((m) => ({
    id: m.id,
    thread_id: m.thread_id,
    sender_id: m.sender_id,
    body: m.body,
    message_type: m.message_type ?? "text",
    metadata: m.metadata ?? {},
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    created_at: m.created_at,
  }));

  return Response.json({ messages, hasMore });
}
