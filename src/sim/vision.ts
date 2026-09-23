import type { Fighter } from "./fighter";
import type { Vec2 } from "./vec";
import type { World } from "./world";

/**
 * How much of the arena a mech can see: the same rule for humans (their
 * camera) and bots (their senses). The view has the shape of a 14" MacBook
 * Pro screen; the head can make it bigger (viewMultiplier), never smaller.
 */
export const VIEW_ASPECT = 1512 / 982;
export const VIEW_HEIGHT = 600;
export const VIEW_WIDTH = VIEW_HEIGHT * VIEW_ASPECT;

/** A mech's view: its size, centered on the mech but kept inside the arena walls (like the camera). */
export function viewRect(self: Fighter, world: World): { min: Vec2; max: Vec2 } {
  const w = VIEW_WIDTH * self.stats.viewMultiplier;
  const h = VIEW_HEIGHT * self.stats.viewMultiplier;
  const cx = clampAxis(self.pos.x, w, world.width);
  const cy = clampAxis(self.pos.y, h, world.height);
  return { min: { x: cx - w / 2, y: cy - h / 2 }, max: { x: cx + w / 2, y: cy + h / 2 } };
}

/** True if `p` is inside `self`'s view. */
export function canSee(self: Fighter, world: World, p: Vec2): boolean {
  const v = viewRect(self, world);
  return p.x >= v.min.x && p.x <= v.max.x && p.y >= v.min.y && p.y <= v.max.y;
}

/** Keeps a view of `viewSize` inside [0, world] on one axis; centers it if the world is smaller. */
export function clampAxis(center: number, viewSize: number, worldSize: number): number {
  if (viewSize >= worldSize) return worldSize / 2;
  return Math.min(worldSize - viewSize / 2, Math.max(viewSize / 2, center));
}
