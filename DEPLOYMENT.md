# Déploiement production — Kingshot Battle Assistant

Ce guide décrit comment faire tourner ensemble **PostgreSQL**, le **bot Discord** (Node) et l’**admin web** (Next.js), sans modifier la logique métier.

## Architecture cible

| Composant | Rôle | Exemple d’hébergement |
|-----------|------|------------------------|
| PostgreSQL | Données Prisma (partagées) | Railway, Supabase, Neon |
| Bot | Discord + API HTTP run-control + tâches planifiées | Railway, Render |
| Web | Next.js (admin) | Vercel |

---

## 1. Variables d’environnement

### Bot (`apps/bot`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | Oui | URL PostgreSQL (même base que le web). |
| `DISCORD_TOKEN` | Oui | Token du bot Discord. |
| `DISCORD_CLIENT_ID` | Oui | ID d’application Discord. |
| `BOT_CONTROL_SECRET` | Fortement recommandé | Secret partagé avec le web ; requis pour activer l’API de contrôle des runs. |
| `BOT_CONTROL_PORT` | Optionnel en prod | Port d’écoute explicite (ex. `3847` en local). |
| `PORT` | Souvent injecté | Sur Railway/Render, la plateforme définit `PORT` : le bot l’utilise si `BOT_CONTROL_PORT` est vide. |
| `BOT_CONTROL_HOST` | Optionnel | `0.0.0.0` pour écouter sur toutes les interfaces (défaut en **production**). |
| `DISCORD_DEV_GUILD_ID` | Optionnel | Limite l’enregistrement des slash commands à une guilde (dev). |

Modèles : `apps/bot/.env.example`.

### Web (`apps/web` / Vercel)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `DATABASE_URL` | Oui | Même base que le bot. |
| `ADMIN_PANEL_SECRET` | Oui en prod | « Mot de passe » de la page `/login`. |
| `DISCORD_BOT_TOKEN` | Recommandé | Même token que le bot ; sert à lister les salons via l’API Discord. |
| `BOT_CONTROL_URL` | Pour contrôler les runs | URL **publique** du bot, sans `/` final (ex. `https://xxx.up.railway.app`). |
| `BOT_CONTROL_SECRET` | Idem | **Identique** à `BOT_CONTROL_SECRET` du bot. |

Modèles : `apps/web/.env.example`.

**Sécurité**

- Ne jamais préfixer les secrets avec `NEXT_PUBLIC_`.
- Utiliser un `BOT_CONTROL_SECRET` long et aléatoire (générateur de mots de passe / `openssl rand -hex 32`).

---

## 2. Base de données (production)

1. Créer une base PostgreSQL managée.
2. Copier l’URL de connexion dans `DATABASE_URL` (bot + web).
3. Appliquer le schéma Prisma **une fois** avant ou au premier déploiement du bot :

```bash
# À la racine du dépôt
npm run db:migrate:deploy
```

En développement local, continuer à utiliser :

```bash
npm run db:migrate
```

### Seed (optionnel)

```bash
npm run db:seed
```

Configurer `SEED_DISCORD_GUILD_ID` dans `apps/bot/.env` si besoin (voir `apps/bot/.env.example`).

### Vercel + Prisma

- Utiliser une URL compatible **connexions serverless** si votre fournisseur le propose (pooler, mode transaction, `connection_limit`, etc.).
- Après chaque changement de schéma : redéployer après `migrate deploy`.

---

## 3. Déploiement du bot (ex. Railway)

1. **Root directory** : racine du monorepo (ou `apps/bot` si le repo n’est que le bot).
2. **Build** (exemple) :
   - `npm ci`
   - `npm run build -w @kingshot/bot`
3. **Release / pre-deploy** (recommandé) :
   - `npx prisma migrate deploy --schema=apps/bot/prisma/schema.prisma`  
   ou depuis la racine : `npm run db:migrate:deploy`
4. **Start** :
   - `npm run start -w @kingshot/bot`  
   (exécute `node dist/index.js` après build)

5. Variables : voir section bot ci-dessus. Sur Railway, **`PORT`** est généralement défini automatiquement : laisser `BOT_CONTROL_PORT` vide pour réutiliser `PORT`.

6. **Santé** : le bot expose `GET /health` (JSON `{ "ok": true, "service": "kingshot-bot" }`) sur le même port que l’API run-control. Configurez un healthcheck HTTP sur `/health`.

7. **Logs** : au démarrage vous devriez voir notamment :
   - `[kingshot:bot] Prisma connecté à PostgreSQL.`
   - `[kingshot:bot] Discord prêt`
   - `[kingshot:control] API prête (run-control + GET /health)`

8. Enregistrer les commandes slash (une fois ou après changement de commandes) :

```bash
cd apps/bot && npm run commands:register
```

(utilise `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, et éventuellement `DISCORD_DEV_GUILD_ID`).

---

## 4. Déploiement du web (Vercel)

1. Importer le projet Git ; **Root Directory** : `apps/web` (ou adapter les commandes).
2. **Build** :
   - `npm run build` (le `postinstall` génère le client Prisma via le schéma du bot).
3. **Install** : à la racine du monorepo, Vercel peut nécessiter d’installer depuis la racine avec workspaces ; sinon utiliser un repo dédié au web avec copie du schéma Prisma (non décrit ici — le setup actuel suppose monorepo).

   Si le build Vercel part de la **racine** :

   - Install command : `npm ci`
   - Build command : `npm run build -w @kingshot/web`

4. Définir toutes les variables d’environnement (Production + Preview si besoin).

5. `BOT_CONTROL_URL` doit pointer vers l’URL **HTTPS** publique du bot (pas `localhost`).

---

## 5. Chaînage des services

```
Navigateur → Vercel (Next.js) → PostgreSQL
                ↓ HTTPS + Bearer BOT_CONTROL_SECRET
         Bot (Railway) → PostgreSQL + Discord API
```

- Le **navigateur** ne voit pas `BOT_CONTROL_SECRET` : les actions passent par des **Server Actions** / routes serveur Next.js.
- Le bot et le web partagent la **même** `DATABASE_URL` et le **même** `BOT_CONTROL_SECRET`.

---

## 6. Vérifications rapides

| Test | Attendu |
|------|---------|
| `GET https://<bot>/health` | `200`, JSON `ok: true` |
| Connexion `/login` avec `ADMIN_PANEL_SECRET` | Accès dashboard |
| Page Événements / Modèles | Pas d’erreur Prisma |
| Run actif + boutons pause/reprise | Bot joignable (`BOT_CONTROL_URL` + secret) |

---

## 7. Dépannage

- **Prisma P2022 / colonne manquante** : lancer `npm run db:migrate:deploy` sur la base de prod.
- **401 sur run-control** : `BOT_CONTROL_SECRET` différent entre web et bot, ou URL incorrecte.
- **Connexion DB depuis Vercel** : vérifier firewall / IP autorisées / URL pooler.
- **Bot hors ligne** : vérifier `DISCORD_TOKEN`, logs Railway, et que le process n’exit pas au boot (variables manquantes).

---

## 8. Commandes utiles (référence)

| Commande | Usage |
|----------|--------|
| `npm run db:migrate` | Migrations interactives (dev) |
| `npm run db:migrate:deploy` | Migrations prod / CI |
| `npm run db:generate` | Régénérer le client Prisma |
| `npm run build -w @kingshot/bot` | Compiler le bot |
| `npm run start -w @kingshot/bot` | Démarrer le bot compilé |
| `npm run build -w @kingshot/web` | Build Next.js |
