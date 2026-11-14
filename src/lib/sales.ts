type SaleLineLike = {
  qtyOrdered: number;
  unitSalePrice: number;
  shipmentLines: { qty: number }[];
};

function paidAmount(sale: { payments: { amount: number; archivedAt?: Date | null }[] }) {
  return sale.payments.filter((payment) => !payment.archivedAt).reduce((sum, payment) => sum + payment.amount, 0);
}

function lineShipped(line: Pick<SaleLineLike, "shipmentLines">) {
  return line.shipmentLines.reduce((sum, row) => sum + row.qty, 0);
}

type SaleLike = {
  lines: SaleLineLike[];
  payments: { amount: number }[];
  status: "open" | "partial" | "done";
};

export function orderedRevenue(sale: { lines: Pick<SaleLineLike, "qtyOrdered" | "unitSalePrice">[] }) {
  return sale.lines.reduce((sum, line) => sum + line.unitSalePrice * line.qtyOrdered, 0);
}

/** Сколько клиент должен по заказу: вся сумма заказа минус оплаты (включая предзаказ до отгрузки). */
export function saleDebt(sale: SaleLike) {
  return orderedRevenue(sale) - paidAmount(sale);
}

export function totalOrderedQty(sale: { lines: Pick<SaleLineLike, "qtyOrdered">[] }) {
  return sale.lines.reduce((sum, line) => sum + line.qtyOrdered, 0);
}

export function totalShippedQty(sale: { lines: SaleLineLike[] }) {
  return sale.lines.reduce((sum, line) => sum + lineShipped(line), 0);
}

export function totalRemainingQty(sale: { lines: SaleLineLike[] }) {
  return sale.lines.reduce((sum, line) => sum + Math.max(line.qtyOrdered - lineShipped(line), 0), 0);
}

export type FulfillmentKind = "preorder" | "partial" | "shipped";

export function fulfillmentKind(sale: Pick<SaleLike, "status"> & { lines: SaleLineLike[] }): FulfillmentKind {
  const shipped = totalShippedQty(sale);
  if (shipped === 0) return "preorder";
  if (sale.status === "done") return "shipped";
  return "partial";
}

const kindLabel: Record<FulfillmentKind, string> = {
  preorder: "Предзаказ",
  partial: "Частичная отгрузка",
  shipped: "Отгружено",
};

export function saleFlowSummary(sale: SaleLike & { lines: SaleLineLike[] }) {
  const kind = fulfillmentKind(sale);
  const orderedSum = orderedRevenue(sale);
  const paid = paidAmount(sale);
  const debt = saleDebt(sale);
  const orderedQty = totalOrderedQty(sale);
  const shippedQtyTotal = totalShippedQty(sale);
  const remainingQty = totalRemainingQty(sale);

  const paidPct = orderedSum > 0 ? Math.min(100, Math.round((paid / orderedSum) * 100)) : 0;
  const shipPct = orderedQty > 0 ? Math.min(100, Math.round((shippedQtyTotal / orderedQty) * 100)) : 0;

  const steps: { key: string; label: string; detail: string; done: boolean; active: boolean }[] = [
    {
      key: "order",
      label: "Заказ",
      detail: `${orderedQty.toLocaleString("ru-RU")} шт`,
      done: true,
      active: false,
    },
    {
      key: "pay",
      label: "Оплата",
      detail: debt > 0 ? `осталось ${debt.toLocaleString("ru-RU")} сум` : debt < 0 ? "переплата" : "закрыто",
      done: debt <= 0,
      active: debt > 0,
    },
    {
      key: "ship",
      label: "Отгрузка",
      detail:
        remainingQty > 0
          ? `осталось ${remainingQty.toLocaleString("ru-RU")} шт`
          : `${shippedQtyTotal.toLocaleString("ru-RU")} шт`,
      done: remainingQty === 0 && shippedQtyTotal > 0,
      active: remainingQty > 0,
    },
  ];

  let nextAction: string | null = null;
  if (remainingQty > 0 && debt > 0) {
    nextAction = "Сначала можно принять оплату или отгрузить часть — как договоритесь с клиентом";
  } else if (remainingQty > 0) {
    nextAction = `Отгрузить остаток: ${remainingQty.toLocaleString("ru-RU")} шт`;
  } else if (debt > 0) {
    nextAction = `Принять оплату: ${debt.toLocaleString("ru-RU")} сум`;
  } else {
    nextAction = "Заказ закрыт";
  }

  return {
    kind,
    kindLabel: kindLabel[kind],
    paidPct,
    shipPct,
    steps,
    nextAction,
    orderedSum,
    paid,
    debt,
    orderedQty,
    shippedQty: shippedQtyTotal,
    remainingQty,
  };
}

export function parseCreateFulfillment(formData: FormData, qty: number, stock: number) {
  const mode = String(formData.get("fulfillmentMode") ?? "preorder");
  if (mode !== "preorder" && mode !== "ship_now") {
    return { error: "Выберите, отгружать сразу или оформить предзаказ" as const };
  }

  if (mode === "preorder") {
    return { mode, shipQty: 0 as const };
  }

  const raw = formData.get("shipQty");
  const shipQty = raw === null || raw === "" ? qty : Number(raw);
  if (!Number.isInteger(shipQty) || shipQty <= 0) {
    return { error: "Укажите, сколько отгрузить сейчас (от 1 до количества в заказе)" as const };
  }
  if (shipQty > qty) {
    return { error: `Нельзя отгрузить больше ${qty} — столько в заказе` as const };
  }
  if (shipQty > stock) {
    return { error: `На складе только ${stock} — уменьшите отгрузку или оформите предзаказ` as const };
  }

  return { mode: "ship_now" as const, shipQty };
}