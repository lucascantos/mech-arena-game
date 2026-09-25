import { buildFighter } from "../../presets/buildFighter";
import { toPreset, type Build } from "../../presets/build";
import type { BackUnit } from "../../sim/back/backUnit";
import type { Fighter } from "../../sim/fighter";
import { REVIEW_ATTRIBUTES, fill } from "./attributes";
import { slotsOf, type Option, type Slot, type SlotId } from "./slots";
import { UNIT_ATTRIBUTES } from "./unitAttributes";

/** A line of the picker: "Speed  259 → 270" (the new value colored as a buff or nerf), or just "Speed  259". */
interface Delta {
  label: string;
  from: string;
  to: string;
  change: "up" | "down" | "same";
}

const fighterOf = (b: Build): Fighter => buildFighter(toPreset(b), { id: 1, team: 1, color: "#e5534b", pos: { x: 0, y: 0 } });
const verdict = (better: "higher" | "lower", a: number, b: number): Delta["change"] => {
  if (a === b) return "same";
  return (b > a) === (better === "higher") ? "up" : "down";
};

/**
 * The hangar: Selection (pick a slot, then a part for it, with what each
 * choice would change) and Review (every attribute of the build as a bar).
 */
export class HangarView {
  private slot: SlotId = "legs";
  private readonly root = document.createElement("div");

  constructor(
    private build: Build,
    private readonly onChange: (build: Build) => void,
    private readonly onDone: () => void,
  ) {
    this.root.className = "hangar";
  }

  mount(parent: HTMLElement): void {
    parent.append(this.root);
    this.render();
  }

  private set(build: Build): void {
    this.build = build;
    this.onChange(build);
    this.render();
  }

  private render(): void {
    const slots = slotsOf(this.build);
    const slot = slots.find((s) => s.id === this.slot) ?? slots[1];
    const me = fighterOf(this.build);
    this.root.replaceChildren(this.slotColumn(slots, slot), this.pickerColumn(slot, me), this.reviewColumn(me));
  }

  /** Selection, step 1: the slots and what's in them. */
  private slotColumn(slots: Slot[], active: Slot): HTMLElement {
    const col = section("Selection");
    for (const s of slots) {
      const b = button("hangar-slot", () => ((this.slot = s.id), this.render()));
      b.classList.toggle("active", s === active);
      b.append(span(s.label, "hangar-slot-label"), span(s.current, "hangar-slot-value"));
      col.append(b);
    }
    col.append(button("hangar-done", () => this.onDone(), "Done"));
    return col;
  }

  /** Selection, step 2: the choices for the slot, each with the changes it would make. */
  private pickerColumn(slot: Slot, me: Fighter): HTMLElement {
    const col = section(slot.label);
    for (const option of slot.options) {
      const b = button("hangar-option", () => this.set(option.apply(this.build)));
      b.classList.toggle("equipped", option.equipped);
      b.append(span(option.label, "hangar-option-name"));
      if (option.equipped) b.append(span("Equipped", "hangar-tag"));
      for (const d of this.deltas(slot, option, me)) b.append(deltaRow(d));
      col.append(b);
    }
    return col;
  }

  /** The slot's lines for this option, the same lines for every option: weapon stats, or mech attributes. */
  private deltas(slot: Slot, option: Option, me: Fighter): Delta[] {
    if (option.unit !== undefined) return unitDeltas(slot.unit ?? null, option.unit);
    const next = option.equipped ? me : fighterOf(option.apply(this.build));
    return (slot.attributes ?? []).map((a) => {
      const [x, y] = [a.value(me), a.value(next)];
      const [from, to] = [a.format(x, me), a.format(y, next)];
      return { label: a.label, from, to, change: from === to ? "same" : verdict(a.better, x, y) };
    });
  }

  /** Review: the build's name and every attribute as a bar (full = the best any build reaches). */
  private reviewColumn(me: Fighter): HTMLElement {
    const col = section("Review");
    const name = document.createElement("input");
    name.className = "hangar-name";
    name.maxLength = 20;
    name.value = this.build.name;
    name.addEventListener("input", () => {
      this.build = { ...this.build, name: name.value };
      this.onChange(this.build);
    });
    // One grid for all rows, so every bar lines up whatever the length of its value.
    const grid = document.createElement("div");
    grid.className = "hangar-attrs";
    col.append(name, grid);
    for (const a of REVIEW_ATTRIBUTES) {
      const v = a.value(me);
      const row = document.createElement("div");
      row.className = "hangar-attr";
      const bar = document.createElement("div");
      bar.className = "hangar-bar";
      const filled = document.createElement("div");
      filled.style.width = `${Math.round(fill(a, v) * 100)}%`;
      bar.append(filled);
      row.append(span(a.label, "hangar-attr-label"), bar, span(a.format(v, me), "hangar-attr-value"));
      grid.append(row);
    }
    return col;
  }
}

function unitDeltas(before: BackUnit | null, after: BackUnit | null): Delta[] {
  return UNIT_ATTRIBUTES.map((a) => {
    const x = before ? a.value(before) : null;
    const y = after ? a.value(after) : null;
    const from = x === null || !before ? "—" : a.format(x, before);
    const to = y === null || !after ? "—" : a.format(y, after);
    return { label: a.label, from, to, change: from === to ? "same" : verdict(a.better, x ?? 0, y ?? 0) };
  });
}

function section(title: string): HTMLElement {
  const s = document.createElement("section");
  s.append(span(title, "hangar-heading"));
  return s;
}

function button(className: string, onClick: () => void, text = ""): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = className;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function span(text: string, className: string): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = className;
  s.textContent = text;
  return s;
}

function deltaRow(d: Delta): HTMLElement {
  const row = document.createElement("span");
  row.className = "hangar-delta";
  row.append(span(d.label, "hangar-delta-label"));
  if (d.change === "same") row.append(span("", "hangar-delta-from"), span(d.to, "same"));
  else row.append(span(`${d.from} → `, "hangar-delta-from"), span(d.to, d.change));
  return row;
}
