import { createClient } from "@libsql/client";
import { execFileSync } from "node:child_process";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
if (!url || !authToken) {
  console.error("Нужны TURSO_DATABASE_URL и TURSO_AUTH_TOKEN");
  process.exit(1);
}

const sql = execFileSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "migrate", "diff", "--from-empty", "--to-schema-datamodel", "prisma/schema.prisma", "--script"],
  { encoding: "utf8" },
);

const statements = sql
  .split(";")
  .map((part) => part.trim())
  .filter((part) => part && !part.startsWith("--"));

const client = createClient({ url, authToken });

async function main() {
  for (const statement of statements) {
    try {
      await client.execute(statement);
      console.log("ok:", statement.slice(0, 72).replace(/\s+/g, " "));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists/i.test(message)) {
        console.log("skip:", statement.slice(0, 72).replace(/\s+/g, " "));
        continue;
      }
      throw error;
    }
  }
  console.log("Схема Turso обновлена");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
