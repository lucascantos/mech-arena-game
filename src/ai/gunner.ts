import type { Fighter } from "../sim/fighter";
import type { Rng } from "../sim/rng";
import { add, dist, normalize, scale, sub, vec, type Vec2 } from "../sim/vec";
import { HomingWeapon } from "../sim/weapons/homingWeapon";
import type { Weapon } from "../sim/weapons/weapon";
import type { Personality } from "./personality";

const DEG = Math.PI / 180;
/** Ticks between re-rolling the aim error, so the aim drifts instead of shaking. */
const AIM_DRIFT_TICKS = 20;

/** The shooting half of a bot: weapon choice, aim, trigger and reload. */
export class Gunner {
  private aimOffset = 0;
  private aimTicks = 0;
  private triggerToggle = false;

  constructor(private readonly rng: Rng, private readonly personality: Personality) {}

  /** Best slot for this distance. Prefers loaded weapons whose sweet spot is close to `range`. */
  chooseSlot(self: Fighter, range: number): number {
    let best = self.weaponSlot;
    let bestScore = -Infinity;
    self.weapons.forEach((w, slot) => {
      // Holstered weapons don't reload, so switching to an empty one is pointless.
      if (slot !== self.weaponSlot && w.ammo === 0) return;
      let score = -Math.abs(range - idealRange(w, self.size.x));
      if (range > w.stats.range * 0.9) score -= 1000;
      if (w.isReloading) score -= 500;
      if (slot === self.weaponSlot) score += 40; // a bit of loyalty, avoids flip-flopping
      if (score > bestScore) [best, bestScore] = [slot, score];
    });
    return best;
  }

  /** Aim direction, leading the target based on projectile speed plus some error. */
  aim(self: Fighter, target: Fighter): Vec2 {
    const weapon = self.weapon;
    const speed = weapon?.stats.projectileSpeed ?? 1000;
    const travel = dist(self.pos, target.pos) / speed;
    // Homing missiles steer themselves: aim straight at the target so the lock picks it.
    const leadSkill = weapon instanceof HomingWeapon ? 0 : this.personality.leadSkill;
    const lead = scale(add(target.vel, target.knockback), travel * leadSkill);
    const dir = normalize(sub(add(target.pos, lead), self.pos));

    if (--this.aimTicks <= 0) {
      this.aimOffset = this.rng.range(-1, 1) * this.personality.aimError * DEG;
      this.aimTicks = AIM_DRIFT_TICKS;
    }
    const c = Math.cos(this.aimOffset);
    const s = Math.sin(this.aimOffset);
    return vec(dir.x * c - dir.y * s, dir.x * s + dir.y * c);
  }

  /** Trigger state for this tick. Semi-auto weapons need the trigger released between shots. */
  trigger(self: Fighter, range: number): boolean {
    const w = self.weapon;
    if (!w || w.isReloading || w.ammo === 0 || range > w.stats.range * 0.9) return false;
    if (w.stats.fireMode === "auto") return true;
    this.triggerToggle = !this.triggerToggle;
    return this.triggerToggle;
  }

  /** Top off the magazine during a lull. */
  wantsReload(self: Fighter, calm: boolean): boolean {
    const w = self.weapon;
    return !!w && calm && !w.isReloading && w.ammo < w.stats.magazine * 0.3;
  }
}

/**
 * Distance where a weapon is at its best: half its range, but no farther than
 * where the spread cone is still about as wide as a fighter (so shotguns stay close).
 */
function idealRange(w: Weapon, targetWidth: number): number {
  const halfSpread = ((w.stats.spread / 2) * Math.PI) / 180;
  const tight = halfSpread > 0 ? targetWidth / Math.tan(halfSpread) : Infinity;
  return Math.min(w.stats.range * 0.5, tight);
}
