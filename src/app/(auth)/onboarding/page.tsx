import type { Metadata } from "next";
import { createFirstOrganization } from "@/lib/auth/org-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = { title: "Criar empresa" };

export default function OnboardingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar sua empresa</CardTitle>
        <CardDescription>
          Você ainda não faz parte de nenhuma empresa. Crie a primeira para começar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={createFirstOrganization} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da empresa</Label>
            <Input id="name" name="name" placeholder="Granja São João" required />
          </div>
          <Button type="submit" size="lg" className="w-full">
            Criar e continuar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
