"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  createManagedRunAction,
  type ManagedRunActionResult,
} from "@/actions/data";
import type { AppLocale } from "@/i18n/config";
import { formatDurationHuman } from "@/lib/time-human";
import {
  addMinutesUtc,
  formatUtcDatetimeInputValue,
  parseUtcDatetimeInputToDate,
} from "@/lib/utc-legion-start-input";
import { DiscordInviteCta } from "@/components/discord-invite-cta";
import { UtcLegionDatetimeField } from "@/components/utc-legion-datetime-field";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

type Guild = {
  id: string;
  discordGuildId: string;
  battleChannelId: string | null;
};
type Template = { id: string; name: string; guildId: string };
type ChannelOpt = { id: string; name: string };

type PhasePreviewRow = {
  offsetLabel: string;
  phaseType: string;
  title: string;
};

export function EventsWizard({
  guilds,
  templates,
  templatesMeta,
  templatesPhasePreview,
  channelsByGuildId,
  discordConfigured,
  discordInviteUrl,
  discordInstallRedirectUri,
  initialTemplateId,
  initialGuildSettingsId,
  scheduleMode,
}: {
  guilds: Guild[];
  templates: Template[];
  templatesMeta: Record<
    string,
    {
      phaseCount: number;
      durationSec: number;
      eventDurationMinutes: number;
      hasLegionPhases: boolean;
      legionTimelinesNeedSchedule: boolean;
      legion1StartOffsetMinutes: number;
      legion2StartOffsetMinutes: number;
    }
  >;
  templatesPhasePreview: Record<string, PhasePreviewRow[]>;
  channelsByGuildId: Record<string, ChannelOpt[]>;
  discordConfigured: boolean;
  discordInviteUrl: string | null;
  discordInstallRedirectUri: string | null;
  initialTemplateId?: string;
  initialGuildSettingsId?: string;
  scheduleMode: boolean;
}) {
  const t = useTranslations("eventsWizard");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [channelId, setChannelId] = useState("");
  const [channelNameSnapshot, setChannelNameSnapshot] = useState("");
  const [launchNow, setLaunchNow] = useState(!scheduleMode);
  const [scheduledAt, setScheduledAt] = useState("");
  /** Saisie interprétée comme UTC : `YYYY-MM-DDTHH:mm`. */
  const [legion1StartsAtUtc, setLegion1StartsAtUtc] = useState("");
  const [legion2StartsAtUtc, setLegion2StartsAtUtc] = useState("");
  const [error, setError] = useState<string | null>(null);

  const steps = useMemo(
    () => [t("step0"), t("step1"), t("step2"), t("step3")],
    [t],
  );

  const guildSettingsId = useMemo(() => {
    const tmpl = templates.find((x) => x.id === templateId);
    return tmpl?.guildId ?? "";
  }, [templates, templateId]);

  const channels = channelsByGuildId[guildSettingsId] ?? [];

  const pickDefaultChannel = useCallback(() => {
    const g = guilds.find((x) => x.id === guildSettingsId);
    const chs = channelsByGuildId[guildSettingsId] ?? [];
    const pref =
      g?.battleChannelId && chs.some((c) => c.id === g.battleChannelId)
        ? g.battleChannelId
        : chs[0]?.id ?? "";
    const name = chs.find((c) => c.id === pref)?.name ?? "";
    setChannelId(pref);
    setChannelNameSnapshot(name);
  }, [guilds, guildSettingsId, channelsByGuildId]);

  useEffect(() => {
    if (guildSettingsId) pickDefaultChannel();
  }, [guildSettingsId, pickDefaultChannel]);

  useEffect(() => {
    if (initialTemplateId && templates.some((x) => x.id === initialTemplateId)) {
      setTemplateId(initialTemplateId);
      setStep(1);
    }
    if (initialGuildSettingsId) {
      /* pré-sélection guilde optionnelle */
    }
  }, [initialTemplateId, templates]);

  useEffect(() => {
    const m = templateId ? templatesMeta[templateId] : null;
    if (!m?.legionTimelinesNeedSchedule) return;
    setLaunchNow(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- meta serveur stable par `templateId`
  }, [templateId]);

  /** Deux timelines légion : préremplissage depuis l’instant présent (pas de date « alliance » séparée). */
  useEffect(() => {
    const m = templateId ? templatesMeta[templateId] : null;
    if (!m?.hasLegionPhases || !m.legionTimelinesNeedSchedule) return;
    const base = new Date();
    setLegion1StartsAtUtc(
      formatUtcDatetimeInputValue(
        addMinutesUtc(base, m.legion1StartOffsetMinutes),
      ),
    );
    setLegion2StartsAtUtc(
      formatUtcDatetimeInputValue(
        addMinutesUtc(base, m.legion2StartOffsetMinutes),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    const m = templateId ? templatesMeta[templateId] : null;
    if (!m?.hasLegionPhases) {
      setLegion1StartsAtUtc("");
      setLegion2StartsAtUtc("");
      return;
    }
    if (m.legionTimelinesNeedSchedule) return;

    let base: Date;
    if (launchNow) {
      base = new Date();
    } else {
      const raw = scheduledAt.trim();
      if (!raw) {
        setLegion1StartsAtUtc("");
        setLegion2StartsAtUtc("");
        return;
      }
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        setLegion1StartsAtUtc("");
        setLegion2StartsAtUtc("");
        return;
      }
      base = d;
    }
    setLegion1StartsAtUtc(
      formatUtcDatetimeInputValue(
        addMinutesUtc(base, m.legion1StartOffsetMinutes),
      ),
    );
    setLegion2StartsAtUtc(
      formatUtcDatetimeInputValue(
        addMinutesUtc(base, m.legion2StartOffsetMinutes),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `templatesMeta` stable par rendu serveur
  }, [templateId, launchNow, scheduledAt]);

  const meta = templateId ? templatesMeta[templateId] : null;
  const legionTimelinesNeedSchedule =
    meta?.legionTimelinesNeedSchedule ?? false;
  const phasePreview = templateId
    ? templatesPhasePreview[templateId] ?? []
    : [];

  const canNext0 = Boolean(templateId);
  const canNext1 =
    Boolean(channelId) &&
    channels.some((c) => c.id === channelId) &&
    discordConfigured &&
    channels.length > 0;
  const legionUtcOk =
    !meta?.hasLegionPhases ||
    (parseUtcDatetimeInputToDate(legion1StartsAtUtc) != null &&
      parseUtcDatetimeInputToDate(legion2StartsAtUtc) != null);

  const canNext2 =
    legionUtcOk &&
    (legionTimelinesNeedSchedule ||
      launchNow ||
      Boolean(scheduledAt.trim()));

  const phaseLabels = useMemo(
    () => ({
      START: t("phaseTypes.START"),
      OBJECTIVE: t("phaseTypes.OBJECTIVE"),
      REMINDER: t("phaseTypes.REMINDER"),
      FINAL: t("phaseTypes.FINAL"),
    }),
    [t],
  );
  function phaseTypeLabel(phaseType: string): string {
    return phaseLabels[phaseType as keyof typeof phaseLabels] ?? phaseType;
  }

  async function submit(kind: "now" | "schedule") {
    setError(null);
    const fd = new FormData();
    fd.set("guildSettingsId", guildSettingsId);
    fd.set("templateId", templateId);
    fd.set("channelId", channelId);
    fd.set("channelNameSnapshot", channelNameSnapshot);
    const m = templatesMeta[templateId];
    let legionD1: Date | null = null;
    let legionD2: Date | null = null;
    if (m?.hasLegionPhases) {
      legionD1 = parseUtcDatetimeInputToDate(legion1StartsAtUtc);
      legionD2 = parseUtcDatetimeInputToDate(legion2StartsAtUtc);
      if (!legionD1 || !legionD2) {
        setError(t("legionUtcInvalid"));
        return;
      }
      fd.set("legion1StartsAtUtc", legionD1.toISOString());
      fd.set("legion2StartsAtUtc", legionD2.toISOString());
    }
    if (kind === "now") {
      fd.set("launchNow", "on");
    } else if (m?.legionTimelinesNeedSchedule && legionD1 && legionD2) {
      fd.set(
        "scheduledAt",
        new Date(
          Math.min(legionD1.getTime(), legionD2.getTime()),
        ).toISOString(),
      );
    } else {
      fd.set("scheduledAt", scheduledAt);
    }
    startTransition(async () => {
      const r: ManagedRunActionResult = await createManagedRunAction(fd);
      if (r.ok) {
        const msg =
          kind === "now" ? t("toastNow") : t("toastScheduled");
        router.push(
          `/dashboard/runs?toast=launched&toastMsg=${encodeURIComponent(msg)}`,
        );
        router.refresh();
        return;
      }
      setError(r.error);
    });
  }

  if (guilds.length === 0) {
    return (
      <div className="dashboard-main">
        <PageHeader title={t("emptyPageTitle")} description={t("emptyPageDesc")} />
        <SectionCard title={t("connectTitle")} subtitle={t("connectSubtitle")}>
          <DiscordInviteCta
            inviteUrl={discordInviteUrl}
            installRedirectUri={discordInstallRedirectUri}
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="dashboard-main">
      <PageHeader
        title={t("pageTitle")}
        description={t("pageDesc")}
        actions={
          <Link href="/dashboard/templates" className="btn btn-ghost">
            ← {t("backTemplates")}
          </Link>
        }
      />

      <nav className="wizard-steps" aria-label={t("stepsAria")}>
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            className={`wizard-steps__item ${i === step ? "wizard-steps__item--active" : ""} ${i < step ? "wizard-steps__item--done" : ""}`}
            onClick={() => i < step && setStep(i)}
            disabled={i > step}
          >
            <span className="wizard-steps__num">{i + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="wizard-panel">
        {error ? <p className="form-error">{error}</p> : null}

        {step === 0 && (
          <div className="wizard-step-body">
            <h2 className="wizard-step-title">{t("pickTemplateTitle")}</h2>
            <p className="field-hint">{t("pickTemplateHint")}</p>
            <div className="template-pick-grid">
              {templates.map((tmpl) => {
                const m = templatesMeta[tmpl.id];
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    className={`template-pick-card ${templateId === tmpl.id ? "template-pick-card--selected" : ""}`}
                    onClick={() => setTemplateId(tmpl.id)}
                  >
                    <span className="template-pick-card__name">{tmpl.name}</span>
                    {m ? (
                      <span className="template-pick-card__meta">
                        {t("announcementsLine", {
                          count: m.phaseCount,
                          duration: formatDurationHuman(m.durationSec, locale),
                          minutes: m.eventDurationMinutes,
                        })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="wizard-nav">
              <span />
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canNext0}
                onClick={() => setStep(1)}
              >
                {t("continue")}
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-step-body">
            <h2 className="wizard-step-title">{t("pickChannelTitle")}</h2>
            <p className="field-hint">{t("pickChannelHint")}</p>
            {!discordConfigured ? (
              <p className="form-error">{t("discordListError")}</p>
            ) : (
              <div className="channel-pick-grid">
                {channels.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`channel-pick-card ${channelId === c.id ? "channel-pick-card--selected" : ""}`}
                    onClick={() => {
                      setChannelId(c.id);
                      setChannelNameSnapshot(c.name);
                    }}
                  >
                    #{c.name}
                  </button>
                ))}
              </div>
            )}
            <div className="wizard-nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(0)}
              >
                {t("back")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canNext1}
                onClick={() => setStep(2)}
              >
                {t("continue")}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step-body">
            <h2 className="wizard-step-title">{t("whenTitle")}</h2>
            <div
              className={`timing-options ${legionTimelinesNeedSchedule ? "timing-options--single" : ""}`}
            >
              {!legionTimelinesNeedSchedule ? (
                <>
                  <label
                    className={`timing-card ${launchNow ? "timing-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="when"
                      checked={launchNow}
                      onChange={() => setLaunchNow(true)}
                    />
                    <span className="timing-card__title">{t("nowTitle")}</span>
                    <span className="timing-card__desc">{t("nowDesc")}</span>
                  </label>
                  <label
                    className={`timing-card ${!launchNow ? "timing-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="when"
                      checked={!launchNow}
                      onChange={() => setLaunchNow(false)}
                    />
                    <span className="timing-card__title">
                      {t("scheduleTitle")}
                    </span>
                    <span className="timing-card__desc">
                      {t("scheduleDesc")}
                    </span>
                  </label>
                </>
              ) : (
                <div className="timing-card timing-card--selected timing-card--locked">
                  <span className="timing-card__title">
                    {t("scheduleTitle")}
                  </span>
                  <span className="timing-card__desc">
                    {t("scheduleDescDualLegion")}
                  </span>
                </div>
              )}
            </div>
            {!launchNow && !legionTimelinesNeedSchedule ? (
              <div className="form-field" style={{ marginTop: "1rem" }}>
                <label htmlFor="sched">{t("datetimeLabel")}</label>
                <input
                  id="sched"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            ) : null}
            {meta?.hasLegionPhases ? (
              <div
                className="events-wizard-legion-offsets"
                style={{ marginTop: "1.25rem" }}
              >
                <p style={{ fontWeight: 600, margin: "0 0 0.35rem" }}>
                  {t("legionStartsSectionTitle")}
                </p>
                <p className="field-hint" style={{ marginBottom: "1rem" }}>
                  {t("legionStartsHint")}
                </p>
                <div className="events-wizard-legion-offsets-grid">
                  <UtcLegionDatetimeField
                    id="ev-legion1-utc"
                    groupLabel={t("legion1StartUtcLabel")}
                    dateLabel={t("legionUtcDateLabel")}
                    timeLabel={t("legionUtcTimeLabel")}
                    value={legion1StartsAtUtc}
                    onChange={setLegion1StartsAtUtc}
                  />
                  <UtcLegionDatetimeField
                    id="ev-legion2-utc"
                    groupLabel={t("legion2StartUtcLabel")}
                    dateLabel={t("legionUtcDateLabel")}
                    timeLabel={t("legionUtcTimeLabel")}
                    value={legion2StartsAtUtc}
                    onChange={setLegion2StartsAtUtc}
                  />
                </div>
                <p className="field-hint" style={{ marginTop: "0.5rem" }}>
                  {t("legionUtcFormatHint")}
                </p>
              </div>
            ) : null}
            <div className="wizard-nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
              >
                {t("back")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canNext2}
                onClick={() => setStep(3)}
              >
                {t("continue")}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step-body">
            <h2 className="wizard-step-title">{t("reviewTitle")}</h2>
            <div className="review-card">
              <dl className="review-dl">
                <dt>{t("dtTemplate")}</dt>
                <dd>{templates.find((x) => x.id === templateId)?.name}</dd>
                <dt>{t("dtChannel")}</dt>
                <dd>
                  {channelNameSnapshot ? (
                    <strong>#{channelNameSnapshot}</strong>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt>{t("dtStart")}</dt>
                <dd>
                  {launchNow ? (
                    t("immediate")
                  ) : legionTimelinesNeedSchedule ? (
                    (() => {
                      const a = parseUtcDatetimeInputToDate(legion1StartsAtUtc);
                      const b = parseUtcDatetimeInputToDate(legion2StartsAtUtc);
                      if (!a || !b) return "—";
                      const earliest = new Date(
                        Math.min(a.getTime(), b.getTime()),
                      );
                      return (
                        <>
                          {earliest.toLocaleString(locale)}
                          <span
                            className="muted"
                            style={{
                              display: "block",
                              fontSize: "0.88em",
                              marginTop: "0.3rem",
                            }}
                          >
                            {t("dtStartDualLegionNote")}
                          </span>
                        </>
                      );
                    })()
                  ) : scheduledAt ? (
                    new Date(scheduledAt).toLocaleString(locale)
                  ) : (
                    "—"
                  )}
                </dd>
                {meta?.hasLegionPhases ? (
                  <>
                    <dt>{t("dtLegion1StartUtc")}</dt>
                    <dd>
                      <strong>
                        {(() => {
                          const d = parseUtcDatetimeInputToDate(
                            legion1StartsAtUtc,
                          );
                          return d
                            ? `${d.toLocaleString(locale, {
                                timeZone: "UTC",
                                dateStyle: "short",
                                timeStyle: "short",
                              })} UTC`
                            : "—";
                        })()}
                      </strong>
                    </dd>
                    <dt>{t("dtLegion2StartUtc")}</dt>
                    <dd>
                      <strong>
                        {(() => {
                          const d = parseUtcDatetimeInputToDate(
                            legion2StartsAtUtc,
                          );
                          return d
                            ? `${d.toLocaleString(locale, {
                                timeZone: "UTC",
                                dateStyle: "short",
                                timeStyle: "short",
                              })} UTC`
                            : "—";
                        })()}
                      </strong>
                    </dd>
                  </>
                ) : null}
                {meta ? (
                  <>
                    <dt>{t("dtTerrain")}</dt>
                    <dd>
                      <strong>{meta.eventDurationMinutes} min</strong>{" "}
                      {t("dtTerrainModel")}
                    </dd>
                    <dt>{t("dtAnnounce")}</dt>
                    <dd>
                      {t("announceSpread", {
                        count: meta.phaseCount,
                        duration: formatDurationHuman(meta.durationSec, locale),
                      })}
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>
            {phasePreview.length > 0 ? (
              <div>
                <p className="field-hint" style={{ marginBottom: 0 }}>
                  {t("previewHint")}
                </p>
                <ul className="wizard-phase-preview">
                  {phasePreview.map((row, i) => (
                    <li key={`${row.offsetLabel}-${i}`}>
                      <span className="wizard-phase-preview__when">
                        {row.offsetLabel}
                      </span>
                      <span className="wizard-phase-preview__type">
                        {phaseTypeLabel(row.phaseType)}
                      </span>
                      <span className="wizard-phase-preview__title">
                        {row.title.trim() ? row.title : t("untitledPhase")}
                      </span>
                    </li>
                  ))}
                </ul>
                {meta && meta.phaseCount > phasePreview.length ? (
                  <p className="wizard-phase-preview__more">
                    {t("morePhases", {
                      count: meta.phaseCount - phasePreview.length,
                    })}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="wizard-nav wizard-nav--final">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(2)}
              >
                {t("back")}
              </button>
              <div className="btn-row">
                <button
                  type="button"
                  className={
                    legionTimelinesNeedSchedule
                      ? "btn btn-primary"
                      : "btn btn-secondary"
                  }
                  disabled={
                    pending ||
                    launchNow ||
                    (!legionTimelinesNeedSchedule && !scheduledAt.trim())
                  }
                  onClick={() => submit("schedule")}
                >
                  {t("scheduleBtn")}
                </button>
                {!legionTimelinesNeedSchedule ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={pending || !launchNow}
                    onClick={() => submit("now")}
                  >
                    {t("launchNowBtn")}
                  </button>
                ) : null}
              </div>
            </div>
            <p className="field-hint wizard-final-hint">
              {legionTimelinesNeedSchedule
                ? t("finalHintSchedule")
                : launchNow
                  ? t("finalHintNow")
                  : t("finalHintSchedule")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
