import type { WorldEvent } from "../sim/events";
import type { Vec2 } from "../sim/vec";
import { DAMAGE_COLORS, UI } from "./palette";

interface Effect {
  kind: "impact" | "explosion" | "damage";
  pos: Vec2;
  color: string;
  /** Explosion radius, impact size, or damage amount. */
  value: number;
  born: number;
  life: number;
  /** Damage numbers only: at least one hit in this number was a crit. */
  crit?: boolean;
}

/**
 * Short-lived visuals driven by world events. Purely cosmetic: lives on the
 * client and uses wall-clock time, never touches the sim.
 */
export class Effects {
  private list: Effect[] = [];

  clear(): void {
    this.list = [];
  }

  /** Call with each tick's events. Damage to the same fighter in one tick is summed. */
  ingest(events: WorldEvent[]): void {
    const now = performance.now();
    const damage = new Map<number, Effect>();
    for (const e of events) {
      if (e.kind === "impact") {
        this.list.push({ kind: "impact", pos: e.pos, color: DAMAGE_COLORS[e.damageType], value: 10, born: now, life: 120 });
      } else if (e.kind === "explosion") {
        this.list.push({ kind: "explosion", pos: e.pos, color: DAMAGE_COLORS.explosive, value: e.radius, born: now, life: 350 });
      } else if (e.kind === "damage") {
        const existing = damage.get(e.targetId);
        if (existing) {
          existing.value += e.amount;
          if (e.crit) [existing.crit, existing.color] = [true, UI.crit];
        } else {
          const color = e.crit ? UI.crit : UI.damage;
          const fx: Effect = { kind: "damage", pos: { ...e.pos }, color, value: e.amount, born: now, life: 700, crit: e.crit };
          damage.set(e.targetId, fx);
          this.list.push(fx);
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const now = performance.now();
    this.list = this.list.filter((fx) => now - fx.born < fx.life);
    for (const fx of this.list) {
      const t = (now - fx.born) / fx.life;
      ctx.globalAlpha = 1 - t;
      if (fx.kind === "impact") {
        const s = fx.value * (0.5 + t);
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(fx.pos.x - s / 2, fx.pos.y - s / 2, s, s);
      } else if (fx.kind === "explosion") {
        // Shows the real blast radius: the ring is exactly the damage area.
        ctx.fillStyle = fx.color;
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.beginPath();
        ctx.arc(fx.pos.x, fx.pos.y, fx.value * (0.6 + 0.4 * t), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = fx.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(fx.pos.x, fx.pos.y, fx.value, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Crits: bigger, yellow, with a "!".
        ctx.fillStyle = fx.color;
        ctx.font = fx.crit ? "bold 22px system-ui, sans-serif" : "bold 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        const text = `${Math.round(fx.value)}${fx.crit ? "!" : ""}`;
        ctx.fillText(text, fx.pos.x, fx.pos.y - 40 - t * 30);
      }
    }
    ctx.globalAlpha = 1;
  }
}
