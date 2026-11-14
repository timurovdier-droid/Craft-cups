"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Button, Input, Select } from "@/components/ui";
import { isoDate } from "@/lib/dates";

export function SummaryFilters({
  from,
  to,
  category,
  clientId,
  productId,
  categories,
  clients,
  products,
}: {
  from: string;
  to: string;
  category: string;
  clientId: string;
  productId: string;
  categories: string[];
  clients: { id: string; name: string }[];
  products: { id: string; name: string; category: string; unit: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const visibleProducts = category ? products.filter((product) => product.category === category) : products;
  const presets = [
    { days: 1, label: "Сегодня" },
    { days: 7, label: "7 дней" },
    { days: 30, label: "30 дней" },
  ];

  function apply(form: HTMLFormElement) {
    const data = new FormData(form);
    const params = new URLSearchParams();
    params.set("from", String(data.get("from") ?? ""));
    params.set("to", String(data.get("to") ?? ""));
    const nextCategory = String(data.get("category") ?? "");
    const nextClient = String(data.get("client") ?? "");
    const nextProduct = String(data.get("product") ?? "");
    if (nextCategory) params.set("category", nextCategory);
    if (nextClient) params.set("client", nextClient);
    if (nextProduct) params.set("product", nextProduct);
    router.push(`/?${params.toString()}`);
  }

  function applyRange(days: number) {
    const form = formRef.current;
    if (!form) return;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const fromInput = form.elements.namedItem("from") as HTMLInputElement;
    const toInput = form.elements.namedItem("to") as HTMLInputElement;
    fromInput.value = isoDate(start);
    toInput.value = isoDate(end);
    apply(form);
  }

  return (
    <form
      key={`${from}|${to}|${category}|${clientId}|${productId}`}
      ref={formRef}
      className="flex min-w-0 flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
    >
      <div className="flex h-11 shrink-0 items-center rounded-full bg-[#e7e2de] p-1">
        {presets.map((preset) => {
          const active = isPreset(from, to, preset.days);
          return (
            <button
              key={preset.days}
              type="button"
              onClick={() => applyRange(preset.days)}
              className={`h-9 rounded-full px-3 text-sm font-semibold whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--terracotta)] ${
                active
                  ? "bg-white text-[var(--ink)] shadow-[0_1px_2px_rgb(28_20_16_/_0.16)]"
                  : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
              }`}
              aria-pressed={active}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <label className="shrink-0">
        <span className="sr-only">С</span>
        <Input type="date" name="from" defaultValue={from} aria-label="С" className="w-[9.5rem] max-w-full" onChange={(event) => apply(event.currentTarget.form!)} />
      </label>
      <label className="shrink-0">
        <span className="sr-only">По</span>
        <Input type="date" name="to" defaultValue={to} aria-label="По" className="w-[9.5rem] max-w-full" onChange={(event) => apply(event.currentTarget.form!)} />
      </label>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--paper)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--terracotta)]"
        aria-label="Обновить"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M20 12 a8 8 0 1 1 -2.2 -5.5" strokeLinecap="round" />
          <path d="M20 4 V9 H15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <label className="min-w-[7.5rem] flex-1 basis-[8rem] sm:max-w-[12rem]">
        <span className="sr-only">Тип товара</span>
        <Select name="category" defaultValue={category} aria-label="Тип товара" onChange={(event) => apply(event.currentTarget.form!)}>
          <option value="">Все типы</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </label>
      <label className="min-w-[8.5rem] flex-1 basis-[9rem] sm:max-w-[14rem]">
        <span className="sr-only">Товар</span>
        <Select name="product" defaultValue={productId} aria-label="Товар" onChange={(event) => apply(event.currentTarget.form!)}>
          <option value="">Не выбран</option>
          {visibleProducts.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="min-w-[8.5rem] flex-1 basis-[9rem] sm:max-w-[14rem]">
        <span className="sr-only">Клиент</span>
        <Select name="client" defaultValue={clientId} aria-label="Клиент" onChange={(event) => apply(event.currentTarget.form!)}>
          <option value="">Все клиенты</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </label>
      <Button type="submit" tone="ghost" className="shrink-0">
        Показать
      </Button>
    </form>
  );
}

function isPreset(from: string, to: string, days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return from === isoDate(start) && to === isoDate(end);
}
