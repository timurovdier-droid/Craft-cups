import "@/lib/load-env";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function tursoConfig() {
  const raw = process.env.TURSO_DATABASE_URL?.trim() || "";
  if (!raw) return null;
  const url = raw.startsWith("libsql://") ? `https://${raw.slice("libsql://".length)}` : raw;
  if (!url.startsWith("https://")) return null;
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!authToken) return null;
  return { url, authToken };
}

function createPrisma() {
  const turso = tursoConfig();
  const log: ("error" | "warn")[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  if (turso) {
    return new PrismaClient({ adapter: new PrismaLibSQL(turso), log });
  }
  return new PrismaClient({
    log,
    datasources: { db: { url: process.env.DATABASE_URL || "file:./dev.db" } },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;
