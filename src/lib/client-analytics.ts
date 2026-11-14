import { clientAvgMarkup, lineProfit } from "@/lib/money";
import { paidAmount, shippedQty } from "@/lib/queries";
import { saleDebt } from "@/lib/queries";

type SaleLine = {
  qtyOrdered: number;
  unitSalePrice: number;
  unitPurchasePrice: number;
  shipmentLines: { qty: number }[];
  product: { id: string; name: string; category: string; unit: string };
};

type Sale = {
  id: string;
  status: "open" | "partial" | "done";
  createdAt: Date;
  lines: SaleLine[];
  payments: { amount: number }[];
};

export type ProductAggregate = {
  id: string;
  name: string;
  qtyOrdered: number;
  qtyShipped: number;
  revenue: number;
  profit: number;
};

export type ClientSaleRow = {
  id: string;
  when: string;
  status: Sale["status"];
  orderedSum: number;
  paid: number;
  debt: number;
  profit: number;
  remainingQty: number;
  isActive: boolean;
  linesLabel: string;
};

export type ClientAnalytics = {
  orderedQty: number;
  shippedQty: number;
  remainingQty: number;
  orderedAmount: number;
  shippedAmount: number;
  paid: number;
  orderDebt: number;
  totalProfit: number;
  avgMarkup: number | null;
  activeOrders: number;
  products: ProductAggregate[];
  sales: ClientSaleRow[];
  monthly: { month: string; turnover: number; profit: number }[];
  paymentMix: { name: string; value: number }[];
};

function isSaleActive(sale: Sale) {
  const remaining = sale.lines.reduce((sum, line) => sum + Math.max(line.qtyOrdered - shippedQty(line), 0), 0);
  return remaining > 0 || saleDebt(sale) > 0;
}

export function buildClientAnalytics(
  sales: Sale[],
  paymentsTotal: number,
): ClientAnalytics {
  const productsMap = new Map<string, ProductAggregate>();

  for (const sale of sales) {
    for (const line of sale.lines) {
      const shipped = shippedQty(line);
      const existing = productsMap.get(line.product.id) ?? {
        id: line.product.id,
        name: line.product.name,
        qtyOrdered: 0,
        qtyShipped: 0,
        revenue: 0,
        profit: 0,
      };
      existing.qtyOrdered += line.qtyOrdered;
      existing.qtyShipped += shipped;
      existing.revenue += line.unitSalePrice * shipped;
      existing.profit += lineProfit(line.unitSalePrice, line.unitPurchasePrice, shipped);
      productsMap.set(line.product.id, existing);
    }
  }

  const products = [...productsMap.values()].sort((a, b) => b.qtyOrdered - a.qtyOrdered);

  const salesRows: ClientSaleRow[] = sales.map((sale) => {
    const orderedSum = sale.lines.reduce((s, line) => s + line.unitSalePrice * line.qtyOrdered, 0);
    const profit = sale.lines.reduce(
      (s, line) => s + lineProfit(line.unitSalePrice, line.unitPurchasePrice, shippedQty(line)),
      0,
    );
    const remainingQty = sale.lines.reduce(
      (s, line) => s + Math.max(line.qtyOrdered - shippedQty(line), 0),
      0,
    );
    const units = new Set(sale.lines.map((l) => l.product.unit));
    const linesLabel =
      sale.lines.length === 1
        ? `${sale.lines[0]?.qtyOrdered ?? 0} ${sale.lines[0]?.product.unit ?? "шт"}`
        : `${sale.lines.length} позиц.`;
    return {
      id: sale.id,
      when: sale.createdAt.toLocaleString("ru-RU"),
      status: sale.status,
      orderedSum,
      paid: paidAmount(sale),
      debt: saleDebt(sale),
      profit,
      remainingQty,
      isActive: isSaleActive(sale),
      linesLabel,
    };
  });

  const orderedQty = sales.reduce((s, sale) => s + sale.lines.reduce((a, l) => a + l.qtyOrdered, 0), 0);
  const shippedQtyTotal = sales.reduce(
    (s, sale) => s + sale.lines.reduce((a, l) => a + shippedQty(l), 0),
    0,
  );
  const orderedAmount = sales.reduce(
    (s, sale) => s + sale.lines.reduce((a, l) => a + l.unitSalePrice * l.qtyOrdered, 0),
    0,
  );
  const shippedAmount = products.reduce((s, p) => s + p.revenue, 0);
  const totalProfit = products.reduce((s, p) => s + p.profit, 0);
  const orderDebt = Math.max(0, salesRows.reduce((s, row) => s + Math.max(row.debt, 0), 0));

  const markupLines = sales.flatMap((sale) =>
    sale.lines.map((l) => ({
      salePrice: l.unitSalePrice,
      cost: l.unitPurchasePrice,
      qty: shippedQty(l),
    })),
  );

  const monthMap = new Map<string, { turnover: number; profit: number }>();
  for (const sale of sales) {
    const key = `${sale.createdAt.getFullYear()}-${String(sale.createdAt.getMonth() + 1).padStart(2, "0")}`;
    const row = monthMap.get(key) ?? { turnover: 0, profit: 0 };
    sale.lines.forEach((line) => {
      const shipped = shippedQty(line);
      row.turnover += line.unitSalePrice * line.qtyOrdered;
      row.profit += lineProfit(line.unitSalePrice, line.unitPurchasePrice, shipped);
    });
    monthMap.set(key, row);
  }
  const monthly = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, value]) => ({
      month: formatMonth(key),
      turnover: value.turnover,
      profit: value.profit,
    }));

  const paymentMix = [
    { name: "Оплачено", value: paymentsTotal },
    { name: "К оплате", value: orderDebt },
  ].filter((slice) => slice.value > 0);

  return {
    orderedQty,
    shippedQty: shippedQtyTotal,
    remainingQty: orderedQty - shippedQtyTotal,
    orderedAmount,
    shippedAmount,
    paid: paymentsTotal,
    orderDebt,
    totalProfit,
    avgMarkup: clientAvgMarkup(markupLines.filter((l) => l.qty > 0)),
    activeOrders: salesRows.filter((s) => s.isActive).length,
    products,
    sales: salesRows,
    monthly,
    paymentMix,
  };
}

function formatMonth(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
}