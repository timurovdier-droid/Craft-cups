"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "@/app/actions/sales";
import { IntInput } from "@/components/int-input";
import { Button, ErrorText, Field, Select } from "@/components/ui";
import { formatPct, formatSom, lineProfit, markupPct } from "@/lib/money";

type Product = { id: string; name: string; purchasePrice: number; unit: string; stock: number };
type Client = { id: string; name: string };

type FulfillmentMode = "preorder" | "ship_now";

export function SaleForm({
  clients,
  products,
  onDone,
}: {
  clients: Client[];
  products: Product[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState(0);
  const [price, setPrice] = useState(products[0]?.purchasePrice ?? 0);
  const [mode, setMode] = useState<FulfillmentMode>("ship_now");
  const [shipQty, setShipQty] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const product = products.find((p) => p.id === productId);
  const markup = useMemo(() => markupPct(price, product?.purchasePrice ?? 0), [price, product]);
  const profit = useMemo(
    () => lineProfit(price, product?.purchasePrice ?? 0, qty || 0),
    [price, product, qty],
  );
  const orderSum = price * (qty || 0);
  const stock = product?.stock ?? 0;
  const maxShipNow = Math.min(qty || 0, stock);

  useEffect(() => {
    if (mode === "ship_now" && qty > 0) {
      setShipQty((prev) => {
        if (prev < 1) return Math.min(qty, stock) || 0;
        return Math.min(prev, qty, stock);
      });
    }
  }, [mode, qty, stock]);

  return (
    <form
      className="grid gap-4"
      action={async (formData) => {
        const result = await createSale(formData);
        if (result?.error) {
          setError(result.error);
          return;
        }
        setError(null);
        onDone?.();
        router.refresh();
      }}
    >
      <input type="hidden" name="fulfillmentMode" value={mode} />
      <p className="text-sm text-[var(--ink-soft)]">
        Заказ фиксирует клиента, товар, количество и цену. Дальше — оплата и отгрузка по шагам ниже.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Клиент">
          <Select name="clientId" required defaultValue={clients[0]?.id}>
            {clients.length === 0 ? <option value="">Сначала добавьте клиента</option> : null}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Товар">
          <Select
            name="productId"
            value={productId}
            onChange={(e) => {
              const next = products.find((p) => p.id === e.target.value);
              setProductId(e.target.value);
              if (next) setPrice(next.purchasePrice);
            }}
            required
          >
            {products.length === 0 ? <option value="">Сначала добавьте товар</option> : null}
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · на складе {p.stock} {p.unit}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Количество в заказе">
          <IntInput name="qty" min={1} required value={qty} onValueChange={setQty} placeholder="" />
        </Field>
        <Field label="Цена продажи за единицу, сум">
          <IntInput
            name="unitSalePrice"
            min={0}
            required
            value={price}
            onValueChange={setPrice}
            syncKey={productId}
          />
        </Field>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold">Как отгружаем</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <ModeCard
            active={mode === "ship_now"}
            title="Сразу со склада"
            description="Списываем товар сейчас. Можно отгрузить часть, остаток — позже из карточки заказа."
            onPick={() => setMode("ship_now")}
          />
          <ModeCard
            active={mode === "preorder"}
            title="Предзаказ"
            description="Только резерв в заказе. Клиент может оплатить до или после отгрузки. Со склада — когда будете готовы."
            onPick={() => setMode("preorder")}
          />
        </div>
      </fieldset>

      {mode === "ship_now" ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[#faf8f7] px-4 py-3">
          {stock === 0 ? (
            <p className="text-sm text-[var(--danger)]">
              На складе 0 {product?.unit ?? "шт"}. Выберите «Предзаказ» или пополните склад.
            </p>
          ) : (
            <Field label={`Сколько отгрузить сейчас (макс. ${maxShipNow} ${product?.unit ?? "шт"})`}>
              <IntInput
                name="shipQty"
                min={1}
                max={maxShipNow}
                required
                value={shipQty}
                onValueChange={setShipQty}
                placeholder=""
              />
            </Field>
          )}
          {qty > 0 && shipQty > 0 && shipQty < qty ? (
            <p className="mt-2 text-sm text-[var(--ink-soft)]">
              В заказе {qty} {product?.unit}, сейчас со склада уйдёт {shipQty} {product?.unit}. Остаток отгрузите из списка продаж.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="rounded-2xl border border-[var(--line)] bg-[#fff4df] px-4 py-3 text-sm text-[#8a5a00]">
          Со склада пока ничего не спишется. После сохранения заказ появится как предзаказ — отгрузку можно сделать частями.
        </p>
      )}

      <Field label="Оплата при оформлении, сум (необязательно)">
        <IntInput name="paidNow" min={0} placeholder="0" />
      </Field>
      <p className="-mt-2 text-xs text-[var(--ink-soft)]">
        Для предзаказа можно принять предоплату или оставить 0 и принять позже в карточке заказа.
      </p>

      <div className="grid gap-2 rounded-2xl bg-[var(--terracotta)]/8 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-sm text-[var(--ink-soft)]">Закуп</div>
          <div className="num text-lg">{formatSom(product?.purchasePrice ?? 0)}</div>
        </div>
        <div>
          <div className="text-sm text-[var(--ink-soft)]">Наценка</div>
          <div className="num text-lg font-semibold text-[var(--terracotta-dark)]">{formatPct(markup)}</div>
        </div>
        <div>
          <div className="text-sm text-[var(--ink-soft)]">Сумма заказа</div>
          <div className="num text-lg font-semibold">{formatSom(orderSum)}</div>
        </div>
        <div>
          <div className="text-sm text-[var(--ink-soft)]">Прибыль (если всё отгрузить)</div>
          <div className="num text-lg">{formatSom(profit)}</div>
        </div>
      </div>
      <ErrorText message={error} />
      <Button
        type="submit"
        disabled={
          clients.length === 0 ||
          products.length === 0 ||
          (mode === "ship_now" && (stock === 0 || shipQty < 1))
        }
      >
        Сохранить заказ
      </Button>
    </form>
  );
}

function ModeCard({
  active,
  title,
  description,
  onPick,
}: {
  active: boolean;
  title: string;
  description: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
        active
          ? "border-[var(--terracotta-dark)] bg-[#fff1ea] ring-1 ring-[var(--terracotta-dark)]/25"
          : "border-[var(--line)] bg-white hover:border-[#ddd8d3]"
      }`}
    >
      <div className="font-semibold">{title}</div>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p>
    </button>
  );
}