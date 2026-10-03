import { isUuidLike } from "@/lib/validators";

/** Keep PostgreSQL microseconds; Date.toISOString() would truncate them. */
export function isMessageTimestamp(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate() &&
    hour <= 23 && minute <= 59 && second <= 59;
}

export function messageCursorFilter(direction: "before" | "after", timestamp: string, id: string): string {
  if (!isMessageTimestamp(timestamp) || !isUuidLike(id)) throw new Error("Invalid message cursor");
  const operator = direction === "before" ? "lt" : "gt";
  return `created_at.${operator}.${timestamp},and(created_at.eq.${timestamp},id.${operator}.${id})`;
}
