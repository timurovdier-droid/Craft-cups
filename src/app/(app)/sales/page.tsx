import { SalesBoard } from "@/components/sales-board";
import { clientAvgMarkup, lineProfit } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { paidAmount, shippedQty, stockMap } from "@/lib/queries";
import { saleFlowSummary } from "@/lib/sales";

export default async function SalesPage() {
  const [clients, products, sales, stocks] = await Promise.all([
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.sale.findMany({
      include: {
        client: true,
        createdBy: true,
        payments: { where: { archivedAt: null } },
        lines: { include: { product: true, shipmentLines: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    stockMap(),
  ]);

  return (
    <SalesBoard
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        purchasePrice: product.purchasePrice,
        unit: product.unit,
        stock: stocks.get(product.id) ?? 0,
      }))}
      sales={sales.map((sale) => {
        const orderedQty = sale.lines.reduce((sum, line) => sum + line.qtyOrdered, 0);
        const shipped = sale.lines.reduce((sum, line) => sum + shippedQty(line), 0);
        const units = new Set(sale.lines.map((line) => line.product.unit));
        const boughtLabel =
          units.size === 1
            ? `${orderedQty.toLocaleString("ru-RU")} ${sale.lines[0]?.product.unit ?? "шт"}`
            : `${sale.lines.length} позиц.`;
        const markupLines = sale.lines.map((line) => ({
          salePrice: line.unitSalePrice,
          cost: line.unitPurchasePrice,
          qty: line.qtyOrdered,
        }));
        const profitQty = shipped > 0 ? "shipped" : "ordered";
        const profit = sale.lines.reduce((sum, line) => {
          const qty = profitQty === "shipped" ? shippedQty(line) : line.qtyOrdered;
          return sum + lineProfit(line.unitSalePrice, line.unitPurchasePrice, qty);
        }, 0);

        const flow = saleFlowSummary(sale);

        return {
          id: sale.id,
          clientId: sale.clientId,
          clientName: sale.client.name,
          when: sale.createdAt.toLocaleString("ru-RU"),
          author: sale.createdBy.name,
          status: sale.status,
          boughtLabel,
          orderedSum: flow.orderedSum,
          paid: flow.paid,
          debt: flow.debt,
          markup: clientAvgMarkup(markupLines),
          profit,
          profitNote: shipped === 0 ? "появится в отчёте после отгрузки" : shipped < orderedQty ? "с уже отгруженного" : null,
          kindLabel: flow.kindLabel,
          paidPct: flow.paidPct,
          shipPct: flow.shipPct,
          flowSteps: flow.steps,
          nextAction: flow.nextAction,
          orderedQty: flow.orderedQty,
          shippedQty: flow.shippedQty,
          remainingQty: flow.remainingQty,
          lines: sale.lines.map((line) => ({
            id: line.id,
            name: line.product.name,
            category: line.product.category,
            unit: line.product.unit,
            qtyOrdered: line.qtyOrdered,
            shipped: shippedQty(line),
            remaining: line.qtyOrdered - shippedQty(line),
            unitSalePrice: line.unitSalePrice,
          })),
        };
      })}
    />
  );
}
