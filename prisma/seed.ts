import "../src/lib/load-env";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function upsertUser(name: string, login: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { login },
    update: { name, passwordHash },
    create: { name, login, passwordHash },
  });
}

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  }
  await upsertUser(
    process.env.USER1_NAME ?? "Дониёр",
    (process.env.USER1_LOGIN ?? "doniyor").toLowerCase(),
    process.env.USER1_PASSWORD ?? "cups111",
  );
  await upsertUser(
    process.env.USER2_NAME ?? "Ильёс",
    (process.env.USER2_LOGIN ?? "ilyos").toLowerCase(),
    process.env.USER2_PASSWORD ?? "cups222",
  );
  await upsertUser(
    process.env.USER3_NAME ?? "Исобу",
    (process.env.USER3_LOGIN ?? "isobu").toLowerCase(),
    process.env.USER3_PASSWORD ?? "cups333",
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
