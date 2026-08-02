"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { requestPasswordResetAction } from "../login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Enviando..." : "Enviar link de recuperação"}
    </Button>
  );
}

export default function RecuperarSenhaPage() {
  const [state, action] = useActionState(requestPasswordResetAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
      </CardHeader>
      <CardContent>
        {state.sent ? (
          <div className="flex items-start gap-2 rounded-md border border-brand/30 bg-brand-light px-3 py-3 text-sm text-brand-dark">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Se o e-mail existir, enviamos um link para redefinir a senha.
            </span>
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
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <SubmitButton />
          </form>
        )}
        <p className="mt-4 text-center text-sm text-ink-muted">
          <Link href="/login" className="font-medium text-brand hover:underline">
            Voltar para o login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
