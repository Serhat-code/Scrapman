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
    // Objet court et factuel : pas de "Bienvenue", "Gratuit" ni ponctuation excessive
    subject: "Confirmez votre compte Scrapman",
    html: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Confirmez votre compte Scrapman</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" role="presentation"
               style="background-color:#ffffff;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden;">
          <tr>
            <td style="background-color:#059669;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Scrapman</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a7f3d0;">Prospection B2B locale</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 28px;">
              <p style="margin:0 0 12px;font-size:15px;color:#111827;line-height:1.6;">Bonjour,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
                Merci d'avoir créé votre compte. Cliquez sur le bouton ci-dessous
                pour confirmer votre adresse email — vous accéderez ensuite à votre espace Scrapman.
              </p>
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background-color:#059669;border-radius:6px;">
                    <a href="${lien}"
                       style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.1px;">
                      Confirmer mon compte
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.6;">
                Si le bouton ne fonctionne pas, copiez cette URL dans votre navigateur :<br>
                <span style="word-break:break-all;color:#059669;">${lien}</span>
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
                Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5;">
                Scrapman · Atlamaz Studio · Saint-Étienne, France<br>
                <a href="https://scrapman-nine.vercel.app" style="color:#059669;text-decoration:none;">scrapman-nine.vercel.app</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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
