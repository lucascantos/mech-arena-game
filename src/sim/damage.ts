import { CRIT_MULTIPLIER } from "./constants";
import type { Fighter } from "./fighter";
import { scale, type Vec2 } from "./vec";
import type { World } from "./world";

/**
 * Applies one hit to a fighter: damage (×CRIT_MULTIPLIER on a crit, soaked
 * by a raised shield it travels into along `dir`), knockback and the
 * damage/kill events. Returns the damage actually dealt.
 */
export function dealDamage(
  world: World, f: Fighter, sourceId: number, damage: number, dir: Vec2, knockback: number, at: Vec2, crit: boolean,
): number {
  const dealt = f.takeDamage(crit ? damage * CRIT_MULTIPLIER : damage, dir);
  if (dealt <= 0) return 0;
  f.applyKnockback(scale(dir, knockback));
  world.emit({ kind: "damage", targetId: f.id, sourceId, amount: dealt, pos: at, crit });
  if (!f.alive) world.emit({ kind: "kill", victimId: f.id, killerId: sourceId });
  return dealt;
}
