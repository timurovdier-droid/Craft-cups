import { isoDate } from "@/lib/dates";
import { formatSom } from "@/lib/money";

export type ShipEvent = {
  at: Date;
  qty: number;
  revenue: number;
  profit: number;
  saleId: string;
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  category: string;
  unit: string;
};

export type PayEvent = {
  at: Date;
  amount: number;
  clientId: string;
  saleId: string | null;
};

export type CashEvent = {
  at: Date;
  amount: number;
  direction: "IN" | "OUT";
};

export type SummaryInput = {
  ships: ShipEvent[];
  pays: PayEvent[];
  cash: CashEvent[];
  clients: { id: string; name: string }[];
  start: Date;
  end: Date;
  clientId: string;
  category: string;
  productId: string;
};

export type KpiModel = {
  key: "turnover" | "profit" | "qty" | "cash" | "debt";
  label: string;
  value: string;
  hint?: string;
  series: number[];
  current: number;
  previous: number;
  higherIsBetter: boolean;
};

export type DayPoint = {
  label: string;
  turnover: number;
  profit: number;
  payments: number;
};

export type SlicePoint = { name: string; value: number };

export type HourPoint = { hour: string; avg: number };

export type CollectionModel = {
  rate: number | null;
  points: number | null;
  covered: number;
  turnover: number;
  closed: number;
  partial: number;
  unpaid: number;
  closedCount: number;
  partialCount: number;
  unpaidCount: number;
  orderCount: number;
};

export type SummaryModel = {
  kpis: KpiModel[];
  days: DayPoint[];
  slices: SlicePoint[];
  sliceTitle: string;
  hours: HourPoint[];
  collection: CollectionModel;
  debtors: { id: string; name: string; debt: number }[];
  asOf: string;
};

const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function eachDay(start: Date, end: Date): string[] {
  const days: string[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    days.push(isoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function previousPeriod(start: Date, end: Date) {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const span = Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1;
  const prevEnd = new Date(startDay);
  prevEnd.setDate(prevEnd.getDate() - 1);
  prevEnd.setHours(23, 59, 59, 999);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - (span - 1));
  prevStart.setHours(0, 0, 0, 0);
  return { start: prevStart, end: prevEnd };
}

export function formatCount(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function compactSom(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const n = abs / 1_000_000;
    const text = n >= 10 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "");
    return `${sign}${text} млн`;
  }
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1000)} тыс`;
  return `${sign}${formatCount(abs)}`;
}

export function formatRate(rate: number | null): string {
  if (rate === null || Number.isNaN(rate)) return "—";
  const tenths = Math.round(rate * 10) / 10;
  return `${Number.isInteger(tenths) ? tenths.toFixed(0) : tenths.toFixed(1)}%`;
}

function shortDay(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

function endOfDay(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function inRange(at: Date, start: Date, end: Date) {
  const time = at.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function signedCash(entry: CashEvent) {
  return entry.direction === "IN" ? entry.amount : -entry.amount;
}

function matches(ship: ShipEvent, input: SummaryInput) {
  if (input.clientId && ship.clientId !== input.clientId) return false;
  if (input.category && ship.category !== input.category) return false;
  if (input.productId && ship.productId !== input.productId) return false;
  return true;
}

function payMatches(pay: PayEvent, input: SummaryInput) {
  return !input.clientId || pay.clientId === input.clientId;
}

function bucket(days: string[]) {
  return new Map(days.map((day) => [day, { turnover: 0, profit: 0, payments: 0, qty: 0 }]));
}

function coverage(ships: ShipEvent[], pays: PayEvent[], saleId: string, at: Date) {
  const time = at.getTime();
  let shipped = 0;
  for (const ship of ships) {
    if (ship.saleId === saleId && ship.at.getTime() <= time) shipped += ship.revenue;
  }
  let paid = 0;
  for (const pay of pays) {
    if (pay.saleId === saleId && pay.at.getTime() <= time) paid += pay.amount;
  }
  return { shipped, paid };
}

function collect(ships: ShipEvent[], pays: PayEvent[], periodShips: ShipEvent[], at: Date): CollectionModel {
  const bySale = new Map<string, number>();
  for (const ship of periodShips) bySale.set(ship.saleId, (bySale.get(ship.saleId) ?? 0) + ship.revenue);

  let closed = 0;
  let partial = 0;
  let unpaid = 0;
  let closedCount = 0;
  let partialCount = 0;
  let unpaidCount = 0;
  let covered = 0;
  let turnover = 0;

  for (const [saleId, revenue] of bySale) {
    turnover += revenue;
    const { shipped, paid } = coverage(ships, pays, saleId, at);
    const ratio = shipped > 0 ? Math.min(1, paid / shipped) : 0;
    covered += revenue * ratio;
    if (paid <= 0 || shipped <= 0) {
      unpaid += revenue;
      unpaidCount += 1;
    } else if (paid >= shipped) {
      closed += revenue;
      closedCount += 1;
    } else {
      partial += revenue;
      partialCount += 1;
    }
  }

  return {
    rate: turnover > 0 ? (covered / turnover) * 100 : null,
    points: null,
    covered,
    turnover,
    closed,
    partial,
    unpaid,
    closedCount,
    partialCount,
    unpaidCount,
    orderCount: bySale.size,
  };
}

function debtAt(input: SummaryInput, names: Map<string, string>, at: Date) {
  const time = at.getTime();
  const productScoped = Boolean(input.category || input.productId);
  const shippedByClient = new Map<string, number>();
  const salesByClient = new Map<string, Set<string>>();

  for (const ship of input.ships) {
    if (input.clientId && ship.clientId !== input.clientId) continue;
    if (productScoped && !matches(ship, input)) continue;
    if (ship.at.getTime() > time) continue;
    shippedByClient.set(ship.clientId, (shippedByClient.get(ship.clientId) ?? 0) + ship.revenue);
    const sales = salesByClient.get(ship.clientId) ?? new Set<string>();
    sales.add(ship.saleId);
    salesByClient.set(ship.clientId, sales);
  }

  const paidByClient = new Map<string, number>();
  for (const pay of input.pays) {
    if (input.clientId && pay.clientId !== input.clientId) continue;
    if (pay.at.getTime() > time) continue;
    if (productScoped) {
      if (!pay.saleId || !salesByClient.get(pay.clientId)?.has(pay.saleId)) continue;
    }
    paidByClient.set(pay.clientId, (paidByClient.get(pay.clientId) ?? 0) + pay.amount);
  }

  const rows: { id: string; name: string; debt: number }[] = [];
  let total = 0;
  for (const id of new Set([...shippedByClient.keys(), ...paidByClient.keys()])) {
    const debt = (shippedByClient.get(id) ?? 0) - (paidByClient.get(id) ?? 0);
    total += debt;
    if (debt > 0) rows.push({ id, name: names.get(id) ?? "Клиент", debt });
  }
  rows.sort((a, b) => b.debt - a.debt || a.name.localeCompare(b.name, "ru"));
  return { total, rows };
}

function cashAt(cash: CashEvent[], at: Date) {
  const time = at.getTime();
  let balance = 0;
  for (const entry of cash) {
    if (entry.at.getTime() <= time) balance += signedCash(entry);
  }
  return balance;
}

function topSlices(entries: { name: string; value: number }[]) {
  const grouped = new Map<string, number>();
  for (const entry of entries) {
    if (entry.value === 0) continue;
    grouped.set(entry.name, (grouped.get(entry.name) ?? 0) + entry.value);
  }
  const sorted = [...grouped.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"));
  const head = sorted.slice(0, 5).map(([name, value]) => ({ name, value }));
  const rest = sorted.slice(5).reduce((sum, [, value]) => sum + value, 0);
  if (rest > 0) head.push({ name: "Остальные", value: rest });
  return head;
}

export function buildSummary(input: SummaryInput): SummaryModel {
  const days = eachDay(input.start, input.end);
  const previous = previousPeriod(input.start, input.end);
  const names = new Map(input.clients.map((client) => [client.id, client.name]));
  const productScoped = Boolean(input.category || input.productId);

  const periodShips = input.ships.filter((ship) => matches(ship, input) && inRange(ship.at, input.start, input.end));
  const previousShips = input.ships.filter((ship) => matches(ship, input) && inRange(ship.at, previous.start, previous.end));
  const periodPays = input.pays.filter((pay) => payMatches(pay, input) && inRange(pay.at, input.start, input.end));

  const currentDays = bucket(days);
  for (const ship of periodShips) {
    const cell = currentDays.get(isoDate(ship.at));
    if (!cell) continue;
    cell.turnover += ship.revenue;
    cell.profit += ship.profit;
    cell.qty += ship.qty;
  }
  for (const pay of periodPays) {
    const cell = currentDays.get(isoDate(pay.at));
    if (!cell) continue;
    cell.payments += pay.amount;
  }

  const sum = (ships: ShipEvent[], field: "revenue" | "profit" | "qty") => ships.reduce((total, ship) => total + ship[field], 0);
  const turnover = sum(periodShips, "revenue");
  const profit = sum(periodShips, "profit");
  const qty = sum(periodShips, "qty");
  const previousTurnover = sum(previousShips, "revenue");
  const previousProfit = sum(previousShips, "profit");
  const previousQty = sum(previousShips, "qty");

  const units = new Set(periodShips.map((ship) => ship.unit));
  const unit = units.size === 1 ? [...units][0] : "ед.";

  const debtNow = debtAt(input, names, input.end);
  const debtBefore = debtAt(input, names, previous.end);
  const cashNow = cashAt(input.cash, input.end);
  const cashBefore = cashAt(input.cash, previous.end);

  const debtSeries = days.map((day) => debtAt(input, names, endOfDay(day)).total);
  const cashSeries = days.map((day) => cashAt(input.cash, endOfDay(day)));
  const turnoverSeries = days.map((day) => currentDays.get(day)?.turnover ?? 0);
  const profitSeries = days.map((day) => currentDays.get(day)?.profit ?? 0);
  const qtySeries = days.map((day) => currentDays.get(day)?.qty ?? 0);

  const collection = collect(input.ships, input.pays, periodShips, input.end);
  const previousCollection = collect(input.ships, input.pays, previousShips, previous.end);
  collection.points =
    collection.rate === null || previousCollection.rate === null ? null : collection.rate - previousCollection.rate;

  const sliceSource = input.clientId ? "product" : "client";
  const slices = topSlices(
    periodShips.map((ship) => ({
      name: sliceSource === "product" ? ship.productName : ship.clientName,
      value: ship.revenue,
    })),
  );

  const dayCount = Math.max(1, days.length);
  const hourSums = Array.from({ length: 24 }, () => 0);
  for (const ship of periodShips) hourSums[ship.at.getHours()] += ship.revenue;

  const kpis: KpiModel[] = [
    {
      key: "turnover",
      label: "Оборот",
      value: formatSom(turnover),
      series: turnoverSeries,
      current: turnover,
      previous: previousTurnover,
      higherIsBetter: true,
    },
    {
      key: "profit",
      label: "Прибыль",
      value: formatSom(profit),
      series: profitSeries,
      current: profit,
      previous: previousProfit,
      higherIsBetter: true,
    },
    {
      key: "qty",
      label: "Отгружено",
      value: `${formatCount(qty)} ${unit}`,
      series: qtySeries,
      current: qty,
      previous: previousQty,
      higherIsBetter: true,
    },
    {
      key: "cash",
      label: "В кассе",
      value: formatSom(cashNow),
      hint: input.clientId || productScoped ? "Общая касса, фильтр на неё не влияет" : "На выбранную дату «по»",
      series: cashSeries,
      current: cashNow,
      previous: cashBefore,
      higherIsBetter: true,
    },
    {
      key: "debt",
      label: "Долг",
      value: formatSom(debtNow.total),
      hint: productScoped ? "По выбранному товару, на дату «по»" : "На дату «по»",
      series: debtSeries,
      current: debtNow.total,
      previous: debtBefore.total,
      higherIsBetter: false,
    },
  ];

  return {
    kpis,
    days: days.map((day) => ({
      label: shortDay(day),
      turnover: currentDays.get(day)?.turnover ?? 0,
      profit: currentDays.get(day)?.profit ?? 0,
      payments: currentDays.get(day)?.payments ?? 0,
    })),
    slices,
    sliceTitle: input.clientId ? "Оборот по товарам" : "Оборот по клиентам",
    hours: hourSums.map((sum, hour) => ({
      hour: String(hour).padStart(2, "0"),
      avg: sum / dayCount,
    })),
    collection,
    debtors: debtNow.rows,
    asOf: input.end.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
  };
}
