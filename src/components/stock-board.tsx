"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearProductPhoto, receiveStock, setProductPhoto, updateProductPrice, upsertProduct } from "@/app/actions/stock";
import { IntInput } from "@/components/int-input";
import { Button, Empty, ErrorText, Field, Input, Money, Select } from "@/components/ui";
import { UNIT_OPTIONS } from "@/lib/labels";

export type StockProduct = {
  id: string;
  name: string;
  category: string;
  unit: string;
  purchasePrice: number;
  imagePath: string | null;
  stock: number;
};

type Mode = "create" | "receive" | "price" | "photo" | null;

export function StockBoard({ products }: { products: StockProduct[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [editing, setEditing] = useState<StockProduct | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return products;
    return products.filter((product) =>
      `${product.name} ${product.category}`.toLowerCase().includes(needle),
    );
  }, [products, query]);

  function open(next: Mode, product?: StockProduct) {
    setError(null);
    setEditing(product ?? null);
    setMode(next);
  }

  function close() {
    setMode(null);
    setEditing(null);
    setError(null);
  }

  async function submit(action: (formData: FormData) => Promise<{ error?: string } | void>, formData: FormData) {
    const result = await action(formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    close();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Склад</h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--ink-soft)]">
            Новая цена закупа пойдёт в следующие продажи. Уже сделанные отчёты остаются со старой ценой.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" tone="ghost" onClick={() => open("receive")}>
            Приход от поставщика
          </Button>
          <Button type="button" onClick={() => open("create")}>
            Создать товар
          </Button>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)] px-4 py-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию или категории"
            aria-label="Поиск товара"
          />
        </div>
        {products.length === 0 ? (
          <div className="p-4">
            <Empty>Каталог пуст. Создайте первый товар.</Empty>
          </div>
        ) : visible.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--ink-soft)]">Ничего не найдено.</p>
        ) : (
          <ul>
            {visible.map((product) => (
              <li key={product.id} className="border-b border-[var(--line)] last:border-b-0">
                <article className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#fff1ea] text-sm font-semibold text-[var(--terracotta-dark)]"
                      onClick={() => open("photo", product)}
                      aria-label={`Фото: ${product.name}`}
                    >
                      {product.imagePath ? (
                        <img src={product.imagePath} alt="" className="h-full w-full object-cover" />
                      ) : (
                        product.name.slice(0, 1).toUpperCase()
                      )}
                    </button>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">{product.name}</h2>
                      <p className="text-sm text-[var(--ink-soft)]">{product.category}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--ink-soft)]">Цена закупа</p>
                    <p className="text-xl font-semibold tracking-tight">
                      <Money value={product.purchasePrice} />
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--ink-soft)]">На складе</p>
                    <p className={`text-xl font-semibold tracking-tight num ${product.stock <= 0 ? "text-[var(--danger)]" : ""}`}>
                      {product.stock} {product.unit}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" tone="ghost" className="h-10" onClick={() => open("photo", product)}>
                      Фото
                    </Button>
                    <Button type="button" tone="ghost" className="h-10" onClick={() => open("price", product)}>
                      Изменить цену
                    </Button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mode ? (
        <Modal title={titleFor(mode)} onClose={close}>
          {mode === "create" ? (
            <form className="grid gap-3" action={(formData) => submit(upsertProduct, formData)}>
              <Field label="Название">
                <Input name="name" required autoFocus />
              </Field>
              <Field label="Категория">
                <Input name="category" placeholder="Стаканы, крышки…" />
              </Field>
              <PhotoPicker label="Фото" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Ед. изм.">
                  <Select name="unit" defaultValue="шт">
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit}>{unit}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Цена закупа, сум">
                  <IntInput name="purchasePrice" min={0} required placeholder="" />
                </Field>
              </div>
              <ErrorText message={error} />
              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" tone="ghost" onClick={close}>
                  Отмена
                </Button>
                <Button type="submit">Создать товар</Button>
              </div>
            </form>
          ) : null}

          {mode === "receive" ? (
            <form className="grid gap-3" action={(formData) => submit(receiveStock, formData)}>
              {products.length === 0 ? (
                <p className="text-sm text-[var(--ink-soft)]">Сначала создайте товар.</p>
              ) : (
                <>
                  <Field label="Товар">
                    <Select name="productId" required defaultValue={products[0]?.id} autoFocus>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Количество">
                    <IntInput name="qty" min={1} required placeholder="" />
                  </Field>
                  <Field label="Заметка">
                    <Input name="note" placeholder="Накладная, поставщик…" />
                  </Field>
                </>
              )}
              <ErrorText message={error} />
              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" tone="ghost" onClick={close}>
                  Отмена
                </Button>
                <Button type="submit" disabled={products.length === 0}>
                  Оприходовать
                </Button>
              </div>
            </form>
          ) : null}

          {mode === "photo" && editing ? (
            <div className="grid gap-3">
              <p className="text-sm text-[var(--ink-soft)]">{editing.name}</p>
              <form className="grid gap-3" action={(formData) => submit(setProductPhoto, formData)}>
                <input type="hidden" name="id" value={editing.id} />
                <PhotoPicker label="Новое фото" current={editing.imagePath} />
                <ErrorText message={error} />
                <div className="mt-1 flex justify-end gap-2">
                  <Button type="button" tone="ghost" onClick={close}>
                    Отмена
                  </Button>
                  <Button type="submit">Сохранить фото</Button>
                </div>
              </form>
              {editing.imagePath ? (
                <form action={(formData) => submit(clearProductPhoto, formData)}>
                  <input type="hidden" name="id" value={editing.id} />
                  <Button type="submit" tone="ghost" className="h-10 w-full text-[var(--danger)]">
                    Удалить фото
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}

          {mode === "price" && editing ? (
            <form className="grid gap-3" action={(formData) => submit(updateProductPrice, formData)}>
              <input type="hidden" name="id" value={editing.id} />
              <p className="text-sm text-[var(--ink-soft)]">
                {editing.name}. Сейчас {editing.purchasePrice.toLocaleString("ru-RU")} сум. Прошлые продажи и отчёты не изменятся.
              </p>
              <Field label="Новая цена закупа, сум">
                <IntInput name="purchasePrice" min={0} required defaultValue={editing.purchasePrice} syncKey={editing.id} />
              </Field>
              <ErrorText message={error} />
              <div className="mt-1 flex justify-end gap-2">
                <Button type="button" tone="ghost" onClick={close}>
                  Отмена
                </Button>
                <Button type="submit">Сохранить цену</Button>
              </div>
            </form>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}

function titleFor(mode: Exclude<Mode, null>) {
  if (mode === "create") return "Создать товар";
  if (mode === "receive") return "Приход от поставщика";
  if (mode === "photo") return "Фото товара";
  return "Изменить цену";
}

function PhotoPicker({ label, current }: { label: string; current?: string | null }) {
  const [preview, setPreview] = useState<string | null>(current ?? null);

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="grid h-44 place-items-center overflow-hidden rounded-2xl bg-[#f6f3f0]">
        {preview ? (
          <img src={preview} alt="Фото товара" className="h-full w-full object-contain" />
        ) : (
          <span className="text-sm text-[var(--ink-soft)]">Фото ещё нет</span>
        )}
      </div>
      <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-medium">
        Выбрать файл
        <input
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const url = URL.createObjectURL(file);
            setPreview((previous) => {
              if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
              return url;
            });
          }}
        />
      </label>
      <p className="text-xs text-[var(--ink-soft)]">JPG, PNG или WEBP, до 4 МБ.</p>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center p-4" role="presentation">
      <button type="button" className="absolute inset-0 bg-[#161311]/40" aria-label="Закрыть" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="stock-dialog-title"
        className="relative z-10 w-full max-w-lg rounded-[20px] border border-[var(--line)] bg-white p-5 shadow-[0_24px_60px_rgb(22_19_17_/_0.18)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="stock-dialog-title" className="section-title">
            {title}
          </h2>
          <button type="button" className="text-sm text-[var(--ink-soft)]" onClick={onClose} aria-label="Закрыть окно">
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
