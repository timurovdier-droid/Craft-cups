import type { ReactNode } from "react";
import { formatSom } from "@/lib/money";

export function BrandMark({ className = "h-5 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 16" className={className} aria-hidden>
      <path d="M3 12c3.2-8 22.8-8 26 0" fill="none" stroke="#ff5c1a" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--terracotta)] ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 outline-none focus:border-[var(--terracotta)] ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`min-h-24 w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2 outline-none focus:border-[var(--terracotta)] ${props.className ?? ""}`}
    />
  );
}

export function Button({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-[var(--terracotta)] text-white hover:bg-[var(--terracotta-dark)]",
    ghost: "border border-[var(--line)] bg-white hover:bg-[var(--paper)]",
    danger: "bg-[var(--danger)] text-white",
  }[tone];
  return (
    <button
      {...props}
      className={`inline-flex h-11 items-center justify-center gap-1 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-[var(--ink-soft)]">
        {label}
      </div>
      <div className="mt-2 text-[1.7rem] font-semibold tracking-tight num">{value}</div>
      {hint ? <div className="mt-1 text-sm text-[var(--ink-soft)]">{hint}</div> : null}
    </div>
  );
}

export function Money({ value }: { value: number }) {
  return <span className="num">{formatSom(value)}</span>;
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-[var(--danger)]">{message}</p>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-[var(--ink-soft)]">
      {children}
    </div>
  );
}
