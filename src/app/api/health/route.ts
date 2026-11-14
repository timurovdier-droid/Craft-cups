import { ensureDatabase } from "@/lib/bootstrap";
import { prisma, tursoConfig } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const turso = tursoConfig();
  try {
    await ensureDatabase();
    const users = await prisma.user.count();
    return Response.json({
      ok: true,
      turso: Boolean(turso),
      users,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        turso: Boolean(turso),
        hasToken: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
        vercel: Boolean(process.env.VERCEL),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
