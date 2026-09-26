import type { Fighter } from "../sim/fighter";
import type { Vec2 } from "../sim/vec";

const STREAKS = 16;
/** Streaks start this far out (times the mech's size) and vanish at its edge. */
const FROM = 1.5;
const TO = 0.55;
/** How far a streak curls around while it travels in (radians): a spiral, not a straight dash. */
const CURL = 1.1;
/** Tail length along the spiral (radians of travel behind the head). */
const TAIL = 0.35;
const COLOR = "#58a6ff";
/** Trips per second for each streak. */
const SPEED = 2.5;

/**
 * Mega Man style charging: blue streaks of energy spiral in toward the mech
 * the whole time it charges, each with a tail that fades outward. At full
 * charge the mech's body also flickers blue and white (the "ready" signal).
 * Purely cosmetic (animated by wall-clock time).
 */
export function drawGather(ctx: CanvasRenderingContext2D, f: Fighter, charge: number, p: Vec2): void {
  const now = performance.now() / 1000;
  const size = Math.max(f.size.x, f.size.y);
  ctx.lineCap = "round";
  for (let i = 0; i < STREAKS; i++) {
    const seed = (i * 0.618) % 1; // golden-ratio spread so streaks don't bunch up
    const trip = now * SPEED + seed;
    const phase = trip % 1; // 0 far out → 1 at the mech
    const base = (i / STREAKS) * Math.PI * 2 + Math.floor(trip) * 2.4; // each trip comes from a new direction
    // A few points along the spiral, from the tail (fainter, outer) to the head (brighter, inner).
    for (let k = 0; k < 4; k++) {
      const t0 = Math.max(0, phase - (TAIL * (k + 1)) / 4);
      const t1 = Math.max(0, phase - (TAIL * k) / 4);
      if (t1 <= 0) continue;
      const [a, b] = [spiral(p, base, t0, size), spiral(p, base, t1, size)];
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = 1 + 1.5 * (1 - k / 4);
      ctx.globalAlpha = Math.sin(phase * Math.PI) * (1 - k / 4) * 0.95;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
  if (charge >= 1) {
    // Fully charged: the body flickers (blue / white), like Mega Man's buster.
    const flick = Math.floor(now * 16) % 2 === 0;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = flick ? "#58a6ff" : "#ffffff";
    ctx.fillRect(p.x - f.size.x / 2, p.y - f.size.y / 2, f.size.x, f.size.y);
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = "butt";
}

/** A point on a streak's inward spiral, `t` of the way from its start (0) to the mech (1). */
function spiral(p: Vec2, base: number, t: number, size: number): Vec2 {
  const r = size * (FROM + (TO - FROM) * t);
  const a = base + CURL * t;
  return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
}
