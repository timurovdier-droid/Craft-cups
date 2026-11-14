import { del, put } from "@vercel/blob";
import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 4 * 1024 * 1024;

export function photoDir() {
  return path.join(process.cwd(), "public", "product-photos");
}

export function checkPhotoFile(file: FormDataEntryValue | null, required: boolean) {
  if (!(file instanceof File) || file.size === 0) {
    return required ? { error: "Выберите фото" } : { file: null };
  }
  if (file.size > MAX_BYTES) return { error: "Фото больше 4 МБ" };
  const ext = TYPES[file.type];
  if (!ext) return { error: "Подойдёт фото JPG, PNG или WEBP" };
  return { file, ext };
}

export function looksLikeImage(bytes: Buffer, ext: string) {
  if (ext === "jpg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === "png") return bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (ext === "webp") {
    return (
      bytes.length >= 12 &&
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function writeProductPhoto(productId: string, bytes: Buffer, ext: string) {
  if (!/^[a-z0-9]+$/i.test(productId)) throw new Error("Некорректный товар");
  const filename = `${productId}-${Date.now()}.${ext}`;

  if (blobEnabled()) {
    const blob = await put(`product-photos/${filename}`, bytes, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error("На Vercel подключите хранилище Blob, иначе фото не сохранятся");
  }

  const dir = photoDir();
  await mkdir(dir, { recursive: true });
  const existing = await readdir(dir).catch(() => [] as string[]);
  await Promise.all(
    existing
      .filter((name) => name.startsWith(`${productId}.`) || name.startsWith(`${productId}-`))
      .map((name) => unlink(path.join(dir, name)).catch(() => undefined)),
  );
  await writeFile(path.join(dir, filename), bytes);
  return `/product-photos/${filename}`;
}

export async function deleteProductPhoto(imagePath: string | null) {
  if (!imagePath) return;
  if (imagePath.startsWith("http")) {
    if (blobEnabled()) await del(imagePath, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined);
    return;
  }
  const filename = path.basename(imagePath.split("?")[0] ?? "");
  if (!filename || filename !== path.basename(filename)) return;
  await unlink(path.join(photoDir(), filename)).catch(() => undefined);
}
