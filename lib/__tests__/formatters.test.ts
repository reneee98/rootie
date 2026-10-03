import { describe, expect, it } from "vitest";
import { formatDateTime, formatPrice } from "../formatters";

describe("price formatting", () => {
  it("preserves cents in prices and bid increments", () => {
    expect(formatPrice(12.5)).toContain("12,5");
    expect(formatPrice(0.01)).toContain("0,01");
    expect(formatPrice(10)).toContain("10");
    expect(formatPrice(10)).not.toContain(",");
  });

  it("does not display invalid prices as an amount", () => {
    expect(formatPrice(Number.NaN)).toBe("—");
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("date formatting", () => {
  it("uses Slovakia's time zone including daylight saving time", () => {
    expect(formatDateTime("2026-01-02T10:00:00Z")).toContain("11:00");
    expect(formatDateTime("2026-07-02T10:00:00Z")).toContain("12:00");
  });

  it("does not crash the page for an invalid timestamp", () => {
    expect(formatDateTime("invalid")).toBe("—");
  });
});
