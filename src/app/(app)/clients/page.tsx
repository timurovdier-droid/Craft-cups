import { ClientsBoard, type ClientCardModel } from "@/components/clients-board";
import { clientBalances } from "@/lib/queries";

export default async function ClientsPage() {
  const clients = await clientBalances();

  const rows: ClientCardModel[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    notes: c.notes,
    orderedQty: c.orderedQty,
    shippedQty: c.shippedQty,
    remainingQty: c.remainingQty,
    paid: c.paid,
    orderDebt: c.orderDebt,
    totalProfit: c.totalProfit,
    avgMarkup: c.avgMarkup,
    activeOrders: c.activeOrders,
    orderedAmount: c.orderedAmount,
  }));

  return <ClientsBoard clients={rows} />;
}