import { auth } from "@/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { redirect } from "next/navigation";

export async function requireUser() {
  await ensureDatabase();
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return { id: session.user.id, name: session.user.name ?? "" };
}
