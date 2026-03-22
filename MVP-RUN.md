# Kingshot battle assistant — MVP runbook

## Requirements

- Node.js **20+**
- PostgreSQL **14+**
- Discord bot + token ([Developer Portal](https://discord.com/developers/applications))

## Setup (minimal)

```powershell
cd c:\Users\mpech\Documents\kingshot-battle-assistant
npm install
```

Create `apps\bot\.env` from `apps\bot\.env.example`:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Postgres URL |
| `DISCORD_TOKEN` | Yes | Bot token |
| `DISCORD_CLIENT_ID` | Yes | Application ID |
| `DISCORD_DEV_GUILD_ID` | Strongly recommended | Instant guild slash commands |
| `SEED_DISCORD_GUILD_ID` | For seed only | Your server snowflake (same as above is fine) |

Apply schema (first time: name the migration `init` when prompted; later pulls may add more migrations such as structured battle phases):

```powershell
npm run db:migrate -w @kingshot/bot
```

Optional **Swordland** default template (7 structured phases):

```powershell
npm run db:seed -w @kingshot/bot
```

Register slash commands (required after schema or command changes):

```powershell
npm run commands:register -w @kingshot/bot
```

`battle` subcommands include **`stop`**, **`pause`**, **`resume`**, **`next-event`** (queue next pending phase now), **`phase-now`** (post a pending phase by template `phase_key`), plus **`start`** / **`status`**. After DB changes (e.g. `BattleSession.isPaused`, `ManagedEventRunLog`), run **`npm run db:migrate -w @kingshot/bot`** then **`npm run db:generate -w @kingshot/bot`**.

Invite the bot (OAuth2 URL Generator): scopes `bot` + `applications.commands`, permission **Administrator** (matches MVP slash defaults).

Run:

```powershell
npm run bot:dev
```

Expect: `[kingshot:bot] ready user=YourBot#1234` then `[kingshot:reminder] hydrate done pending=N`.

## Web admin (templates, guild, launch, runs)

The **Next.js** app in `apps/web` uses the **same** Postgres database as the bot (`DATABASE_URL`). **`npm run db:generate -w @kingshot/bot`** only refreshes the Prisma *client* (TypeScript); it does **not** create tables. Apply migrations so the schema exists: **`npm run db:migrate -w @kingshot/bot`** (or `prisma migrate deploy` in production). Use the same `DATABASE_URL` in `apps/web/.env` as in `apps/bot/.env`.

Copy `apps/web/.env.example` to `apps/web/.env` and set:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Same URL as `apps/bot/.env` |
| `ADMIN_PANEL_SECRET` | Yes | Shared secret; sets an HTTP-only cookie to unlock the dashboard |
| `DISCORD_BOT_TOKEN` | Strongly recommended | Same token as the bot; lets the admin **list text channels** (`#name`) for Guild + Launch and **validate** channel IDs before save |

```powershell
npm run web:dev
```

Open [http://localhost:3000](http://localhost:3000), sign in with the secret, then use **Templates** (list / view / edit phases), **Guild** (default battle channel picker + default template), **Launch** (channel dropdown, prefilled from guild default when valid), and **Runs** (scheduled / in progress with **STARTING** → **ACTIVE** / history). The bot polls **SCHEDULED** runs about every **15s**, verifies the Discord channel, then starts battles without `/battle start`.

After pulling schema changes (e.g. `ManagedEventStatus.STARTING`, `channelNameSnapshot`), run **`npm run db:migrate -w @kingshot/bot`** then **`npm run db:generate -w @kingshot/bot`**. If Postgres errors on `ALTER TYPE ... ADD VALUE` inside a transaction, apply that statement manually once (depends on PG version), then mark the migration resolved.

## Tests

```powershell
npm run test -w @kingshot/bot
```

## Scheduler after restart

1. Only `BattleReminder` rows in **`PENDING`** are loaded and armed with timers. **`SENT`** and **`SKIPPED`** are ignored.
2. Rows stuck in **`PROCESSING`** (crash during send) for an **ACTIVE** session are reset to **`PENDING`** on startup, then re-armed — **one retry**. *Rare case:* if Discord already received the message but the DB never reached `SENT`, the same line could appear twice (documented tradeoff for MVP).
3. **Overdue** `PENDING` rows (scheduled time in the past) run **immediately** on hydrate (`setTimeout(..., 0)`), so nothing is silently dropped.

## Real scenario (smoke)

1. In your server: `/setup channel` → pick `#battle-feed`.
2. `/template list` → confirm `swordland` (after seed) or create events with `/template event_add`.
3. `/battle start` (or `/battle start template:swordland`) → ephemeral **START** embed + N phases scheduled; battle channel shows **tactical embeds** at each T+.
4. `/battle status` → next relative timestamp + text.
5. `/assign slot:Rally lead player:@Friend` → line in battle channel (only while battle is active).
6. `/announce message:Fall back to south` → `📣` in battle channel (max length enforced before defer).
7. `/battle stop` → pending + in-flight reminders become **`SKIPPED`** in DB; no further timers for that session.

## Short checklist

- [ ] One `/battle start` at a time per server (DB partial unique + clear errors if race).
- [ ] Restart bot during ACTIVE battle → pending pings still fire.
- [ ] Cannot delete default template until another `/template default`.
- [ ] `/assign` rejected without active battle.
