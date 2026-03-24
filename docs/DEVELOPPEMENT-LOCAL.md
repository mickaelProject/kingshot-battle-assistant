# Développement local (PostgreSQL)

Pour tester l’admin et les modèles **sans Railway**, utilise une base PostgreSQL sur ta machine et des fichiers **`.env.local`** (non commités) qui **écrasent** les URLs cloud.

## 1. Démarrer PostgreSQL

### Option A — Docker (recommandé)

À la racine du dépôt :

```bash
npm run db:up
```

Connexion (port **5433** sur ta machine → conteneur en 5432 ; évite un Postgres Windows déjà sur 5432) :

```text
postgresql://postgres:postgres@localhost:5433/kingshot?schema=public
```

Arrêt :

```bash
npm run db:down
```

### Option B — PostgreSQL installé sur Windows

Crée une base `kingshot` et un utilisateur, puis adapte l’URL ci-dessous.

## 2. Fichiers d’environnement

À la racine du dépôt, tu peux créer d’un coup les deux fichiers à partir des exemples (sans écraser l’existant) :

```bash
npm run setup:local
```

Puis édite-les pour coller ton **token Discord**, **CLIENT_ID**, etc.

### Web (`apps/web`)

1. Copie le modèle : `apps/web/env.local.example` → `apps/web/.env.local` (ou utilise `npm run setup:local`).
2. Vérifie que `DATABASE_URL` pointe vers ton Postgres local (l’exemple Docker est déjà bon).

Le code charge **`apps/web/.env`** puis **`apps/web/.env.local` avec priorité** : tu peux laisser Railway dans `.env` et ne toucher qu’à `.env.local` en local.

### Bot (`apps/bot`)

1. Copie le modèle : `apps/bot/env.local.example` → `apps/bot/.env.local` (ou `npm run setup:local`).
2. Même `DATABASE_URL` que pour le web.

Le bot charge `.env` puis `.env.local` (override).

## 3. Migrations Prisma

**Obligatoire :** le fichier `apps/bot/.env.local` doit exister (copie de `env.local.example`), sinon Prisma n’utilise que `apps/bot/.env` et tu restes sur Railway → erreur **P1001**.

La commande `db:migrate:local` exécute `scripts/prisma-with-local-env.mjs` : même logique que le bot (`.env` puis `.env.local` avec priorité).

```bash
npm run db:migrate:local
```

Si tu vois encore `caboose.proxy.rlwy.net` dans la sortie Prisma, c’est que **`.env.local` est absent ou sans `DATABASE_URL`**.

Alternative : mettre l’URL locale directement dans `apps/bot/.env` (non commité).

### Erreur **P1000** (authentification refusée sur `localhost`)

Tu atteins bien Postgres en local, mais **user / mot de passe / instance** ne correspondent pas.

1. **Tu utilises Docker du repo** (`npm run db:up`)  
   - Mets **`localhost:5433`** dans `DATABASE_URL` (voir `env.local.example`).  
   - Si ton fichier `.env.local` parlait encore de **5432**, tu te connectais peut‑être au **PostgreSQL Windows** (autre mot de passe) → P1000.

2. **Tu n’utilises pas Docker**  
   - Remplace `DATABASE_URL` par ton vrai utilisateur Postgres Windows et le bon port (souvent 5432).  
   - Ex. si ton superuser est `postgres` avec un mot de passe défini à l’installation :  
     `postgresql://postgres:TON_MOT_DE_PASSE@localhost:5432/kingshot?schema=public`  
   - La base `kingshot` doit exister (`CREATE DATABASE kingshot;`).

3. **Vérifier le conteneur** : `docker ps` doit montrer `kingshot-postgres-local` et le mapping `0.0.0.0:5433->5432/tcp`.

## 4. Lancer le site

```bash
npm run web:dev
```

Ouvre `/dashboard/templates` : les modèles se chargent si la DB locale est joignable et migrée.

## 5. Railway / prod

Remets une URL cloud valide dans `.env` ou enlève `.env.local` sur l’environnement de prod. Ne commite **jamais** `.env.local` avec des secrets.

## 6. Discord + bot en local (inviter le bot et tester toute l’appli)

Tu utilises **la même application Discord** pour le bot et pour le lien « Inviter le bot » dans l’admin. En local, le web et le bot doivent partager la **même `DATABASE_URL`** et le bot doit **tourner** pendant que tu testes.

### 6.1 Portail Discord (une fois)

1. Ouvre [Applications Discord](https://discord.com/developers/applications) → **New Application**.
2. **OAuth2 → General**  
   - Sous **Redirects**, ajoute **exactement** :  
     `http://localhost:3000/dashboard/server`  
   - (C’est la page où Discord renvoie après autorisation ; sans cette ligne, l’invite peut échouer ou ne pas revenir sur ton admin.)
3. **Bot** → **Add Bot** → **Reset Token** → garde-le pour `DISCORD_TOKEN` (bot uniquement, secret).
4. **OAuth2 → URL Generator** (optionnel pour vérifier) : coche `bot` + `applications.commands`, copie l’URL si besoin — l’admin construit la même chose si `DISCORD_CLIENT_ID` est défini.

### 6.2 Fichiers `.env.local`

- **Web** : à partir de `apps/web/env.local.example` → `apps/web/.env.local`  
  - `DATABASE_URL` identique au bot.  
  - `NEXT_PUBLIC_APP_URL="http://localhost:3000"` (pour la redirection après invite).  
  - `DISCORD_CLIENT_ID` = **Application ID** (page *General Information*).  
  - `DISCORD_BOT_TOKEN` = **le même token** que `DISCORD_TOKEN` du bot (pour lister les salons dans l’admin).  
  - `BOT_CONTROL_URL="http://127.0.0.1:3847"` et `BOT_CONTROL_SECRET` = **même secret** que sur le bot (contrôle pause/reprise depuis le dashboard).

- **Bot** : à partir de `apps/bot/env.local.example` → `apps/bot/.env.local`  
  - Même `DATABASE_URL`.  
  - `DISCORD_TOKEN` + `DISCORD_CLIENT_ID`.  
  - Même `BOT_CONTROL_SECRET` que le web.  
  - Après avoir invité le bot sur ton serveur de test : récupère l’**ID du serveur** (mode développeur Discord) et mets-le dans `DISCORD_DEV_GUILD_ID` pour enregistrer les slash **sans attendre** la propagation globale.

### 6.3 Commandes (ordre conseillé)

```bash
npm run db:up
npm install
npm run db:migrate:local
npm run commands:register -w @kingshot/bot
```

Puis lance **web + bot** dans le même terminal :

```bash
npm run dev:stack
```

(Ou deux terminaux : `npm run web:dev` et `npm run bot:dev`.)

### 6.4 Inviter le bot et finaliser

1. Ouvre `http://localhost:3000` → connecte-toi à l’admin (`ADMIN_PANEL_SECRET` dans ton `.env` / `.env.local`).
2. Va dans **Réglages serveur** → **Inviter le bot** → choisis ton serveur de test sur Discord.
3. Le bot étant connecté avec la **même base locale**, la guilde est enregistrée au démarrage ou à l’événement `GuildCreate` — **actualise** la page serveur.
4. En admin Discord sur le serveur, exécute une fois `/setup channel` (ou équivalent) si besoin, puis configure le salon tactique dans l’admin.

Sans bot lancé en local ou sans la même `DATABASE_URL`, l’invite Discord fonctionne mais **aucune ligne n’apparaît** dans l’admin : les données restent dans une autre base ou ne sont jamais écrites.

### 6.5 Raccourci sans attendre le bot (`next dev` uniquement)

Sur les pages **Modèles** et **Serveur**, en mode `npm run web:dev`, un encadré **« Raccourci local »** permet d’insérer une ligne `GuildSettings` à partir de l’**ID du serveur Discord** (mode développeur → clic droit sur le serveur → copier l’identifiant). Tu peux aussi définir `DEV_DISCORD_GUILD_ID` dans `apps/web/.env.local` pour préremplir le champ. **Cet encadré n’existe pas** sur un build de production (`next build`).

### 6.6 Événements / exécutions sans liste de salons Discord

Si l’API Discord ne renvoie aucun salon (token, bot hors serveur, etc.), l’assistant **Événements** et la page **Lancer un événement** affichent en **`next dev`** un bloc **saisie manuelle** : ID du **salon** texte (clic droit sur le salon → copier l’identifiant du salon) + nom d’affichage. Le run est enregistré en base **sans vérification API** ; pour que le bot poste vraiment sur Discord, il faut un ID correct et le bot présent sur le serveur.
