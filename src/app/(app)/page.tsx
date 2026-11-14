import { SummaryCharts } from "@/components/summary-charts";
import { SummaryFilters } from "@/components/summary-filters";
import { Money } from "@/components/ui";
import { isoDate } from "@/lib/dates";
import { lineProfit } from "@/lib/money";
import { periodBounds } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildSummary, type CashEvent, type PayEvent, type ShipEvent } from "@/lib/summary";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; category?: string; client?: string; product?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { start, end } = periodBounds(params.from, params.to);
  const category = params.category?.trim() ?? "";
  const clientId = params.client?.trim() ?? "";
  const productId = params.product?.trim() ?? "";

  const [sales, payments, cashEntries, products, clients, categoriesRaw] = await Promise.all([
    prisma.sale.findMany({
      include: {
        client: { select: { name: true } },
        lines: {
          include: {
            product: true,
            shipmentLines: { include: { shipment: { select: { createdAt: true } } } },
          },
        },
      },
    }),
    prisma.payment.findMany({
      where: { archivedAt: null },
      select: { amount: true, paidAt: true, saleId: true, clientId: true },
    }),
    prisma.cashEntry.findMany({
      where: { archivedAt: null },
      select: { amount: true, direction: true, date: true },
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } }),
  ]);

  const ships: ShipEvent[] = [];
  for (const sale of sales) {
    for (const line of sale.lines) {
      for (const shipmentLine of line.shipmentLines) {
        ships.push({
          at: shipmentLine.shipment.createdAt,
          qty: shipmentLine.qty,
          revenue: line.unitSalePrice * shipmentLine.qty,
          profit: lineProfit(line.unitSalePrice, line.unitPurchasePrice, shipmentLine.qty),
          saleId: sale.id,
          clientId: sale.clientId,
          clientName: sale.client.name,
          productId: line.productId,
          productName: line.product.name,
          category: line.product.category,
          unit: line.product.unit,
        });
      }
    }
  }

  const pays: PayEvent[] = payments.map((payment) => ({
    at: payment.paidAt,
    amount: payment.amount,
    clientId: payment.clientId,
    saleId: payment.saleId,
  }));

  const cash: CashEvent[] = cashEntries.map((entry) => ({
    at: entry.date,
    amount: entry.amount,
    direction: entry.direction,
  }));

  const summary = buildSummary({
    ships,
    pays,
    cash,
    clients,
    start,
    end,
    clientId,
    category,
    productId,
  });

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <div>
          <h1 className="page-title leading-none">
            Сводка
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">С возвращением, {user.name}</p>
        </div>
        <SummaryFilters
          from={params.from ?? isoDate(start)}
          to={params.to ?? isoDate(end)}
          category={category}
          clientId={clientId}
          productId={productId}
          categories={categoriesRaw.map((row) => row.category)}
          clients={clients}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category,
            unit: product.unit,
          }))}
        />
      </div>

      <SummaryCharts summary={summary} />

      <section id="dolgi" className="panel scroll-mt-24 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-3">
          <div>
            <h2 className="section-title">
              Кто должен
            </h2>
            <p className="text-sm text-[var(--ink-soft)]">на {summary.asOf}</p>
          </div>
          <Link href="/clients" className="text-sm text-[var(--terracotta-dark)]">
            Все клиенты
          </Link>
        </div>
        {summary.debtors.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-[var(--ink-soft)]">Долгов нет.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Долг</th>
              </tr>
            </thead>
            <tbody>
              {summary.debtors.map((debtor) => (
                <tr key={debtor.id}>
                  <td>
                    <Link href={`/clients/${debtor.id}`}>{debtor.name}</Link>
                  </td>
                  <td>
                    <Money value={debtor.debt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
