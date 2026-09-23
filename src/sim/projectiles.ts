import { DT } from "./constants";
import type { Fighter } from "./fighter";
import { distanceToBox, segmentHitsBox } from "./geometry";
import type { Projectile } from "./projectile";
import { add, length, lerp, normalize, scale, sub, type Vec2 } from "./vec";
import type { World } from "./world";

/** Explosions deal full damage at the center and this fraction at the edge. */
const BLAST_EDGE_DAMAGE = 0.5;

/** Moves every projectile one tick and resolves hits, walls and max range. */
export function stepProjectiles(world: World): void {
  for (const p of world.projectiles) {
    p.prevPos = p.pos;
    const step = scale(p.vel, DT);
    const next = add(p.pos, step);

    const hit = firstFighterHit(world, p, p.pos, next);
    if (hit) {
      const point = lerp(p.pos, next, hit.t);
      impact(world, p, point, hit.fighter);
      continue;
    }

    p.pos = next;
    p.rangeLeft -= length(step);
    const outside = p.pos.x < 0 || p.pos.y < 0 || p.pos.x > world.width || p.pos.y > world.height;
    if (outside || p.rangeLeft <= 0) {
      const point = {
        x: Math.min(world.width, Math.max(0, p.pos.x)),
        y: Math.min(world.height, Math.max(0, p.pos.y)),
      };
      impact(world, p, point, null);
    }
  }
  world.projectiles = world.projectiles.filter((p) => p.alive);
}

/** Closest enemy along the path. Invulnerable fighters are passed through. */
function firstFighterHit(world: World, p: Projectile, from: Vec2, to: Vec2) {
  let best: { fighter: Fighter; t: number } | null = null;
  const pad = p.size / 2;
  for (const f of world.fighters) {
    if (!f.alive || f.team === p.team || f.invulnerable) continue;
    const half = { x: f.size.x / 2 + pad, y: f.size.y / 2 + pad };
    const t = segmentHitsBox(from, to, f.pos, half);
    if (t !== null && (!best || t < best.t)) best = { fighter: f, t };
  }
  return best;
}

function impact(world: World, p: Projectile, point: Vec2, target: Fighter | null): void {
  p.alive = false;
  p.pos = point;
  if (p.blastRadius > 0) {
    explode(world, p, point);
    return;
  }
  world.emit({ kind: "impact", pos: point, damageType: p.damageType });
  if (target) hitFighter(world, target, p.damage, normalize(p.vel), p.knockback, point);
}

function explode(world: World, p: Projectile, center: Vec2): void {
  world.emit({ kind: "explosion", pos: center, radius: p.blastRadius });
  for (const f of world.fighters) {
    if (!f.alive || f.team === p.team) continue;
    const half = { x: f.size.x / 2, y: f.size.y / 2 };
    const d = distanceToBox(center, f.pos, half);
    if (d > p.blastRadius) continue;
    const falloff = 1 - (1 - BLAST_EDGE_DAMAGE) * (d / p.blastRadius);
    const away = normalize(sub(f.pos, center));
    const dir = away.x === 0 && away.y === 0 ? normalize(p.vel) : away;
    hitFighter(world, f, p.damage * falloff, dir, p.knockback * falloff, f.pos);
  }
}

function hitFighter(world: World, f: Fighter, damage: number, dir: Vec2, knockback: number, at: Vec2) {
  const dealt = f.takeDamage(damage);
  if (dealt <= 0) return;
  f.applyKnockback(scale(dir, knockback));
  world.emit({ kind: "damage", targetId: f.id, amount: dealt, pos: at });
}
