"use server";

import { revalidatePath } from "next/cache";
import { checkPhotoFile, deleteProductPhoto, looksLikeImage, writeProductPhoto } from "@/lib/product-photo";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

async function readPhoto(file: FormDataEntryValue | null, required: boolean) {
  const checked = checkPhotoFile(file, required);
  if ("error" in checked && checked.error) return { error: checked.error };
  if (!checked.file || !checked.ext) return { bytes: null, ext: null };
  const bytes = Buffer.from(await checked.file.arrayBuffer());
  if (!looksLikeImage(bytes, checked.ext)) return { error: "Файл не похож на фото" };
  return { bytes, ext: checked.ext };
}

export async function upsertProduct(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "Без категории";
  const unit = String(formData.get("unit") ?? "шт").trim() || "шт";
  const purchasePrice = Number(formData.get("purchasePrice") ?? 0);
  if (!name) return { error: "Укажите название" };
  if (purchasePrice < 0 || Number.isNaN(purchasePrice)) return { error: "Цена закупа неверная" };

  const photo = await readPhoto(formData.get("photo"), false);
  if ("error" in photo && photo.error) return { error: photo.error };

  const saved = id
    ? await prisma.product.update({
        where: { id },
        data: { name, category, unit, purchasePrice: Math.round(purchasePrice) },
      })
    : await prisma.product.create({
        data: { name, category, unit, purchasePrice: Math.round(purchasePrice) },
      });

  if (photo.bytes && photo.ext) {
    try {
      const imagePath = await writeProductPhoto(saved.id, photo.bytes, photo.ext);
      await prisma.product.update({ where: { id: saved.id }, data: { imagePath } });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Не удалось сохранить фото" };
    }
  }

  revalidatePath("/stock");
  revalidatePath("/sales");
}

export async function updateProductPrice(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  const purchasePrice = Number(formData.get("purchasePrice") ?? NaN);
  if (!id) return { error: "Нет товара" };
  if (!Number.isInteger(purchasePrice) || purchasePrice < 0) return { error: "Цена закупа неверная" };

  await prisma.product.update({
    where: { id },
    data: { purchasePrice },
  });
  revalidatePath("/stock");
  revalidatePath("/sales");
}

export async function setProductPhoto(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Нет товара" };
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { error: "Товар не найден" };

  const photo = await readPhoto(formData.get("photo"), true);
  if ("error" in photo && photo.error) return { error: photo.error };
  if (!photo.bytes || !photo.ext) return { error: "Выберите фото" };

  try {
    const imagePath = await writeProductPhoto(id, photo.bytes, photo.ext);
    await prisma.product.update({ where: { id }, data: { imagePath } });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось сохранить фото" };
  }
  revalidatePath("/stock");
  revalidatePath("/sales");
}

export async function clearProductPhoto(formData: FormData) {
  await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Нет товара" };
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return { error: "Товар не найден" };
  await deleteProductPhoto(product.imagePath);
  await prisma.product.update({ where: { id }, data: { imagePath: null } });
  revalidatePath("/stock");
  revalidatePath("/sales");
}

export async function receiveStock(formData: FormData) {
  const user = await requireUser();
  const productId = String(formData.get("productId") ?? "");
  const qty = Number(formData.get("qty") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  if (!productId) return { error: "Выберите товар" };
  if (!Number.isInteger(qty) || qty <= 0) return { error: "Количество должно быть больше нуля" };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Товар не найден" };

  await prisma.stockMove.create({
    data: {
      productId,
      type: "IN",
      qty,
      unitCost: product.purchasePrice,
      note: note || "Приход от поставщика",
      createdById: user.id,
    },
  });
  revalidatePath("/stock");
  revalidatePath("/");
}
