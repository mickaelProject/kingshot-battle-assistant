"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

const TRUNCATE_AT = 120;

export function TemplateDescriptionField({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const long = defaultValue.length > TRUNCATE_AT;
  const preview = long
    ? `${defaultValue.slice(0, TRUNCATE_AT).trimEnd()}…`
    : defaultValue;

  return (
    <div className="space-y-2">
      {!expanded && long ? (
        <>
          <input type="hidden" name={name} value={defaultValue} />
          <p className="rounded-lg border border-[#1e2230] bg-[#0a0c10] px-3 py-2.5 text-sm leading-relaxed text-slate-300">
            {preview}
          </p>
          <button
            type="button"
            className="text-xs font-medium text-war-amber hover:text-amber-400 hover:underline"
            onClick={() => setExpanded(true)}
          >
            Voir plus
          </button>
        </>
      ) : (
        <>
          <Textarea
            id={id}
            name={name}
            defaultValue={defaultValue}
            rows={3}
            placeholder="Notes internes sur ce modèle (non visible dans Discord)"
            className="resize-none border-[#1e2230] bg-[#0a0c10] font-sans focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15"
          />
          {long ? (
            <button
              type="button"
              className="text-xs font-medium text-slate-500 hover:text-slate-400"
              onClick={() => setExpanded(false)}
            >
              Réduire l’aperçu
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
