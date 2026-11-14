export function markupPct(salePrice: number, cost: number): number | null {
  if (cost <= 0) return null;
  return ((salePrice - cost) / cost) * 100;
}

export function lineProfit(salePrice: number, cost: number, qty: number): number {
  return (salePrice - cost) * qty;
}

export function clientAvgMarkup(
  lines: { salePrice: number; cost: number; qty: number }[],
): number | null {
  let profit = 0;
  let costSum = 0;
  for (const line of lines) {
    profit += lineProfit(line.salePrice, line.cost, line.qty);
    costSum += line.cost * line.qty;
  }
  if (costSum <= 0) return null;
  return (profit / costSum) * 100;
}

export function marginPct(profit: number, revenue: number): number | null {
  if (revenue <= 0) return null;
  return (profit / revenue) * 100;
}

export function cashTotals(entries: { direction: "IN" | "OUT"; amount: number }[]) {
  let incoming = 0;
  let outgoing = 0;
  for (const e of entries) {
    if (e.direction === "IN") incoming += e.amount;
    else outgoing += e.amount;
  }
  return { incoming, outgoing, balance: incoming - outgoing };
}

export function formatSom(value: number): string {
  const formatted = Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted} сум`;
}

export function formatPct(value: number | null, digits = 1): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}
