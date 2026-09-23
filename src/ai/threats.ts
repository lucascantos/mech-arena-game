import type { Fighter } from "../sim/fighter";
import type { Rng } from "../sim/rng";
import { dot, normalize, perp, scale, sub, vec, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";
import type { Personality } from "./personality";

/** Only react to shots arriving within this many seconds. */
const LOOKAHEAD = 0.4;
/** After deciding on a threat, ignore new ones for this long (ticks). */
const DECISION_COOLDOWN = 30;
/** Damage at which a single projectile is worth a full-chance dodge. */
const SCARY_DAMAGE = 25;

/**
 * Notices incoming danger (enemy dashes, projectiles on a collision course)
 * and schedules a dodge after the bot's reaction delay.
 */
export class ThreatSense {
  private dodgeAt = -1;
  private dodgeDir: Vec2 = vec();
  private quietUntil = 0;
  private sawEnemyDash = false;
  private readonly seen = new Set<number>();

  constructor(private readonly rng: Rng, private readonly personality: Personality) {}

  /** Returns a dodge direction if the bot should dodge this tick. */
  update(self: Fighter, target: Fighter, world: World): Vec2 | null {
    this.watchEnemyDash(self, target, world);
    this.watchProjectiles(self, world);
    if (this.dodgeAt !== world.tick) return null;
    this.dodgeAt = -1;
    return this.dodgeDir;
  }

  private schedule(world: World, dir: Vec2, weight: number): void {
    this.quietUntil = world.tick + DECISION_COOLDOWN;
    if (!this.rng.chance(this.personality.reflex * weight)) return;
    this.dodgeAt = world.tick + this.personality.reactionTicks;
    this.dodgeDir = dir;
  }

  private watchEnemyDash(self: Fighter, target: Fighter, world: World): void {
    if (!(target.defense?.isActive ?? false)) {
      this.sawEnemyDash = false;
      return;
    }
    if (this.sawEnemyDash || world.tick < this.quietUntil) return;
    this.sawEnemyDash = true;
    const toMe = normalize(sub(self.pos, target.pos));
    if (dot(normalize(target.vel), toMe) < 0.5) return;
    this.schedule(world, scale(perp(toMe), this.rng.chance(0.5) ? 1 : -1), 1);
  }

  private watchProjectiles(self: Fighter, world: World): void {
    if (this.seen.size > 300) this.prune(world);
    if (world.tick < this.quietUntil) return;

    for (const p of world.projectiles) {
      if (p.team === self.team || this.seen.has(p.id)) continue;
      const speed = Math.hypot(p.vel.x, p.vel.y);
      const dir = scale(p.vel, 1 / speed);
      const rel = sub(self.pos, p.pos);
      const along = dot(rel, dir);
      if (along < 0) {
        this.seen.add(p.id); // already past us
        continue;
      }
      if (along / speed > LOOKAHEAD) continue; // look again when it's closer

      this.seen.add(p.id);
      const side = rel.x * dir.y - rel.y * dir.x; // signed miss distance
      const margin = self.size.x / 2 + p.threatRadius + 8;
      if (Math.abs(side) > margin) continue;

      // Dodge sideways, away from the projectile's line.
      const away = scale(perp(dir), side > 0 ? -1 : 1);
      this.schedule(world, away, Math.min(1, p.damage / SCARY_DAMAGE));
      return;
    }
  }

  private prune(world: World): void {
    const live = new Set(world.projectiles.map((p) => p.id));
    for (const id of this.seen) if (!live.has(id)) this.seen.delete(id);
  }
}
