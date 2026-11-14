import { StockBoard } from "@/components/stock-board";
import { prisma } from "@/lib/prisma";
import { stockMap } from "@/lib/queries";

export default async function StockPage() {
  const [products, moves, stocks] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.stockMove.findMany({
      include: { product: true, createdBy: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    stockMap(),
  ]);

  return (
    <div className="grid gap-6">
      <StockBoard
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          category: product.category,
          unit: product.unit,
          purchasePrice: product.purchasePrice,
          imagePath: product.imagePath,
          stock: stocks.get(product.id) ?? 0,
        }))}
      />

      <section className="panel overflow-hidden">
        <h2 className="px-4 py-3 section-title">
          История операций
        </h2>
        {moves.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-[var(--ink-soft)]">Движений ещё не было.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Когда</th>
                <th>Тип</th>
                <th>Товар</th>
                <th>Кол-во</th>
                <th>Кто</th>
                <th>Заметка</th>
              </tr>
            </thead>
            <tbody>
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="num">{m.createdAt.toLocaleString("ru-RU")}</td>
                  <td>{m.type === "IN" ? "Приход" : "Выход клиенту"}</td>
                  <td>{m.product.name}</td>
                  <td className="num">
                    {m.type === "IN" ? "+" : "−"}
                    {m.qty} {m.product.unit}
                  </td>
                  <td>{m.createdBy.name}</td>
                  <td>{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
