"use server";

import { requireUser } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

export interface PwResult {
  ok: boolean;
  error?: string;
}

/** O próprio usuário logado altera a sua senha. */
export async function changeMyPassword(
  _prev: PwResult,
  formData: FormData
): Promise<PwResult> {
  await requireUser();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) return { ok: false, error: "A senha deve ter ao menos 8 caracteres." };
  if (password !== confirm) return { ok: false, error: "As senhas não coincidem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: "Não foi possível alterar a senha." };
  return { ok: true };
}
