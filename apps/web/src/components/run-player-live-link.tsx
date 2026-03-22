"use client";

import { useCallback, useState } from "react";

export function RunPlayerLiveLink({ runId }: { runId: string }) {
  const [hint, setHint] = useState<string | null>(null);
  const relPath = `/app/live?run=${encodeURIComponent(runId)}`;

  const copy = useCallback(async () => {
    const url = `${window.location.origin}${relPath}`;
    try {
      await navigator.clipboard.writeText(url);
      setHint("Lien copié.");
    } catch {
      setHint("Copie manuelle : sélectionnez l’URL ci-dessous.");
    }
    window.setTimeout(() => setHint(null), 2500);
  }, [relPath]);

  return (
    <div className="run-player-live-link">
      <p className="field-hint">
        Écran minimal pour les joueurs : objectif, bâtiment, leader, prochaine
        action, compte à rebours. Pas d’édition.
      </p>
      <code className="run-player-live-link__url">{relPath}</code>
      <div className="run-player-live-link__row">
        <button type="button" className="btn btn-secondary btn-small" onClick={copy}>
          Copier le lien complet
        </button>
        {hint ? <span className="muted run-player-live-link__hint">{hint}</span> : null}
      </div>
      <p className="field-hint">
        Personnalisation (assignations en base) : ajoutez{" "}
        <code className="roster-code-hint">
          &amp;me=ID_DISCORD
        </code>{" "}
        (snowflake du joueur).
      </p>
    </div>
  );
}
