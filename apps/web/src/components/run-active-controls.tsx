"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import {
  nextPhaseRunAction,
  pauseRunAction,
  resumeRunAction,
  stopRunAction,
} from "@/actions/run-control";
import { ConfirmDestructive } from "@/components/ui/confirm-dialog";

function DeckSubmit({
  className,
  children,
  pendingText,
  ...props
}: ComponentProps<"button"> & { pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || props.disabled}
      className={`${className}${pending ? " control-deck__btn--pending" : ""}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function RunActiveControls({
  runId,
  isPaused,
  redirectPath,
  compact,
}: {
  runId: string;
  isPaused: boolean;
  redirectPath: string;
  compact?: boolean;
}) {
  const cls = compact
    ? "run-active-controls run-active-controls--compact control-deck__row"
    : "run-active-controls control-deck__row";

  return (
    <div className={cls}>
      {isPaused ? (
        <form action={resumeRunAction} className="control-deck__form">
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="redirectTo" value={redirectPath} />
          <DeckSubmit
            className="control-deck__btn control-deck__btn--resume"
            pendingText="Reprise…"
          >
            Reprendre
          </DeckSubmit>
        </form>
      ) : (
        <form action={pauseRunAction} className="control-deck__form">
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="redirectTo" value={redirectPath} />
          <DeckSubmit
            className="control-deck__btn control-deck__btn--pause"
            pendingText="Pause…"
          >
            Pause
          </DeckSubmit>
        </form>
      )}
      <form action={nextPhaseRunAction} className="control-deck__form">
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="redirectTo" value={redirectPath} />
        <DeckSubmit
          className="control-deck__btn control-deck__btn--next"
          pendingText="Envoi…"
          title="Envoie tout de suite la prochaine phase en attente"
        >
          Phase suivante
        </DeckSubmit>
      </form>
      <ConfirmDestructive
        label="Arrêter maintenant…"
        confirmLabel="Arrêter la bataille tout de suite ? Les phases en attente seront ignorées."
      >
        <form action={stopRunAction} className="control-deck__form">
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="redirectTo" value={redirectPath} />
          <DeckSubmit
            className="control-deck__btn control-deck__btn--stop"
            pendingText="Arrêt…"
          >
            Stop
          </DeckSubmit>
        </form>
      </ConfirmDestructive>
    </div>
  );
}
