"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("serverCard");
  const [state, formAction, pending] = useActionState(
    updateGuildAction,
    initial,
  );

  const orphanBattle =
    battleChannelId &&
    !channels.some((c) => c.id === battleChannelId) ? (
      <option value={battleChannelId}>{t("orphanChannel")}</option>
    ) : null;

  return (
    <SectionCard title={serverLabel}>
      {!discordConfigured ? (
        <p className="form-error">{t("botNotConfigured")}</p>
      ) : null}
      {channels.length === 0 && discordConfigured ? (
        <p className="form-error">{t("noTextChannels")}</p>
      ) : null}

      <form action={formAction} className="form-stack">
        <input type="hidden" name="id" value={guildId} />
        {state.error ? <p className="form-error">{state.error}</p> : null}
        {state.success ? <p className="form-success">{state.success}</p> : null}

        <div className="form-field">
          <label htmlFor={`battle-ch-${guildId}`}>
            {t("tacticalChannelLabel")}
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
              <option value="">{t("chooseChannel")}</option>
              {orphanBattle}
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          )}
          <p className="field-hint">{t("tacticalChannelHint")}</p>
        </div>

        <div className="form-field">
          <label htmlFor={`def-tpl-${guildId}`}>
            {t("defaultTemplateLabel")}
          </label>
          <select
            id={`def-tpl-${guildId}`}
            name="defaultTemplateId"
            defaultValue={defaultTemplateId ?? ""}
          >
            <option value="">{t("noTemplate")}</option>
            {templates.map((tmpl) => (
              <option key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </option>
            ))}
          </select>
          <p className="field-hint">{t("defaultTemplateHint")}</p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </button>
      </form>
    </SectionCard>
  );
}
