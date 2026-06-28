function enveloppe(titre: string, corps: string, lien: string, libelleBouton: string): string {
  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h1 style="font-size: 18px; color: #111827; margin-bottom: 16px;">${titre}</h1>
      <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">${corps}</p>
      <a href="${lien}" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px;">${libelleBouton}</a>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
        <span style="word-break: break-all;">${lien}</span>
      </p>
    </div>
  `;
}

export function emailConfirmationInscription(lien: string) {
  return {
    subject: "Confirmez votre inscription à Scrapman",
    html: enveloppe(
      "Bienvenue sur Scrapman",
      "Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et accéder à votre espace.",
      lien,
      "Confirmer mon inscription"
    ),
  };
}

export function emailReinitialisationMotDePasse(lien: string) {
  return {
    subject: "Réinitialisation de votre mot de passe Scrapman",
    html: enveloppe(
      "Réinitialisation du mot de passe",
      "Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
      lien,
      "Choisir un nouveau mot de passe"
    ),
  };
}

export function emailInvitationEquipe(lien: string, nomEquipe: string) {
  return {
    subject: `Invitation à rejoindre l'équipe ${nomEquipe} sur Scrapman`,
    html: enveloppe(
      "Invitation à rejoindre une équipe",
      `Vous avez été invité(e) à rejoindre l'équipe <strong>${nomEquipe}</strong> sur Scrapman. Cliquez ci-dessous pour accepter l'invitation.`,
      lien,
      "Accepter l'invitation"
    ),
  };
}
