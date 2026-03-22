"use client";

import { useCallback, useState } from "react";
import { addPhaseAction } from "@/actions/data";
import { TacticalPhasePreview } from "@/components/tactical-phase-preview";

const PHASE_OPTIONS = ["START", "OBJECTIVE", "REMINDER", "FINAL"] as const;

type Draft = {
  key: string;
  offsetSeconds: string;
  phaseType: string;
  title: string;
  objective: string;
  action: string;
  nextHint: string;
};

const initial: Draft = {
  key: "",
  offsetSeconds: "0",
  phaseType: "REMINDER",
  title: "",
  objective: "",
  action: "",
  nextHint: "",
};

export function AddPhaseForm({ templateId }: { templateId: string }) {
  const [draft, setDraft] = useState<Draft>(initial);

  const onField = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setDraft((d) => ({ ...d, [name]: value }));
    },
    [],
  );

  return (
    <div className="phase-editor-split">
      <form action={addPhaseAction} className="stack phase-form">
        <input type="hidden" name="templateId" value={templateId} />
        <h3 className="phase-form__heading">Nouvelle phase</h3>
        <div className="form-grid-2">
          <div>
            <label htmlFor="add-key">Clé</label>
            <input
              id="add-key"
              name="key"
              required
              placeholder="t900_objective"
              value={draft.key}
              onChange={onField}
            />
          </div>
          <div>
            <label htmlFor="add-offset">T+ (secondes)</label>
            <input
              id="add-offset"
              name="offsetSeconds"
              type="text"
              inputMode="numeric"
              required
              value={draft.offsetSeconds}
              onChange={onField}
            />
          </div>
        </div>
        <div>
          <label htmlFor="add-phaseType">Type</label>
          <select
            id="add-phaseType"
            name="phaseType"
            required
            value={draft.phaseType}
            onChange={onField}
          >
            {PHASE_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="add-title">Titre (embed Discord)</label>
          <input
            id="add-title"
            name="title"
            required
            placeholder="Court et lisible sur mobile"
            value={draft.title}
            onChange={onField}
          />
        </div>
        <div>
          <label htmlFor="add-objective">Objectif</label>
          <textarea
            id="add-objective"
            name="objective"
            value={draft.objective}
            onChange={onField}
          />
        </div>
        <div>
          <label htmlFor="add-action">Action</label>
          <textarea
            id="add-action"
            name="action"
            value={draft.action}
            onChange={onField}
          />
        </div>
        <div>
          <label htmlFor="add-nextHint">Prochain pas</label>
          <textarea
            id="add-nextHint"
            name="nextHint"
            value={draft.nextHint}
            onChange={onField}
          />
        </div>
        <button type="submit" className="primary">
          Ajouter la phase
        </button>
      </form>
      <div className="phase-preview-column">
        <h3 className="phase-form__heading">Aperçu Discord</h3>
        <TacticalPhasePreview
          phaseType={draft.phaseType}
          title={draft.title}
          objective={draft.objective}
          action={draft.action}
          nextHint={draft.nextHint}
        />
      </div>
    </div>
  );
}
