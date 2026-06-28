import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: estAdmin } = await supabase.rpc("is_platform_admin");
  if (!estAdmin) {
    redirect("/prospects");
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[var(--bg-app)]">
      <nav className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)]">
          <ShieldCheck size={16} className="text-[var(--emerald-light)]" />
          Admin plateforme
        </span>
        <Link href="/admin" className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Statut
        </Link>
        <Link
          href="/admin/logs"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Logs
        </Link>
        <Link
          href="/admin/diagnostics"
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Diagnostics
        </Link>
        <Link
          href="/prospects"
          className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Retour à l&apos;app
        </Link>
      </nav>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
