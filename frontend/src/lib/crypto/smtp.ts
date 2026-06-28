import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import type { SmtpPasswordEnc } from "@/types/database";

function getKey(): Buffer {
  const hex = process.env.SMTP_ENCRYPTION_KEY;
  if (!hex) throw new Error("SMTP_ENCRYPTION_KEY n'est pas configurée");

  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("SMTP_ENCRYPTION_KEY doit faire 32 octets (64 caractères hexadécimaux)");
  }
  return key;
}

// AES-256-GCM avec IV unique à chaque appel (12 octets, recommandé pour GCM).
export function encryptSmtpPassword(plain: string): SmtpPasswordEnc {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("hex"),
    ciphertext: ciphertext.toString("hex"),
    tag: tag.toString("hex"),
  };
}

// Déchiffre un mot de passe SMTP (utilisé uniquement côté serveur, pour le
// bouton "Tester SMTP" — jamais exposé au client).
//
// `enc` peut arriver encodé en JSON (string) plutôt que déjà parsé : selon la
// version de PostgREST / le chemin de lecture, une colonne jsonb peut revenir
// sous l'une ou l'autre forme. On normalise donc avant de l'utiliser.
export function decryptSmtpPassword(encInput: SmtpPasswordEnc | string): string {
  const enc: SmtpPasswordEnc = typeof encInput === "string" ? JSON.parse(encInput) : encInput;

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(enc.iv, "hex"));
  decipher.setAuthTag(Buffer.from(enc.tag, "hex"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(enc.ciphertext, "hex")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
