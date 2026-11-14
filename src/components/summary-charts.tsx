"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatSom } from "@/lib/money";
import { compactSom, formatCount, formatRate, type SummaryModel } from "@/lib/summary";

const SLICE_COLORS = ["#ff5c1a", "#1b9a57", "#1a1a1a", "#ffb088", "#7d8f86", "#c9a28a"];

const SERIES = [
  { key: "turnover", name: "Оборот", color: "#1c1410" },
  { key: "payments", name: "Оплаты", color: "#ff5c1a" },
  { key: "profit", name: "Прибыль", color: "#1b9a57" },
] as const;

export function SummaryCharts({ summary }: { summary: SummaryModel }) {
  return (
    <div className="grid gap-3">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Показатели">
        {summary.kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </section>

      <div className="grid gap-3 lg:grid-cols-5">
        <CollectionCard collection={summary.collection} />
        <TrendCard days={summary.days} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SliceCard title={summary.sliceTitle} slices={summary.slices} />
        <HourCard hours={summary.hours} />
      </div>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: SummaryModel["kpis"][number] }) {
  const tone = deltaTone(kpi.higherIsBetter, kpi.current, kpi.previous);
  const color = tone === "good" ? "var(--pine)" : tone === "bad" ? "var(--danger)" : "var(--ink-soft)";

  return (
    <article className="panel flex min-w-0 flex-col p-4" aria-label={`${kpi.label}: ${kpi.value}`}>
      <div className="flex items-center gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{
            background: "color-mix(in srgb, var(--terracotta) 12%, white)",
            color: "var(--terracotta-dark)",
          }}
        >
          <KpiIcon name={kpi.key} />
        </span>
        <h2 className="text-[0.78rem] font-semibold text-[var(--ink-soft)]">{kpi.label}</h2>
      </div>
      <p className="mt-3 text-[1.45rem] font-semibold leading-none tracking-tight num">{kpi.value}</p>
      <p className="mt-2 flex items-center gap-1.5 text-xs" style={{ color }}>
        <DeltaMark tone={tone} up={kpi.current > kpi.previous} />
        <span>{deltaText(kpi.current, kpi.previous, tone)}</span>
      </p>
      {kpi.hint ? <p className="mt-1 text-[0.7rem] leading-snug text-[var(--ink-soft)]">{kpi.hint}</p> : null}
      <div className="mt-auto pt-3">
        <Sparkline values={kpi.series} color={tone === "flat" ? "#ff5c1a" : color} />
      </div>
    </article>
  );
}

function CollectionCard({ collection }: { collection: SummaryModel["collection"] }) {
  const total = collection.turnover;
  const rows = [
    { label: "Закрыто", count: collection.closedCount, value: collection.closed, color: "#8fce9a" },
    { label: "Частично", count: collection.partialCount, value: collection.partial, color: "#e7a15a" },
    { label: "Не оплачено", count: collection.unpaidCount, value: collection.unpaid, color: "#e07a72" },
  ];

  return (
    <section className="flex h-full min-w-0 flex-col rounded-2xl bg-[var(--ink)] p-5 text-[#f3e6d4] lg:col-span-2">
      <h2 className="text-sm font-semibold text-[#f3e6d4]">Доля оплаченного</h2>
      <div className="mt-3 flex items-end gap-3">
        <p className="font-semibold leading-none tracking-tight num text-[#ff5c1a] text-5xl">{formatRate(collection.rate)}</p>
        {collection.points !== null ? (
          <p className="pb-1 text-sm num text-[#e7c7a4]">{pointsText(collection.points)}</p>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-snug text-[#e7d3bc]">
        {total > 0
          ? `${formatSom(collection.covered)} из ${formatSom(total)} отгрузок покрыто оплатой заказа`
          : "За период отгрузок не было"}
      </p>
      {total > 0 ? (
        <>
          <p className="mt-5 text-xs text-[#e7d3bc]">Заказы по сумме отгрузки</p>
          <div className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-[#3a2e26]" aria-hidden>
            {rows
              .filter((row) => row.value > 0)
              .map((row) => (
                <div key={row.label} style={{ width: `${(row.value / total) * 100}%`, background: row.color }} />
              ))}
          </div>
          <ul className="mt-4 grid gap-2">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: row.color }} />
                <span className="flex-1 text-[#f3e6d4]">
                  {row.label}
                  <span className="text-[#e7d3bc]"> · {row.count}</span>
                </span>
                <span className="num text-[#f3e6d4]">{formatSom(row.value)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <Link
        href="#dolgi"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--terracotta)] text-sm font-semibold text-white hover:bg-[var(--terracotta-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff8c42]"
      >
        К должникам
      </Link>
    </section>
  );
}

function TrendCard({ days }: { days: SummaryModel["days"] }) {
  const hasValue = days.some((day) => day.turnover > 0 || day.profit > 0 || day.payments > 0);

  return (
    <section className="panel min-w-0 p-4 lg:col-span-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">
          Обзор отгрузок
        </h2>
        <ul className="flex flex-wrap gap-3 text-xs text-[var(--ink-soft)]">
          {SERIES.map((series) => (
            <li key={series.key} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: series.color }} />
              {series.name}
            </li>
          ))}
        </ul>
      </div>
      {hasValue ? (
        <div className="mt-3 h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ece8e4" strokeOpacity={0.8} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6e6965", fontSize: 11 }} minTickGap={24} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6e6965", fontSize: 11 }}
                width={52}
                tickFormatter={compactSom}
              />
              <Tooltip content={<MoneyTooltip />} cursor={{ stroke: "#ece8e4" }} />
              {SERIES.map((series) => (
                <Area
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.name}
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={series.key === "turnover" ? 0.08 : 0.16}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="grid h-[280px] place-items-center text-sm text-[var(--ink-soft)]">За период движений не было</p>
      )}
    </section>
  );
}

function SliceCard({ title, slices }: { title: string; slices: SummaryModel["slices"] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <section className="panel min-w-0 p-4">
      <h2 className="section-title">
        {title}
      </h2>
      {total > 0 ? (
        <div className="mt-2 grid items-center gap-2 sm:grid-cols-[220px_minmax(0,1fr)]">
          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={68}
                  outerRadius={92}
                  startAngle={100}
                  endAngle={slices.length === 1 ? -250 : -260}
                  stroke="none"
                  paddingAngle={slices.length > 1 ? 2 : 0}
                >
                  {slices.map((slice, index) => (
                    <Cell key={slice.name} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<MoneyTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-semibold leading-none num">{formatCount(total)}</span>
              <span className="mt-1 text-xs text-[var(--ink-soft)]">сум</span>
            </div>
          </div>
          <ul className="grid gap-2">
            {slices.map((slice, index) => (
              <li key={slice.name} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SLICE_COLORS[index % SLICE_COLORS.length] }} />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="text-[var(--ink-soft)] num">{shareText(slice.value, total)}</span>
                <span className="w-28 shrink-0 text-right num">{formatSom(slice.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="grid h-[220px] place-items-center text-sm text-[var(--ink-soft)]">За период отгрузок не было</p>
      )}
    </section>
  );
}

function HourCard({ hours }: { hours: SummaryModel["hours"] }) {
  const hasValue = hours.some((hour) => hour.avg > 0);

  return (
    <section className="panel min-w-0 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="section-title">
          Отгрузки по часам
        </h2>
        <p className="text-xs text-[var(--ink-soft)]">в среднем за день</p>
      </div>
      {hasValue ? (
        <div className="mt-3 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hours} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#ece8e4" strokeOpacity={0.8} />
              <XAxis
                dataKey="hour"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6e6965", fontSize: 11 }}
                interval={3}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#6e6965", fontSize: 11 }}
                width={52}
                tickFormatter={compactSom}
              />
              <Tooltip content={<HourTooltip />} cursor={{ fill: "rgb(196 92 38 / 0.08)" }} />
              <Bar dataKey="avg" name="Среднее" fill="#ff5c1a" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="grid h-[260px] place-items-center text-sm text-[var(--ink-soft)]">За период отгрузок не было</p>
      )}
    </section>
  );
}

function MoneyTooltip({
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
      {label ? <p className="mb-1 font-semibold">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.name} className="flex items-center justify-between gap-4">
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

function HourTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--paper-2)] px-3 py-2 text-xs shadow-[0_8px_20px_rgb(28_20_16_/_0.12)]">
      <p className="font-semibold">{label}:00</p>
      <p className="mt-1 num">{formatSom(Number(payload[0].value ?? 0))} в среднем</p>
    </div>
  );
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const width = 120;
  const height = 36;
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length === 1 ? 0 : width / (values.length - 1);
  const coords = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : index * step;
    const y = height - 4 - ((value - min) / span) * (height - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const points = values.length === 1 ? `0,${coords[0].split(",")[1]} ${width},${coords[0].split(",")[1]}` : coords.join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-full" aria-hidden>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points} />
    </svg>
  );
}

function deltaTone(higherIsBetter: boolean, current: number, previous: number): "good" | "bad" | "flat" {
  if (current === previous) return "flat";
  const up = current > previous;
  return (higherIsBetter ? up : !up) ? "good" : "bad";
}

function deltaText(current: number, previous: number, tone: "good" | "bad" | "flat") {
  if (tone === "flat") return "без изменений";
  if (previous === 0) return "было 0";
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const abs = Math.abs(pct);
  const digits = abs >= 10 ? 0 : 1;
  const verdict = tone === "good" ? "лучше" : "хуже";
  return `${abs.toFixed(digits)}% · ${verdict}`;
}

function pointsText(points: number) {
  const rounded = Math.round(points);
  if (rounded === 0) return "0 п.п.";
  return `${rounded > 0 ? "+" : ""}${rounded} п.п.`;
}

function shareText(value: number, total: number) {
  const pct = (value / total) * 100;
  if (pct > 0 && pct < 1) return "<1%";
  if (pct > 99 && pct < 100) return ">99%";
  return `${Math.round(pct)}%`;
}

function DeltaMark({ tone, up }: { tone: "good" | "bad" | "flat"; up: boolean }) {
  if (tone === "flat") {
    return (
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
        <path d="M2 6 H10" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {up ? <path d="M6 9.5 V2.5 M3.2 5.2 L6 2.5 L8.8 5.2" /> : <path d="M6 2.5 V9.5 M3.2 6.8 L6 9.5 L8.8 6.8" />}
    </svg>
  );
}

function KpiIcon({ name }: { name: SummaryModel["kpis"][number]["key"] }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "turnover") {
    return (
      <svg {...common}>
        <path d="M4 19 V10 M10 19 V5 M16 19 V12 M20 19 H3" />
      </svg>
    );
  }
  if (name === "profit") {
    return (
      <svg {...common}>
        <path d="M4 16 L9 11 L13 14 L20 7" />
        <path d="M15 7 H20 V12" />
      </svg>
    );
  }
  if (name === "qty") {
    return (
      <svg {...common}>
        <path d="M3 8 L12 4 L21 8 L12 12 Z" />
        <path d="M3 8 V16 L12 20 L21 16 V8" />
        <path d="M12 12 V20" />
      </svg>
    );
  }
  if (name === "cash") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10 H21" />
        <path d="M7 15 H11" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8 V12 L15 14" />
    </svg>
  );
}
