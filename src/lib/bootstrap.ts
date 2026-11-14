import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

let ready = false;

export async function ensureDefaultUsers() {
  if (ready) return;
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
