"use client";

import {
  BarChart2,
  CreditCard,
  HelpCircle,
  LayoutGrid,
  LogOut,
  Megaphone,
  Mail,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";

import { useIsPlatformAdmin } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/prospects", label: "Prospects", icon: LayoutGrid },
  { href: "/campaigns", label: "Campagnes", icon: Megaphone },
  { href: "/messages", label: "Messages", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/facturation", label: "Facturation", icon: CreditCard },
  { href: "/aide", label: "Aide", icon: HelpCircle },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: estAdmin } = useIsPlatformAdmin();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <nav className="flex h-full w-14 shrink-0 flex-col items-center border-r border-[var(--border)] bg-[var(--bg-sidebar)] py-3">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-[var(--emerald-dim)] text-[var(--emerald-light)]">
        <Sparkles size={18} strokeWidth={2} />
      </div>

      <div className="flex flex-1 flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
                isActive
                  ? "bg-[var(--bg-hover)] text-[var(--emerald-light)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 h-5 w-0.5 rounded-r bg-[var(--emerald)]" />
              )}
              <Icon size={18} strokeWidth={2} />
            </Link>
          );
        })}
      </div>

      {estAdmin && (
        <Link
          href="/admin"
          title="Admin plateforme"
          className="mb-1 flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--emerald-light)]"
        >
          <ShieldCheck size={18} strokeWidth={2} />
        </Link>
      )}

      <button
        type="button"
        onClick={handleLogout}
        title="Se déconnecter"
        className="flex h-10 w-10 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      >
        <LogOut size={18} strokeWidth={2} />
      </button>
    </nav>
  );
}
