import type { BackUnit } from "../../sim/back/backUnit";
import { Weapon } from "../../sim/weapons/weapon";

/** A stat of a single weapon or back unit, compared between two of them in the part picker. */
export interface UnitAttribute {
  label: string;
  /** Null when it doesn't apply to this unit (e.g. damage of a shield). */
  value(u: BackUnit): number | null;
  format(v: number, u: BackUnit): string;
  better: "higher" | "lower";
}

const weapon = (u: BackUnit) => (u instanceof Weapon ? u : null);

/** The same four lines for every weapon and back unit. */
export const UNIT_ATTRIBUTES: UnitAttribute[] = [
  {
    label: "Damage",
    value: (u) => {
      const w = weapon(u);
      return w ? w.stats.damage * w.stats.pellets : null;
    },
    format: (v, u) => {
      const w = weapon(u);
      return w && w.stats.pellets > 1 ? `${w.stats.damage}×${w.stats.pellets}` : `${Math.round(v)}`;
    },
    better: "higher",
  },
  { label: "Fire rate", value: (u) => weapon(u)?.stats.fireRate ?? null, format: (v) => `${v.toFixed(1)}/s`, better: "higher" },
  { label: "Magazine", value: (u) => weapon(u)?.stats.magazine ?? null, format: (v) => `${v}`, better: "higher" },
  { label: "Weight", value: (u) => u.weight, format: (v) => `${v}`, better: "lower" },
];
