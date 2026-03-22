"use client";

import { useState } from "react";

/**
 * Two-step confirmation for destructive actions (no extra deps).
 */
export function ConfirmDestructive({
  label,
  confirmLabel,
  detail,
  triggerClassName,
  children,
}: {
  label: string;
  confirmLabel?: string;
  /** Texte ou liste d’avertissements sous le titre de confirmation */
  detail?: React.ReactNode;
  /** Bouton d’ouverture (défaut : style discret) */
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="confirm-destructive">
      {!open ? (
        <button
          type="button"
          className={triggerClassName ?? "btn btn-danger-ghost"}
          onClick={() => setOpen(true)}
        >
          {label}
        </button>
      ) : (
        <div className="confirm-destructive__panel">
          <span className="confirm-destructive__warn">
            {confirmLabel ?? "Confirmer ? Cette action est définitive."}
          </span>
          {detail ? (
            <div className="confirm-destructive__detail muted">{detail}</div>
          ) : null}
          <div className="confirm-destructive__actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
            >
              Annuler
            </button>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
