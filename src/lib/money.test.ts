import { describe, expect, it } from "vitest";
import {
  cashTotals,
  clientAvgMarkup,
  formatPct,
  formatSom,
  lineProfit,
  marginPct,
  markupPct,
} from "./money";

describe("markupPct", () => {
  it("1000 → 1100 = 10%", () => {
    expect(markupPct(1100, 1000)).toBe(10);
  });

  it("zero cost is dash", () => {
    expect(markupPct(1100, 0)).toBeNull();
  });
});

describe("lineProfit", () => {
  it("uses shipped quantity", () => {
    expect(lineProfit(1100, 1000, 3)).toBe(300);
  });
});

describe("clientAvgMarkup", () => {
  it("weights by purchase cost of shipped qty", () => {
    const avg = clientAvgMarkup([
      { salePrice: 1100, cost: 1000, qty: 2 },
      { salePrice: 1500, cost: 1000, qty: 1 },
    ]);
    expect(avg).toBeCloseTo(700 / 3000 * 100);
  });
});

describe("marginPct", () => {
  it("profit / revenue", () => {
    expect(marginPct(100, 1100)).toBeCloseTo(9.0909, 3);
  });
});

describe("cashTotals", () => {
  it("sums in, out, balance", () => {
    expect(
      cashTotals([
        { direction: "IN", amount: 5000 },
        { direction: "OUT", amount: 2000 },
        { direction: "OUT", amount: 500 },
      ]),
    ).toEqual({ incoming: 5000, outgoing: 2500, balance: 2500 });
  });
});

describe("format", () => {
  it("formats som with spaces", () => {
    expect(formatSom(1100)).toBe("1 100 сум");
  });

  it("formats percent", () => {
    expect(formatPct(10)).toBe("10.0%");
    expect(formatPct(null)).toBe("—");
  });
});
