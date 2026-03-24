"use client";

import { SWORDLAND_BUILDINGS } from "@/lib/tactical-war-plan";

const MAP_GRID: Record<string, { gridRow: number; gridColumn: number }> = {
  abbey1: { gridRow: 1, gridColumn: 1 },
  sanctum1: { gridRow: 1, gridColumn: 2 },
  abbey3: { gridRow: 1, gridColumn: 4 },
  abbey4: { gridRow: 1, gridColumn: 5 },
  abbey2: { gridRow: 2, gridColumn: 1 },
  sanctum2: { gridRow: 2, gridColumn: 2 },
  bell: { gridRow: 2, gridColumn: 3 },
  stables: { gridRow: 2, gridColumn: 4 },
  hall: { gridRow: 2, gridColumn: 5 },
  merc: { gridRow: 3, gridColumn: 4 },
  sword: { gridRow: 3, gridColumn: 5 },
};

/**
 * Schéma statique Ouest/Est (éditeur / aperçu) — sans assignations joueurs.
 * Le live et les autres `eventProductKey` n’affichent pas cette carte.
 */
export function SwordlandStaticMapSchematic() {
  return (
    <div className="swordland-static-map">
      <p className="swordland-static-map__title font-rajdhani text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Carte tactique — Swordland (schéma)
      </p>
      <div className="swordland-map__arena swordland-static-map__arena">
        <div className="swordland-map__axis swordland-map__axis--w">Ouest</div>
        <div className="swordland-map__axis swordland-map__axis--e">Est</div>
        <div className="swordland-map__grid">
          {SWORDLAND_BUILDINGS.map((b) => {
            const pos = MAP_GRID[b.id];
            const style = pos
              ? { gridRow: pos.gridRow, gridColumn: pos.gridColumn }
              : undefined;
            return (
              <div
                key={b.id}
                className="swordland-map-node swordland-static-map__node"
                style={style}
              >
                <span className="swordland-map-node__name">{b.name}</span>
                <span className="swordland-static-map__side muted">{b.side}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
