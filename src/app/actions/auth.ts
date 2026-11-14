"use server";

import { signIn, signOut } from "@/auth";
import { ensureDefaultUsers } from "@/lib/bootstrap";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  try {
    await ensureDefaultUsers();
    await signIn("credentials", {
      login: String(formData.get("login") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный логин или пароль" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
