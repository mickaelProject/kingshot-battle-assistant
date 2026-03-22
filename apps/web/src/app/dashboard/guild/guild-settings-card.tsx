"use client";

import { useActionState } from "react";
import { updateGuildAction, type GuildSettingsFormState } from "@/actions/data";

type ChannelOpt = { id: string; name: string };
type TemplateOpt = { id: string; name: string };

const initial: GuildSettingsFormState = {};

export function GuildSettingsCard({
  guildId,
  discordGuildId,
  channels,
  battleChannelId,
  templates,
  defaultTemplateId,
  discordConfigured,
}: {
  guildId: string;
  discordGuildId: string;
  channels: ChannelOpt[];
  battleChannelId: string | null;
  templates: TemplateOpt[];
  defaultTemplateId: string | null;
  discordConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    updateGuildAction,
    initial,
  );

  const orphanBattle =
    battleChannelId &&
    !channels.some((c) => c.id === battleChannelId) ? (
      <option value={battleChannelId}>
        Salon enregistré (hors liste) — {battleChannelId}
      </option>
    ) : null;

  return (
    <div className="card">
      <h2>
        Serveur Discord <code>{discordGuildId}</code>
      </h2>
      {!discordConfigured ? (
        <p className="err">
          Ajoute <code>DISCORD_BOT_TOKEN</code> dans <code>apps/web/.env</code>{" "}
          (même token que le bot) pour lister les salons texte.
        </p>
      ) : channels.length === 0 ? (
        <p className="err">
          Aucun salon texte listé : vérifie que le bot est dans ce serveur et que
          le token est valide.
        </p>
      ) : null}

      <form action={formAction} className="stack">
        <input type="hidden" name="id" value={guildId} />
        {state.error ? <p className="err">{state.error}</p> : null}
        {state.success ? <p className="ok-banner">{state.success}</p> : null}

        <div>
          <label htmlFor={`battle-ch-${guildId}`}>
            Salon de bataille par défaut (texte / annonces)
          </label>
          {!discordConfigured ? (
            <>
              <input
                type="hidden"
                name="battleChannelId"
                value={battleChannelId ?? ""}
              />
              <p className="muted">
                Valeur actuelle conservée tant que le token Discord n’est pas
                configuré. Ajoute <code>DISCORD_BOT_TOKEN</code> pour modifier le
                salon depuis cette liste.
              </p>
            </>
          ) : (
            <select
              id={`battle-ch-${guildId}`}
              name="battleChannelId"
              defaultValue={battleChannelId ?? ""}
            >
              <option value="">— aucun —</option>
              {orphanBattle}
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          )}
          <p className="muted">
            Utilisé par <code>/battle start</code> sans autre salon. Les runs
            planifiés peuvent cibler un autre salon au lancement.
          </p>
        </div>

        <div>
          <label htmlFor={`def-tpl-${guildId}`}>Modèle par défaut</label>
          <select
            id={`def-tpl-${guildId}`}
            name="defaultTemplateId"
            defaultValue={defaultTemplateId ?? ""}
          >
            <option value="">— aucun —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
