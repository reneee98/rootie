import { describe, expect, it } from "vitest";
import { isUuidLike } from "../validators";

describe("UUID route parameters", () => {
  it("accepts canonical database UUIDs", () => {
    expect(isUuidLike("00000000-0000-4000-8000-000000000000")).toBe(true);
    expect(isUuidLike("D837BDD9-C940-4E93-B4A2-03BFAA341C7F")).toBe(true);
  });

  it("rejects hex prefixes, missing segments and malformed IDs before querying", () => {
    for (const value of ["deadbeef", "--------", "d837bdd9c9404e93b4a203bfaa341c7f", "d837bdd9-c940-4e93-b4a2-03bfaa341c7g"]) {
      expect(isUuidLike(value)).toBe(false);
    }
  });
});
