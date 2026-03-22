import Link from "next/link";

export default function ClientAppHomePage() {
  return (
    <main className="live-war live-war--landing">
      <p className="live-war__eyebrow">Espace joueur</p>
      <h1 className="live-war__title">Mission en direct</h1>
      <p className="muted live-war--landing__lede">
        Utilisez le lien envoyé par votre alliance (il contient l’identifiant de
        mission). Aucune connexion admin requise.
      </p>
      <p className="muted live-war--landing__hint">
        Exemple :{" "}
        <code className="roster-code-hint">
          /live/VOTRE_RUN_ID?me=VOTRE_ID_DISCORD
        </code>
        <br />
        <span className="live-war--landing__sub">
          Sans <code className="roster-code-hint">me</code>, la vue affiche
          l’objectif global sans poste personnel.
        </span>
      </p>
      <p className="live-war--landing__admin">
        <Link href="/login" className="text-link">
          Accès administrateur →
        </Link>
      </p>
    </main>
  );
}
