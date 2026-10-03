import { describe, expect, it } from "vitest";
import { normalizeNextPath } from "../auth-redirect";

describe("authentication redirects", () => {
  it("preserves internal destinations and filters", () => {
    expect(normalizeNextPath("/wanted/create?region=BA#form")).toBe("/wanted/create?region=BA#form");
  });

  it.each([undefined, ["/me"], "https://evil.test", "//evil.test", "/\\evil.test", "/%2fevil.test", "/%5cevil.test", "/\n/evil.test", "/login?next=/me", "/foo/../signup", "/auth/callback", "/%6cogin", "/signup/"])("rejects unsafe or looping destination %s", (value) => {
    expect(normalizeNextPath(value)).toBe("/");
  });
});
