import { redirect } from "next/navigation";

import { AbonnementRequisScreen } from "@/components/billing/AbonnementRequisScreen";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { Sidebar } from "@/components/layout/Sidebar";
import { ScrapingBanner } from "@/components/prospects/ScrapingBanner";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Une seule requête (jointure imbriquée PostgREST) au lieu de deux
    // appels séquentiels — réduit la latence de cette garde sur chaque
    // navigation dans l'app.
    const { data } = await supabase
      .from("team_members")
      .select(
        "team_id, team:teams(onboarding_completed_at, exempte_paywall, subscriptions(status))"
      )
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const row = data as unknown as {
      team_id: string;
      team: {
        onboarding_completed_at: string | null;
        exempte_paywall: boolean;
        subscriptions: { status: string } | null;
      };
    } | null;

    if (row && !row.team.onboarding_completed_at) {
      redirect("/onboarding");
    }

    if (row && !row.team.exempte_paywall) {
      const status = row.team.subscriptions?.status;
      const abonnementActif = status === "active" || status === "trialing";
      if (!abonnementActif) {
        return (
          <div className="flex h-screen w-screen overflow-hidden">
            <AbonnementRequisScreen />
          </div>
        );
      }
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 overflow-hidden">{children}</main>
      <FeedbackWidget />
      <ScrapingBanner />
    </div>
  );
}
