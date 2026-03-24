"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  createManagedRunAction,
  type ManagedRunActionResult,
} from "@/actions/data";
import { isDiscordSnowflake } from "@/lib/discord-rest";
import { DiscordInviteCta } from "@/components/discord-invite-cta";
import { SectionCard } from "@/components/ui/section-card";

type Guild = {
  id: string;
  discordGuildId: string;
  battleChannelId: string | null;
};
type Template = { id: string; name: string; guildId: string };
type ChannelOpt = { id: string; name: string };

export function LaunchClient({
  guilds,
  templates,
  channelsByGuildId,
  discordConfigured,
  discordInviteUrl,
  discordInstallRedirectUri,
  devManualChannelEntry = false,
}: {
  guilds: Guild[];
  templates: Template[];
  channelsByGuildId: Record<string, ChannelOpt[]>;
  discordConfigured: boolean;
  discordInviteUrl: string | null;
  discordInstallRedirectUri: string | null;
  devManualChannelEntry?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [guildId, setGuildId] = useState(guilds[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState("");
  const [channelNameSnapshot, setChannelNameSnapshot] = useState("");

  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.guildId === guildId),
    [templates, guildId],
  );

  const channels = channelsByGuildId[guildId] ?? [];

  const pickDefaultChannel = useCallback(
    (gId: string) => {
      const g = guilds.find((x) => x.id === gId);
      const chs = channelsByGuildId[gId] ?? [];
      const pref =
        g?.battleChannelId &&
        chs.some((c) => c.id === g.battleChannelId)
          ? g.battleChannelId
          : chs[0]?.id ?? "";
      const name =
        chs.find((c) => c.id === pref)?.name ??
        (pref ? "(nom inconnu)" : "");
      setChannelId(pref);
      setChannelNameSnapshot(name);
    },
    [guilds, channelsByGuildId],
  );

  useEffect(() => {
    pickDefaultChannel(guildId);
  }, [guildId, pickDefaultChannel]);

  if (guilds.length === 0) {
    return (
      <div className="dashboard-main">
        <h1>Lancer un événement</h1>
        <p className="muted">
          Aucune guilde en base — ajoutez d’abord le bot sur votre serveur Discord.
        </p>
        <SectionCard title="Inviter le bot">
          <DiscordInviteCta
            inviteUrl={discordInviteUrl}
            installRedirectUri={discordInstallRedirectUri}
          />
        </SectionCard>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("channelId", channelId);
    fd.set("channelNameSnapshot", channelNameSnapshot);

    startTransition(async () => {
      const r: ManagedRunActionResult = await createManagedRunAction(fd);
      if (r.ok) {
        const msg =
          "Run enregistré. Le bot l’exécute à l’heure choisie (ou immédiatement si « tout de suite »).";
        router.push(
          `/dashboard/runs?toast=launched&toastMsg=${encodeURIComponent(msg)}`,
        );
        router.refresh();
        return;
      }
      setError(r.error);
    });
  }

  function onChannelChange(id: string) {
    setChannelId(id);
    const ch = channels.find((c) => c.id === id);
    setChannelNameSnapshot(ch?.name ?? "");
  }

  const listPickOk =
    discordConfigured &&
    channels.length > 0 &&
    Boolean(channelId) &&
    channels.some((c) => c.id === channelId);
  const manualDevOk =
    devManualChannelEntry &&
    isDiscordSnowflake(channelId) &&
    channelNameSnapshot.trim().length >= 1 &&
    (!discordConfigured || channels.length === 0);
  const channelChoiceInvalid = !listPickOk && !manualDevOk;

  const step1Ok = Boolean(guildId);
  const step2Ok = filteredTemplates.length > 0;
  const step3Ok = !channelChoiceInvalid;

  return (
    <main>
      <h1>Lancer un événement</h1>
      <p className="muted launch-lead">
        Trois choix : <strong>guilde</strong>, <strong>modèle</strong>,{" "}
        <strong>salon Discord</strong>. Puis l’heure ou « tout de suite ». Le bot
        fait le reste sur Discord.
      </p>

      <ol className="launch-steps" aria-label="Étapes">
        <li className={step1Ok ? "launch-steps__item--done" : ""}>
          <span className="launch-steps__n">1</span>
          Guilde
        </li>
        <li className={step2Ok ? "launch-steps__item--done" : ""}>
          <span className="launch-steps__n">2</span>
          Modèle
        </li>
        <li className={step3Ok ? "launch-steps__item--done" : ""}>
          <span className="launch-steps__n">3</span>
          Salon & horaire
        </li>
      </ol>

      {!discordConfigured ? (
        <p className="err">
          {process.env.NODE_ENV === "development" ? (
            <>
              <code>DISCORD_BOT_TOKEN</code> requis dans{" "}
              <code>apps/web/.env</code> ou <code>.env.local</code> pour lister
              les salons.
            </>
          ) : (
            <>
              Variable <code>DISCORD_BOT_TOKEN</code> requise (même valeur que le
              token du bot) pour lister les salons.
            </>
          )}
        </p>
      ) : null}

      {discordConfigured &&
      channels.length === 0 &&
      !devManualChannelEntry ? (
        <p className="err">
          Aucun salon texte listé pour ce serveur — vérifie l’invitation du bot.
        </p>
      ) : null}

      <form key={guildId} onSubmit={onSubmit} className="card stack launch-form">
        <input type="hidden" name="guildSettingsId" value={guildId} />
        <input type="hidden" name="channelNameSnapshot" value={channelNameSnapshot} />

        {error ? <p className="err">{error}</p> : null}

        <div className="launch-field">
          <label htmlFor="guildSelect">
            <span className="launch-field__step">1</span> Guilde Discord
          </label>
          <select
            id="guildSelect"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
          >
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.discordGuildId}
              </option>
            ))}
          </select>
        </div>

        <div className="launch-field">
          <label htmlFor="templateId">
            <span className="launch-field__step">2</span> Modèle (timeline)
          </label>
          <select id="templateId" name="templateId" required>
            {filteredTemplates.length === 0 ? (
              <option value="">Aucun modèle pour cette guilde</option>
            ) : (
              filteredTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="launch-field">
          <label htmlFor="channelSelect">
            <span className="launch-field__step">3</span> Salon où poster les embeds
          </label>
          {devManualChannelEntry &&
          (!discordConfigured || channels.length === 0) ? (
            <>
              <p className="muted launch-hint" style={{ marginBottom: "0.5rem" }}>
                <strong>Mode dev</strong> : saisie manuelle si la liste Discord est
                vide — ID du salon (snowflake) + nom affiché.
              </p>
              <input
                id="channelSelect"
                className="dev-guild-shortcut__input"
                style={{ width: "100%", marginBottom: "0.5rem" }}
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="ID salon Discord"
                autoComplete="off"
                inputMode="numeric"
              />
              <input
                className="dev-guild-shortcut__input"
                style={{ width: "100%" }}
                value={channelNameSnapshot}
                onChange={(e) => setChannelNameSnapshot(e.target.value)}
                placeholder="Nom (ex. annonces)"
                autoComplete="off"
              />
            </>
          ) : (
            <>
              <select
                id="channelSelect"
                name="channelId"
                value={channelId}
                onChange={(e) => onChannelChange(e.target.value)}
                required
                disabled={!discordConfigured || channels.length === 0}
              >
                {channels.length === 0 ? (
                  <option value="">—</option>
                ) : (
                  channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))
                )}
              </select>
              <p className="muted launch-hint">
                Prérempli avec le salon de bataille par défaut de la guilde lorsqu’il
                est valide.
              </p>
            </>
          )}
        </div>

        <div className="launch-field">
          <label htmlFor="scheduledAt">Démarrage</label>
          <input id="scheduledAt" name="scheduledAt" type="datetime-local" />
          <label className="launch-now-row">
            <input type="checkbox" name="launchNow" />{" "}
            <strong>Lancer tout de suite</strong> (ignore la date ci-dessus)
          </label>
        </div>

        <button
          type="submit"
          className="primary launch-submit"
          disabled={
            pending ||
            filteredTemplates.length === 0 ||
            channelChoiceInvalid
          }
        >
          {pending ? "Enregistrement…" : "Confirmer le run"}
        </button>
      </form>
    </main>
  );
}
