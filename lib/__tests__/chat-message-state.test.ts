import { describe, expect, it } from "vitest";
import { confirmOptimisticChatMessage, mergeChatMessages } from "../chat-message-state";
import type { ChatMessage } from "../data/chat";

const message = (id: string, created_at = "2026-10-02T10:00:00Z"): ChatMessage => ({
  id, created_at, thread_id: "thread", sender_id: "user", body: id,
  message_type: "text", metadata: {}, attachments: [],
});

describe("chat message reconciliation", () => {
  it("deduplicates repeated polling and sorts incoming messages", () => {
    expect(mergeChatMessages([message("new", "2026-10-02T10:01:00Z")], [message("old"), message("new", "2026-10-02T10:01:00Z")]).map((m) => m.id)).toEqual(["old", "new"]);
  });

  it("confirms only the matching optimistic send", () => {
    const settled = confirmOptimisticChatMessage([message("temp-a"), message("temp-b"), message("other")], "temp-a", "sent-a", "2026-10-02T10:02:00Z");
    expect(settled.map((m) => m.id)).toEqual(["other", "temp-b", "sent-a"]);
  });

  it("keeps the server message when realtime wins the race", () => {
    const real = { ...message("real"), body: "Server text" };
    expect(confirmOptimisticChatMessage([message("temp-a"), real], "temp-a", "real", real.created_at)).toEqual([real]);
  });

  it("retains PostgreSQL microsecond order when IDs sort in the opposite order", () => {
    const earlier = message("z", "2026-10-02T10:00:00.123100+00:00");
    const later = message("a", "2026-10-02T10:00:00.123900Z");
    expect(mergeChatMessages([later], [earlier]).map((m) => m.id)).toEqual(["z", "a"]);
  });

  it("orders equivalent offsets and fractions by ID only when instants match", () => {
    const equivalent = message("z", "2026-10-02T12:00:00.1234+02:00");
    const utc = message("a", "2026-10-02T10:00:00.123400Z");
    expect(mergeChatMessages([equivalent], [utc]).map((m) => m.id)).toEqual(["a", "z"]);
  });
});
