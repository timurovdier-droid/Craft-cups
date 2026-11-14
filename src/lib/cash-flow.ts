import { CASH_CATEGORY_LABEL, type CashCategoryKey } from "@/lib/labels";
import { isoDate } from "@/lib/dates";

export type CashFlowEntry = {
  amount: number;
  direction: "IN" | "OUT";
  category: CashCategoryKey | string;
  note: string;
  date: Date;
  paymentId?: string | null;
};

export function expenseSlices(entries: CashFlowEntry[]) {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (entry.direction !== "OUT") continue;
    const name = CASH_CATEGORY_LABEL[entry.category as CashCategoryKey] ?? entry.category;
    map.set(name, (map.get(name) ?? 0) + entry.amount);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function incomeSlices(entries: CashFlowEntry[]) {
  let fromSales = 0;
  let toCash = 0;
  for (const entry of entries) {
    if (entry.direction !== "IN") continue;
    if (entry.paymentId) fromSales += entry.amount;
    else toCash += entry.amount;
  }
  return [
    { name: "Оплаты заказов", value: fromSales },
    { name: "Внесено в кассу", value: toCash },
  ].filter((slice) => slice.value > 0);
}

export function dailyCash(entries: CashFlowEntry[], start: Date, end: Date) {
  const days: { day: string; incoming: number; outgoing: number }[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const byDay = new Map<string, { incoming: number; outgoing: number }>();

  for (const entry of entries) {
    const key = isoDate(entry.date);
    const row = byDay.get(key) ?? { incoming: 0, outgoing: 0 };
    if (entry.direction === "IN") row.incoming += entry.amount;
    else row.outgoing += entry.amount;
    byDay.set(key, row);
  }

  while (cursor <= last) {
    const key = isoDate(cursor);
    const row = byDay.get(key) ?? { incoming: 0, outgoing: 0 };
    days.push({
      day: cursor.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" }),
      incoming: row.incoming,
      outgoing: row.outgoing,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function isCashWithdraw(note: string) {
  return note.trim().toLowerCase().startsWith("с кассы");
}
