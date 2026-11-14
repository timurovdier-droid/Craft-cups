import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function tursoConfig() {
  const url = process.env.TURSO_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || "";
  if (!url.startsWith("libsql://") && !url.startsWith("https://")) return null;
  return { url, authToken: process.env.TURSO_AUTH_TOKEN };
}

function createPrisma() {
  const turso = tursoConfig();
  const log: ("error" | "warn")[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];
  if (turso) {
    return new PrismaClient({ adapter: new PrismaLibSQL(turso), log });
  }
  return new PrismaClient({ log });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
