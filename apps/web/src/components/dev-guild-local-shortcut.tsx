"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { devUpsertDiscordGuild } from "@/actions/dev-guild-seed";

/**
 * Affiché uniquement quand le parent rend en mode `next dev` et qu’il n’y a aucune guilde en base.
 * Permet d’insérer une ligne GuildSettings sans attendre le processus bot.
 */
export function DevGuildLocalShortcut({
  prefillGuildId,
}: {
  prefillGuildId: string | null;
}) {
  const t = useTranslations("templates");
  const router = useRouter();
  const [guildId, setGuildId] = useState(prefillGuildId ?? "");
  const [feedback, setFeedback] = useState<"ok" | "err" | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setErrCode(null);
    startTransition(async () => {
      const r = await devUpsertDiscordGuild(guildId);
      if (r.ok) {
        setFeedback("ok");
        router.refresh();
        return;
      }
      setFeedback("err");
      setErrCode(r.code);
    });
  }

  return (
    <div className="server-dev-only-hint dev-guild-shortcut">
      <p className="server-dev-only-hint__title">{t("devGuild.title")}</p>
      <p className="muted dev-guild-shortcut__desc">{t("devGuild.body")}</p>
      {prefillGuildId ? (
        <p className="muted dev-guild-shortcut__prefill">
          {t("devGuild.prefillNote")}
        </p>
      ) : null}
      <form className="dev-guild-shortcut__form" onSubmit={onSubmit}>
        <label
          className="dev-guild-shortcut__label"
          htmlFor="dev-discord-guild-id"
        >
          {t("devGuild.label")}
        </label>
        <div className="dev-guild-shortcut__row">
          <input
            id="dev-discord-guild-id"
            className="dev-guild-shortcut__input"
            name="discordGuildId"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            placeholder={t("devGuild.placeholder")}
            autoComplete="off"
            spellCheck={false}
            inputMode="numeric"
          />
          <button
            type="submit"
            className="btn btn-secondary dev-guild-shortcut__btn"
            disabled={pending || guildId.trim().length === 0}
          >
            {pending ? t("devGuild.saving") : t("devGuild.submit")}
          </button>
        </div>
      </form>
      {feedback === "ok" ? (
        <p className="dev-guild-shortcut__ok ok-banner">{t("devGuild.success")}</p>
      ) : null}
      {feedback === "err" && errCode ? (
        <p className="dev-guild-shortcut__err err">
          {t(`devGuild.errors.${errCode}`)}
        </p>
      ) : null}
    </div>
  );
}
