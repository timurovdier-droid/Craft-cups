"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatSom } from "@/lib/money";

type Row = { name: string; volume: number; amount: number };

export function TopClients({ rows }: { rows: Row[] }) {
  const topVolume = [...rows].sort((a, b) => b.volume - a.volume).slice(0, 8);
  const topAmount = [...rows].sort((a, b) => b.amount - a.amount).slice(0, 8);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartBlock title="Топ по объёму" data={topVolume} dataKey="volume" format={(v) => `${v} шт`} />
      <ChartBlock title="Топ по сумме" data={topAmount} dataKey="amount" format={(v) => formatSom(v)} />
    </div>
  );
}

function ChartBlock({
  title,
  data,
  dataKey,
  format,
}: {
  title: string;
  data: Row[];
  dataKey: "volume" | "amount";
  format: (v: number) => string;
}) {
  return (
    <div className="panel p-4">
      <h3 className="mb-3 section-title">
        {title}
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-[var(--ink-soft)]">Пока нет отгрузок.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => format(Number(value))} />
              <Bar dataKey={dataKey} fill="#c45c26" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
