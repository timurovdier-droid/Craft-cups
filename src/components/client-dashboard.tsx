"use client";

import Link from "next/link";
import {
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
import { Money } from "@/components/ui";
import { formatPct, formatSom } from "@/lib/money";
import type { ClientAnalytics } from "@/lib/client-analytics";

const PIE_COLORS = ["#1b9a57", "#ff5c1a"];

export function ClientDashboard({
  clientName,
  analytics,
}: {
  clientName: string;
  analytics: ClientAnalytics;
}) {
  const topProducts = analytics.products.slice(0, 6);
  const topProfit = [...analytics.products].sort((a, b) => b.profit - a.profit).slice(0, 6);
  const active = analytics.sales.filter((s) => s.isActive);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Заказано" value={`${analytics.orderedQty.toLocaleString("ru-RU")} шт`} />
        <Kpi label="Отгружено" value={`${analytics.shippedQty.toLocaleString("ru-RU")} шт`} />
        <Kpi label="Прибыль" value={<Money value={analytics.totalProfit} />} good />
        <Kpi label="К оплате" value={<Money value={analytics.orderDebt} />} danger={analytics.orderDebt > 0} />
      </div>

      <motionRow>
        <div className="panel p-4">
          <p className="text-sm text-[var(--ink-soft)]">Оплачено клиентом</p>
          <p className="mt-1 text-xl font-semibold num">
            <Money value={analytics.paid} />
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-[var(--ink-soft)]">Сумма заказов</p>
          <p className="mt-1 text-xl font-semibold num">
            <Money value={analytics.orderedAmount} />
          </p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-[var(--ink-soft)]">Средняя наценка</p>
          <p className="mt-1 text-xl font-semibold text-[var(--terracotta-dark)]">{formatPct(analytics.avgMarkup)}</p>
        </div>
        <div className="panel p-4">
          <p className="text-sm text-[var(--ink-soft)]">Активных заказов</p>
          <p className="mt-1 text-xl font-semibold num text-[var(--terracotta-dark)]">{analytics.activeOrders}</p>
        </div>
      </motionRow>

      <motionCharts topProducts={topProducts} topProfit={topProfit} analytics={analytics} clientName={clientName} />

      <section className="panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Активные заказы</h2>
          <Link href="/sales" className="text-sm font-semibold text-[var(--terracotta-dark)]">
            Все продажи
          </Link>
        </div>
        {active.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-soft)]">У {clientName} нет незакрытых заказов.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {active.map((sale) => (
              <li key={sale.id} className="rounded-2xl border border-[var(--line)] bg-[#faf8f7] px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{sale.when}</span>
                  <span className="text-[var(--ink-soft)]">{sale.linesLabel}</span>
                </div>
                <p className="mt-1 text-[var(--ink-soft)]">
                  Заказ <Money value={sale.orderedSum} /> · долг{" "}
                  <span className={sale.debt > 0 ? "font-semibold text-[var(--danger)]" : ""}>
                    <Money value={Math.max(sale.debt, 0)} />
                  </span>
                  {sale.remainingQty > 0 ? ` · осталось отгрузить ${sale.remainingQty} шт` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-[var(--line)] px-4 py-3 section-title">История заказов</h2>
        <motionTable sales={analytics.sales} />
      </section>
    </div>
  );
}

function motionRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

function Kpi({
  label,
  value,
  good,
  danger,
}: {
  label: string;
  value: React.ReactNode;
  good?: boolean;
  danger?: boolean;
}) {
  const tone = danger ? "text-[var(--danger)]" : good ? "text-[#0d7a40]" : "";
  return (
    <div className="panel px-4 py-3">
      <p className="text-sm text-[var(--ink-soft)]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight num ${tone}`}>{value}</p>
    </div>
  );
}

function motionCharts({
  topProducts,
  topProfit,
  analytics,
  clientName,
}: {
  topProducts: ClientAnalytics["products"];
  topProfit: ClientAnalytics["products"];
  analytics: ClientAnalytics;
  clientName: string;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <ChartCard title={`Что чаще заказывает ${clientName}`} empty="Нет заказов" hasData={topProducts.length > 0}>
        <BarChart data={topProducts} layout="vertical" margin={{ left: 4, right: 12 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => `${v} шт`} />
          <Bar dataKey="qtyOrdered" fill="#ff5c1a" radius={[0, 8, 8, 0]} name="Заказано" />
        </BarChart>
      </ChartCard>

      <ChartCard title="Прибыль по товарам" empty="Нет отгрузок для расчёта" hasData={topProfit.some((p) => p.profit > 0)}>
        <BarChart data={topProfit} layout="vertical" margin={{ left: 4, right: 12 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v) => formatSom(Number(v))} />
          <Bar dataKey="profit" fill="#1b9a57" radius={[0, 8, 8, 0]} name="Прибыль" />
        </BarChart>
      </ChartCard>

      {analytics.monthly.length > 0 ? (
        <ChartCard title="Заказы по месяцам" empty="Мало данных" hasData>
          <BarChart data={analytics.monthly} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ece8e4" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => compact(v)} width={48} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, name) => (name === "profit" ? formatSom(Number(v)) : formatSom(Number(v)))} />
            <Bar dataKey="turnover" fill="#c45c26" radius={[6, 6, 0, 0]} name="Сумма заказа" />
            <Bar dataKey="profit" fill="#1b9a57" radius={[6, 6, 0, 0]} name="Прибыль" />
          </BarChart>
        </ChartCard>
      ) : null}

      {analytics.paymentMix.length > 0 ? (
        <ChartCard title="Оплата vs долг" empty="Нет данных" hasData>
          <PieChart>
            <Pie data={analytics.paymentMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2}>
              {analytics.paymentMix.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatSom(Number(v))} />
          </PieChart>
        </ChartCard>
      ) : null}
    </div>
  );
}

function ChartCard({
  title,
  empty,
  hasData,
  children,
}: {
  title: string;
  empty: string;
  hasData: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="panel flex min-h-[17rem] flex-col p-4">
      <h3 className="section-title">{title}</h3>
      <div className="mt-3 min-h-56 flex-1">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">{empty}</p>
        )}
      </div>
    </div>
  );
}

function motionTable({ sales }: { sales: ClientAnalytics["sales"] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Состав</th>
          <th>Сумма</th>
          <th>Оплачено</th>
          <th>Долг</th>
          <th>Прибыль</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        {sales.map((sale) => (
          <tr key={sale.id}>
            <td className="num whitespace-nowrap">{sale.when}</td>
            <td>{sale.linesLabel}</td>
            <td className="num">
              <Money value={sale.orderedSum} />
            </td>
            <td className="num">
              <Money value={sale.paid} />
            </td>
            <td className="num">
              <Money value={Math.max(sale.debt, 0)} />
            </td>
            <td className="num text-[#0d7a40]">
              <Money value={sale.profit} />
            </td>
            <td>{sale.isActive ? "Активен" : "Закрыт"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function compact(value: number) {
  if (value >= 1_000_000) return `${Math.round(value / 100_000) / 10}M`;
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(value);
}