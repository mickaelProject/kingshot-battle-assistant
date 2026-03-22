"use client";

import {
  nextPhaseRunAction,
  pauseRunAction,
  resumeRunAction,
  stopRunAction,
} from "@/actions/run-control";
import { ConfirmDestructive } from "@/components/ui/confirm-dialog";

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
    ? "run-active-controls run-active-controls--compact"
    : "run-active-controls";

  return (
    <div className={cls}>
      {isPaused ? (
        <form action={resumeRunAction}>
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="redirectTo" value={redirectPath} />
          <button type="submit" className="btn btn-primary btn-small">
            Reprendre
          </button>
        </form>
      ) : (
        <form action={pauseRunAction}>
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="redirectTo" value={redirectPath} />
          <button type="submit" className="btn btn-secondary btn-small">
            Pause
          </button>
        </form>
      )}
      <form action={nextPhaseRunAction}>
        <input type="hidden" name="runId" value={runId} />
        <input type="hidden" name="redirectTo" value={redirectPath} />
        <button
          type="submit"
          className="btn btn-secondary btn-small"
          title="Envoie tout de suite la prochaine phase en attente"
        >
          Phase suivante
        </button>
      </form>
      <ConfirmDestructive
        label="Arrêter maintenant…"
        confirmLabel="Arrêter la bataille tout de suite ? Les phases en attente seront ignorées."
      >
        <form action={stopRunAction}>
          <input type="hidden" name="runId" value={runId} />
          <input type="hidden" name="redirectTo" value={redirectPath} />
          <button type="submit" className="btn btn-danger btn-small">
            Arrêter
          </button>
        </form>
      </ConfirmDestructive>
    </div>
  );
}
