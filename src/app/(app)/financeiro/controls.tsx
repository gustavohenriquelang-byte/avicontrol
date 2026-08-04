"use client";

import { useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { markEntryPaid, seedDefaultCategories } from "./actions";
import { Button } from "@/components/ui/button";

export function PayButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => await markEntryPaid(id))}
      className="inline-flex items-center gap-1 rounded-md border border-hairline px-2 py-1 text-xs font-medium text-brand-dark hover:bg-brand-light disabled:opacity-50"
    >
      <Check className="size-3.5" /> Baixar
    </button>
  );
}

export function SeedCategoriesButton() {
  const [pending, start] = useTransition();
  return (
    <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => start(async () => await seedDefaultCategories())}>
      <Sparkles className="size-4" /> {pending ? "Criando..." : "Criar categorias padrão"}
    </Button>
  );
}
