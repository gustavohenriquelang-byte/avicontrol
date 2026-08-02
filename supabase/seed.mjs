/**
 * Seed de demonstração do Avicontrol (Etapa 1).
 *
 * Requer as variáveis de ambiente:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (chave service_role — NUNCA commitar)
 *
 * Uso:
 *   node --env-file=.env.local supabase/seed.mjs
 *
 * Cria: usuário demo, empresa, granja, 3 aviários, 2 linhagens (com curvas),
 * 3 lotes e movimentações de entrada. Os 90 dias de produção, mortalidade,
 * ração, vendas e financeiro serão adicionados nas Etapas 3–6, quando as
 * respectivas tabelas existirem.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY antes de rodar o seed."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL = "admin@avicontrol.local";
const DEMO_PASSWORD = "avicontrol123";

async function ensureDemoUser() {
  // Procura usuário existente.
  const { data: list } = await supabase.auth.admin.listUsers();
  const existing = list?.users?.find((u) => u.email === DEMO_EMAIL);
  if (existing) return existing.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Administrador Demo" },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  console.log("→ Criando usuário demo...");
  const userId = await ensureDemoUser();

  console.log("→ Criando empresa...");
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .insert({
      name: "Granja Modelo Avicontrol",
      legal_name: "Granja Modelo Avicontrol Ltda.",
      city: "Bastos",
      state: "SP",
    })
    .select("id")
    .single();
  if (orgErr) throw orgErr;
  const orgId = org.id;

  await supabase
    .from("organization_users")
    .upsert(
      { organization_id: orgId, user_id: userId, role: "admin", active: true },
      { onConflict: "organization_id,user_id" }
    );

  console.log("→ Criando granja e aviários...");
  const { data: farm } = await supabase
    .from("farms")
    .insert({
      organization_id: orgId,
      code: "G01",
      name: "Granja Sede",
      city: "Bastos",
      state: "SP",
    })
    .select("id")
    .single();
  const farmId = farm.id;

  const houses = [
    { code: "A01", name: "Aviário 1", housing_system: "gaiolas_convencionais", capacity: 20000 },
    { code: "A02", name: "Aviário 2", housing_system: "cage_free", capacity: 15000 },
    { code: "A03", name: "Aviário 3", housing_system: "free_range", capacity: 8000 },
  ];
  const { data: insertedHouses } = await supabase
    .from("houses")
    .insert(
      houses.map((h) => ({ ...h, organization_id: orgId, farm_id: farmId, status: "ativo" }))
    )
    .select("id, code");

  console.log("→ Criando linhagens e curvas...");
  const { data: breeds } = await supabase
    .from("breeds")
    .insert([
      { organization_id: orgId, name: "Hy-Line W-36", color: "branca" },
      { organization_id: orgId, name: "Lohmann Brown", color: "vermelha" },
    ])
    .select("id, name");

  // Curva simplificada (semanas 18–30) para uma linhagem.
  const curveRows = [];
  for (let w = 18; w <= 30; w++) {
    const laying = Math.min(95, Math.max(0, (w - 18) * 12)); // sobe até ~95%
    curveRows.push({
      organization_id: orgId,
      breed_id: breeds[0].id,
      age_weeks: w,
      expected_laying_rate: laying,
      expected_weight_g: 1200 + (w - 18) * 25,
      expected_feed_g: 95 + (w - 18) * 2,
    });
  }
  await supabase.from("breed_curves").insert(curveRows);

  console.log("→ Criando lotes...");
  const flocks = insertedHouses.map((h, i) => ({
    organization_id: orgId,
    farm_id: farmId,
    house_id: h.id,
    breed_id: breeds[i % breeds.length].id,
    code: `L0${i + 1}`,
    supplier: "Incubatório Regional",
    birth_date: "2025-12-01",
    housing_date: "2026-04-01",
    initial_quantity: houses[i].capacity,
    current_quantity: Math.round(houses[i].capacity * 0.98),
    age_at_housing_days: 120,
    status: i === 0 ? "producao" : i === 1 ? "pre_postura" : "recria",
  }));
  const { data: insertedFlocks } = await supabase
    .from("flocks")
    .insert(flocks)
    .select("id, initial_quantity");

  await supabase.from("flock_movements").insert(
    insertedFlocks.map((f) => ({
      organization_id: orgId,
      flock_id: f.id,
      movement_type: "entrada",
      quantity: f.initial_quantity,
      reason: "Alojamento inicial",
      created_by: userId,
    }))
  );

  console.log("\n✔ Seed concluído.");
  console.log(`  Empresa: Granja Modelo Avicontrol (${orgId})`);
  console.log(`  Login demo: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Erro no seed:", err);
  process.exit(1);
});
