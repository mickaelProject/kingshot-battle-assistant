# Kingshot Battle Assistant

Monorepo (`apps/web`, `apps/bot`).

## Développement local (PostgreSQL)

Voir **[docs/DEVELOPPEMENT-LOCAL.md](./docs/DEVELOPPEMENT-LOCAL.md)** : Docker Postgres, fichiers `.env.local`, migrations.

Résumé rapide :

```bash
npm run db:up
npm install
npm run setup:local
# Puis éditer apps/web/.env.local et apps/bot/.env.local (Discord, secrets)
npm run db:migrate:local
npm run web:dev
```

Pour **tester l’admin + Discord + bot** sur ta machine (invite du bot, salons, runs), suis la section **« Discord + bot en local »** dans [docs/DEVELOPPEMENT-LOCAL.md](./docs/DEVELOPPEMENT-LOCAL.md), puis :

```bash
npm run dev:stack
```

## Scripts utiles

| Commande | Rôle |
|----------|------|
| `npm run web:dev` | Next.js (admin) |
| `npm run bot:dev` | Bot Discord |
| `npm run dev:stack` | Web + bot en parallèle (local) |
| `npm run db:up` / `db:down` | Postgres Docker |
| `npm run setup:local` | Copie `env.local.example` → `.env.local` (web + bot) si absents |
| `npm run db:migrate:local` | Migrations avec `.env` + `.env.local` |
