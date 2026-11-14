"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui";

function normalizeDigits(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits === "") return "";
  return digits.replace(/^0+(?=\d)/, "");
}

export function IntInput({
  name,
  value,
  defaultValue,
  onValueChange,
  min,
  max,
  required,
  placeholder = "0",
  syncKey,
}: {
  name?: string;
  value?: number;
  defaultValue?: number;
  onValueChange?: (n: number) => void;
  min?: number;
  max?: number;
  required?: boolean;
  placeholder?: string;
  syncKey?: string | number;
}) {
  const [text, setText] = useState(() => {
    const initial = value ?? defaultValue;
    return initial ? String(initial) : "";
  });

  useEffect(() => {
    if (value === undefined) return;
    setText(value ? String(value) : "");
  }, [value, syncKey]);

  return (
    <Input
      name={name}
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      required={required}
      min={min}
      max={max}
      placeholder={placeholder}
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => {
        const next = normalizeDigits(e.target.value);
        setText(next);
        onValueChange?.(next === "" ? 0 : Number(next));
      }}
    />
  );
}
