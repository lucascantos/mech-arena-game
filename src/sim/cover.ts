import { explode, type BlastSource } from "./explosion";
import type { Obstacle } from "./obstacles";
import type { World } from "./world";

/**
 * Damages a destructible obstacle. Buildings only take explosions
 * (`explosive`); cars take anything. At 0 HP it's destroyed (left as rubble,
 * see World.destroyObstacle), and a car explodes, credited to whoever
 * destroyed it.
 */
export function damageCover(world: World, o: Obstacle, amount: number, explosive: boolean, source: BlastSource): void {
  const d = o.durability;
  if (!d || o.hp === undefined || o.hp <= 0 || amount <= 0) return;
  if (d.explosiveOnly && !explosive) return;
  o.hp -= amount;
  if (o.hp > 0) return;
  world.destroyObstacle(o);
  if (d.blast) {
    const center = { x: o.shape.x, y: o.shape.y };
    explode(world, center, d.blast.radius, d.blast.damage, d.blast.knockback, source, false, "explosive", { x: 0, y: -1 });
  }
}
