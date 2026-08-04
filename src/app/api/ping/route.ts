import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sempre dinâmico — este endpoint existe para "acordar" app e banco.
export const dynamic = "force-dynamic";

/**
 * Health check / keep-warm.
 * Um serviço externo (ex.: UptimeRobot) acessa este endereço a cada poucos
 * minutos para evitar que o app (Vercel) e o banco (Supabase) hibernem.
 * Faz uma consulta trivial só para tocar o banco; RLS pode retornar 0 linhas.
 */
export async function GET() {
  let db = "skip";
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("settings")
      .select("id", { count: "exact", head: true });
    db = error ? "error" : "ok";
  } catch {
    db = "error";
  }
  return NextResponse.json(
    { ok: true, db, ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
