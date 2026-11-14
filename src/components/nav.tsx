"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { BrandMark } from "@/components/ui";

const links = [
  { href: "/", label: "Сводка" },
  { href: "/stock", label: "Склад" },
  { href: "/sales", label: "Продажа" },
  { href: "/clients", label: "Клиенты" },
  { href: "/cash", label: "Деньги" },
  { href: "/profit", label: "Рентабельность" },
];

export function Nav({ name }: { name: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="mr-1 flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="grid h-9 w-11 place-items-center rounded-xl border border-[var(--line)] bg-white">
            <BrandMark className="h-4 w-7" />
          </span>
          Craft Cups
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm ${
                  active ? "bg-[var(--paper)] font-semibold text-[var(--ink)]" : "text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[var(--ink-soft)]">{name}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-white px-3 text-sm font-semibold hover:bg-[var(--paper)]"
            >
              Выйти
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
