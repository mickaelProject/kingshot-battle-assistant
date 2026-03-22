"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  createManagedRunAction,
  type ManagedRunActionResult,
} from "@/actions/data";
import { formatDurationHuman } from "@/lib/time-human";
import { DiscordInviteCta } from "@/components/discord-invite-cta";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";

type Guild = {
  id: string;
  discordGuildId: string;
  battleChannelId: string | null;
};
type Template = { id: string; name: string; guildId: string };
type ChannelOpt = { id: string; name: string };

const STEPS = [
  "Choisir le modèle",
  "Choisir le salon",
  "Quand lancer ?",
  "Vérifier & confirmer",
] as const;

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
    }
  >;
  templatesPhasePreview: Record<
    string,
    { offsetLabel: string; typeLabel: string; title: string }[]
  >;
  channelsByGuildId: Record<string, ChannelOpt[]>;
  discordConfigured: boolean;
  discordInviteUrl: string | null;
  discordInstallRedirectUri: string | null;
  initialTemplateId?: string;
  initialGuildSettingsId?: string;
  scheduleMode: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [templateId, setTemplateId] = useState(initialTemplateId ?? "");
  const [channelId, setChannelId] = useState("");
  const [channelNameSnapshot, setChannelNameSnapshot] = useState("");
  const [launchNow, setLaunchNow] = useState(!scheduleMode);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const guildSettingsId = useMemo(() => {
    const t = templates.find((x) => x.id === templateId);
    return t?.guildId ?? "";
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
    if (initialTemplateId && templates.some((t) => t.id === initialTemplateId)) {
      setTemplateId(initialTemplateId);
      setStep(1);
    }
    if (initialGuildSettingsId) {
      /* optional preselect guild filter — templates carry guild */
    }
  }, [initialTemplateId, templates]);

  const meta = templateId ? templatesMeta[templateId] : null;
  const phasePreview = templateId
    ? templatesPhasePreview[templateId] ?? []
    : [];

  const canNext0 = Boolean(templateId);
  const canNext1 =
    Boolean(channelId) &&
    channels.some((c) => c.id === channelId) &&
    discordConfigured &&
    channels.length > 0;
  const canNext2 = launchNow || Boolean(scheduledAt.trim());

  async function submit(kind: "now" | "schedule") {
    setError(null);
    const fd = new FormData();
    fd.set("guildSettingsId", guildSettingsId);
    fd.set("templateId", templateId);
    fd.set("channelId", channelId);
    fd.set("channelNameSnapshot", channelNameSnapshot);
    if (kind === "now") {
      fd.set("launchNow", "on");
    } else {
      fd.set("scheduledAt", scheduledAt);
    }
    startTransition(async () => {
      const r: ManagedRunActionResult = await createManagedRunAction(fd);
      if (r.ok) {
        const msg =
          kind === "now"
            ? "Lancement immédiat en file — le bot s’en occupe dans quelques secondes."
            : "Événement planifié. Retrouve le suivi sous Exécutions.";
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
        <PageHeader
          title="Événements"
          description="Aucun serveur Discord n’est encore relié à cette base."
        />
        <SectionCard
          title="Relier un serveur"
          subtitle="Invitez le bot, puis utilisez une commande slash en tant qu’administrateur."
        >
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
          title="Lancer une bataille"
          description="Quatre étapes simples : modèle, salon, horaire, confirmation."
          actions={
            <Link href="/dashboard/templates" className="btn btn-ghost">
              ← Modèles
            </Link>
          }
        />

      <nav className="wizard-steps" aria-label="Progression">
        {STEPS.map((label, i) => (
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
            <h2 className="wizard-step-title">Quel modèle utiliser ?</h2>
            <p className="field-hint">
              Le modèle définit la timeline des messages dans le salon Discord.
            </p>
            <div className="template-pick-grid">
              {templates.map((t) => {
                const m = templatesMeta[t.id];
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`template-pick-card ${templateId === t.id ? "template-pick-card--selected" : ""}`}
                    onClick={() => setTemplateId(t.id)}
                  >
                    <span className="template-pick-card__name">{t.name}</span>
                    {m ? (
                      <span className="template-pick-card__meta">
                        {m.phaseCount} annonce{m.phaseCount !== 1 ? "s" : ""} sur ~{" "}
                        {formatDurationHuman(m.durationSec)} · bataille{" "}
                        {m.eventDurationMinutes} min
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
                Continuer
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="wizard-step-body">
            <h2 className="wizard-step-title">Où publier sur Discord ?</h2>
            <p className="field-hint">
              Choisis le salon texte où les joueurs verront les annonces.
            </p>
            {!discordConfigured ? (
              <p className="form-error">
                Impossible de charger la liste des salons : vérifiez la
                configuration Discord côté administration.
              </p>
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
                Retour
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canNext1}
                onClick={() => setStep(2)}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="wizard-step-body">
            <h2 className="wizard-step-title">Quand démarrer ?</h2>
            <div className="timing-options">
              <label
                className={`timing-card ${launchNow ? "timing-card--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="when"
                  checked={launchNow}
                  onChange={() => setLaunchNow(true)}
                />
                <span className="timing-card__title">Tout de suite</span>
                <span className="timing-card__desc">
                  Le bot lancera dès que possible (quelques secondes).
                </span>
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
                <span className="timing-card__title">Planifier</span>
                <span className="timing-card__desc">
                  Choisis une date et heure précises.
                </span>
              </label>
            </div>
            {!launchNow ? (
              <div className="form-field" style={{ marginTop: "1rem" }}>
                <label htmlFor="sched">Date et heure</label>
                <input
                  id="sched"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            ) : null}
            <div className="wizard-nav">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setStep(1)}
              >
                Retour
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canNext2}
                onClick={() => setStep(3)}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="wizard-step-body">
            <h2 className="wizard-step-title">Récapitulatif</h2>
            <div className="review-card">
              <dl className="review-dl">
                <dt>Modèle</dt>
                <dd>{templates.find((t) => t.id === templateId)?.name}</dd>
                <dt>Salon Discord</dt>
                <dd>
                  {channelNameSnapshot ? (
                    <strong>#{channelNameSnapshot}</strong>
                  ) : (
                    "—"
                  )}
                </dd>
                <dt>Démarrage</dt>
                <dd>
                  {launchNow
                    ? "Immédiat"
                    : scheduledAt
                      ? new Date(scheduledAt).toLocaleString()
                      : "—"}
                </dd>
                {meta ? (
                  <>
                    <dt>Durée sur le terrain</dt>
                    <dd>
                      <strong>{meta.eventDurationMinutes} min</strong> (selon le
                      modèle)
                    </dd>
                    <dt>Annonces Discord</dt>
                    <dd>
                      {meta.phaseCount} étape
                      {meta.phaseCount !== 1 ? "s" : ""}, étalées sur ~{" "}
                      {formatDurationHuman(meta.durationSec)} après le départ
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>
            {phasePreview.length > 0 ? (
              <div>
                <p className="field-hint" style={{ marginBottom: 0 }}>
                  Aperçu des prochaines annonces :
                </p>
                <ul className="wizard-phase-preview">
                  {phasePreview.map((row, i) => (
                    <li key={`${row.offsetLabel}-${i}`}>
                      <span className="wizard-phase-preview__when">
                        {row.offsetLabel}
                      </span>
                      <span className="wizard-phase-preview__type">
                        {row.typeLabel}
                      </span>
                      <span className="wizard-phase-preview__title">
                        {row.title}
                      </span>
                    </li>
                  ))}
                </ul>
                {meta && meta.phaseCount > phasePreview.length ? (
                  <p className="wizard-phase-preview__more">
                    + {meta.phaseCount - phasePreview.length} autre
                    {meta.phaseCount - phasePreview.length !== 1 ? "s" : ""}{" "}
                    étape
                    {meta.phaseCount - phasePreview.length !== 1 ? "s" : ""}
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
                Retour
              </button>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={
                    pending || launchNow || !scheduledAt.trim()
                  }
                  onClick={() => submit("schedule")}
                >
                  Planifier l’événement
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending || !launchNow}
                  onClick={() => submit("now")}
                >
                  Lancer maintenant
                </button>
              </div>
            </div>
            <p className="field-hint wizard-final-hint">
              {launchNow
                ? "« Lancer maintenant » : le bot prend la main dans les secondes."
                : "« Planifier l’événement » : départ à l’heure choisie."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
