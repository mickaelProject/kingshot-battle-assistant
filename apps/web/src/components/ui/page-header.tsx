export function PageHeader({
  title,
  description,
  actions,
  emphasis = "default",
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** `hero` : titre plus grand pour l’accueil cockpit. */
  emphasis?: "default" | "hero";
}) {
  return (
    <header
      className={`page-header ${emphasis === "hero" ? "page-header--hero" : ""}`}
    >
      <div className="page-header__text">
        <h1 className="page-header__title">{title}</h1>
        {description ? (
          <p className="page-header__desc">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
