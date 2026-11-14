"use client";

import { useState } from "react";
import { ErrorText } from "@/components/ui";

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<{ error?: string } | void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={className}
      action={async (formData) => {
        const result = await action(formData);
        setError(result?.error ?? null);
      }}
    >
      {children}
      <ErrorText message={error} />
    </form>
  );
}
