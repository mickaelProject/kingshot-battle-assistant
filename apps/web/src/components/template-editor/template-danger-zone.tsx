"use client";

import * as Collapsible from "@radix-ui/react-collapsible";
import { useState } from "react";
import { deleteTemplateAction } from "@/actions/data";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

function IconWarning({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 9v4M12 17h.01M10.3 4.2h3.4L21 18H3L10.3 4.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TemplateDangerZone({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const [openCollapsible, setOpenCollapsible] = useState(false);
  const returnTo = `/dashboard/templates/${templateId}/edit`;

  return (
    <Collapsible.Root open={openCollapsible} onOpenChange={setOpenCollapsible}>
      <div className="rounded-xl border border-red-900/40 bg-red-950/30">
        <Collapsible.Trigger
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-red-200/90 outline-none hover:bg-red-950/40 [&[data-state=open]]:border-b [&[data-state=open]]:border-red-900/30"
          type="button"
        >
          <IconWarning className="text-red-400" />
          Zone dangereuse
          <span className="ml-auto text-xs font-normal text-red-300/60">
            {openCollapsible ? "▼" : "▶"}
          </span>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div className="space-y-4 px-4 pb-4 pt-2">
            <p className="text-xs leading-relaxed text-red-200/70">
              La suppression est définitive. Elle est refusée si une session
              active ou un lancement planifié utilise encore ce modèle.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="w-full rounded-lg border border-red-500/40 bg-red-600/20 px-4 py-2.5 text-sm font-semibold text-red-200 transition hover:bg-red-600/30"
                >
                  Supprimer le modèle
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Supprimer « {templateName} » ?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes les phases associées
                    seront supprimées.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Annuler</AlertDialogCancel>
                  <form action={deleteTemplateAction} className="inline">
                    <input type="hidden" name="id" value={templateId} />
                    <input type="hidden" name="errorReturnTo" value={returnTo} />
                    <button
                      type="submit"
                      className="inline-flex h-9 items-center justify-center rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Confirmer la suppression
                    </button>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Collapsible.Content>
      </div>
    </Collapsible.Root>
  );
}
