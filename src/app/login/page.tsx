"use client";

import { useState } from "react";
import { loginAction } from "@/app/actions/auth";
import { BrandMark, Button, ErrorText, Field, Input } from "@/components/ui";

const points = [
  { title: "Остатки и приход", icon: "box" },
  { title: "Продажи и отгрузки", icon: "trend" },
  { title: "Долги и касса", icon: "card" },
] as const;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="flex min-h-screen flex-col bg-white px-6 py-8">
        <form
          className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center"
          action={async (formData) => {
            const result = await loginAction(formData);
            if (result?.error) setError(result.error);
          }}
        >
          <h1 className="text-[1.7rem] font-semibold tracking-tight">С возвращением</h1>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">Войдите, чтобы продолжить работу в Craft Cups</p>

          <div className="mt-8 grid gap-4">
            <Field label="Логин">
              <span className="relative block">
                <UserIcon />
                <Input name="login" autoComplete="username" required placeholder="Логин" className="!border-transparent !bg-[var(--field)] !pl-10" />
              </span>
            </Field>
            <Field label="Пароль">
              <span className="relative block">
                <LockIcon />
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Пароль"
                  className="!border-transparent !bg-[var(--field)] !pl-10 !pr-11"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-[var(--ink-soft)]"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  aria-pressed={showPassword}
                >
                  <EyeIcon />
                </button>
              </span>
            </Field>
            <ErrorText message={error} />
            <Button type="submit" className="h-12 w-full rounded-xl text-base">
              Войти
              <ArrowIcon />
            </Button>
          </div>
          <p className="mt-8 text-center text-xs text-[var(--ink-soft)]">© 2026 Craft Cups</p>
        </form>
      </section>

      <section className="relative hidden overflow-hidden lg:block">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(520px 380px at 78% 8%, rgba(255,92,26,0.55), transparent 62%), radial-gradient(460px 360px at 18% 100%, rgba(90,32,8,0.55), transparent 60%), #140e0c",
          }}
        />
        <div className="absolute right-8 top-8 grid h-12 w-[4.5rem] place-items-center rounded-2xl bg-white">
          <BrandMark className="h-5 w-9" />
        </div>
        <div className="relative flex h-full flex-col justify-center px-14 text-white">
          <h2 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
            Учёт, который видит каждую отгрузку
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
            Склад, продажи, долги клиентов и касса — в одном окне.
          </p>
          <ul className="mt-8 grid gap-3">
            {points.map((point) => (
              <li key={point.title} className="flex items-center gap-3 text-sm">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[var(--terracotta)]">
                  <PointIcon name={point.icon} />
                </span>
                {point.title}
              </li>
            ))}
          </ul>
        </div>
        <p className="absolute bottom-6 left-14 text-xs text-white/45">© 2026 Craft Cups</p>
      </section>
    </main>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <rect x="6" y="10" width="12" height="9" rx="2" />
      <path d="M9 10 V8 a3 3 0 0 1 6 0 V10" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="ml-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M5 12 H19 M13 6 L19 12 L13 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PointIcon({ name }: { name: (typeof points)[number]["icon"] }) {
  const common = {
    viewBox: "0 0 24 24",
    className: "h-4 w-4",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "box") {
    return (
      <svg {...common}>
        <path d="M4 8 L12 4 L20 8 L12 12 Z" />
        <path d="M4 8 V16 L12 20 L20 16 V8" />
      </svg>
    );
  }
  if (name === "trend") {
    return (
      <svg {...common}>
        <path d="M4 16 L9 11 L13 14 L20 7" />
        <path d="M15 7 H20 V12" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10 H21" />
    </svg>
  );
}
