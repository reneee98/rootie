import { describe, expect, it } from "vitest";
import { normalizePhone } from "../phone";

describe("phone normalization", () => {
  it.each(["901 234 567", "0901 234 567", "+421 901 234 567", "421901234567", "00421901234567"])("normalizes %s consistently for profile and OTP", (value) => {
    expect(normalizePhone(value)).toBe("+421901234567");
  });

  it("preserves explicit international country codes", () => {
    expect(normalizePhone("+420 601 234 567")).toBe("+420601234567");
  });

  it.each([null, "", "abc901234567", "+421", "+000000000", "901234567890123456", "901+234567"])("rejects invalid phone %s", (value) => {
    expect(normalizePhone(value)).toBeNull();
  });
});
