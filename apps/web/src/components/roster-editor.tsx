"use client";

import { useEffect, useMemo } from "react";
import {
  formatPowerDisplay,
  parseRosterText,
} from "@/lib/parse-roster-line";
import type { ParsedRoster } from "@/lib/roster-editor-types";
import { cn } from "@/lib/utils";

export type { ParsedRoster, ParsedPlayer } from "@/lib/roster-editor-types";

function sortByPowerDesc(players: ParsedRoster["groupA"]) {
  return [...players].sort((a, b) => {
    const pa = a.power ?? -1;
    const pb = b.power ?? -1;
    return pb - pa;
  });
}

function buildRoster(textA: string, textB: string): ParsedRoster {
  const groupA = parseRosterText(textA);
  const groupB = parseRosterText(textB);
  const powerSum = (g: typeof groupA) =>
    g.reduce((s, p) => s + (p.error || p.power == null ? 0 : p.power), 0);
  return {
    groupA,
    groupB,
    totalPlayers: groupA.length + groupB.length,
    totalPower: powerSum(groupA) + powerSum(groupB),
  };
}

function PreviewList({
  title,
  players,
}: {
  title: string;
  players: ParsedRoster["groupA"];
}) {
  const sorted = useMemo(() => sortByPowerDesc(players), [players]);
  const maxP = Math.max(
    1,
    ...sorted.map((p) => (p.power != null && !p.error ? p.power : 0)),
  );

  if (sorted.length === 0) {
    return (
      <div className="rounded-lg border border-[#1e2230] bg-[#0d1117]/50 px-3 py-2 text-xs text-slate-600">
        {title} — vide
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#1e2230] bg-[#0d1117] p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      <ul className="space-y-2">
        {sorted.map((p, i) => (
          <li key={`${p.name}-${i}`} className="flex items-center gap-2">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm",
                p.error ? "text-red-400" : "text-slate-200",
              )}
            >
              {p.name}
              {p.error ? (
                <span className="ml-2 text-[10px] font-medium uppercase text-red-400/80">
                  format ?
                </span>
              ) : null}
            </span>
            {!p.error && p.power != null ? (
              <>
                <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-black/50">
                  <div
                    className="h-full rounded-full bg-amber-500/80"
                    style={{ width: `${Math.min(100, (p.power / maxP) * 100)}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-xs text-slate-400">
                  {formatPowerDisplay(p.power)}
                </span>
              </>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface RosterEditorProps {
  groupALabel?: string;
  groupBLabel?: string;
  groupABadge?: string;
  groupBBadge?: string;
  /** Un seul bloc roster (ex. mobilisation — tout l’effectif dans le champ A). */
  singleGroup?: boolean;
  valueA: string;
  valueB: string;
  onValueAChange: (v: string) => void;
  onValueBChange: (v: string) => void;
  /** Appelé à chaque modification (pensez à stabiliser avec useCallback côté parent si besoin). */
  onRosterChange: (roster: ParsedRoster) => void;
}

export function RosterEditor({
  groupALabel = "Groupe A",
  groupBLabel = "Groupe B",
  groupABadge = "Principal",
  groupBBadge = "Secondaire",
  singleGroup = false,
  valueA,
  valueB,
  onValueAChange,
  onValueBChange,
  onRosterChange,
}: RosterEditorProps) {
  const roster = useMemo(
    () => buildRoster(valueA, valueB),
    [valueA, valueB],
  );

  function pushA(next: string) {
    onValueAChange(next);
    onRosterChange(buildRoster(next, valueB));
  }

  function pushB(next: string) {
    onValueBChange(next);
    onRosterChange(buildRoster(valueA, next));
  }

  useEffect(() => {
    onRosterChange(buildRoster(valueA, valueB));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync initial / hydratation uniquement
  }, []);

  const pa = roster.groupA.filter((p) => !p.error && p.power != null);
  const pb = roster.groupB.filter((p) => !p.error && p.power != null);
  const sumA = pa.reduce((s, p) => s + (p.power ?? 0), 0);
  const sumB = pb.reduce((s, p) => s + (p.power ?? 0), 0);

  const idA = "roster-editor-a";
  const idB = "roster-editor-b";

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-[#1e2230] bg-[#111318]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2230] px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor={idA}
              className="text-sm font-semibold text-slate-200"
            >
              {groupALabel}
            </label>
            <span className="rounded-full bg-blue-950 px-2 py-0.5 text-[10px] font-semibold text-blue-400">
              {groupABadge}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            {roster.groupA.length} joueur
            {roster.groupA.length !== 1 ? "s" : ""}
          </span>
        </div>
        <textarea
          id={idA}
          value={valueA}
          onChange={(e) => pushA(e.target.value)}
          rows={8}
          spellCheck={false}
          className="w-full resize-none border-0 bg-[#0d1117] px-4 py-3 text-sm font-sans text-slate-200 outline-none placeholder:text-slate-600"
          placeholder={"CRICKETTS 3704\nEDA 3014"}
        />
      </div>

      {!singleGroup ? (
        <div className="overflow-hidden rounded-xl border border-[#1e2230] bg-[#111318]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e2230] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <label
                htmlFor={idB}
                className="text-sm font-semibold text-slate-200"
              >
                {groupBLabel}
              </label>
              <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                {groupBBadge}
              </span>
            </div>
            <span className="text-xs text-slate-500">
              {roster.groupB.length} joueur
              {roster.groupB.length !== 1 ? "s" : ""}
            </span>
          </div>
          <textarea
            id={idB}
            value={valueB}
            onChange={(e) => pushB(e.target.value)}
            rows={8}
            spellCheck={false}
            className="w-full resize-none border-0 bg-[#0d1117] px-4 py-3 text-sm font-sans text-slate-200 outline-none placeholder:text-slate-600"
            placeholder={"Optionnel — une ligne par joueur"}
          />
        </div>
      ) : null}

      <div
        className={cn(
          "grid grid-cols-2 gap-2 rounded-lg border border-[#1e2230] bg-[#111318] p-3",
          singleGroup ? "sm:grid-cols-3" : "sm:grid-cols-4",
        )}
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Total joueurs
          </p>
          <p className="font-mono text-lg font-semibold text-slate-200">
            {roster.totalPlayers}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Puissance A
          </p>
          <p className="font-mono text-lg font-semibold text-amber-500/90">
            {formatPowerDisplay(sumA)}
          </p>
        </div>
        {!singleGroup ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              Puissance B
            </p>
            <p className="font-mono text-lg font-semibold text-emerald-400/90">
              {formatPowerDisplay(sumB)}
            </p>
          </div>
        ) : null}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
            Total puissance
          </p>
          <p className="font-mono text-lg font-semibold text-slate-200">
            {formatPowerDisplay(roster.totalPower)}
          </p>
        </div>
      </div>

      <div
        className={`grid gap-3 ${singleGroup ? "" : "sm:grid-cols-2"}`}
      >
        <PreviewList title={`Aperçu ${groupALabel}`} players={roster.groupA} />
        {!singleGroup ? (
          <PreviewList title={`Aperçu ${groupBLabel}`} players={roster.groupB} />
        ) : null}
      </div>
    </div>
  );
}
