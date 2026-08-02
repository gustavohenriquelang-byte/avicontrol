"use client";

import { useTransition } from "react";
import { Power } from "lucide-react";
import { toggleFeedTypeActive } from "../actions";

export function FeedTypeToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => await toggleFeedTypeActive(id, !active))}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-surface"
    >
      <Power className="size-3.5" /> {active ? "Inativar" : "Reativar"}
    </button>
  );
}
