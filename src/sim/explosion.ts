import { damageCover } from "./cover";
import { dealDamage } from "./damage";
import { distanceToBox } from "./geometry";
import { shapeDistance } from "./obstacles";
import { normalize, sub, type Vec2 } from "./vec";
import type { DamageType } from "./weapons/weaponStats";
import type { World } from "./world";

/** Explosions deal full damage at the center and this fraction at the edge. */
const BLAST_EDGE_DAMAGE = 0.5;

/** Who set off a blast: its fighter id (credited with damage and kills) and team (not hurt by it). */
export interface BlastSource {
  id: number;
  team: number;
}

/**
 * A blast at `center`: every enemy of `source` within `radius` takes damage
 * and a push away from the center (less toward the edge), and so does any
 * destructible cover in range (explosions are what bring buildings down).
 * Returns the damage dealt to fighters. `fallbackDir`: the push for someone
 * right at the center.
 */
export function explode(
  world: World, center: Vec2, radius: number, damage: number, knockback: number,
  source: BlastSource, crit: boolean, damageType: DamageType, fallbackDir: Vec2,
): number {
  world.emit({ kind: "explosion", pos: center, radius, damageType });
  let dealt = 0;
  for (const f of world.fighters) {
    if (!f.alive || f.team === source.team) continue;
    const d = distanceToBox(center, f.pos, { x: f.size.x / 2, y: f.size.y / 2 });
    if (d > radius) continue;
    const falloff = 1 - (1 - BLAST_EDGE_DAMAGE) * (d / radius);
    const away = normalize(sub(f.pos, center));
    const dir = away.x === 0 && away.y === 0 ? fallbackDir : away;
    dealt += dealDamage(world, f, source.id, damage * falloff, dir, knockback * falloff, f.pos, crit);
  }
  // A copy: destroying cover changes the list (and a car can set off another).
  for (const o of [...world.obstacles]) {
    const d = shapeDistance(o.shape, center);
    if (d <= radius) damageCover(world, o, damage * (1 - (1 - BLAST_EDGE_DAMAGE) * (d / radius)), true, source);
  }
  return dealt;
}
