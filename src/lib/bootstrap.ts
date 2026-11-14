import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { prisma, tursoConfig } from "@/lib/prisma";
import { INIT_SQL } from "@/lib/schema-sql";

let ready = false;

export async function ensureDatabase() {
  if (ready) return;
  const turso = tursoConfig();
  if (turso) {
    const client = createClient(turso);
    const existing = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='User'");
    if (existing.rows.length === 0) {
      const statements = INIT_SQL.split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((sql) => ({ sql }));
      await client.batch(statements, "write");
    }
  } else if (process.env.VERCEL) {
    throw new Error("На Vercel задайте TURSO_DATABASE_URL и TURSO_AUTH_TOKEN");
  }

  const count = await prisma.user.count();
  if (count === 0) {
    const users = [
      {
        name: process.env.USER1_NAME ?? "Дониёр",
        login: (process.env.USER1_LOGIN ?? "doniyor").toLowerCase(),
        password: process.env.USER1_PASSWORD ?? "cups111",
      },
      {
        name: process.env.USER2_NAME ?? "Ильёс",
        login: (process.env.USER2_LOGIN ?? "ilyos").toLowerCase(),
        password: process.env.USER2_PASSWORD ?? "cups222",
      },
      {
        name: process.env.USER3_NAME ?? "Исобу",
        login: (process.env.USER3_LOGIN ?? "isobu").toLowerCase(),
        password: process.env.USER3_PASSWORD ?? "cups333",
      },
    ];
    for (const user of users) {
      await prisma.user.create({
        data: {
          name: user.name,
          login: user.login,
          passwordHash: await bcrypt.hash(user.password, 10),
        },
      });
    }
  }
  ready = true;
}

export const ensureDefaultUsers = ensureDatabase;
