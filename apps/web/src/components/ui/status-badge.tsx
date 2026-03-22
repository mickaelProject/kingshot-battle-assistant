import type { ManagedEventStatus } from "@prisma/client";

const LABELS: Record<string, string> = {
  SCHEDULED: "Planifié",
  STARTING: "Démarrage",
  ACTIVE: "En cours",
  COMPLETED: "Terminé",
  FAILED: "Échec",
  CANCELLED: "Annulé",
};

export function StatusBadge({ status }: { status: ManagedEventStatus | string }) {
  const s = String(status);
  const cls = `status-badge status-badge--${s.toLowerCase()}`;
  return <span className={cls}>{LABELS[s] ?? s}</span>;
}
