"use client";

import { Check, Loader2, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/shared/Button";
import { useSenderProfile, useUpsertSenderProfile } from "@/lib/queries/settings";
import type { SenderProfile } from "@/types/database";

import { TextAreaField, TextField } from "./fields";

export function ProfilTab() {
  const { data: profile, isLoading } = useSenderProfile();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--text-muted)]">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return <ProfilForm key={profile?.user_id ?? "new"} profile={profile} />;
}

function ProfilForm({ profile }: { profile: SenderProfile | null | undefined }) {
  const upsert = useUpsertSenderProfile();

  const [prenom, setPrenom] = useState(profile?.prenom ?? "");
  const [marque, setMarque] = useState(profile?.marque ?? "");
  const [metier, setMetier] = useState(profile?.metier ?? "");
  const [ville, setVille] = useState(profile?.ville ?? "");
  const [lienRdv, setLienRdv] = useState(profile?.lien_rdv ?? "");
  const [signature, setSignature] = useState(profile?.signature ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await upsert.mutateAsync({
      prenom: prenom || null,
      marque: marque || null,
      metier: metier || null,
      ville: ville || null,
      lien_rdv: lienRdv || null,
      signature: signature || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex max-w-xl flex-col gap-4 p-4">
      <p className="text-xs text-[var(--text-muted)]">
        Ces informations sont utilisées pour personnaliser les emails et scripts d&apos;appel
        générés (signature, ville de référence, lien de prise de rendez-vous).
      </p>

      <TextField label="Prénom" value={prenom} onChange={setPrenom} placeholder="Serhat" />
      <TextField
        label="Nom de l'entreprise / marque"
        value={marque}
        onChange={setMarque}
        placeholder="Atlamaz Studio"
      />
      <TextField
        label="Métier"
        value={metier}
        onChange={setMetier}
        placeholder="Développeur web freelance"
      />
      <TextField
        label="Ville de référence"
        value={ville}
        onChange={setVille}
        placeholder="Saint-Étienne"
      />
      <TextField
        label="Lien de prise de rendez-vous"
        value={lienRdv}
        onChange={setLienRdv}
        placeholder="calendly.com/atlamazstudio/30min"
      />
      <TextAreaField
        label="Signature email"
        value={signature}
        onChange={setSignature}
        placeholder={"Serhat — Atlamaz Studio\n📅 calendly.com/atlamazstudio/30min"}
        rows={3}
      />

      <div>
        <Button variant="primary" onClick={handleSave} disabled={upsert.isPending}>
          {saved ? <Check size={14} /> : <Save size={14} />}
          {upsert.isPending ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
