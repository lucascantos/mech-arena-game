import { arenaExit } from "../arena";
import type { Fighter } from "../fighter";
import { damageCover } from "../cover";
import { firstObstacle } from "../obstacles";
import { segmentHitsBox } from "../geometry";
import { add, lerp, length, normalize, scale, sub } from "../vec";
import type { World } from "../world";
import { Projectile } from "./projectile";

/**
 * A hitscan shot: resolves the moment it's launched, along its whole range,
 * instead of flying. Pierces every enemy on its line (damage still falls off
 * with distance) and stops at the first one that took nothing from it (e.g.
 * a raised shield soaked the hit). `size` is the beam's width.
 * Any weapon can fire beams by building them in `createProjectile`.
 */
export class Beam extends Projectile {
  launch(world: World): void {
    this.alive = false;
    const from = this.pos;
    const dir = normalize(this.vel);
    const end = add(from, scale(dir, this.range));
    const cover = firstObstacle(world.obstacles, from, end);
    const wall = arenaExit(world.arena, from, end);
    let to = lerp(from, end, Math.min(wall, cover?.t ?? 1));

    const pad = this.size / 2;
    const hits: { f: Fighter; t: number }[] = [];
    for (const f of world.fighters) {
      if (!f.alive || f.team === this.team || f.invulnerable) continue;
      const t = segmentHitsBox(from, to, f.pos, { x: f.size.x / 2 + pad, y: f.size.y / 2 + pad });
      if (t !== null) hits.push({ f, t });
    }
    hits.sort((a, b) => a.t - b.t);

    const reach = length(sub(to, from));
    let dealt = 0;
    for (const { f, t } of hits) {
      const at = lerp(from, to, t);
      this.rangeLeft = this.range - reach * t; // for the falloff at this distance
      const d = this.hit(world, f, this.damage * this.falloff, dir, this.knockback, at, this.rollCrit(world));
      dealt += d;
      if (d <= 0) {
        to = at;
        break;
      }
    }
    this.pos = to;
    // Reached the cover that stopped it (a shield in front would have ended it sooner): burn it (cars; not buildings).
    if (cover && cover.t <= wall && length(sub(to, from)) >= reach * cover.t - 1) {
      this.rangeLeft = this.range - reach * cover.t;
      damageCover(world, cover.obstacle, this.damage * this.falloff, false, { id: this.ownerId, team: this.team });
    }
    if (dealt > 0) world.emit({ kind: "projectileHit", ownerId: this.ownerId });
    world.emit({ kind: "beam", ownerId: this.ownerId, from, to, width: this.size });
  }
}
