import { Nav } from "@/components/nav";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <>
      <Nav name={user.name} />
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </>
  );
}
