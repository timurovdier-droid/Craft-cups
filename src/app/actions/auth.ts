"use server";

import { signIn, signOut } from "@/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { AuthError } from "next-auth";

export async function loginAction(formData: FormData) {
  try {
    await ensureDatabase();
    await signIn("credentials", {
      login: String(formData.get("login") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Неверный логин или пароль" };
    }
    const message = error instanceof Error ? error.message : "Ошибка входа";
    return { error: message };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
