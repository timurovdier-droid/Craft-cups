import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientAvgMarkup, lineProfit, marginPct } from "@/lib/money";

export async function stockMap() {
  const moves = await prisma.stockMove.groupBy({
    by: ["productId", "type"],
    _sum: { qty: true },
  });
  const map = new Map<string, number>();
  for (const row of moves) {
    const current = map.get(row.productId) ?? 0;
    const qty = row._sum.qty ?? 0;
    map.set(row.productId, current + (row.type === "IN" ? qty : -qty));
  }
  return map;
}

export function shippedQty(line: {
  shipmentLines: { qty: number }[];
}) {
  return line.shipmentLines.reduce((s, l) => s + l.qty, 0);
}

export async function refreshSaleStatus(saleId: string) {
  const sale = await prisma.sale.findUniqueOrThrow({
    where: { id: saleId },
    include: { lines: { include: { shipmentLines: true } } },
  });
  const totals = sale.lines.map((line) => ({
    ordered: line.qtyOrdered,
    shipped: shippedQty(line),
  }));
  const shippedAny = totals.some((t) => t.shipped > 0);
  const allDone = totals.every((t) => t.shipped >= t.ordered);
  const status = allDone && shippedAny ? "done" : shippedAny ? "partial" : "open";
  await prisma.sale.update({ where: { id: saleId }, data: { status } });
}

export function saleLineEconomics(line: {
  unitSalePrice: number;
  unitPurchasePrice: number;
  shipmentLines: { qty: number }[];
}) {
  const qty = shippedQty(line);
  const revenue = line.unitSalePrice * qty;
  const profit = lineProfit(line.unitSalePrice, line.unitPurchasePrice, qty);
  return {
    qty,
    revenue,
    profit,
    markup: qty > 0 ? clientAvgMarkup([{ salePrice: line.unitSalePrice, cost: line.unitPurchasePrice, qty }]) : null,
    margin: marginPct(profit, revenue),
  };
}

export const activeRecord = { archivedAt: null } as const;
export const activePayments = { where: { archivedAt: null } } as const;

const saleInclude = {
  client: true,
  createdBy: true,
  lines: {
    include: {
      product: true,
      shipmentLines: true,
    },
  },
  shipments: { include: { createdBy: true, lines: true } },
  payments: activePayments,
} satisfies Prisma.SaleInclude;

export type SaleFull = Prisma.SaleGetPayload<{ include: typeof saleInclude }>;

export function shippedRevenue(sale: {
  lines: {
    unitSalePrice: number;
    shipmentLines: { qty: number }[];
  }[];
}) {
  return sale.lines.reduce((sum, line) => sum + line.unitSalePrice * shippedQty(line), 0);
}

export function paidAmount(sale: { payments?: { amount: number; archivedAt?: Date | null }[] }) {
  return (sale.payments ?? []).filter((payment) => !payment.archivedAt).reduce((s, p) => s + p.amount, 0);
}

export function saleDebt(sale: Parameters<typeof paidAmount>[0] & {
  lines: { unitSalePrice: number; qtyOrdered: number }[];
}) {
  const ordered = sale.lines.reduce((sum, line) => sum + line.unitSalePrice * line.qtyOrdered, 0);
  return ordered - paidAmount(sale);
}

export async function clientBalances() {
  const clients = await prisma.client.findMany({
    include: {
      payments: activePayments,
      sales: {
        include: {
          payments: activePayments,
          lines: { include: { shipmentLines: true } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return clients.map((client) => {
    const shipped = client.sales.reduce((s, sale) => s + shippedRevenue(sale), 0);
    const paid = client.payments.reduce((s, p) => s + p.amount, 0);
    const orderedQty = client.sales.reduce(
      (s, sale) => s + sale.lines.reduce((a, l) => a + l.qtyOrdered, 0),
      0,
    );
    const shippedQtyTotal = client.sales.reduce(
      (s, sale) => s + sale.lines.reduce((a, l) => a + shippedQty(l), 0),
      0,
    );
    const markupLines = client.sales.flatMap((sale) =>
      sale.lines.map((l) => ({
        salePrice: l.unitSalePrice,
        cost: l.unitPurchasePrice,
        qty: shippedQty(l),
      })),
    );
    const orderedAmount = client.sales.reduce(
      (s, sale) => s + sale.lines.reduce((a, l) => a + l.unitSalePrice * l.qtyOrdered, 0),
      0,
    );
    const orderDebt = client.sales.reduce((s, sale) => s + Math.max(0, saleDebt(sale)), 0);
    const totalProfit = client.sales.reduce(
      (s, sale) =>
        s +
        sale.lines.reduce(
          (a, l) => a + lineProfit(l.unitSalePrice, l.unitPurchasePrice, shippedQty(l)),
          0,
        ),
      0,
    );
    const activeOrders = client.sales.filter((sale) => {
      const remaining = sale.lines.reduce((a, l) => a + Math.max(l.qtyOrdered - shippedQty(l), 0), 0);
      return remaining > 0 || saleDebt(sale) > 0;
    }).length;
    return {
      ...client,
      shippedAmount: shipped,
      paid,
      debt: shipped - paid,
      orderDebt,
      orderedAmount,
      totalProfit,
      activeOrders,
      orderedQty,
      shippedQty: shippedQtyTotal,
      remainingQty: orderedQty - shippedQtyTotal,
      avgMarkup: clientAvgMarkup(markupLines.filter((l) => l.qty > 0)),
    };
  });
}

export function periodBounds(from?: string, to?: string) {
  const start = from ? new Date(`${from}T00:00:00`) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = to ? new Date(`${to}T23:59:59.999`) : new Date();
  return { start, end };
}
