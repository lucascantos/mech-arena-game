import { BALANCED } from "../ai/personality";
import type { BackUnitClass } from "../sim/back/backUnit";
import type { Head } from "../sim/parts/head";
import type { Legs } from "../sim/parts/legs";
import type { Torso } from "../sim/parts/torso";
import type { WeaponClass } from "../sim/weapons/catalog";
import { BACK_UNITS, HAND_WEAPONS, HEADS, LEGS, TORSOS, unitName } from "./partCatalog";
import type { MechPreset } from "./presets";

/** A player's own mech, as edited in the hangar. `hand[i]` null = empty slot. */
export interface Build {
  name: string;
  legs: Legs;
  torso: Torso;
  head: Head;
  hand: (WeaponClass | null)[];
  back: BackUnitClass;
}

/** One entry per hand slot the torso has; extra weapons are dropped, missing slots are empty. */
export function fitToTorso(build: Build): Build {
  const cap = build.torso.weaponCapacity;
  const hand = Array.from({ length: cap }, (_, i) => build.hand[i] ?? null);
  if (!hand.some(Boolean)) hand[0] = HAND_WEAPONS[0]; // always carry something in hand
  return { ...build, hand };
}

export function fromPreset(p: MechPreset, name = p.name): Build {
  return fitToTorso({ name, legs: p.legs, torso: p.torso, head: p.head, hand: [...p.weapons], back: p.back });
}

/** The build as a preset the game can spawn. Bots driving it play balanced. */
export function toPreset(build: Build): MechPreset {
  return {
    id: "custom",
    name: build.name.trim() || "Custom",
    legs: build.legs,
    torso: build.torso,
    head: build.head,
    weapons: build.hand.filter((w): w is WeaponClass => w !== null),
    back: build.back,
    personality: BALANCED,
  };
}

/** Saved form: part names only. */
interface SavedBuild {
  name: string;
  legs: string;
  torso: string;
  head: string;
  hand: (string | null)[];
  back: string;
}

export function encodeBuild(b: Build): string {
  const saved: SavedBuild = {
    name: b.name,
    legs: b.legs.name,
    torso: b.torso.name,
    head: b.head.name,
    hand: b.hand.map((w) => (w ? unitName(w) : null)),
    back: unitName(b.back),
  };
  return JSON.stringify(saved);
}

/** Null if the text isn't a build or names a part that no longer exists. */
export function decodeBuild(text: string): Build | null {
  try {
    const s = JSON.parse(text) as SavedBuild;
    const legs = LEGS.find((p) => p.name === s.legs);
    const torso = TORSOS.find((p) => p.name === s.torso);
    const head = HEADS.find((p) => p.name === s.head);
    const back = BACK_UNITS.find((C) => unitName(C) === s.back);
    if (!legs || !torso || !head || !back || !Array.isArray(s.hand)) return null;
    const hand = s.hand.map((n) => (n === null ? null : (HAND_WEAPONS.find((C) => unitName(C) === n) ?? null)));
    return fitToTorso({ name: String(s.name ?? "Custom"), legs, torso, head, hand, back });
  } catch {
    return null;
  }
}
