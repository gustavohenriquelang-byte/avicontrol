"use client";

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/** Um lançamento diário na fila offline. */
export interface QueuedDaily {
  localId: string;
  createdAt: string;
  status: "pendente" | "erro";
  error?: string;
  /** Corpo enviado para /api/daily (campos do lançamento + intent + record_id). */
  payload: Record<string, unknown>;
  /** Rótulo amigável (lote/data) para exibir na lista. */
  label: string;
}

interface OfflineDB extends DBSchema {
  daily_queue: {
    key: string;
    value: QueuedDaily;
  };
}

const DB_NAME = "avicontrol-offline";
const STORE = "daily_queue";

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;
function getDb() {
  if (typeof window === "undefined") throw new Error("offline: apenas no navegador");
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE, { keyPath: "localId" });
      },
    });
  }
  return dbPromise;
}

function uuid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Adiciona um lançamento à fila (para enviar quando houver internet). */
export async function enqueueDaily(payload: Record<string, unknown>, label: string) {
  const db = await getDb();
  const item: QueuedDaily = {
    localId: uuid(),
    createdAt: new Date().toISOString(),
    status: "pendente",
    payload,
    label,
  };
  await db.put(STORE, item);
  return item;
}

export async function getQueue(): Promise<QueuedDaily[]> {
  const db = await getDb();
  const all = await db.getAll(STORE);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  return db.count(STORE);
}

export async function removeFromQueue(localId: string) {
  const db = await getDb();
  await db.delete(STORE, localId);
}

export interface SyncOutcome {
  synced: number;
  errored: number;
  remaining: number;
}

/**
 * Envia os itens pendentes para /api/daily.
 * - sucesso → remove da fila.
 * - erro de validação (400) → marca como "erro" e mantém para revisão.
 * - falha de rede → interrompe (segue offline) e mantém tudo.
 */
export async function syncQueue(): Promise<SyncOutcome> {
  const db = await getDb();
  const items = await getQueue();
  let synced = 0;
  let errored = 0;

  for (const item of items) {
    if (item.status === "erro") continue;
    let res: Response;
    try {
      res = await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.payload),
      });
    } catch {
      // Sem rede: interrompe e mantém a fila.
      break;
    }
    if (res.ok) {
      await db.delete(STORE, item.localId);
      synced++;
    } else if (res.status === 400) {
      const body = await res.json().catch(() => ({}));
      item.status = "erro";
      item.error = body?.error ?? "Erro ao sincronizar.";
      await db.put(STORE, item);
      errored++;
    } else {
      // 401/403/5xx: interrompe (sessão/servidor); tenta depois.
      break;
    }
  }

  const remaining = await db.count(STORE);
  return { synced, errored, remaining };
}
