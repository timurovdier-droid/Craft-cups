import { CashBoard } from "@/components/cash-board";
import { CashOverviewCharts } from "@/components/cash-overview-charts";
import { PeriodFilter } from "@/components/period-filter";
import { Money } from "@/components/ui";
import { dailyCash, expenseSlices, incomeSlices } from "@/lib/cash-flow";
import { isoDate } from "@/lib/dates";
import { CASH_CATEGORY_LABEL, type CashCategoryKey } from "@/lib/labels";
import { cashTotals } from "@/lib/money";
import { periodBounds } from "@/lib/queries";
import { prisma } from "@/lib/prisma";

export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; archive?: string }>;
}) {
  const params = await searchParams;
  const { start, end } = periodBounds(params.from, params.to);
  const archive = params.archive === "1";
  const from = params.from ?? isoDate(start);
  const to = params.to ?? isoDate(end);
  const [entries, archiveCount] = await Promise.all([
    prisma.cashEntry.findMany({
      where: {
        date: { gte: start, lte: end },
        archivedAt: archive ? { not: null } : null,
      },
      include: { createdBy: true },
      orderBy: { date: "desc" },
    }),
    prisma.cashEntry.count({ where: { archivedAt: { not: null } } }),
  ]);
  const totals = cashTotals(entries);
  const flow = entries.map((entry) => ({
    amount: entry.amount,
    direction: entry.direction,
    category: entry.category,
    note: entry.note,
    date: entry.date,
    paymentId: entry.paymentId,
  }));
  const liveHref = `/cash?from=${from}&to=${to}`;
  const archiveHref = `/cash?from=${from}&to=${to}&archive=1`;

  return (
    <CashBoard
      today={isoDate(new Date())}
      archive={archive}
      archiveCount={archiveCount}
      liveHref={liveHref}
      archiveHref={archiveHref}
      rows={entries.map((entry) => ({
        id: entry.id,
        when: entry.date.toLocaleString("ru-RU"),
        direction: entry.direction,
        category: CASH_CATEGORY_LABEL[entry.category as CashCategoryKey] ?? entry.category,
        amount: entry.amount,
        author: entry.createdBy.name,
        note: entry.note,
        fromSale: Boolean(entry.paymentId),
      }))}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PeriodFilter from={from} to={to} path="/cash" extra={archive ? { archive: "1" } : undefined} />
      </div>

      {archive ? null : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="panel px-4 py-3">
              <p className="text-sm text-[var(--ink-soft)]">Пришло</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight num text-[#0d7a40]">
                <Money value={totals.incoming} />
              </p>
            </div>
            <div className="panel px-4 py-3">
              <p className="text-sm text-[var(--ink-soft)]">Ушло</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight num text-[var(--terracotta-dark)]">
                <Money value={totals.outgoing} />
              </p>
            </div>
            <div className="panel px-4 py-3">
              <p className="text-sm text-[var(--ink-soft)]">В кассе за период</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight num">
                <Money value={totals.balance} />
              </p>
            </div>
          </div>

          <CashOverviewCharts
            expense={expenseSlices(flow)}
            income={incomeSlices(flow)}
            days={dailyCash(flow, start, end)}
          />
        </>
      )}
    </CashBoard>
  );
}
