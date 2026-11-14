import { describe, expect, it } from "vitest";
import {
  fulfillmentKind,
  orderedRevenue,
  parseCreateFulfillment,
  saleDebt,
  saleFlowSummary,
} from "./sales";

function line(ordered: number, shipped: number, price = 1000) {
  return {
    qtyOrdered: ordered,
    unitSalePrice: price,
    shipmentLines: shipped ? [{ qty: shipped }] : [],
  };
}

describe("saleDebt", () => {
  it("counts preorder debt from full order, not shipped revenue", () => {
    const sale = {
      status: "open" as const,
      lines: [line(10, 0)],
      payments: [],
    };
    expect(saleDebt(sale)).toBe(10_000);
    expect(orderedRevenue(sale)).toBe(10_000);
  });

  it("subtracts payments from order total", () => {
    const sale = {
      status: "partial" as const,
      lines: [line(10, 4)],
      payments: [{ amount: 3000 }],
    };
    expect(saleDebt(sale)).toBe(7_000);
  });

  it("ignores archived payments", () => {
    const sale = {
      status: "open" as const,
      lines: [line(10, 0)],
      payments: [{ amount: 4000, archivedAt: new Date("2026-11-14") }],
    };
    expect(saleDebt(sale)).toBe(10_000);
  });
});

describe("fulfillmentKind", () => {
  it("marks unshipped orders as preorder", () => {
    expect(fulfillmentKind({ status: "open", lines: [line(5, 0)] })).toBe("preorder");
  });

  it("marks partial shipments", () => {
    expect(fulfillmentKind({ status: "partial", lines: [line(5, 2)] })).toBe("partial");
  });
});

describe("saleFlowSummary", () => {
  it("suggests shipment when prepaid preorder", () => {
    const flow = saleFlowSummary({
      status: "open",
      lines: [line(8, 0)],
      payments: [{ amount: 8_000 }],
    });
    expect(flow.debt).toBe(0);
    expect(flow.remainingQty).toBe(8);
    expect(flow.steps[2].active).toBe(true);
  });
});

describe("parseCreateFulfillment", () => {
  it("preorder never ships", () => {
    const fd = new FormData();
    fd.set("fulfillmentMode", "preorder");
    expect(parseCreateFulfillment(fd, 10, 3)).toEqual({ mode: "preorder", shipQty: 0 });
  });

  it("ship_now validates stock and partial qty", () => {
    const fd = new FormData();
    fd.set("fulfillmentMode", "ship_now");
    fd.set("shipQty", "3");
    expect(parseCreateFulfillment(fd, 10, 5)).toEqual({ mode: "ship_now", shipQty: 3 });
    expect(parseCreateFulfillment(fd, 10, 2)).toEqual({
      error: "На складе только 2 — уменьшите отгрузку или оформите предзаказ",
    });
  });
});