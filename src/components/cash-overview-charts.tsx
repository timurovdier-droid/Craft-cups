"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Donut, DONUT_COLORS, shareText } from "@/components/donut";
import { formatSom } from "@/lib/money";
import { compactSom } from "@/lib/summary";

type Slice = { name: string; value: number };
type DayRow = { day: string; incoming: number; outgoing: number };

export function CashOverviewCharts({
  expense,
  income,
  days,
}: {
  expense: Slice[];
  income: Slice[];
  days: DayRow[];
}) {
  const expenseTotal = expense.reduce((sum, slice) => sum + slice.value, 0);
  const incomeTotal = income.reduce((sum, slice) => sum + slice.value, 0);
  const hasDays = days.some((day) => day.incoming > 0 || day.outgoing > 0);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <PieCard title="Расходы" empty="За период расходов не было" slices={expense} total={expenseTotal} />
      <PieCard title="Откуда пришло" empty="За период приходов не было" slices={income} total={incomeTotal} />
      <section className="panel min-w-0 p-4 lg:col-span-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="section-title">Движение по дням</h2>
          <p className="text-xs text-[var(--ink-soft)]">приход и расход</p>
        </div>
        {hasDays ? (
          <div className="mt-3 h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#ece8e4" strokeOpacity={0.8} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6e6965", fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#6e6965", fontSize: 11 }}
                  width={52}
                  tickFormatter={compactSom}
                />
                <Tooltip content={<DayTooltip />} cursor={{ fill: "rgb(255 92 26 / 0.08)" }} />
                <Bar dataKey="incoming" name="Приход" fill="#1b9a57" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="outgoing" name="Расход" fill="#ff5c1a" radius={[3, 3, 0, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="grid h-[220px] place-items-center text-sm text-[var(--ink-soft)]">За период движений не было</p>
        )}
        <div className="mt-1 flex gap-4 text-xs text-[var(--ink-soft)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#1b9a57]" /> Приход
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5c1a]" /> Расход
          </span>
        </div>
      </section>
    </div>
  );
}

function PieCard({
  title,
  empty,
  slices,
  total,
}: {
  title: string;
  empty: string;
  slices: Slice[];
  total: number;
}) {
  return (
    <section className="panel min-w-0 p-4">
      <h2 className="section-title">{title}</h2>
      {total > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-6">
          <Donut slices={slices} total={total} />
          <ul className="grid min-w-[14rem] flex-1 gap-2">
            {slices.map((slice, index) => (
              <li key={slice.name} className="flex min-w-0 items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="text-[var(--ink-soft)] num">{shareText(slice.value, total)}</span>
                <span className="w-28 shrink-0 text-right num">{formatSom(slice.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="grid h-[220px] place-items-center text-sm text-[var(--ink-soft)]">{empty}</p>
      )}
    </section>
  );
}

function DayTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-xs shadow-[0_8px_20px_rgb(28_20_16_/_0.12)]">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <p key={String(item.name)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            {item.name}
          </span>
          <span className="num">{formatSom(Number(item.value ?? 0))}</span>
        </p>
      ))}
    </div>
  );
}
