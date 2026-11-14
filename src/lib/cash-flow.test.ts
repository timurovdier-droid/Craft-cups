import { describe, expect, it } from "vitest";
import { parseCashCategory } from "./labels";
import { dailyCash, expenseSlices, incomeSlices, isCashWithdraw } from "./cash-flow";

const day = (iso: string) => new Date(`${iso}T12:00:00`);

describe("cash-flow", () => {
  it("groups expenses by category", () => {
    const slices = expenseSlices([
      { amount: 100, direction: "OUT", category: "cargo", note: "", date: day("2026-11-01") },
      { amount: 40, direction: "OUT", category: "cargo", note: "", date: day("2026-11-01") },
      { amount: 10, direction: "IN", category: "goods", note: "", date: day("2026-11-01") },
    ]);
    expect(slices).toEqual([{ name: "Карго", value: 140 }]);
  });

  it("splits income from sales vs cash-in", () => {
    const slices = incomeSlices([
      { amount: 500, direction: "IN", category: "goods", note: "", date: day("2026-11-01"), paymentId: "p1" },
      { amount: 200, direction: "IN", category: "other", note: "внёс", date: day("2026-11-01") },
    ]);
    expect(slices).toEqual([
      { name: "Оплаты заказов", value: 500 },
      { name: "Внесено в кассу", value: 200 },
    ]);
  });

  it("accepts person names as expense categories", () => {
    expect(parseCashCategory("doniyor")).toBe("doniyor");
    expect(parseCashCategory("Дониёр")).toBe("doniyor");
    expect(parseCashCategory("isobu")).toBe("isobu");
    expect(parseCashCategory("Исобу")).toBe("isobu");
    expect(parseCashCategory("muhammad")).toBe("isobu");
    expect(parseCashCategory("ilyos")).toBe("ilyos");
    expect(parseCashCategory("")).toBeNull();
  });

  it("marks cash withdraw notes", () => {
    expect(isCashWithdraw("С кассы. Такси")).toBe(true);
    expect(isCashWithdraw("Карго Ташкент")).toBe(false);
  });

  it("builds a day row for the period", () => {
    const rows = dailyCash(
      [{ amount: 80, direction: "OUT", category: "other", note: "С кассы. обед", date: day("2026-11-02") }],
      day("2026-11-01"),
      day("2026-11-02"),
    );
    expect(rows).toHaveLength(2);
    expect(rows[1]?.outgoing).toBe(80);
  });
});
