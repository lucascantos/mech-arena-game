import { fitToTorso, fromPreset, type Build } from "../../presets/build";
import { BACK_UNITS, HAND_WEAPONS, HEADS, LEGS, TORSOS, unitName } from "../../presets/partCatalog";
import { PRESETS } from "../../presets/presets";
import type { BackUnit } from "../../sim/back/backUnit";
import { HEAD_ATTRIBUTES, HP, LEGS_ATTRIBUTES, SPEED, ENERGY, TORSO_ATTRIBUTES, WEIGHT, type Attribute } from "./attributes";

/** Something the player can change: a part, a weapon slot, or "start from a preset". */
export type SlotId = "preset" | "legs" | "torso" | "head" | "back" | `hand${number}`;

/** One choice in the part picker. */
export interface Option {
  label: string;
  /** The build with this choice made. */
  apply(build: Build): Build;
  /** For weapon/back choices: an instance to compare stats with (null = empty slot). */
  unit?: BackUnit | null;
  /** True for the part the build already has. */
  equipped: boolean;
}

export interface Slot {
  id: SlotId;
  label: string;
  /** What's in it now. */
  current: string;
  options: Option[];
  /** Mech attributes the picker shows for every option (parts and presets). */
  attributes?: Attribute[];
  /** The unit in this slot now, for weapon/back comparisons (the picker shows unit stats instead). */
  unit?: BackUnit | null;
}

const handSlot = (i: number): SlotId => `hand${i}`;

/** Every slot of `build`, top to bottom as the hangar lists them. */
export function slotsOf(build: Build): Slot[] {
  const slots: Slot[] = [
    {
      id: "preset",
      label: "Start from",
      current: "a preset build",
      attributes: [HP, WEIGHT, SPEED, ENERGY],
      options: PRESETS.map((p) => ({ label: p.name, apply: () => fromPreset(p), equipped: false })),
    },
    {
      id: "legs",
      label: "Legs",
      current: build.legs.name,
      attributes: LEGS_ATTRIBUTES,
      options: LEGS.map((legs) => ({ label: legs.name, apply: (b) => ({ ...b, legs }), equipped: legs === build.legs })),
    },
    {
      id: "torso",
      label: "Torso",
      current: build.torso.name,
      attributes: TORSO_ATTRIBUTES,
      options: TORSOS.map((torso) => ({
        label: `${torso.name} (${torso.weaponCapacity} hand slot${torso.weaponCapacity > 1 ? "s" : ""})`,
        apply: (b) => fitToTorso({ ...b, torso }),
        equipped: torso === build.torso,
      })),
    },
    {
      id: "head",
      label: "Head",
      current: build.head.name,
      attributes: HEAD_ATTRIBUTES,
      options: HEADS.map((head) => ({ label: head.name, apply: (b) => ({ ...b, head }), equipped: head === build.head })),
    },
  ];

  build.hand.forEach((W, i) => {
    const set = (b: Build, C: (typeof HAND_WEAPONS)[number] | null) => ({ ...b, hand: b.hand.map((x, j) => (j === i ? C : x)) });
    const options: Option[] = HAND_WEAPONS.map((C) => ({ label: unitName(C), apply: (b) => set(b, C), unit: new C(), equipped: C === W }));
    const othersEmpty = build.hand.every((x, j) => j === i || x === null);
    if (!othersEmpty) options.push({ label: "Empty", apply: (b) => set(b, null), unit: null, equipped: W === null });
    slots.push({ id: handSlot(i), label: `Hand ${i + 1}`, current: W ? unitName(W) : "Empty", options, unit: W ? new W() : null });
  });

  slots.push({
    id: "back",
    label: "Back",
    current: unitName(build.back),
    options: BACK_UNITS.map((C) => ({ label: unitName(C), apply: (b) => ({ ...b, back: C }), unit: new C(), equipped: C === build.back })),
    unit: new build.back(),
  });
  return slots;
}
