"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
}

/** Login com e-mail e senha (Supabase Auth). */
export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/") || "/";

  if (!email || !password) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  redirect(redirectTo);
}

/** Solicita e-mail de recuperação de senha. */
export async function requestPasswordResetAction(
  _prev: AuthState & { sent?: boolean },
  formData: FormData
): Promise<AuthState & { sent?: boolean }> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/redefinir-senha`,
  });

  if (error) return { error: "Não foi possível enviar o e-mail de recuperação." };
  return { sent: true };
}

/** Define nova senha (usuário já autenticado pelo link de recuperação). */
export async function updatePasswordAction(
  _prev: AuthState & { done?: boolean },
  formData: FormData
): Promise<AuthState & { done?: boolean }> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { error: "A senha deve ter ao menos 8 caracteres." };
  if (password !== confirm) return { error: "As senhas não coincidem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível redefinir a senha." };
  return { done: true };
}

/** Logout. */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
