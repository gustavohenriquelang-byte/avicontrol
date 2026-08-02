import { requireActiveOrg } from "@/lib/auth/context";
import { visibleModules } from "@/lib/auth/roles";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Topbar } from "@/components/shell/topbar";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { ctx, org } = await requireActiveOrg();
  const allowed = visibleModules(org.role);

  return (
    <div className="flex min-h-dvh bg-surface">
      <Sidebar allowed={allowed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          fullName={ctx.fullName}
          email={ctx.email}
          activeOrg={org}
          memberships={ctx.memberships}
        />
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <div className="mx-auto w-full max-w-6xl space-y-6">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
