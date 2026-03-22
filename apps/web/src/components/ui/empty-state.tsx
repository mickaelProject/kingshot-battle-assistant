import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {description ? (
        <p className="empty-state__desc">{description}</p>
      ) : null}
      {actionLabel && actionHref ? (
        <Link href={actionHref} className="btn btn-primary">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
