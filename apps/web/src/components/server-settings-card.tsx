"use client";

import { useActionState } from "react";
import { SectionCard } from "@/components/ui/section-card";
import { updateGuildAction, type GuildSettingsFormState } from "@/actions/data";

type ChannelOpt = { id: string; name: string };
type TemplateOpt = { id: string; name: string };

const initial: GuildSettingsFormState = {};

export function ServerSettingsCard({
  guildId,
  channels,
  battleChannelId,
  templates,
  defaultTemplateId,
  discordConfigured,
  serverLabel,
}: {
  guildId: string;
  channels: ChannelOpt[];
  battleChannelId: string | null;
  templates: TemplateOpt[];
  defaultTemplateId: string | null;
  discordConfigured: boolean;
  serverLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateGuildAction,
    initial,
  );

  const orphanBattle =
    battleChannelId &&
    !channels.some((c) => c.id === battleChannelId) ? (
      <option value={battleChannelId}>
        Ancien canal (hors liste)
      </option>
    ) : null;

  return (
    <SectionCard title={serverLabel}>
      {!discordConfigured ? (
        <p className="form-error">
          La connexion au bot n’est pas configurée : impossible de lister les salons
          depuis l’administration.
        </p>
      ) : null}
      {channels.length === 0 && discordConfigured ? (
        <p className="form-error">
          Aucun salon texte détecté — vérifiez que le bot est sur le serveur.
        </p>
      ) : null}

      <form action={formAction} className="form-stack">
        <input type="hidden" name="id" value={guildId} />
        {state.error ? <p className="form-error">{state.error}</p> : null}
        {state.success ? <p className="form-success">{state.success}</p> : null}

        <div className="form-field">
          <label htmlFor={`battle-ch-${guildId}`}>
            Canal des annonces tactiques
          </label>
          {!discordConfigured ? (
            <input
              type="hidden"
              name="battleChannelId"
              value={battleChannelId ?? ""}
            />
          ) : (
            <select
              id={`battle-ch-${guildId}`}
              name="battleChannelId"
              defaultValue={battleChannelId ?? ""}
            >
              <option value="">— Choisir un salon —</option>
              {orphanBattle}
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          )}
          <p className="field-hint">
            C’est là que le bot publie les messages de bataille. Choisis un
            salon texte dédié (ex. #tactique).
          </p>
        </div>

        <div className="form-field">
          <label htmlFor={`def-tpl-${guildId}`}>Modèle utilisé par défaut</label>
          <select
            id={`def-tpl-${guildId}`}
            name="defaultTemplateId"
            defaultValue={defaultTemplateId ?? ""}
          >
            <option value="">— Aucun —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <p className="field-hint">
            Utilisé quand une bataille démarre sans préciser de modèle.
          </p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </SectionCard>
  );
}
