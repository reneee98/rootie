"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { requireUser } from "@/lib/auth";

export type SendMessageResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export type SendMessageInput = {
  threadId: string;
  body: string;
  messageType?: "text" | "offer_price" | "offer_swap" | "system";
  metadata?: Record<string, unknown>;
  attachments?: { url: string; type?: string }[];
};

export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResult> {
  const user = await requireUser("/inbox");
  const supabase = await createSupabaseServerClient();

  const body = input.body?.trim() ?? "";
  if (!body && (!input.attachments || input.attachments.length === 0)) {
    return { ok: false, error: "Správa alebo príloha je povinná." };
  }

  const { data: thread } = await supabase
    .from("threads")
    .select("id, user1_id, user2_id")
    .eq("id", input.threadId)
    .single();

  if (!thread) {
    return { ok: false, error: "Konverzácia neexistuje." };
  }

  const otherId =
    thread.user1_id === user.id ? thread.user2_id : thread.user1_id;
  const { data: blocked } = await supabase
    .from("blocks")
    .select("id")
    .eq("blocker_id", otherId)
    .eq("blocked_id", user.id)
    .maybeSingle();

  if (blocked) {
    return { ok: false, error: "Tento používateľ vás zablokoval." };
  }

  const messageType = input.messageType ?? "text";
  const metadata = input.metadata ?? {};
  const attachments = input.attachments ?? [];

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      thread_id: input.threadId,
      sender_id: user.id,
      body: body || " ",
      message_type: messageType,
      metadata,
      attachments,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Message insert error:", error);
    return { ok: false, error: "Nepodarilo sa odoslať správu." };
  }

  revalidatePath("/inbox");
  revalidatePath(`/chat/${input.threadId}`);

  return { ok: true, messageId: msg.id };
}

export async function markThreadRead(threadId: string) {
  const user = await requireUser("/inbox");
  const supabase = await createSupabaseServerClient();

  await supabase.from("thread_reads").upsert(
    {
      thread_id: threadId,
      user_id: user.id,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: "thread_id,user_id" }
  );
}
