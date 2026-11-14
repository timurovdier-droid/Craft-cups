"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Donut, DONUT_COLORS, shareText } from "@/components/donut";
import { formatSom } from "@/lib/money";
import { compactSom, formatCount } from "@/lib/summary";

export type ClientChartRow = {
  name: string;
  turnover: number;
  profit: number;
  volume: number;
};

export function ClientsOverviewCharts({ rows }: { rows: ClientChartRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ClientTurnoverPie rows={rows} />
      <ClientRankBars rows={rows} />
    </div>
  );
}

function ClientTurnoverPie({ rows }: { rows: ClientChartRow[] }) {
  const slices = rows
    .filter((row) => row.turnover > 0)
    .sort((a, b) => b.turnover - a.turnover)
    .map((row) => ({ name: row.name, value: row.turnover }));
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <section className="panel min-w-0 p-4">
      <h2 className="section-title">Оборот по клиентам</h2>
      {total > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-6">
          <Donut slices={slices} total={total} />
          <ul className="grid min-w-[16rem] flex-1 gap-2">
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
        <p className="grid h-[220px] place-items-center text-sm text-[var(--ink-soft)]">Заказов пока нет</p>
      )}
    </section>
  );
}

function ClientRankBars({ rows }: { rows: ClientChartRow[] }) {
  const data = [...rows]
    .filter((row) => row.turnover > 0 || row.profit > 0)
    .sort((a, b) => b.turnover - a.turnover);

  if (data.length === 0) {
    return (
      <section className="panel min-w-0 p-4">
        <h2 className="section-title">Оборот и прибыль</h2>
        <p className="grid h-[260px] place-items-center text-sm text-[var(--ink-soft)]">Пока нет заказов</p>
      </section>
    );
  }

  return (
    <section className="panel min-w-0 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="section-title">Оборот и прибыль</h2>
        <p className="text-xs text-[var(--ink-soft)]">по каждому клиенту</p>
      </div>
      <div className="mt-3 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 72, left: 4, bottom: 8 }}>
            <CartesianGrid horizontal={false} stroke="#ece8e4" strokeOpacity={0.8} />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6e6965", fontSize: 11 }}
              tickFormatter={compactSom}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={108}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#6e6965", fontSize: 12 }}
            />
            <Tooltip content={<CompareTooltip />} cursor={{ fill: "rgb(255 92 26 / 0.08)" }} />
            <Bar dataKey="turnover" name="Оборот" fill="#ff5c1a" radius={[0, 6, 6, 0]} maxBarSize={18} minPointSize={6}>
              <LabelList dataKey="turnover" position="right" formatter={(v) => formatCount(Number(v))} className="num" />
            </Bar>
            <Bar dataKey="profit" name="Прибыль" fill="#1b9a57" radius={[0, 6, 6, 0]} maxBarSize={18} minPointSize={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex gap-4 text-xs text-[var(--ink-soft)]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#ff5c1a]" /> Оборот
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#1b9a57]" /> Прибыль
        </span>
      </div>
    </section>
  );
}

function CompareTooltip({
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
