import type { DamageType } from "../sim/weapons/weaponStats";

export const DAMAGE_COLORS: Record<DamageType, string> = {
  bullet: "#f2cc60",
  energy: "#56d4dd",
  explosive: "#f0883e",
};

export const UI = {
  background: "#0e1116",
  floor: "#161b22",
  grid: "#1f2630",
  wall: "#3a4452",
  text: "#c9d1d9",
  muted: "#8b949e",
  hp: "#3fb950",
  defense: "#58a6ff",
  barBack: "#00000088",
  damage: "#ff7b72",
  crit: "#ffd33d",
};

/** Darker variant of a #rrggbb color for outlines. */
export function shade(hex: string, factor = 0.6): string {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * factor;
  const g = ((n >> 8) & 255) * factor;
  const b = (n & 255) * factor;
  return `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
}
