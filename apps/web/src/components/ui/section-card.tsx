export function SectionCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`section-card ${className}`.trim()}>
      {title ? (
        <div className="section-card__head">
          <h2 className="section-card__title">{title}</h2>
          {subtitle ? (
            <p className="section-card__subtitle">{subtitle}</p>
          ) : null}
        </div>
      ) : null}
      <div className="section-card__body">{children}</div>
    </section>
  );
}
