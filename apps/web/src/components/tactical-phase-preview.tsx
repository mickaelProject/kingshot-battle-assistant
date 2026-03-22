import {
  TACTICAL_PHASE_UI,
  tacticalPreviewTitle,
} from "@/lib/tactical-preview";

export function TacticalPhasePreview({
  phaseType,
  title,
  objective,
  action,
  nextHint,
  compact,
  showMessageChrome = true,
}: {
  phaseType: string;
  title: string;
  objective?: string;
  action?: string;
  nextHint?: string;
  compact?: boolean;
  /** Enveloppe type fil Discord (avatar + pseudo) — désactiver si déjà dans un mock externe. */
  showMessageChrome?: boolean;
}) {
  const ui = TACTICAL_PHASE_UI[phaseType] ?? TACTICAL_PHASE_UI.REMINDER;
  const head = tacticalPreviewTitle(title, objective, action);
  const obj = objective?.trim();
  const act = action?.trim();
  const next = nextHint?.trim();

  const embed = (
    <aside
      className={`discord-embed-preview ${compact ? "discord-embed-preview--compact" : ""}`}
      style={{ borderLeftColor: ui.color }}
      aria-label="Aperçu embed Discord"
    >
      <div className="discord-embed-preview__author">
        <span aria-hidden>{ui.ribbon}</span>
        {ui.label}
      </div>
      <div className="discord-embed-preview__title">{head}</div>
      <div className="discord-embed-preview__body">
        {obj ? (
          <p>
            <strong>Objectif</strong>
            <br />
            {obj}
          </p>
        ) : null}
        {act ? (
          <p>
            <strong>Action</strong>
            <br />
            {act}
          </p>
        ) : null}
        {next ? (
          <p>
            <strong>Prochain pas</strong>
            <br />
            {next}
          </p>
        ) : null}
        {!obj && !act && !next ? (
          <p className="muted" style={{ margin: 0 }}>
            (aucun corps — titre seul sur Discord)
          </p>
        ) : null}
      </div>
      <div className="discord-embed-preview__footer">
        Kingshot Battle Assistant · aperçu admin
      </div>
    </aside>
  );

  if (!showMessageChrome) {
    return embed;
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="discord-message-mock">
      <div className="discord-message-mock__avatar" aria-hidden>
        KB
      </div>
      <div className="discord-message-mock__col">
        <div className="discord-message-mock__head">
          <span className="discord-message-mock__name">
            Kingshot Battle Assistant
          </span>
          <span className="discord-message-mock__bot">APP</span>
          <time className="discord-message-mock__time" dateTime={now.toISOString()}>
            {timeStr}
          </time>
        </div>
        {embed}
      </div>
    </div>
  );
}
