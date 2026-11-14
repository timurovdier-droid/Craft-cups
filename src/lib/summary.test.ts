import { describe, expect, it } from "vitest";
import { buildSummary, eachDay, previousPeriod, type CashEvent, type PayEvent, type ShipEvent } from "./summary";

function ship(partial: Partial<ShipEvent> & Pick<ShipEvent, "at" | "saleId" | "clientId" | "revenue">): ShipEvent {
  return {
    qty: 1,
    profit: 0,
    clientName: partial.clientId === "c1" ? "Дониёр" : "Ромашка",
    productId: "cup",
    productName: "Стакан",
    category: "Стаканы",
    unit: "шт",
    ...partial,
  };
}

describe("previousPeriod", () => {
  it("keeps the same number of calendar days", () => {
    const start = new Date(2026, 10, 7, 0, 0, 0, 0);
    const end = new Date(2026, 10, 13, 23, 59, 59, 999);
    const previous = previousPeriod(start, end);
    expect(eachDay(start, end)).toHaveLength(7);
    expect(eachDay(previous.start, previous.end)).toEqual([
      "2026-10-31",
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
    ]);
  });
});

describe("buildSummary", () => {
  const start = new Date(2026, 10, 7, 0, 0, 0, 0);
  const end = new Date(2026, 10, 13, 23, 59, 59, 999);

  const ships: ShipEvent[] = [
    ship({ at: new Date(2026, 10, 8, 14, 0), saleId: "s1", clientId: "c1", revenue: 1000, profit: 200, qty: 2 }),
    ship({
      at: new Date(2026, 10, 10, 11, 0),
      saleId: "s2",
      clientId: "c2",
      revenue: 500,
      profit: 50,
      qty: 1,
      productId: "lid",
      productName: "Крышка",
      category: "крышки",
    }),
    ship({ at: new Date(2026, 9, 31, 12, 0), saleId: "s1", clientId: "c1", revenue: 400, profit: 40, qty: 1 }),
  ];

  const pays: PayEvent[] = [
    { at: new Date(2026, 10, 9, 9, 0), amount: 1000, clientId: "c1", saleId: "s1" },
    { at: new Date(2026, 10, 2, 9, 0), amount: 100, clientId: "c1", saleId: "s1" },
    { at: new Date(2026, 10, 10, 15, 0), amount: 999, clientId: "c2", saleId: null },
  ];

  const cash: CashEvent[] = [
    { at: new Date(2026, 9, 20, 12, 0), amount: 50, direction: "IN" },
    { at: new Date(2026, 10, 9, 9, 0), amount: 1000, direction: "IN" },
    { at: new Date(2026, 10, 12, 9, 0), amount: 20, direction: "OUT" },
  ];

  const model = buildSummary({
    ships,
    pays,
    cash,
    clients: [
      { id: "c1", name: "Дониёр" },
      { id: "c2", name: "Ромашка" },
    ],
    start,
    end,
    clientId: "",
    category: "",
    productId: "",
  });

  it("compares the period with the previous one of the same length", () => {
    const turnover = model.kpis.find((kpi) => kpi.key === "turnover");
    const profit = model.kpis.find((kpi) => kpi.key === "profit");
    const qty = model.kpis.find((kpi) => kpi.key === "qty");
    expect(turnover).toMatchObject({ current: 1500, previous: 400, value: "1 500 сум" });
    expect(profit).toMatchObject({ current: 250, previous: 40 });
    expect(qty).toMatchObject({ current: 3, previous: 1, value: "3 шт" });
  });

  it("splits order coverage and keeps unlinked payments in the day series", () => {
    expect(model.collection.closedCount).toBe(0);
    expect(model.collection.partialCount).toBe(1);
    expect(model.collection.unpaidCount).toBe(1);
    expect(model.collection.covered).toBeCloseTo(1000 * (1100 / 1400));
    expect(model.collection.rate).toBeCloseTo((model.collection.covered / 1500) * 100);
    const nov10 = model.days.find((day) => day.label.startsWith("10 "));
    expect(nov10).toMatchObject({ turnover: 500, payments: 999 });
  });

  it("reconstructs debt and cash up to the end date", () => {
    expect(model.debtors).toEqual([{ id: "c1", name: "Дониёр", debt: 300 }]);
    const debt = model.kpis.find((kpi) => kpi.key === "debt");
    const cashKpi = model.kpis.find((kpi) => kpi.key === "cash");
    expect(debt).toMatchObject({ current: -199, previous: 300, higherIsBetter: false });
    expect(cashKpi).toMatchObject({ current: 1030, previous: 50 });
    expect(debt?.series).toHaveLength(7);
    expect(debt?.series[0]).toBe(300);
  });

  it("averages shipment money by hour and groups the donut by client", () => {
    expect(model.hours[14].avg).toBeCloseTo(1000 / 7);
    expect(model.hours[11].avg).toBeCloseTo(500 / 7);
    expect(model.hours[0].avg).toBe(0);
    expect(model.sliceTitle).toBe("Оборот по клиентам");
    expect(model.slices.map((slice) => slice.name)).toEqual(["Дониёр", "Ромашка"]);
  });

  it("scopes shipments to a product without moving the company cash", () => {
    const filtered = buildSummary({
      ships,
      pays,
      cash,
      clients: [
        { id: "c1", name: "Дониёр" },
        { id: "c2", name: "Ромашка" },
      ],
      start,
      end,
      clientId: "c1",
      category: "",
      productId: "cup",
    });
    expect(filtered.kpis.find((kpi) => kpi.key === "turnover")?.current).toBe(1000);
    expect(filtered.kpis.find((kpi) => kpi.key === "cash")?.current).toBe(1030);
    expect(filtered.kpis.find((kpi) => kpi.key === "cash")?.hint).toMatch(/Общая касса/);
    expect(filtered.sliceTitle).toBe("Оборот по товарам");
    expect(filtered.slices).toEqual([{ name: "Стакан", value: 1000 }]);
    expect(filtered.days.find((day) => day.label.startsWith("10 "))?.payments).toBe(0);
  });
});
