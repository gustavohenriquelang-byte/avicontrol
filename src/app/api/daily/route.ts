import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORG_COOKIE } from "@/lib/auth/context";
import { dailySchema } from "@/lib/schemas";
import { persistDaily } from "@/lib/daily-save";
import { can, type Role } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/**
 * Recebe um lançamento diário (JSON) da fila offline e salva.
 * Autenticado pela sessão do usuário (cookies).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const { data: memberships } = await supabase
    .from("organization_users")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("active", true);

  const m = memberships?.find((x) => x.organization_id === activeId) ?? memberships?.[0];
  if (!m) {
    return NextResponse.json({ ok: false, error: "Sem empresa ativa." }, { status: 403 });
  }
  if (!can(m.role as Role, "lancamento", "write")) {
    return NextResponse.json({ ok: false, error: "Sem permissão." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const parsed = dailySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const result = await persistDaily({
    orgId: m.organization_id,
    userId: user.id,
    role: m.role as Role,
    recordId: typeof body.record_id === "string" ? body.record_id : "",
    intent: body.intent === "close" ? "close" : "draft",
    d: parsed.data,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
