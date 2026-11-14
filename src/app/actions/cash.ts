"use server";

import type { CashDirection } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { parseCashCategory } from "@/lib/labels";

const directions: CashDirection[] = ["IN", "OUT"];

export async function addCashEntry(formData: FormData) {
  const user = await requireUser();
  const amount = Number(formData.get("amount") ?? 0);
  const direction = String(formData.get("direction") ?? "") as CashDirection;
  const category = parseCashCategory(String(formData.get("category") ?? ""));
  const noteRaw = String(formData.get("note") ?? "").trim();
  const dateRaw = String(formData.get("date") ?? "");
  const fromCash = String(formData.get("fromCash") ?? "") === "on";

  if (!Number.isInteger(amount) || amount <= 0) return { error: "Сумма должна быть целым числом больше нуля" };
  if (!directions.includes(direction)) return { error: "Укажите приход или расход" };
  if (!category) return { error: "Укажите категорию" };
  if (direction === "OUT" && !noteRaw) {
    return { error: "Для расхода нужен комментарий: за что сняли деньги" };
  }
  if (fromCash && direction !== "OUT") {
    return { error: "Снятие с кассы — это расход" };
  }

  const note =
    fromCash && !noteRaw.toLowerCase().startsWith("с кассы") ? `С кассы. ${noteRaw}` : noteRaw;

  try {
    await prisma.cashEntry.create({
      data: {
        amount,
        direction,
        category,
        note,
        date: dateRaw ? new Date(`${dateRaw}T12:00:00`) : new Date(),
        createdById: user.id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось сохранить запись";
    return { error: message };
  }

  revalidateMoney();
}

function revalidateMoney() {
  revalidatePath("/cash");
  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/clients", "layout");
  revalidatePath("/profit");
}

export async function archiveCashEntry(id: string) {
  await requireUser();
  if (!id) return { error: "Нет записи" };
  const entry = await prisma.cashEntry.findUnique({ where: { id } });
  if (!entry) return { error: "Запись не найдена" };
  if (entry.archivedAt) return { error: "Запись уже в архиве" };

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.cashEntry.update({ where: { id }, data: { archivedAt: now } });
    if (entry.paymentId) {
      await tx.payment.update({ where: { id: entry.paymentId }, data: { archivedAt: now } });
    }
  });

  revalidateMoney();
}

export async function restoreCashEntry(id: string) {
  await requireUser();
  if (!id) return { error: "Нет записи" };
  const entry = await prisma.cashEntry.findUnique({ where: { id } });
  if (!entry) return { error: "Запись не найдена" };
  if (!entry.archivedAt) return { error: "Запись не в архиве" };

  await prisma.$transaction(async (tx) => {
    await tx.cashEntry.update({ where: { id }, data: { archivedAt: null } });
    if (entry.paymentId) {
      await tx.payment.update({ where: { id: entry.paymentId }, data: { archivedAt: null } });
    }
  });

  revalidateMoney();
}
