import { PulseShield, SHIELD_HALF_ARC } from "../sim/back/pulseShield";
import type { Fighter } from "../sim/fighter";
import { lerp, type Vec2 } from "../sim/vec";
import { GRENADE_MIN_DISTANCE, GrenadeLauncher } from "../sim/weapons/grenadeLauncher";
import { ChargeWeapon } from "../sim/weapons/chargeWeapon";
import { MultiLockLauncher } from "../sim/weapons/multiLockLauncher";
import type { World } from "../sim/world";
import { DAMAGE_COLORS, UI } from "./palette";

const DEG = Math.PI / 180;

/**
 * What back units show in the world. Everyone sees a raised shield and a
 * charging laser's aim line (that's the warning); only you see your own
 * multi-lock markers and where your grenade will land (`aim`, in world units).
 */
export function drawBackUnits(ctx: CanvasRenderingContext2D, world: World, alpha: number, own: Fighter | null, aim: Vec2 | null): void {
  for (const f of world.fighters) {
    if (!f.alive) continue;
    const p = lerp(f.prevPos, f.pos, alpha);
    if (f.back instanceof PulseShield && f.back.raised) drawShield(ctx, f, f.back, p);
    // Any charging weapon, hand or back, shows its aiming line.
    for (const w of [f.weapon, f.back]) if (w instanceof ChargeWeapon && w.charge > 0) drawCharge(ctx, f, w, p);
  }
  if (!own?.alive) return;
  const pos = lerp(own.prevPos, own.pos, alpha);
  if (own.back instanceof MultiLockLauncher) drawLocks(ctx, world, own.back, alpha);
  if (own.back instanceof GrenadeLauncher && aim) drawLanding(ctx, own.back, pos, aim);
}

function drawShield(ctx: CanvasRenderingContext2D, f: Fighter, shield: PulseShield, p: Vec2): void {
  const angle = Math.atan2(f.facing.y, f.facing.x);
  const r = f.size.x * 0.9;
  ctx.strokeStyle = UI.defense;
  ctx.globalAlpha = 0.35 + 0.55 * (shield.energy / shield.maxEnergy);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, angle - SHIELD_HALF_ARC * DEG, angle + SHIELD_HALF_ARC * DEG);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A thin line along the aim that brightens and thickens as the charge builds. */
function drawCharge(ctx: CanvasRenderingContext2D, f: Fighter, laser: ChargeWeapon, p: Vec2): void {
  const c = laser.chargeFraction;
  ctx.strokeStyle = DAMAGE_COLORS.energy;
  ctx.globalAlpha = 0.15 + 0.5 * c;
  ctx.lineWidth = 1 + 3 * c;
  ctx.setLineDash(c >= 1 ? [] : [10, 8]);
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + f.facing.x * laser.stats.range, p.y + f.facing.y * laser.stats.range);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

/** A diamond on each painted enemy, one ring per lock on it. */
function drawLocks(ctx: CanvasRenderingContext2D, world: World, launcher: MultiLockLauncher, alpha: number): void {
  const counts = new Map<number, number>();
  for (const id of launcher.locks) counts.set(id, (counts.get(id) ?? 0) + 1);
  ctx.strokeStyle = DAMAGE_COLORS.explosive;
  ctx.lineWidth = 2;
  for (const [id, n] of counts) {
    const t = world.getFighter(id);
    if (!t?.alive) continue;
    const p = lerp(t.prevPos, t.pos, alpha);
    for (let i = 0; i < n; i++) {
      const s = t.size.x * 0.7 + i * 10;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - s);
      ctx.lineTo(p.x + s, p.y);
      ctx.lineTo(p.x, p.y + s);
      ctx.lineTo(p.x - s, p.y);
      ctx.closePath();
      ctx.stroke();
    }
  }
}

/** Where a grenade would land right now: toward the cursor, clamped to the launcher's reach. */
function drawLanding(ctx: CanvasRenderingContext2D, gl: GrenadeLauncher, from: Vec2, aim: Vec2): void {
  const dx = aim.x - from.x;
  const dy = aim.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  const reach = Math.max(GRENADE_MIN_DISTANCE, Math.min(gl.stats.range, d));
  const x = from.x + (dx / d) * reach;
  const y = from.y + (dy / d) * reach;
  ctx.strokeStyle = DAMAGE_COLORS.explosive;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(x, y, gl.stats.blastRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}
