"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseCreateFulfillment } from "@/lib/sales";
import { refreshSaleStatus, shippedQty, stockMap } from "@/lib/queries";
import { requireUser } from "@/lib/session";

function revalidateSales() {
  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/clients");
  revalidatePath("/stock");
  revalidatePath("/cash");
  revalidatePath("/profit");
}

export async function createSale(formData: FormData) {
  const user = await requireUser();
  const clientId = String(formData.get("clientId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const unitSalePrice = Number(formData.get("unitSalePrice") ?? 0);
  const paidNow = Number(formData.get("paidNow") ?? 0);

  if (!clientId) return { error: "Выберите клиента" };
  if (!productId) return { error: "Выберите товар" };
  if (!Number.isInteger(qty) || qty <= 0) return { error: "Количество должно быть больше нуля" };
  if (!Number.isInteger(unitSalePrice) || unitSalePrice < 0) return { error: "Цена продажи неверная" };
  if (paidNow < 0 || Number.isNaN(paidNow)) return { error: "Оплата неверная" };
  if (paidNow > qty * unitSalePrice) {
    return { error: "Оплата не может быть больше суммы заказа" };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Товар не найден" };

  const stock = (await stockMap()).get(productId) ?? 0;
  const fulfillment = parseCreateFulfillment(formData, qty, stock);
  if ("error" in fulfillment) return { error: fulfillment.error };
  const { shipQty } = fulfillment;

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        clientId,
        createdById: user.id,
        lines: {
          create: {
            productId,
            qtyOrdered: qty,
            unitSalePrice: Math.round(unitSalePrice),
            unitPurchasePrice: product.purchasePrice,
          },
        },
      },
      include: { lines: true },
    });

    if (shipQty > 0) {
      const line = created.lines[0];
      const shipment = await tx.shipment.create({
        data: {
          saleId: created.id,
          createdById: user.id,
          lines: { create: { saleLineId: line.id, qty: shipQty } },
        },
      });
      await tx.stockMove.create({
        data: {
          productId,
          type: "OUT",
          qty: shipQty,
          unitCost: product.purchasePrice,
          saleId: created.id,
          note: `Отгрузка ${shipment.id.slice(-6)}`,
          createdById: user.id,
        },
      });
    }

    const paid = Math.round(paidNow);
    if (paid > 0) {
      const payment = await tx.payment.create({
        data: {
          clientId,
          saleId: created.id,
          amount: paid,
          createdById: user.id,
        },
      });
      await tx.cashEntry.create({
        data: {
          amount: paid,
          direction: "IN",
          category: "goods",
          note: "Оплата продажи",
          paymentId: payment.id,
          createdById: user.id,
        },
      });
    }

    return created;
  });

  await refreshSaleStatus(sale.id);
  revalidateSales();
}

export async function shipSale(formData: FormData) {
  const user = await requireUser();
  const saleId = String(formData.get("saleId") ?? "");
  if (!saleId) return { error: "Нет заказа" };

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { lines: { include: { product: true, shipmentLines: true } } },
  });
  if (!sale) return { error: "Заказ не найден" };

  const stock = await stockMap();
  const toShip: { saleLineId: string; productId: string; qty: number; unitCost: number }[] = [];

  for (const line of sale.lines) {
    const remaining = line.qtyOrdered - shippedQty(line);
    const requested = Number(formData.get(`qty_${line.id}`) ?? 0);
    if (!Number.isInteger(requested) || requested < 0) return { error: "Количество отгрузки неверное" };
    if (requested === 0) continue;
    if (requested > remaining) return { error: `По «${line.product.name}» осталось отдать ${remaining}` };
    const available = stock.get(line.productId) ?? 0;
    if (requested > available) {
      return { error: `На складе «${line.product.name}» только ${available} ${line.product.unit}` };
    }
    toShip.push({
      saleLineId: line.id,
      productId: line.productId,
      qty: requested,
      unitCost: line.unitPurchasePrice,
    });
  }

  if (toShip.length === 0) return { error: "Укажите количество к отгрузке" };

  await prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
      data: {
        saleId,
        createdById: user.id,
        lines: {
          create: toShip.map((row) => ({ saleLineId: row.saleLineId, qty: row.qty })),
        },
      },
    });
    for (const row of toShip) {
      await tx.stockMove.create({
        data: {
          productId: row.productId,
          type: "OUT",
          qty: row.qty,
          unitCost: row.unitCost,
          saleId,
          note: `Отгрузка ${shipment.id.slice(-6)}`,
          createdById: user.id,
        },
      });
    }
  });

  await refreshSaleStatus(saleId);
  revalidateSales();
}

export async function addPayment(formData: FormData) {
  const user = await requireUser();
  const clientId = String(formData.get("clientId") ?? "");
  const saleId = String(formData.get("saleId") ?? "") || null;
  const amount = Number(formData.get("amount") ?? 0);
  if (!clientId) return { error: "Нет клиента" };
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Сумма оплаты должна быть больше нуля" };

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        clientId,
        saleId,
        amount,
        createdById: user.id,
      },
    });
    await tx.cashEntry.create({
      data: {
        amount,
        direction: "IN",
        category: "goods",
        note: saleId ? "Оплата заказа" : "Оплата клиента",
        paymentId: payment.id,
        createdById: user.id,
        date: new Date(),
      },
    });
  });

  revalidateSales();
}
