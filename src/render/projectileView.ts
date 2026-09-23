import { lerp } from "../sim/vec";
import type { World } from "../sim/world";
import { DAMAGE_COLORS } from "./palette";

/** Projectiles are their bounding box, colored by damage type, with a short streak (and a lock line for missiles). */
export function drawProjectiles(ctx: CanvasRenderingContext2D, world: World, alpha: number): void {
  for (const p of world.projectiles) {
    const pos = lerp(p.prevPos, p.pos, alpha);
    const color = DAMAGE_COLORS[p.damageType];

    // Homing lock: a faint dashed line from the missile to its target.
    // Missiles carry a targetId (also on a joined player's copy, which is plain data).
    const targetId = (p as { targetId?: number }).targetId;
    const target = targetId !== undefined ? world.getFighter(targetId) : undefined;
    if (target?.alive) {
      const tp = lerp(target.prevPos, target.pos, alpha);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(tp.x, tp.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Streak from the previous tick, so fast shots read as motion.
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = Math.max(2, p.size / 2);
    ctx.beginPath();
    ctx.moveTo(p.prevPos.x, p.prevPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
  }
}
