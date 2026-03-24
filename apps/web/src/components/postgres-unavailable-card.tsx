import Link from "next/link";
import { SectionCard } from "@/components/ui/section-card";

/**
 * Affiché quand Prisma ne peut pas joindre PostgreSQL (souvent en local sans Docker / .env.local).
 */
export function PostgresUnavailableCard({
  backHref,
  backLabel,
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <SectionCard
      title="PostgreSQL inaccessible"
      subtitle="Le client Prisma ne parvient pas à se connecter à la base"
    >
      <p className="muted">
        En local, il faut une base joignable avec la même{" "}
        <code className="roster-code-hint">DATABASE_URL</code> que le bot, puis
        appliquer les migrations.
      </p>
      <ol className="postgres-help-list">
        <li>
          À la racine du dépôt : <code className="roster-code-hint">npm run db:up</code>{" "}
          (Docker, port <strong>5433</strong>)
        </li>
        <li>
          Copier{" "}
          <code className="roster-code-hint">apps/web/env.local.example</code> vers{" "}
          <code className="roster-code-hint">apps/web/.env.local</code> (ou{" "}
          <code className="roster-code-hint">npm run setup:local</code>)
        </li>
        <li>
          Vérifier l’URL (ex. Docker du repo) :{" "}
          <code className="roster-code-hint postgres-help-url">
            postgresql://postgres:postgres@localhost:5433/kingshot?schema=public
          </code>
        </li>
        <li>
          <code className="roster-code-hint">npm run db:migrate:local</code>
        </li>
      </ol>
      <p className="muted postgres-help-doc">
        Détail : voir <code className="roster-code-hint">docs/DEVELOPPEMENT-LOCAL.md</code>
        .
      </p>
      {backHref ? (
        <p className="mt-3">
          <Link href={backHref} className="text-link">
            {backLabel ?? "← Retour"}
          </Link>
        </p>
      ) : null}
    </SectionCard>
  );
}
