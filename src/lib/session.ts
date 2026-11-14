import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cache } from "react";

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { id: session.user.id, name: session.user.name ?? "" };
});
