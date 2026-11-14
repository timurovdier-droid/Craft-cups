"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { addCashEntry, archiveCashEntry, restoreCashEntry } from "@/app/actions/cash";
import { IntInput } from "@/components/int-input";
import { Button, ErrorText, Field, Input, Money, Select, Textarea } from "@/components/ui";
import { CASH_CATEGORY_LABEL } from "@/lib/labels";
import { isCashWithdraw } from "@/lib/cash-flow";

export type CashRow = {
  id: string;
  when: string;
  direction: "IN" | "OUT";
  category: string;
  amount: number;
  author: string;
  note: string;
  fromSale: boolean;
};

type Mode = "in" | "out" | null;

export function CashBoard({
  rows,
  today,
  children,
  archive,
  archiveCount,
  liveHref,
  archiveHref,
}: {
  rows: CashRow[];
  today: string;
  children: React.ReactNode;
  archive: boolean;
  archiveCount: number;
  liveHref: string;
  archiveHref: string;
}) {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">{archive ? "Архив денег" : "Деньги"}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--ink-soft)]">
            {archive
              ? "Удалённые расходы, приходы и оплаты. Их нет в кассе и графиках, пока не вернёте."
              : "Сюда попадают оплаты заказов. Если взяли деньги с кассы — запишите расход с комментарием. Удаление уносит запись в архив."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {archive ? (
            <Link
              href={liveHref}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:bg-[var(--paper)]"
            >
              К кассе
            </Link>
          ) : (
            <>
              <Link
                href={archiveHref}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold hover:bg-[var(--paper)]"
              >
                Архив{archiveCount ? ` (${archiveCount})` : ""}
              </Link>
              <Button type="button" onClick={() => setMode("out")}>
                Расход с кассы
              </Button>
              <Button type="button" tone="ghost" onClick={() => setMode("in")}>
                В оборот
              </Button>
            </>
          )}
        </div>
      </div>

      {children}

      {rows.length === 0 ? (
        <p className="panel px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
          {archive ? "В архиве за этот период пусто." : "За период записей нет. Внесите сумму в оборот или запишите расход."}
        </p>
      ) : (
        <section className="panel overflow-hidden">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Тип</th>
                <th>Категория</th>
                <th>Сумма</th>
                <th>Кто</th>
                <th>Комментарий</th>
                <th className="w-[1%]" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <CashRowActions key={row.id} row={row} archive={archive} />
              ))}
            </tbody>
          </table>
        </section>
      )}

      {mode ? (
        <CashDialog
          title={mode === "in" ? "Добавить в оборот" : "Записать расход"}
          onClose={() => setMode(null)}
        >
          <CashEntryForm mode={mode} today={today} onDone={() => setMode(null)} />
        </CashDialog>
      ) : null}
    </div>
  );
}

function CashRowActions({ row, archive }: { row: CashRow; archive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move() {
    const ok = window.confirm(
      archive
        ? "Вернуть запись в кассу?"
        : row.fromSale
          ? "Убрать оплату в архив? Долг по заказу снова появится."
          : "Убрать запись в архив? Она пропадёт из кассы и графиков.",
    );
    if (!ok) return;
    setBusy(true);
    const result = archive ? await restoreCashEntry(row.id) : await archiveCashEntry(row.id);
    setBusy(false);
    if (result?.error) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <tr className={archive ? "text-[var(--ink-soft)]" : undefined}>
      <td className="num whitespace-nowrap">{row.when}</td>
      <td>
        {row.direction === "IN" ? (
          <span className="font-semibold text-[#0d7a40]">{row.fromSale ? "Оплата заказа" : "В оборот"}</span>
        ) : (
          <span className="font-semibold text-[var(--terracotta-dark)]">
            {isCashWithdraw(row.note) ? "С кассы" : "Расход"}
          </span>
        )}
      </td>
      <td>{row.category}</td>
      <td className="num">
        <Money value={row.direction === "IN" ? row.amount : -row.amount} />
      </td>
      <td>{row.author}</td>
      <td>{row.note || "—"}</td>
      <td>
        <button
          type="button"
          disabled={busy}
          onClick={() => void move()}
          className="whitespace-nowrap text-sm font-semibold text-[var(--terracotta-dark)] hover:underline disabled:opacity-50"
        >
          {archive ? "Вернуть" : "В архив"}
        </button>
      </td>
    </tr>
  );
}

function CashEntryForm({
  mode,
  today,
  onDone,
}: {
  mode: "in" | "out";
  today: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fromCash, setFromCash] = useState(true);

  return (
    <form
      className="grid gap-3"
      action={async (formData) => {
        const result = await addCashEntry(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setError(null);
        onDone();
        router.refresh();
      }}
    >
      <input type="hidden" name="direction" value={mode === "in" ? "IN" : "OUT"} />
      {mode === "in" ? <input type="hidden" name="category" value="other" /> : null}

      <p className="text-sm text-[var(--ink-soft)]">
        {mode === "in"
          ? "Сумма, которую внесли в кассу сверх оплат по заказам. Оплаты клиентов сюда писать не нужно — они попадают сами."
          : "Любое снятие из кассы: карго, комиссия, личные расходы. Если деньги взяли с кассы — оставьте комментарий, за что."}
      </p>

      <Field label="Дата">
        <Input name="date" type="date" defaultValue={today} />
      </Field>
      <Field label="Сумма, сум">
        <IntInput name="amount" min={1} required placeholder="" />
      </Field>

      {mode === "out" ? (
        <>
          <Field label="Категория">
            <Select name="category" defaultValue="" required>
              <option value="" disabled>
                Выберите имя или статью
              </option>
              {Object.entries(CASH_CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="fromCash"
              value="on"
              checked={fromCash}
              onChange={(event) => setFromCash(event.target.checked)}
              className="size-4"
            />
            Снято с кассы
          </label>
        </>
      ) : null}

      <Field label={mode === "out" ? "Комментарий — за что сняли" : "Комментарий"}>
        <Textarea
          name="note"
          required={mode === "out"}
          placeholder={mode === "out" ? "Например: карго, такси, закуп расходников" : "Откуда внесли, если нужно"}
        />
      </Field>
      <ErrorText message={error} />
      <Button type="submit">{mode === "in" ? "Внести в кассу" : "Записать расход"}</Button>
    </form>
  );
}

function CashDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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
