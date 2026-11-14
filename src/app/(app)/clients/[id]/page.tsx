import Link from "next/link";
import { addPayment } from "@/app/actions/sales";
import { upsertClient } from "@/app/actions/clients";
import { ClientDashboard } from "@/components/client-dashboard";
import { ActionForm } from "@/components/form-error";
import { IntInput } from "@/components/int-input";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { buildClientAnalytics } from "@/lib/client-analytics";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function ClientCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      payments: { where: { archivedAt: null }, orderBy: { paidAt: "desc" } },
      sales: {
        include: {
          lines: { include: { product: true, shipmentLines: true } },
          payments: { where: { archivedAt: null } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!client) notFound();

  const paymentsTotal = client.payments.reduce((s, p) => s + p.amount, 0);
  const analytics = buildClientAnalytics(client.sales, paymentsTotal);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/clients" className="text-sm font-semibold text-[var(--terracotta-dark)]">
            ← Все клиенты
          </Link>
          <h1 className="page-title mt-1">{client.name}</h1>
          {client.phone ? <p className="text-sm text-[var(--ink-soft)]">{client.phone}</p> : null}
          {client.notes ? <p className="mt-1 max-w-2xl text-sm text-[var(--ink-soft)]">{client.notes}</p> : null}
        </div>
      </div>

      <ClientDashboard clientName={client.name} analytics={analytics} />

      <details className="panel overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          Редактировать карточку и принять оплату
        </summary>
        <div className="border-t border-[var(--line)] p-4">
          <ActionForm action={upsertClient} className="grid gap-3 md:grid-cols-2">
            <input type="hidden" name="id" value={client.id} />
            <Field label="Имя">
              <Input name="name" defaultValue={client.name} required />
            </Field>
            <Field label="Телефон">
              <Input name="phone" defaultValue={client.phone} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Заметки">
                <Textarea name="notes" defaultValue={client.notes} />
              </Field>
            </div>
            <Button type="submit">Сохранить</Button>
          </ActionForm>

          <ActionForm action={addPayment} className="mt-4 flex flex-wrap items-end gap-3 border-t border-[var(--line)] pt-4">
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Оплата вне заказа, сум">
              <IntInput name="amount" min={1} required placeholder="" />
            </Field>
            <Button type="submit" tone="ghost">
              Принять оплату
            </Button>
          </ActionForm>
        </div>
      </details>
    </div>
  );
}