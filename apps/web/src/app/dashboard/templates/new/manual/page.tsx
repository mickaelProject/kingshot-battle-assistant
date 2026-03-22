import Link from "next/link";
import { createTemplateAction } from "@/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { prisma } from "@/lib/prisma";

export default async function NewTemplateManualPage() {
  const guilds = await prisma.guildSettings.findMany({
    orderBy: { discordGuildId: "asc" },
  });

  return (
    <div className="dashboard-main">
      <p className="run-detail__back">
        <Link href="/dashboard/templates/new" className="text-link">
          ← Choix du mode
        </Link>
      </p>
      <PageHeader
        title="Nouveau modèle (manuel)"
        description="Crée un modèle vide pour ta guilde, puis configure les phases dans l’éditeur."
      />

      {guilds.length === 0 ? (
        <SectionCard title="Aucune guilde">
          <p className="muted">
            Invite le bot sur Discord et utilise une commande slash une fois (ex.{" "}
            <code>/setup channel</code>) pour créer la fiche serveur.
          </p>
        </SectionCard>
      ) : (
        <SectionCard title="Informations">
          <form action={createTemplateAction} className="form-stack">
            <div className="form-field">
              <label htmlFor="guildId">Guilde</label>
              <select id="guildId" name="guildId" required>
                {guilds.map((g) => (
                  <option key={g.id} value={g.id}>
                    Serveur · …{g.discordGuildId.slice(-6)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="name">Nom du modèle</label>
              <input
                id="name"
                name="name"
                required
                placeholder="Ex. Bataille porte sud"
              />
            </div>
            <div className="form-field">
              <label htmlFor="description">Description interne (optionnel)</label>
              <input
                id="description"
                name="description"
                placeholder="Note pour les officiers"
              />
            </div>
            <div className="form-field">
              <label htmlFor="eventDurationMinutes">
                Durée de l’événement (minutes, in-game)
              </label>
              <input
                id="eventDurationMinutes"
                name="eventDurationMinutes"
                type="number"
                min={1}
                max={1440}
                defaultValue={90}
              />
              <p className="field-hint">
                Temps réel prévu (brief → fin). Les annonces Discord se règlent ensuite
                dans l’éditeur de phases.
              </p>
            </div>
            <button type="submit" className="btn btn-primary">
              Créer et ouvrir l’éditeur
            </button>
          </form>
        </SectionCard>
      )}
    </div>
  );
}
