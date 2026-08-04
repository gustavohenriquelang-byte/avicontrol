"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";
import { writeAudit } from "@/lib/audit";
import {
  vaccineSchema,
  medicationSchema,
  healthEventSchema,
  scheduleSchema,
} from "@/lib/schemas";
import { addDaysISO } from "@/lib/format";
import type { ScheduleStatus } from "@/lib/supabase/database.types";

export interface FormResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function fieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const fe: Record<string, string> = {};
  for (const i of issues) fe[i.path.join(".")] = i.message;
  return fe;
}

export async function saveVaccine(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("sanidade", "write");
  const parsed = vaccineSchema.safeParse({
    name: formData.get("name"),
    manufacturer: formData.get("manufacturer"),
    target_disease: formData.get("target_disease"),
    route: formData.get("route"),
    doses: formData.get("doses"),
    withdrawal_days: formData.get("withdrawal_days"),
    active: formData.get("active") !== "false",
  });
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: fieldErrors(parsed.error.issues) };
  const supabase = await createClient();
  const values = {
    ...parsed.data,
    doses: parsed.data.doses ?? null,
    withdrawal_days: parsed.data.withdrawal_days ?? null,
    organization_id: org.organizationId,
  };
  const res = id
    ? await supabase.from("vaccines").update(values).eq("id", id).eq("organization_id", org.organizationId)
    : await supabase.from("vaccines").insert(values);
  if (res.error) return { ok: false, error: res.error.message.includes("duplicate") ? "Já existe uma vacina com este nome." : "Não foi possível salvar." };
  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: id ? "update" : "insert", table: "vaccines", recordId: id || undefined });
  revalidatePath("/sanidade/vacinas");
  return { ok: true };
}

export async function saveMedication(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const id = String(formData.get("id") ?? "");
  const { org, ctx } = await requirePermission("sanidade", "write");
  const parsed = medicationSchema.safeParse({
    name: formData.get("name"),
    manufacturer: formData.get("manufacturer"),
    kind: formData.get("kind"),
    withdrawal_days: formData.get("withdrawal_days"),
    active: formData.get("active") !== "false",
  });
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: fieldErrors(parsed.error.issues) };
  const supabase = await createClient();
  const values = { ...parsed.data, withdrawal_days: parsed.data.withdrawal_days ?? null, organization_id: org.organizationId };
  const res = id
    ? await supabase.from("medications").update(values).eq("id", id).eq("organization_id", org.organizationId)
    : await supabase.from("medications").insert(values);
  if (res.error) return { ok: false, error: res.error.message.includes("duplicate") ? "Já existe um medicamento com este nome." : "Não foi possível salvar." };
  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: id ? "update" : "insert", table: "medications", recordId: id || undefined });
  revalidatePath("/sanidade/medicamentos");
  return { ok: true };
}

export async function registerHealthEvent(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { org, ctx } = await requirePermission("sanidade", "write");
  const parsed = healthEventSchema.safeParse({
    event_type: formData.get("event_type"),
    flock_id: formData.get("flock_id"),
    event_date: formData.get("event_date"),
    vaccine_id: formData.get("vaccine_id"),
    medication_id: formData.get("medication_id"),
    description: formData.get("description"),
    dose: formData.get("dose"),
    responsible: formData.get("responsible"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: fieldErrors(parsed.error.issues) };
  const d = parsed.data;
  const supabase = await createClient();

  // Carência: calcula a data final a partir do produto usado.
  let withdrawalUntil: string | null = null;
  if (d.medication_id) {
    const { data: med } = await supabase.from("medications").select("withdrawal_days").eq("id", d.medication_id).maybeSingle();
    if (med?.withdrawal_days) withdrawalUntil = addDaysISO(d.event_date, med.withdrawal_days);
  } else if (d.vaccine_id) {
    const { data: vac } = await supabase.from("vaccines").select("withdrawal_days").eq("id", d.vaccine_id).maybeSingle();
    if (vac?.withdrawal_days) withdrawalUntil = addDaysISO(d.event_date, vac.withdrawal_days);
  }

  const { data, error } = await supabase.from("health_events").insert({
    organization_id: org.organizationId,
    flock_id: d.flock_id ?? null,
    event_date: d.event_date,
    event_type: d.event_type,
    vaccine_id: d.vaccine_id ?? null,
    medication_id: d.medication_id ?? null,
    description: d.description ?? null,
    dose: d.dose ?? null,
    responsible: d.responsible ?? null,
    withdrawal_until: withdrawalUntil,
    notes: d.notes ?? null,
    created_by: ctx.userId,
  }).select("id").single();
  if (error) return { ok: false, error: "Não foi possível registrar o evento." };
  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "insert", table: "health_events", recordId: data?.id });
  revalidatePath("/sanidade");
  return { ok: true };
}

export async function addSchedule(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const { org, ctx } = await requirePermission("sanidade", "write");
  const parsed = scheduleSchema.safeParse({
    flock_id: formData.get("flock_id"),
    vaccine_id: formData.get("vaccine_id"),
    scheduled_date: formData.get("scheduled_date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: fieldErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.from("vaccination_schedules").insert({
    organization_id: org.organizationId,
    flock_id: parsed.data.flock_id ?? null,
    vaccine_id: parsed.data.vaccine_id ?? null,
    scheduled_date: parsed.data.scheduled_date,
    notes: parsed.data.notes ?? null,
  });
  if (error) return { ok: false, error: "Não foi possível agendar." };
  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "insert", table: "vaccination_schedules" });
  revalidatePath("/sanidade");
  return { ok: true };
}

export async function updateScheduleStatus(id: string, status: ScheduleStatus) {
  const { org, ctx } = await requirePermission("sanidade", "write");
  const supabase = await createClient();
  const patch: { status: ScheduleStatus; applied_date?: string } = { status };
  if (status === "realizada") patch.applied_date = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("vaccination_schedules").update(patch).eq("id", id).eq("organization_id", org.organizationId);
  if (error) throw new Error(error.message);
  await writeAudit({ organizationId: org.organizationId, userId: ctx.userId, action: "update_schedule", table: "vaccination_schedules", recordId: id, newValue: { status } });
  revalidatePath("/sanidade");
}

export async function toggleVaccineActive(id: string, active: boolean) {
  const { org } = await requirePermission("sanidade", "write");
  const supabase = await createClient();
  await supabase.from("vaccines").update({ active }).eq("id", id).eq("organization_id", org.organizationId);
  revalidatePath("/sanidade/vacinas");
}

export async function toggleMedicationActive(id: string, active: boolean) {
  const { org } = await requirePermission("sanidade", "write");
  const supabase = await createClient();
  await supabase.from("medications").update({ active }).eq("id", id).eq("organization_id", org.organizationId);
  revalidatePath("/sanidade/medicamentos");
}
