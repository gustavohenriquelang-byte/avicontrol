"use client";

import { useEffect, useState, useCallback } from "react";
import { CloudOff, RefreshCw, Cloud, Check } from "lucide-react";
import { pendingCount, syncQueue } from "@/lib/offline";

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPending(await pendingCount());
    } catch {
      /* IndexedDB indisponível */
    }
  }, []);

  const doSync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setSyncing(true);
    try {
      const out = await syncQueue();
      if (out.synced > 0) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2500);
      }
    } catch {
      /* ignora */
    } finally {
      setSyncing(false);
      refresh();
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(navigator.onLine);
    refresh();

    const onOnline = () => {
      setOnline(true);
      doSync();
    };
    const onOffline = () => setOnline(false);
    const onQueued = () => refresh();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("avicontrol:queued", onQueued);

    // Tenta sincronizar ao abrir (caso tenha ficado algo pendente).
    if (navigator.onLine) doSync();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("avicontrol:queued", onQueued);
    };
  }, [refresh, doSync]);

  // Nada a mostrar: online e sem pendências.
  if (online && pending === 0 && !justSynced) return null;

  if (justSynced) {
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-brand-light px-2.5 py-1.5 text-xs font-medium text-brand-dark">
        <Check className="size-3.5" /> Sincronizado
      </span>
    );
  }

  if (!online) {
    return (
      <span className="flex items-center gap-1.5 rounded-md bg-warning/15 px-2.5 py-1.5 text-xs font-medium text-[#8a5d0f]">
        <CloudOff className="size-3.5" /> Offline
        {pending > 0 && <span className="tabular-nums">· {pending} p/ enviar</span>}
      </span>
    );
  }

  // Online com pendências: botão de sincronizar.
  return (
    <button
      type="button"
      onClick={doSync}
      disabled={syncing}
      className="flex items-center gap-1.5 rounded-md border border-hairline bg-card px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface disabled:opacity-60"
    >
      {syncing ? <RefreshCw className="size-3.5 animate-spin" /> : <Cloud className="size-3.5" />}
      {syncing ? "Enviando..." : `Sincronizar (${pending})`}
    </button>
  );
}
