"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createTemplateFromRosterAction,
  previewRosterTemplateAction,
  type RosterPreviewState,
} from "@/actions/roster-template";
import { SectionCard } from "@/components/ui/section-card";
import { formatOffsetLabel } from "@/lib/time-human";

const EVENT_OPTIONS: { value: string; label: string }[] = [
  { value: "GENERIC", label: "Générique" },
  { value: "RALLY", label: "Ralliement / brief" },
  { value: "FIELD_BATTLE", label: "Champ de bataille ouvert" },
  { value: "SIEGE", label: "Siège / structure" },
];

function fmtPower(p: number): string {
  if (p >= 1_000_000) return `${(p / 1_000_000).toFixed(1)}M`;
  if (p >= 1_000) return `${(p / 1_000).toFixed(1)}k`;
  return String(p);
}

export function RosterTemplateWizard({
  guilds,
}: {
  guilds: { id: string; discordGuildId: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [previewState, setPreviewState] = useState<RosterPreviewState>(null);
  const [previewPending, startPreviewTransition] = useTransition();
  const [createPending, startCreateTransition] = useTransition();
  const [eventDurationMinutes, setEventDurationMinutes] = useState(90);

  const ok = previewState && "ok" in previewState && previewState.ok === true;
  const err =
    previewState && "ok" in previewState && previewState.ok === false
      ? previewState.error
      : null;

  const busy = previewPending || createPending;

  useEffect(() => {
    if (previewState && "ok" in previewState && previewState.ok === true) {
      setEventDurationMinutes(previewState.echo.eventDurationMinutes);
    }
  }, [previewState]);

  return (
    <div className="roster-wizard">
      <div className="roster-draft-callout" role="status">
        <strong>Brouillon intelligent depuis roster</strong>
        <p className="muted">
          Les phases sont générées à partir des noms et puissances : c’est une base à
          relire avant tout lancement réel. Aucune analyse de « stratégie libre ».
        </p>
      </div>

      <form
        ref={formRef}
        id="roster-wizard-form"
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startPreviewTransition(async () => {
            const next = await previewRosterTemplateAction(previewState, fd);
            setPreviewState(next);
          });
        }}
      >
        <SectionCard
          title="Créer un modèle depuis le roster"
          subtitle="Nom, type d’événement, durée in-game, liste joueurs + puissance, notes optionnelles. Puis aperçu avant création du brouillon."
        >
          {err ? <p className="form-error">{err}</p> : null}

          <div className="form-field">
            <label htmlFor="guildId">Guilde</label>
            <select
              id="guildId"
              name="guildId"
              required
              defaultValue={guilds[0]?.id}
            >
              {guilds.map((g) => (
                <option key={g.id} value={g.id}>
                  Serveur · …{g.discordGuildId.slice(-6)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="name">Nom du modèle</label>
            <input
              id="name"
              name="name"
              required
              placeholder="Ex. Soirée KV — roster A"
            />
          </div>
          <div className="form-field">
            <label htmlFor="eventType">Type d’événement</label>
            <select id="eventType" name="eventType" defaultValue="GENERIC">
              {EVENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="field-hint">
              Influence le ton des messages générés — tout reste éditable ensuite.
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="eventDurationMinutes">Durée de l’événement (minutes)</label>
            <input
              id="eventDurationMinutes"
              name="eventDurationMinutes"
              type="number"
              min={1}
              max={1440}
              step={1}
              value={eventDurationMinutes}
              onChange={(e) =>
                setEventDurationMinutes(
                  Math.max(1, Math.min(1440, parseInt(e.target.value, 10) || 60)),
                )
              }
            />
            <p className="field-hint">
              Temps réel prévu sur le terrain (brief → fin). Distinct de la timeline
              Discord (annonces T+0, T+5…).
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="rosterText">Roster — une ligne par joueur</label>
            <textarea
              id="rosterText"
              name="rosterText"
              required
              rows={16}
              className="roster-textarea"
              placeholder={`CRICKETTS 3704\nEDA 3014\nTOBI 2662`}
            />
            <p className="field-hint">
              Format : <strong>NOM</strong> puis <strong>puissance</strong> (nombre).
              Séparateurs espace ou tabulation.
            </p>
          </div>
          <div className="form-field">
            <label htmlFor="notes">Préférences & notes (optionnel)</label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Ex. RL = Cricketts, focus nord, 2 vagues"
            />
          </div>

          <div className="btn-row">
            <button
              type="submit"
              className="btn btn-secondary"
              disabled={busy}
            >
              {previewPending ? "Analyse…" : "Générer l’aperçu"}
            </button>
            {ok ? (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => {
                  const el = formRef.current;
                  if (!el) return;
                  const fd = new FormData(el);
                  startCreateTransition(async () => {
                    await createTemplateFromRosterAction(fd);
                  });
                }}
              >
                {createPending
                  ? "Création…"
                  : "Créer le brouillon dans l’éditeur"}
              </button>
            ) : null}
            <Link
              href="/dashboard/templates/new"
              className="btn btn-ghost btn-small"
            >
              Autre mode
            </Link>
          </div>
        </SectionCard>
      </form>

      {ok && previewState.ok ? (
        <div className="roster-preview-blocks">
          <SectionCard
            title="Joueurs reconnus"
            subtitle={`${previewState.players.length} entrée(s) — tri par puissance décroissante.`}
          >
            <div className="roster-table-wrap">
              <table className="roster-preview-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Joueur</th>
                    <th>Puissance</th>
                  </tr>
                </thead>
                <tbody>
                  {previewState.players.map((p, i) => (
                    <tr key={`${p.name}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{p.name}</td>
                      <td>{fmtPower(p.power)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Candidats RL / shot-call"
            subtitle="Déduits du haut du classement — indicatif seulement."
          >
            <ul className="roster-leader-list">
              {previewState.leaders.map((p, i) => (
                <li key={`${p.name}-${i}`}>
                  <strong>{p.name}</strong>{" "}
                  <span className="muted">({fmtPower(p.power)})</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard
            title="Timeline d’annonces (aperçu)"
            subtitle="Ce n’est pas la durée événement : uniquement le calendrier des embeds Discord."
          >
            <ol className="roster-phase-preview-list">
              {previewState.phasesSummary.map((ph, i) => (
                <li key={i}>
                  <span className="roster-phase-preview-list__t">
                    {formatOffsetLabel(ph.offsetSeconds)}
                  </span>
                  <span className="roster-phase-preview-list__type muted">
                    {ph.phaseType}
                  </span>
                  <div className="roster-phase-preview-list__title">{ph.title}</div>
                </li>
              ))}
            </ol>
          </SectionCard>

          <p className="field-hint roster-preview-hint">
            Si tu modifies le roster, la durée ou les notes, clique à nouveau sur{" "}
            <strong>Générer l’aperçu</strong> avant de créer le brouillon.
          </p>
        </div>
      ) : null}

      {previewPending ? (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Analyse du roster…
        </p>
      ) : null}
    </div>
  );
}
