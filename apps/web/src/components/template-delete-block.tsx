"use client";

import { deleteTemplateAction } from "@/actions/data";
import { ConfirmDestructive } from "@/components/ui/confirm-dialog";

export function TemplateDeleteBlock({
  templateId,
  templateName,
  errorReturnTo,
  triggerClassName = "btn btn-danger",
}: {
  templateId: string;
  templateName: string;
  /** URL de retour en cas d’erreur (toast) */
  errorReturnTo?: string;
  /** Style du bouton d’ouverture */
  triggerClassName?: string;
}) {
  const returnTo =
    errorReturnTo ?? `/dashboard/templates/${templateId}/edit`;
  return (
    <ConfirmDestructive
      label="Supprimer le modèle"
      triggerClassName={triggerClassName}
      confirmLabel={`Supprimer définitivement « ${templateName} » ?`}
      detail={
        <span>
          Cette action est irréversible. Si une session est active ou un run
          planifié / en cours utilise ce modèle, la suppression sera refusée.
        </span>
      }
    >
      <form action={deleteTemplateAction}>
        <input type="hidden" name="id" value={templateId} />
        <input type="hidden" name="errorReturnTo" value={returnTo} />
        <button type="submit" className="btn btn-danger">
          Confirmer la suppression
        </button>
      </form>
    </ConfirmDestructive>
  );
}
