"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { createFirstOrganization, type OnboardingResult } from "@/lib/auth/org-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Criando..." : "Criar e continuar"}
    </Button>
  );
}

export default function OnboardingPage() {
  const [state, action] = useActionState<OnboardingResult, FormData>(
    createFirstOrganization,
    { ok: false }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar sua empresa</CardTitle>
        <CardDescription>
          Você ainda não faz parte de nenhuma empresa. Crie a primeira para começar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {state.error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4 shrink-0" />
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da empresa</Label>
            <Input id="name" name="name" placeholder="Granja São João" required />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
