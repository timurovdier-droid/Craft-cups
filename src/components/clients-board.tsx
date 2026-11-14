"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { upsertClient } from "@/app/actions/clients";
import { ActionForm } from "@/components/form-error";
import { ClientsOverviewCharts } from "@/components/clients-overview-charts";
import { Button, Empty, Field, Input, Money, Textarea } from "@/components/ui";
import { formatPct } from "@/lib/money";
import { useRouter } from "next/navigation";

export type ClientCardModel = {
  id: string;
  name: string;
  phone: string;
  notes: string;
  orderedQty: number;
  shippedQty: number;
  remainingQty: number;
  paid: number;
  orderDebt: number;
  totalProfit: number;
  avgMarkup: number | null;
  activeOrders: number;
  orderedAmount: number;
};

export function ClientsBoard({ clients }: { clients: ClientCardModel[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebt = useMemo(() => clients.reduce((s, c) => s + Math.max(c.orderDebt, 0), 0), [clients]);
  const activeClients = useMemo(() => clients.filter((c) => c.activeOrders > 0).length, [clients]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">Клиенты</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-soft)]">
            Карточка клиента: заказы, активные сделки и аналитика. Нажмите на карточку, чтобы открыть дашборд.
          </p>
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          Добавить клиента
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatMini label="Клиентов" value={String(clients.length)} />
        <StatMini label="С активными заказами" value={String(activeClients)} tone="accent" />
        <StatMini label="Долг по заказам" value={<Money value={totalDebt} />} tone="danger" />
        <StatMini
          label="Сумма заказов"
          value={<Money value={clients.reduce((s, c) => s + c.orderedAmount, 0)} />}
        />
      </div>

      {clients.length === 0 ? (
        <Empty>Клиентов пока нет. Нажмите «Добавить клиента».</Empty>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {clients.map((client) => (
              <ClientListCard key={client.id} client={client} />
            ))}
          </div>

          <ClientsOverviewCharts
            rows={clients.map((c) => ({
              name: c.name,
              turnover: c.orderedAmount,
              profit: c.totalProfit,
              volume: c.shippedQty,
            }))}
          />
        </>
      )}

      {open ? (
        <ClientDialog title="Новый клиент" onClose={() => setOpen(false)}>
          <ActionForm
            action={async (formData) => {
              const result = await upsertClient(formData);
              if (result?.error) {
                setError(result.error);
                return;
              }
              setError(null);
              setOpen(false);
              router.refresh();
            }}
            className="grid gap-3"
          >
            <Field label="Имя">
              <Input name="name" required />
            </Field>
            <Field label="Телефон">
              <Input name="phone" />
            </Field>
            <Field label="Заметки">
              <Textarea name="notes" />
            </Field>
            {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
            <Button type="submit">Сохранить</Button>
          </ActionForm>
        </ClientDialog>
      ) : null}
    </div>
  );
}

function ClientListCard({ client }: { client: ClientCardModel }) {
  const active = client.activeOrders > 0;
  return (
    <Link
      href={`/clients/${client.id}`}
      className={`panel block px-4 py-3 transition-shadow hover:shadow-[0_8px_24px_rgb(22_19_17_/_0.08)] ${
        active ? "ring-1 ring-[var(--terracotta)]/20" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold tracking-tight">{client.name}</h2>
          {client.phone ? <p className="text-sm text-[var(--ink-soft)]">{client.phone}</p> : null}
        </div>
        {active ? (
          <span className="shrink-0 rounded-full bg-[#fff1ea] px-2 py-0.5 text-xs font-semibold text-[var(--terracotta-dark)]">
            {client.activeOrders} активн.
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[#e7f6ee] px-2 py-0.5 text-xs font-semibold text-[#0d7a40]">
            Закрыто
          </span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Metric label="Заказано" value={`${client.orderedQty.toLocaleString("ru-RU")} шт`} />
        <Metric label="Остаток отгрузки" value={`${client.remainingQty.toLocaleString("ru-RU")} шт`} />
        <Metric label="К оплате" value={<Money value={client.orderDebt} />} danger={client.orderDebt > 0} />
        <Metric label="Прибыль" value={<Money value={client.totalProfit} />} good />
      </dl>

      <p className="mt-3 text-xs text-[var(--ink-soft)]">
        Наценка {formatPct(client.avgMarkup)} · оплачено <Money value={client.paid} />
      </p>
    </Link>
  );
}

function Metric({
  label,
  value,
  danger,
  good,
}: {
  label: string;
  value: React.ReactNode;
  danger?: boolean;
  good?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--ink-soft)]">{label}</dt>
      <dd
        className={`font-semibold num ${danger ? "text-[var(--danger)]" : good ? "text-[#0d7a40]" : "text-[var(--ink)]"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function StatMini({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "plain" | "accent" | "danger";
}) {
  const color =
    tone === "danger" ? "text-[var(--danger)]" : tone === "accent" ? "text-[var(--terracotta-dark)]" : "";
  return (
    <div className="panel px-4 py-3">
      <p className="text-sm text-[var(--ink-soft)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight num ${color}`}>{value}</p>
    </div>
  );
}

function ClientDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
        className="relative z-10 w-full max-w-md rounded-[20px] border border-[var(--line)] bg-white p-5 shadow-[0_24px_60px_rgb(22_19_17_/_0.18)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="section-title">{title}</h2>
          <button type="button" className="text-sm text-[var(--ink-soft)]" onClick={onClose}>
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}