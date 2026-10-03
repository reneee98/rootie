import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { getUser } from "@/lib/auth";
import { isUuidLike } from "@/lib/validators";
import { isMessageTimestamp, messageCursorFilter } from "@/lib/message-cursor";

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
  const after = searchParams.get("after");
  const beforeId = searchParams.get("beforeId");
  const afterId = searchParams.get("afterId");

  if (!threadId || !isUuidLike(threadId)) {
    return new Response(JSON.stringify({ error: "Invalid threadId" }), {
      status: 400,
    });
  }

  if ((before && !isMessageTimestamp(before)) || (after && !isMessageTimestamp(after))) {
    return Response.json({ error: "Invalid message timestamp" }, { status: 400 });
  }
  if ((beforeId && (!before || !isUuidLike(beforeId))) || (afterId && (!after || !isUuidLike(afterId)))) {
    return Response.json({ error: "Invalid message cursor" }, { status: 400 });
  }

  if (before && after) {
    return new Response(JSON.stringify({ error: "Use either before or after, not both" }), {
      status: 400,
    });
  }

  const supabase = await createSupabaseServerClient();

  const { data: thread } = await supabase
    .from("threads")
    .select("id, user1_id, user2_id")
    .eq("id", threadId)
    .single();

  if (!thread) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }
  if (thread.user1_id !== user.id && thread.user2_id !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("is_moderator").eq("id", user.id).maybeSingle();
    if (!profile?.is_moderator) return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const mapMessage = (m: {
    id: string;
    thread_id: string;
    sender_id: string;
    body: string;
    message_type: string | null;
    metadata: Record<string, unknown> | null;
    attachments: unknown;
    created_at: string;
  }) => ({
    id: m.id,
    thread_id: m.thread_id,
    sender_id: m.sender_id,
    body: m.body,
    message_type: m.message_type ?? "text",
    metadata: m.metadata ?? {},
    attachments: Array.isArray(m.attachments) ? m.attachments : [],
    created_at: m.created_at,
  });

  const limit = 50;
  let q = supabase
    .from("messages")
    .select("id, thread_id, sender_id, body, message_type, metadata, attachments, created_at")
    .eq("thread_id", threadId);

  if (after) {
    q = afterId ? q.or(messageCursorFilter("after", after, afterId)) : q.gte("created_at", after);
    q = q
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit + 1);
  } else {
    q = q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (before) {
      q = beforeId ? q.or(messageCursorFilter("before", before, beforeId)) : q.lt("created_at", before);
    }
  }

  const { data: rows, error } = await q;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  if (after) {
    const messages = (rows ?? []).slice(0, limit).map(mapMessage);
    return Response.json({ messages, hasMore: (rows?.length ?? 0) > limit });
  }

  const list = rows ?? [];
  const hasMore = list.length > limit;
  const slice = hasMore ? list.slice(0, limit) : list;
  const messages = slice.reverse().map(mapMessage);

  return Response.json({ messages, hasMore });
}
