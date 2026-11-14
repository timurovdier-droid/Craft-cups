import { createClient } from "@libsql/client/web";
import { readFileSync } from "node:fs";
import path from "node:path";
import "../src/lib/load-env";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) {
  console.error("Нужны TURSO_DATABASE_URL и TURSO_AUTH_TOKEN");
  process.exit(1);
}

const sql = readFileSync(path.join(process.cwd(), "prisma", "init.sql"), "utf8");
const statements = sql
  .split(";")
  .map((part) => part.trim())
  .filter(Boolean);

const client = createClient({ url, authToken });

async function main() {
  await client.batch(
    statements.map((statement) => ({ sql: statement, args: [] as string[] })),
    "write",
  );
  console.log("Схема Turso готова");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
