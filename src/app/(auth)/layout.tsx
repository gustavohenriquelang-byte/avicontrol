import { Egg } from "lucide-react";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-brand text-white">
          <Egg className="size-6" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Avicontrol</h1>
        <p className="text-sm text-ink-muted">
          Gestão de poedeiras e produção de ovos
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
