import "@/lib/load-env";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function tursoConfig() {
  const raw = process.env.TURSO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!raw.startsWith("libsql://") && !raw.startsWith("https://")) return null;
  return {
    url: raw,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };
}

function createPrisma() {
  const turso = tursoConfig();
  const log: ("error" | "warn")[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  if (turso) {
    return new PrismaClient({ adapter: new PrismaLibSQL(turso), log });
  }
  if (process.env.VERCEL) {
    throw new Error("На Vercel задайте TURSO_DATABASE_URL и TURSO_AUTH_TOKEN");
  }
  return new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();
globalForPrisma.prisma = prisma;
