"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { updatePasswordAction } from "../login/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Salvando..." : "Redefinir senha"}
    </Button>
  );
}

export default function RedefinirSenhaPage() {
  const [state, action] = useActionState(updatePasswordAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Definir nova senha</CardTitle>
      </CardHeader>
      <CardContent>
        {state.done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-3 text-sm text-brand-dark">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>Senha redefinida com sucesso.</span>
            </div>
            <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
              Ir para o login
            </Link>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            {state.error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircle className="size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input id="confirm" name="confirm" type="password" required />
            </div>
            <SubmitButton />
          </form>
        )}
      </CardContent>
    </Card>
  );
}
