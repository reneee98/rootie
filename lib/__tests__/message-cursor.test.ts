import { describe, expect, it } from "vitest";
import { isMessageTimestamp, messageCursorFilter } from "@/lib/message-cursor";
const id = "00000000-0000-4000-8000-000000000123";
describe("message tuple cursors",()=> {
  it("preserves all PostgreSQL microseconds",()=> {
    const timestamp="2026-10-02T12:00:00.123456+00:00";
    expect(messageCursorFilter("after",timestamp,id)).toBe(`created_at.gt.${timestamp},and(created_at.eq.${timestamp},id.gt.${id})`);
  });
  it("includes ID for timestamp ties when loading earlier messages",()=> {
    expect(messageCursorFilter("before","2026-10-02T12:00:00Z",id)).toContain(`id.lt.${id}`);
  });
  it.each(["garbage","2026-02-30T12:00:00Z","2026-10-02T24:00:00Z","2026-10-02T12:00:00Z,id.gt.bad"])('rejects malformed timestamp %s',value=>expect(isMessageTimestamp(value)).toBe(false));
});
