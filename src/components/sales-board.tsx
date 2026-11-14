"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { addPayment, shipSale } from "@/app/actions/sales";
import { ActionForm } from "@/components/form-error";
import { IntInput } from "@/components/int-input";
import { SaleForm } from "@/components/sale-form";
import { Button, Empty, Money } from "@/components/ui";
import { formatPct } from "@/lib/money";

export type SaleLineView = {
  id: string;
  name: string;
  category: string;
  unit: string;
  qtyOrdered: number;
  shipped: number;
  remaining: number;
  unitSalePrice: number;
};

export type SaleView = {
  id: string;
  clientId: string;
  clientName: string;
  when: string;
  author: string;
  status: "open" | "partial" | "done";
  boughtLabel: string;
  orderedSum: number;
  paid: number;
  debt: number;
  markup: number | null;
  profit: number;
  profitNote: string | null;
  kindLabel: string;
  paidPct: number;
  shipPct: number;
  flowSteps: { key: string; label: string; detail: string; done: boolean; active: boolean }[];
  nextAction: string;
  orderedQty: number;
  shippedQty: number;
  remainingQty: number;
  lines: SaleLineView[];
};

type ClientOption = { id: string; name: string };
type ProductOption = { id: string; name: string; purchasePrice: number; unit: string; stock: number };

type Filter = "all" | "active" | "completed" | "paid" | "unpaid" | "shipped" | "not_shipped";

const statusClass = {
  open: "bg-[#fff4df] text-[#8a5a00]",
  partial: "bg-[#fff1ea] text-[var(--terracotta-dark)]",
  done: "bg-[#e7f6ee] text-[#0d7a40]",
};

function isPaid(sale: SaleView) {
  return sale.debt <= 0;
}

function isUnpaid(sale: SaleView) {
  return sale.debt > 0;
}

function isShipped(sale: SaleView) {
  return sale.remainingQty === 0;
}

function isNotShipped(sale: SaleView) {
  return sale.remainingQty > 0;
}

/** Заказ закрыт: всё отгружено и оплачено по сумме заказа. */
function isCompleted(sale: SaleView) {
  return isPaid(sale) && isShipped(sale);
}

function isActive(sale: SaleView) {
  return !isCompleted(sale);
}

function matchFilter(sale: SaleView, filter: Filter) {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return isActive(sale);
    case "completed":
      return isCompleted(sale);
    case "paid":
      return isPaid(sale);
    case "unpaid":
      return isUnpaid(sale);
    case "shipped":
      return isShipped(sale);
    case "not_shipped":
      return isNotShipped(sale);
  }
}

function needsAttention(sale: SaleView) {
  return isActive(sale);
}

export function SalesBoard({
  sales,
  clients,
  products,
}: {
  sales: SaleView[];
  clients: ClientOption[];
  products: ProductOption[];
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      active: sales.filter(isActive).length,
      completed: sales.filter(isCompleted).length,
      paid: sales.filter(isPaid).length,
      unpaid: sales.filter(isUnpaid).length,
      shipped: sales.filter(isShipped).length,
      not_shipped: sales.filter(isNotShipped).length,
    }),
    [sales],
  );
  const totalDebt = useMemo(() => sales.reduce((sum, sale) => sum + Math.max(sale.debt, 0), 0), [sales]);

  const visible = useMemo(() => sales.filter((sale) => matchFilter(sale, filter)), [sales, filter]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Продажа</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-soft)]">
            Строка заказа компактная: нажмите на карточку, чтобы открыть позиции, отгрузку и оплату.
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          Новая продажа
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel px-4 py-3">
          <p className="text-sm text-[var(--ink-soft)]">Заказов</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight num">{sales.length}</p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-sm text-[var(--ink-soft)]">Активные</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight num text-[var(--terracotta-dark)]">{counts.active}</p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-sm text-[var(--ink-soft)]">Завершённые</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight num text-[#0d7a40]">{counts.completed}</p>
        </div>
        <div className="panel px-4 py-3">
          <p className="text-sm text-[var(--ink-soft)]">Долг по заказам</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight num text-[var(--danger)]">
            <Money value={totalDebt} />
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Фильтр заказов">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
          Все · {sales.length}
        </FilterChip>
        <FilterChip active={filter === "active"} onClick={() => setFilter("active")}>
          Активные · {counts.active}
        </FilterChip>
        <FilterChip active={filter === "completed"} onClick={() => setFilter("completed")}>
          Завершённые · {counts.completed}
        </FilterChip>
        <span className="hidden h-5 w-px bg-[var(--line)] sm:inline" aria-hidden />
        <FilterChip active={filter === "paid"} onClick={() => setFilter("paid")}>
          Оплачены · {counts.paid}
        </FilterChip>
        <FilterChip active={filter === "unpaid"} onClick={() => setFilter("unpaid")}>
          Не оплачены · {counts.unpaid}
        </FilterChip>
        <span className="hidden h-5 w-px bg-[var(--line)] sm:inline" aria-hidden />
        <FilterChip active={filter === "shipped"} onClick={() => setFilter("shipped")}>
          Отгружены · {counts.shipped}
        </FilterChip>
        <FilterChip active={filter === "not_shipped"} onClick={() => setFilter("not_shipped")}>
          Не отгружены · {counts.not_shipped}
        </FilterChip>
      </div>

      {sales.length === 0 ? (
        <div className="panel p-4">
          <Empty>Продаж ещё нет. Нажмите «Новая продажа».</Empty>
        </div>
      ) : visible.length === 0 ? (
        <div className="panel p-4">
          <Empty>
            Нет заказов в этом фильтре.{" "}
            <button type="button" className="text-[var(--terracotta-dark)] underline underline-offset-2" onClick={() => setFilter("all")}>
              Показать все
            </button>
          </Empty>
        </div>
      ) : (
        <div className="grid gap-2">
          {visible.map((sale) => (
            <SaleOrderCard key={sale.id} sale={sale} />
          ))}
        </div>
      )}

      {open ? (
        <SaleDialog title="Новая продажа" onClose={() => setOpen(false)}>
          <SaleForm clients={clients} products={products} onDone={() => setOpen(false)} />
        </SaleDialog>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? "border-[var(--terracotta-dark)] bg-[#fff1ea] text-[var(--terracotta-dark)]"
          : "border-[var(--line)] bg-white text-[var(--ink-soft)] hover:border-[#ddd8d3]"
      }`}
    >
      {children}
    </button>
  );
}

function SaleOrderCard({ sale }: { sale: SaleView }) {
  const debtLabel = sale.debt < 0 ? "Переплата" : sale.debt === 0 ? "Оплачен" : "К оплате";
  const debtTone =
    sale.debt > 0 ? "text-[var(--danger)]" : sale.debt < 0 ? "text-[#0d7a40]" : "text-[var(--ink-soft)]";
  const focus =
    sale.remainingQty > 0 && sale.debt > 0
      ? "both"
      : sale.remainingQty > 0
        ? "ship"
        : sale.debt > 0
          ? "pay"
          : "done";

  return (
    <details
      className={`panel group overflow-hidden transition-shadow hover:shadow-[0_8px_24px_rgb(22_19_17_/_0.06)] ${focus !== "done" ? "ring-1 ring-[var(--terracotta)]/15" : ""}`}
    >
      <summary className="cursor-pointer list-none px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <CompactSummary sale={sale} debtLabel={debtLabel} debtTone={debtTone} />
      </summary>

      <SaleDetailsBody sale={sale} focus={focus} />
    </details>
  );
}

function CompactSummary({
  sale,
  debtLabel,
  debtTone,
}: {
  sale: SaleView;
  debtLabel: string;
  debtTone: string;
}) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[#faf8f7] text-[var(--ink-soft)] transition-transform group-open:rotate-90"
        aria-hidden
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/clients/${sale.clientId}`}
            className="text-base font-semibold tracking-tight"
            onClick={(event) => event.stopPropagation()}
          >
            {sale.clientName}
          </Link>
          <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${statusClass[sale.status]}`}>
            {sale.kindLabel}
          </span>
          <span className="hidden text-xs text-[var(--ink-soft)] sm:inline">{sale.boughtLabel}</span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ink-soft)]">
          <span className="max-w-[11rem] truncate sm:max-w-none">{sale.when}</span>
          <span className="hidden sm:inline">· {sale.author}</span>
          <span className="num font-semibold text-[var(--ink)]">
            оплата {sale.paidPct}% · отгрузка {sale.shipPct}%
          </span>
        </div>

        <p className="mt-1.5 truncate text-sm text-[var(--ink-soft)] group-open:hidden">{sale.nextAction}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--ink-soft)]">{debtLabel}</p>
        <p className={`text-lg font-semibold leading-tight tracking-tight num sm:text-xl ${debtTone}`}>
          <Money value={Math.abs(sale.debt)} />
        </p>
        <p className="mt-0.5 hidden text-xs text-[var(--ink-soft)] sm:block">
          из <Money value={sale.orderedSum} />
        </p>
      </div>
    </div>
  );
}

function FlowStepper({ steps, className = "" }: { steps: SaleView["flowSteps"]; className?: string }) {
  return (
    <ol className={`grid gap-0 sm:grid-cols-3 ${className}`}>
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex min-w-0 flex-col gap-1 sm:px-2 sm:first:pl-0 sm:last:pr-0">
          {index < steps.length - 1 ? (
            <span
              className="absolute left-[calc(50%+0.75rem)] right-0 top-3 hidden h-px bg-[var(--line)] sm:block"
              aria-hidden
            />
          ) : null}
          <StepDot step={step} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--ink-soft)]">{step.label}</p>
            <p
              className={`truncate text-sm font-semibold ${
                step.active ? "text-[var(--terracotta-dark)]" : step.done ? "text-[#0d7a40]" : "text-[var(--ink)]"
              }`}
            >
              {step.detail}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function StepDot({ step }: { step: SaleView["flowSteps"][number] }) {
  const dot = step.done
    ? "border-[#0d7a40] bg-[#e7f6ee] text-[#0d7a40]"
    : step.active
      ? "border-[var(--terracotta-dark)] bg-[#fff1ea] text-[var(--terracotta-dark)]"
      : "border-[var(--line)] bg-white text-[var(--ink-soft)]";
  return (
    <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-[0.65rem] font-bold ${dot}`}>
      {step.done ? (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : step.key === "order" ? (
        "1"
      ) : step.key === "pay" ? (
        "2"
      ) : (
        "3"
      )}
    </span>
  );
}

function DualBar({
  label,
  share,
  tone,
  hint,
}: {
  label: string;
  share: number;
  tone: "pay" | "ship";
  hint?: React.ReactNode;
}) {
  const fill = tone === "pay" ? "bg-[var(--pine)]" : "bg-[var(--terracotta)]";
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
        <span className="num text-sm font-semibold text-[var(--ink-soft)]">{share}%</span>
      </div>
      {hint ? <p className="mt-0.5 text-xs text-[var(--ink-soft)] num">{hint}</p> : null}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line)]">
        <div className={`h-full rounded-full transition-[width] duration-300 ${fill}`} style={{ width: `${share}%` }} />
      </div>
    </div>
  );
}

function SaleDetailsBody({ sale, focus }: { sale: SaleView; focus: "pay" | "ship" | "both" | "done" }) {
  return (
    <>
      <div className="border-t border-[var(--line)] bg-[#faf8f7]/40 px-3 pb-4 sm:px-4">
        <FlowStepper steps={sale.flowSteps} className="mt-3" />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm">
          <span className="font-semibold text-[var(--ink)]">Дальше</span>
          <span className="text-[var(--ink-soft)]">{sale.nextAction}</span>
        </div>

        <SaleMetricsPanel sale={sale} focus={focus} />

        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          <div className="border-b border-[var(--line)] px-4 py-2.5">
            <p className="text-sm font-semibold">Позиции</p>
            <p className="text-xs text-[var(--ink-soft)]">
              заказано {sale.orderedQty.toLocaleString("ru-RU")} · отгружено {sale.shippedQty.toLocaleString("ru-RU")} ·
              осталось {sale.remainingQty.toLocaleString("ru-RU")}
            </p>
          </div>
          <div className="overflow-x-auto">
          <table className="min-w-[32rem]">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Заказано</th>
                <th>Отгружено</th>
                <th>Цена</th>
                <th>Осталось</th>
              </tr>
            </thead>
            <tbody>
              {sale.lines.map((line) => (
                <tr key={line.id}>
                  <td>
                    <div className="font-semibold">{line.name}</div>
                    <div className="text-xs text-[var(--ink-soft)]">{line.category}</div>
                  </td>
                  <td className="num whitespace-nowrap">
                    {line.qtyOrdered.toLocaleString("ru-RU")} {line.unit}
                  </td>
                  <td className="num whitespace-nowrap">
                    {line.shipped.toLocaleString("ru-RU")} {line.unit}
                  </td>
                  <td className="num whitespace-nowrap">
                    <Money value={line.unitSalePrice} />
                  </td>
                  <td className={`num whitespace-nowrap ${line.remaining > 0 ? "font-semibold text-[var(--terracotta-dark)]" : ""}`}>
                    {line.remaining.toLocaleString("ru-RU")} {line.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {sale.status !== "done" && sale.lines.some((line) => line.remaining > 0) ? (
            <ActionForm
              action={shipSale}
              className={`grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1fr_auto] md:items-end ${
                focus === "ship" || focus === "both"
                  ? "border-[var(--terracotta-dark)] shadow-[0_0_0_1px_rgb(226_71_12_/_0.12)]"
                  : "border-[var(--line)]"
              }`}
            >
              <input type="hidden" name="saleId" value={sale.id} />
              <div>
                <p className="text-sm font-semibold">Отгрузка со склада</p>
                <p className="mt-0.5 text-sm text-[var(--ink-soft)]">Можно отгрузить часть — остаток останется в заказе</p>
                <div className="mt-3 grid gap-3">
                  {sale.lines
                    .filter((line) => line.remaining > 0)
                    .map((line) => (
                      <label key={line.id} className="grid gap-1 text-sm">
                        <span className="font-medium">{line.name}</span>
                        <span className="text-xs text-[var(--ink-soft)]">
                          макс. {line.remaining} {line.unit}
                        </span>
                        <IntInput name={`qty_${line.id}`} min={0} max={line.remaining} defaultValue={line.remaining} />
                      </label>
                    ))}
                </div>
              </div>
              <Button type="submit">Отгрузить</Button>
            </ActionForm>
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink-soft)]">
              Отгрузка завершена по этому заказу.
            </div>
          )}

          {sale.debt > 0 ? (
            <ActionForm
              action={addPayment}
              className={`flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4 ${
                focus === "pay" || focus === "both"
                  ? "border-[var(--terracotta-dark)] shadow-[0_0_0_1px_rgb(226_71_12_/_0.12)]"
                  : "border-[var(--line)]"
              }`}
            >
              <input type="hidden" name="clientId" value={sale.clientId} />
              <input type="hidden" name="saleId" value={sale.id} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Оплата</p>
                <p className="mt-0.5 text-sm text-[var(--ink-soft)]">
                  К оплате <Money value={sale.debt} />
                </p>
                <label className="mt-3 grid max-w-full gap-1 text-sm sm:max-w-xs">
                  <span className="text-[var(--ink-soft)]">Сумма, сум</span>
                  <IntInput name="amount" min={1} required defaultValue={sale.debt} />
                </label>
              </div>
              <Button type="submit">Принять оплату</Button>
            </ActionForm>
          ) : sale.debt < 0 ? (
            <div className="rounded-2xl border border-[#c9e8d6] bg-[#e7f6ee] p-4 text-sm text-[#0d7a40] lg:col-span-2">
              Переплата <Money value={Math.abs(sale.debt)} /> — можно зачесть в следующий заказ или вернуть через раздел
              «Деньги».
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--line)] bg-white p-4 text-sm text-[var(--ink-soft)]">
              Оплата закрыта по сумме заказа.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SaleMetricsPanel({ sale, focus }: { sale: SaleView; focus: "pay" | "ship" | "both" | "done" }) {
  const debtTone =
    sale.debt > 0 ? "text-[var(--danger)]" : sale.debt < 0 ? "text-[#0d7a40]" : "text-[var(--ink-soft)]";

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
      <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 sm:grid-cols-2">
        <MetricCell label="Сумма заказа" value={<Money value={sale.orderedSum} />} />
        <MetricCell label="Оплачено" value={<Money value={sale.paid} />} highlight={focus === "pay" || focus === "both"} />
        <MetricCell
          label={sale.debt > 0 ? "К оплате" : sale.debt < 0 ? "Переплата" : "Баланс"}
          value={<Money value={Math.abs(sale.debt)} />}
          className={debtTone}
          highlight={sale.debt > 0}
        />
        <MetricCell
          label="Прибыль"
          value={<Money value={sale.profit} />}
          hint={sale.profitNote}
          className="text-[#0d7a40]"
        />
        <div className="sm:col-span-2 border-t border-[var(--line)] pt-3 text-sm text-[var(--ink-soft)]">
          Наценка{" "}
          <span className="font-semibold text-[var(--terracotta-dark)]">{formatPct(sale.markup)}</span>
        </div>
      </div>

      <div className="grid gap-4 rounded-2xl border border-[var(--line)] bg-white p-4">
        <DualBar
          label="Оплата"
          share={sale.paidPct}
          tone="pay"
          hint={
            <>
              <Money value={sale.paid} /> из <Money value={sale.orderedSum} />
            </>
          }
        />
        <DualBar
          label="Отгрузка"
          share={sale.shipPct}
          tone="ship"
          hint={
            <>
              {sale.shippedQty.toLocaleString("ru-RU")} из {sale.orderedQty.toLocaleString("ru-RU")} шт
            </>
          }
        />
      </div>
    </div>
  );
}

function MetricCell({
  label,
  value,
  hint,
  className = "",
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string | null;
  className?: string;
  highlight?: boolean;
}) {
  return (
    <div className={highlight ? "rounded-xl bg-[#fff1ea] px-2 py-1 -mx-2 -my-1" : ""}>
      <p className="text-xs font-semibold text-[var(--ink-soft)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold tracking-tight num ${className}`}>{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--ink-soft)]">{hint}</p> : null}
    </div>
  );
}

function SaleDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        aria-labelledby="sale-dialog-title"
        className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[20px] border border-[var(--line)] bg-white p-5 shadow-[0_24px_60px_rgb(22_19_17_/_0.18)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="sale-dialog-title" className="section-title">
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