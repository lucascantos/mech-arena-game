import type { Ability } from "./abilities/ability";
import type { BackUnit } from "./back/backUnit";
import type { Fighter } from "./fighter";
import type { Input } from "./input";
import type { World } from "./world";
import { Weapon } from "./weapons/weapon";

/**
 * What a mech carries: its main weapons (one in hand at a time, switched with
 * 1-4 / wheel) and a single back unit used with the right mouse button.
 */
export class Loadout {
  readonly weapons: Weapon[] = [];
  /** Index of the weapon in hand. */
  slot = 0;
  back: BackUnit | null = null;

  /** The weapon in hand, if any. */
  get weapon(): Weapon | undefined {
    return this.weapons[this.slot];
  }

  /** Abilities the weapon in hand brings (a sword's lunge). */
  get abilities(): Ability[] {
    const a = this.weapon?.ability;
    return a ? [a] : [];
  }

  /** Speed multiplier from the gear right now (charging, raised shield...). */
  get moveMultiplier(): number {
    return (this.weapon?.moveMultiplier ?? 1) * (this.back?.moveMultiplier ?? 1);
  }

  /** Everything carried, for weight. */
  get carried(): { weight: number }[] {
    return this.back ? [...this.weapons, this.back] : this.weapons;
  }

  /** Adds a hand weapon; throws if it's a back weapon or the torso is full. */
  equip(weapon: Weapon, capacity: number, who: string): void {
    if (weapon.stats.mount !== "hand") throw new Error(`${who}: ${weapon.name} goes in the back slot`);
    if (this.weapons.length >= capacity) throw new Error(`${who}: torso carries at most ${capacity} weapon(s)`);
    this.weapons.push(weapon);
  }

  /** The single back slot: a back weapon, or a unit like the Pulse Shield. */
  mountBack(unit: BackUnit): void {
    if (unit instanceof Weapon && unit.stats.mount !== "back") throw new Error(`${unit.name} is a hand weapon, not a back weapon`);
    this.back = unit;
  }

  select(slot: number): void {
    if (slot === this.slot || slot < 0 || slot >= this.weapons.length || this.weapon?.ability?.isActive) return;
    this.weapon?.holster();
    this.slot = slot;
  }

  /** Weapon switching, reloads and both triggers for one tick. */
  handleInput(input: Input, owner: Fighter, world: World): void {
    if (input.selectSlot >= 0) this.select(input.selectSlot);
    if (input.reload) this.weapon?.startReload();
    const canAct = owner.canAct();
    this.back?.trigger(input.back && canAct, owner, world);
    const blocked = this.back?.blocksMainWeapon ?? false; // e.g. shield raised
    this.weapon?.trigger(input.fire && !blocked && canAct, owner, world);
  }

  /** Timers: the weapon in hand and the back unit. */
  update(owner: Fighter): void {
    this.weapon?.update(owner);
    this.back?.update(owner);
  }

  reset(): void {
    this.slot = 0;
    for (const w of this.weapons) w.reset();
    this.back?.reset();
  }
}
