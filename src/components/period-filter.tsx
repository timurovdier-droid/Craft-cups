"use client";

import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

export function PeriodFilter({
  from,
  to,
  path,
  extra,
}: {
  from: string;
  to: string;
  path: string;
  extra?: Record<string, string>;
}) {
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const params = new URLSearchParams(extra);
        params.set("from", String(data.get("from")));
        params.set("to", String(data.get("to")));
        router.push(`${path}?${params.toString()}`);
      }}
    >
      <label className="grid gap-1 text-xs font-medium text-[var(--ink-soft)]">
        С
        <Input type="date" name="from" defaultValue={from} />
      </label>
      <label className="grid gap-1 text-xs font-medium text-[var(--ink-soft)]">
        По
        <Input type="date" name="to" defaultValue={to} />
      </label>
      <Button type="submit" tone="ghost">
        Показать
      </Button>
    </form>
  );
}
