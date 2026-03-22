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
  emptyTitle,
  emptySub,
  openRunLabel,
  locale,
}: {
  items: OverviewActivityItem[];
  emptyTitle: string;
  emptySub: string;
  openRunLabel: string;
  locale: string;
}) {
  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#1e2230]">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-slate-600"
            aria-hidden
          >
            <path
              d="M22 12h-4l-3 9L9 3l-3 9H2"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="mb-1 text-sm text-slate-600">{emptyTitle}</div>
        <div className="text-xs text-slate-700">{emptySub}</div>
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
                  {openRunLabel}
                </Link>
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
