import { PeriodFilter } from "@/components/period-filter";
import { Money, Stat } from "@/components/ui";
import { isoDate } from "@/lib/dates";
import { formatPct, lineProfit, marginPct } from "@/lib/money";
import { periodBounds } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export default async function ProfitPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = periodBounds(params.from, params.to);

  const sales = await prisma.sale.findMany({
    include: {
      client: true,
      lines: {
        include: {
          product: true,
          shipmentLines: { include: { shipment: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  type Agg = { name: string; revenue: number; profit: number; qty: number };
  const bySale: Agg[] = [];
  const byProduct = new Map<string, Agg>();
  const byClient = new Map<string, Agg>();

  for (const sale of sales) {
    let revenue = 0;
    let profit = 0;
    let qty = 0;
    for (const line of sale.lines) {
      const shipped = line.shipmentLines
        .filter((sl) => sl.shipment.createdAt >= start && sl.shipment.createdAt <= end)
        .reduce((s, sl) => s + sl.qty, 0);
      if (!shipped) continue;
      const lineRevenue = shipped * line.unitSalePrice;
      const lineP = lineProfit(line.unitSalePrice, line.unitPurchasePrice, shipped);
      revenue += lineRevenue;
      profit += lineP;
      qty += shipped;
      const p = byProduct.get(line.productId) ?? {
        name: line.product.name,
        revenue: 0,
        profit: 0,
        qty: 0,
      };
      p.revenue += lineRevenue;
      p.profit += lineP;
      p.qty += shipped;
      byProduct.set(line.productId, p);
    }
    if (qty > 0) {
      bySale.push({ name: `${sale.client.name} · ${sale.createdAt.toLocaleDateString("ru-RU")}`, revenue, profit, qty });
      const c = byClient.get(sale.clientId) ?? { name: sale.client.name, revenue: 0, profit: 0, qty: 0 };
      c.revenue += revenue;
      c.profit += profit;
      c.qty += qty;
      byClient.set(sale.clientId, c);
    }
  }

  const periodProfit = bySale.reduce((s, r) => s + r.profit, 0);
  const periodRevenue = bySale.reduce((s, r) => s + r.revenue, 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="page-title">
          Рентабельность
        </h1>
        <PeriodFilter from={params.from ?? isoDate(start)} to={params.to ?? isoDate(end)} path="/profit" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Выручка (отгружено)" value={<Money value={periodRevenue} />} />
        <Stat label="Прибыль" value={<Money value={periodProfit} />} />
        <Stat label="Рентабельность" value={formatPct(marginPct(periodProfit, periodRevenue))} />
      </div>
      <Table title="По продаже" rows={bySale} />
      <Table title="По товару" rows={[...byProduct.values()]} />
      <Table title="По клиенту" rows={[...byClient.values()]} />
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: { name: string; revenue: number; profit: number; qty: number }[] }) {
  return (
    <section className="panel overflow-hidden">
      <h2 className="px-4 py-3 section-title">
        {title}
      </h2>
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Кол-во</th>
            <th>Выручка</th>
            <th>Прибыль</th>
            <th>Рентабельность</th>
          </tr>
        </thead>
        <tbody>
          {rows
            .sort((a, b) => b.profit - a.profit)
            .map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td className="num">{row.qty}</td>
                <td>
                  <Money value={row.revenue} />
                </td>
                <td>
                  <Money value={row.profit} />
                </td>
                <td>{formatPct(marginPct(row.profit, row.revenue))}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </section>
  );
}
