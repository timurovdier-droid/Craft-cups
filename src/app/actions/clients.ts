"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function upsertClient(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!name) return { error: "Укажите имя клиента" };

  if (id) {
    await prisma.client.update({ where: { id }, data: { name, phone, notes } });
  } else {
    await prisma.client.create({ data: { name, phone, notes } });
  }
  revalidatePath("/clients");
  revalidatePath("/sales");
  if (id) revalidatePath(`/clients/${id}`);
}
