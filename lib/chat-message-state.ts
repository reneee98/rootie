import type { ChatMessage } from "./data/chat";

function compareMessageTimestamps(first: string, second: string): number {
  const milliseconds = Date.parse(first) - Date.parse(second);
  if (milliseconds) return milliseconds;
  // PostgreSQL retains microseconds; Date.parse only retains milliseconds.
  // Compare the remaining fraction after normalizing offsets via Date.parse.
  const microseconds = (timestamp: string) =>
    Number((timestamp.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6));
  return microseconds(first) - microseconds(second);
}

/** Reconcile polling, realtime and server refreshes without losing local messages. */
export function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) =>
    compareMessageTimestamps(a.created_at, b.created_at) || a.id.localeCompare(b.id)
  );
}

export function confirmOptimisticChatMessage(
  current: ChatMessage[], tempId: string, messageId: string, createdAt: string
): ChatMessage[] {
  const optimistic = current.find((message) => message.id === tempId);
  const withoutTemp = current.filter((message) => message.id !== tempId);
  if (!optimistic || withoutTemp.some((message) => message.id === messageId)) return withoutTemp;
  return mergeChatMessages(withoutTemp, [{ ...optimistic, id: messageId, created_at: createdAt }]);
}
