import type { LockOn } from "../client/lockOn";
import { lerp, type Vec2 } from "../sim/vec";
import type { World } from "../sim/world";

const PAD = 10;
const LOCK_COLOR = "#ff5555";

/**
 * Lock-on markers, in world space: a white outline that traces around the
 * enemy under the cursor as the lock charges, and red corner brackets with a
 * LOCK label on the locked target.
 */
export function drawLockOn(ctx: CanvasRenderingContext2D, world: World, lock: LockOn, alpha: number): void {
  const candidate = lock.candidateId === null ? undefined : world.getFighter(lock.candidateId);
  if (candidate?.alive) {
    const p = lerp(candidate.prevPos, candidate.pos, alpha);
    const w = candidate.size.x + PAD * 2;
    const h = candidate.size.y + PAD * 2;
    const perimeter = 2 * (w + h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([perimeter * lock.progress, perimeter]);
    ctx.strokeRect(p.x - w / 2, p.y - h / 2, w, h);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  const target = lock.targetId === null ? undefined : world.getFighter(lock.targetId);
  if (target?.alive) {
    const p = lerp(target.prevPos, target.pos, alpha);
    const hw = target.size.x / 2 + PAD;
    const hh = target.size.y / 2 + PAD;
    const arm = Math.min(hw, hh) * 0.6;
    ctx.strokeStyle = LOCK_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const cx = p.x + sx * hw;
      const cy = p.y + sy * hh;
      ctx.moveTo(cx - sx * arm, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy - sy * arm);
    }
    ctx.stroke();
    ctx.fillStyle = LOCK_COLOR;
    ctx.font = "bold 11px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("LOCK", p.x, p.y + hh + 30);
  }
}

/**
 * The lock-on area, in screen space: a thick circle around the cursor whose
 * radius is the head's lock-on radius. An enemy whose box touches it starts
 * charging a lock; the circle brightens while that happens.
 */
export function drawLockArea(ctx: CanvasRenderingContext2D, cursor: Vec2, radiusPx: number, charging: boolean): void {
  ctx.strokeStyle = "#ffffff";
  ctx.globalAlpha = charging ? 0.85 : 0.35;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cursor.x, cursor.y, radiusPx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
