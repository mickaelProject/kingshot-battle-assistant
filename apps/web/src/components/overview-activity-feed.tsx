import Link from "next/link";

export type OverviewActivityItem = {
  id: string;
  level: string;
  message: string;
  createdAt: Date;
  runId: string;
  templateName: string | null;
};

export function OverviewActivityFeed({
  items,
}: {
  items: OverviewActivityItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="activity-feed activity-feed--empty">
        <p className="activity-feed__empty-title">Aucune activité récente</p>
        <p className="muted activity-feed__empty-desc">
          Les journaux techniques apparaîtront ici dès qu’un événement démarre ou
          change d’état.
        </p>
        <Link href="/dashboard/events" className="btn btn-secondary btn-small">
          Lancer une mission
        </Link>
      </div>
    );
  }

  return (
    <ul className="activity-feed__list">
      {items.map((row) => {
        const level = row.level.toLowerCase();
        const tone =
          level === "error"
            ? "activity-feed__item--err"
            : level === "warn"
              ? "activity-feed__item--warn"
              : "activity-feed__item--info";
        return (
          <li key={row.id} className={`activity-feed__item ${tone}`}>
            <time
              className="activity-feed__time"
              dateTime={row.createdAt.toISOString()}
            >
              {row.createdAt.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </time>
            <div className="activity-feed__body">
              <span className="activity-feed__badge">{row.level}</span>
              <p className="activity-feed__msg">{row.message}</p>
              <p className="activity-feed__ctx muted">
                {row.templateName ? (
                  <>
                    <strong>{row.templateName}</strong>
                    <span aria-hidden> · </span>
                  </>
                ) : null}
                <Link href={`/dashboard/runs/${row.runId}`} className="text-link">
                  Ouvrir l’exécution
                </Link>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
