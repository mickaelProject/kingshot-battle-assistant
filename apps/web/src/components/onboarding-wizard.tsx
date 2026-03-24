"use client";

import { useMemo, useState } from "react";

const STEPS = ["Event", "Roster", "Preview", "Launch"] as const;

function fakeTimelineFromRoster(raw: string): string[] {
  const count = raw
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean).length;
  const players = Math.max(1, count);
  return [
    `T+00 - Briefing (${players} joueurs detectes)`,
    "T+08 - Bell Tower push",
    "T+16 - Sanctum split L1/L2",
    "T+32 - Abbey defense",
    "T+50 - Final objective rush",
  ];
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [eventType, setEventType] = useState<"SWORDLAND" | "KVK">("SWORDLAND");
  const [roster, setRoster] = useState("");
  const timeline = useMemo(() => fakeTimelineFromRoster(roster), [roster]);

  return (
    <section className="onboarding">
      <header className="onboarding__header">
        <h1>Onboarding rapide</h1>
        <p className="muted">De zero a un event pilotable en 4 etapes.</p>
      </header>
      <div className="onboarding__steps">
        {STEPS.map((label, idx) => (
          <div
            key={label}
            className={`onboarding__step${idx === step ? " onboarding__step--active" : ""}`}
          >
            {idx + 1}. {label}
          </div>
        ))}
      </div>

      <div className="onboarding__panel">
        {step === 0 ? (
          <div className="onboarding__block">
            <h2>Step 1 - Choix event</h2>
            <div className="onboarding__choices">
              <button
                type="button"
                className={`public-btn${eventType === "SWORDLAND" ? " public-btn--primary" : ""}`}
                onClick={() => setEventType("SWORDLAND")}
              >
                Swordland
              </button>
              <button type="button" className="public-btn" disabled title="Disponible bientot">
                KvK (bientot)
              </button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="onboarding__block">
            <h2>Step 2 - Coller roster</h2>
            <textarea
              className="onboarding__textarea"
              placeholder="Ex: Astra, Kyren, Mira..."
              value={roster}
              onChange={(e) => setRoster(e.target.value)}
            />
          </div>
        ) : null}

        {step === 2 ? (
          <div className="onboarding__block">
            <h2>Step 3 - Preview timeline generee</h2>
            <div className="onboarding__timeline">
              {timeline.map((line) => (
                <div key={line} className="onboarding__timeline-row">
                  {line}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="onboarding__block">
            <h2>Step 4 - Lancement</h2>
            <p className="muted">
              Event: {eventType === "SWORDLAND" ? "Swordland" : "KvK"} - {timeline.length} phases
            </p>
            <button type="button" className="public-btn public-btn--primary">
              Lancer l&apos;evenement
            </button>
          </div>
        ) : null}
      </div>

      <div className="onboarding__actions">
        <button
          type="button"
          className="public-btn"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Precedent
        </button>
        <button
          type="button"
          className="public-btn public-btn--ghost"
          onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
          disabled={step === STEPS.length - 1}
        >
          Suivant
        </button>
      </div>
    </section>
  );
}
