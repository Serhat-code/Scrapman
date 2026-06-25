# Notice d'utilisation — Scrapman

Guide écran par écran. Pour l'installation, voir [README.md](README.md) ;
pour le déploiement en production, voir [DEPLOIEMENT.md](DEPLOIEMENT.md) ;
pour les aspects RGPD/légaux, voir [CONFORMITE.md](CONFORMITE.md).

## Vue d'ensemble du flux

```
1. Scraper (CLI Python)  →  2. Enrichir (CLI Python)  →  3. Qualifier (frontend /prospects)
        ↓
4. Créer une campagne (frontend /campaigns) → ajouter des prospects → générer les emails
        ↓
5. Configurer SMTP (/settings) + activer la campagne (Réglages de la campagne)
        ↓
6. Lancer le worker d'envoi (CLI Python, send_worker.py) — manuellement ou planifié
        ↓
7. Suivre les envois et réponses (/messages)
```

Le frontend ne lance **jamais** l'envoi d'un email lui-même. Toute la
collecte (scraping) et tout l'envoi réel (SMTP) passent par le CLI Python
(`scraper/`). Le frontend configure, affiche et planifie.

---

## 1. Connexion (`/login`)

Email + mot de passe. Il n'y a pas d'inscription publique : le compte se
crée depuis le tableau de bord Supabase (*Authentication → Add user*). Une
fois connecté, toutes les autres pages sont accessibles ; si vous n'êtes pas
connecté, vous êtes automatiquement redirigé vers `/login`.

**Déconnexion** : icône en bas de la barre latérale gauche.

---

## 2. Prospects (`/prospects`)

Liste de toutes les entreprises scrapées, avec :

- **Recherche texte** (nom, ville, activité) et **filtres** : bucket
  (A/B/C — priorité commerciale calculée par le scoring), statut
  (à contacter / contacté / qualifié / refusé), angle d'approche, halal
  (tous / halal uniquement / hors halal).
- **Panneau de détail** (clic sur un prospect) :
  - **Actions** : changer le statut (à_contacter → contacté → qualifié /
    refusé). C'est **vous** qui marquez un prospect "Qualifié" — rien ne le
    fait automatiquement.
  - **Relance programmée** : planifier manuellement une relance à une date
    donnée (indépendant du système de relances automatiques des campagnes).
  - **Historique des appels** : journal des appels passés (statut + notes).
  - **Email froid** : aperçu de l'email qui serait généré pour ce prospect
    (avec votre profil expéditeur configuré dans Réglages). Ce n'est qu'un
    aperçu — pour l'ajouter réellement à la file d'envoi, passez par une
    campagne (voir plus bas).
  - **Script d'appel** : script téléphonique généré (objections incluses),
    à utiliser pour vos appels — jamais envoyé automatiquement, c'est un
    support pour vous.

Le bouton **« Lancer un scraping »** en haut configure les paramètres d'un
scraping (NAF, villes ou France entière, halal, limite) mais **n'exécute
pas le scraping lui-même** — il vous donne la commande CLI à lancer côté
Python (le scraping réel, avec Playwright et les appels aux APIs publiques,
ne peut pas tourner dans le navigateur).

---

## 3. Campagnes (`/campaigns`)

### Liste et création

Le panneau de gauche liste vos campagnes. **« Nouvelle campagne »** ouvre un
formulaire avec des filtres de départ (bucket, NAF, villes, halal) — ces
filtres ne servent qu'à vous aider à sélectionner les prospects ensuite, ils
ne filtrent rien automatiquement après coup.

### Onglet Prospects

Liste des prospects actuellement dans la campagne. **« Ajouter des
prospects »** ouvre une modale : décochez « Filtres campagne » pour voir
*tous* vos prospects et choisir librement (utile pour viser uniquement vos
prospects qualifiés, par exemple).

### Onglet Messages

**« Générer les emails »** crée un email (objet + corps, basé sur votre
profil expéditeur) pour chaque prospect de la campagne qui a une adresse
email — les prospects sans email sont ignorés (affiché dans le compteur
au-dessus du bouton), et un email déjà généré pour un prospect n'est jamais
dupliqué. Les emails générés sont mis en file (`statut = en_file`) ; ils ne
sont **pas encore envoyés** à ce stade.

Chaque message affiche son statut, et pour ceux en file : **Marquer
envoyé** / **Marquer erreur**. Ces deux boutons sont surtout utiles pour du
suivi manuel — l'envoi réel automatique se fait par le worker (`send_worker.py`,
voir plus bas), qui met à jour les statuts lui-même.

### Onglet Scripts d'appel

Script téléphonique pour chaque prospect de la campagne, avec bouton copier.

### Onglet Réglages

- **État** : Activer / Mettre en pause. **Une campagne en pause n'envoie ni
  ne relance rien**, même si le worker tourne.
- **Relances automatiques** : activer/désactiver, délai avant relance
  (jours), nombre maximum de relances (0 à 5).
- **Plafond et fenêtre d'envoi** : limite quotidienne pour cette campagne
  (plafonnée à 200 emails/jour au total, tous comptes confondus — c'est une
  protection anti-spam non contournable), jours et heures d'envoi
  autorisés, délai minimum/maximum entre deux envois (jamais sous 30s).

---

## 4. Messages (`/messages`)

Vue globale de tous les messages, toutes campagnes confondues : statut,
planification, tentatives, dernière erreur, campagne, prospect.

**Filtres** : Tous / En file / Planifié / Envoyé / Ouvert / Répondu / Erreur.
« Planifié » correspond aux messages en file dont l'envoi est programmé
dans le futur (`scheduled_at`) ; « En file » montre ceux prêts à partir
immédiatement.

**Actions** (en ouvrant un message) :
- **Marquer répondu** : annule automatiquement toutes les relances prévues
  pour ce message.
- **Marquer erreur** / **Remettre en file** : pour intervenir manuellement
  sur un envoi.
- **Annuler les relances prévues** : visible si des relances sont
  planifiées pour ce message.

---

## 5. Réglages (`/settings`)

### Onglet Profil

Prénom, marque, métier, ville de référence, lien de prise de RDV,
signature personnalisée. **Ces champs sont réellement utilisés** : ils
remplacent les valeurs par défaut dans tous les emails et scripts générés
(objet de ce correctif : avant, ces champs étaient enregistrés mais
ignorés par la génération — désormais corrigé).

### Onglet SMTP

Configuration du compte d'envoi : adresse, hôte/port SMTP, sécurité TLS,
plafond quotidien, mot de passe (chiffré côté serveur avant stockage,
jamais ré-affiché). Le bouton **« Tester la connexion »** vérifie que les
identifiants fonctionnent (connexion + authentification) sans envoyer de
vrai email.

Pour Gmail : il faut un **mot de passe d'application** (pas votre mot de
passe Google habituel) — généré sur
[myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
après activation de la validation en deux étapes.

L'indicateur « SMTP configuré / non configuré » reflète l'état réel des
champs enregistrés.

### Onglet Quotas

Affichage en lecture seule du quota de prospects et du plafond d'envoi
quotidien du compte. Si aucun compte n'existe encore (rare, créé
automatiquement à l'inscription), le message l'indique clairement plutôt
que d'afficher des données fausses.

---

## 6. Le worker d'envoi (CLI Python)

C'est la seule chose qui envoie réellement des emails. Depuis `scraper/` :

```bash
python send_worker.py --dry-run --limit 5   # simulation, rien n'est envoyé
python send_worker.py --limit 20             # envoi réel
```

Il traite la file (premiers emails puis relances), respecte le quota, la
fenêtre d'envoi et le délai anti-spam, et met à jour les statuts visibles
dans `/messages`. Pour un envoi vraiment automatique (sans le lancer à la
main), il faut le planifier — voir [DEPLOIEMENT.md](DEPLOIEMENT.md).
