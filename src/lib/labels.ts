export const CASH_CATEGORY_LABEL = {
  doniyor: "Дониёр",
  ilyos: "Ильёс",
  isobu: "Исобу",
  goods: "Товар",
  cargo: "Карго",
  commission: "Комиссия",
  other: "Прочее",
} as const;

export type CashCategoryKey = keyof typeof CASH_CATEGORY_LABEL;

export function parseCashCategory(raw: string): CashCategoryKey | null {
  if (raw in CASH_CATEGORY_LABEL) return raw as CashCategoryKey;
  if (raw === "muhammad" || raw === "Мухааммад") return "isobu";
  const match = (Object.entries(CASH_CATEGORY_LABEL) as [CashCategoryKey, string][]).find(([, label]) => label === raw);
  return match?.[0] ?? null;
}

export const UNIT_OPTIONS = ["шт", "упак", "кг", "л"] as const;
