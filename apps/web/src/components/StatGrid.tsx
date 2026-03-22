"use client";

import { cn } from "@/lib/utils";

export type StatGridTone = "amber" | "green" | "red" | "muted";

export type StatGridItem = {
  label: string;
  value: string;
  sub: string;
  color: StatGridTone;
};

const toneClass: Record<StatGridTone, string> = {
  amber: "text-amber-500",
  green: "text-green-400",
  red: "text-red-400",
  muted: "text-slate-600",
};

export function StatGrid({ items }: { items: StatGridItem[] }) {
  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[#1e2230] bg-[#111318] p-4"
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {item.label}
          </div>
          <div
            className={cn(
              "mb-1 font-rajdhani text-2xl font-bold tracking-tight",
              toneClass[item.color],
            )}
          >
            {item.value}
          </div>
          <div className="text-xs text-slate-600">{item.sub}</div>
        </div>
      ))}
    </div>
  );
}
