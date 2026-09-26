import { Brace } from "../sim/brace";
import { DT } from "../sim/constants";
import type { WorldEvent } from "../sim/events";
import type { Match, MatchView } from "../sim/match";
import { Missile } from "../sim/projectiles/missile";
import type { Projectile } from "../sim/projectiles/projectile";
import { add, scale } from "../sim/vec";
import type { World } from "../sim/world";
import { DAMAGE_TYPES, SNAPSHOT_EVERY, type FighterState, type MatchState, type ProjectileState, type Snapshot } from "./protocol";

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Host side: the match right now, plus the events collected since the last snapshot. */
export function takeSnapshot(world: World, match: Match | null, events: WorldEvent[]): Snapshot {
  const fighters: FighterState[] = world.fighters.map((f) => [
    f.id, r1(f.pos.x), r1(f.pos.y), r1(f.vel.x + f.knockback.x), r1(f.vel.y + f.knockback.y), r3(f.facing.x), r3(f.facing.y),
    r1(f.hp), f.loadout.slot, r1(f.energy.current), f.defense ? f.defense.netState() : [0, 0], f.brace ? f.brace.ticksRemaining : -1,
    f.weapons.map((w) => w.netState()), f.back ? f.back.netState() : [],
  ]);
  const projectiles: ProjectileState[] = world.projectiles.map((p) => [
    p.id, r1(p.pos.x), r1(p.pos.y), r1(p.vel.x), r1(p.vel.y), p.size, DAMAGE_TYPES.indexOf(p.damageType),
    p instanceof Missile && p.targetId !== undefined ? p.targetId : -1,
  ]);
  const m: MatchState = match
    ? [[...match.scores], match.countdownLeft, match.fightTicks, match.roundOver, match.lastWinner ?? -1]
    : [[], 0, 999, false, -1];
  const gone = world.destroyed.map((o) => o.id!);
  return { t: "snap", tick: world.tick, fighters, projectiles, match: m, events, gone };
}

/** A joined player's read-only copy of the host's match state (for the HUD). */
export class MatchMirror implements MatchView {
  scores = new Map<number, number>();
  roundOver = false;
  countdownLeft = 0;
  fightTicks = 0;
  lastWinner: number | null = null;

  get inCountdown(): boolean {
    return this.countdownLeft > 0;
  }
}

/**
 * Player side: makes this world (built from the same lineup) look like the
 * host's. Positions move from where they were to the snapshot's, so the
 * renderer can interpolate between snapshots.
 */
export function applySnapshot(world: World, mirror: MatchMirror, snap: Snapshot): void {
  world.tick = snap.tick;
  if (snap.gone.length !== world.destroyed.length) world.syncDestroyed(snap.gone);
  for (const [id, x, y, vx, vy, fx, fy, hp, slot, energy, dash, brace, weapons, back] of snap.fighters) {
    const f = world.getFighter(id);
    if (!f) continue;
    f.prevPos = f.pos;
    f.pos = { x, y };
    f.vel = { x: vx, y: vy };
    f.knockback = { x: 0, y: 0 };
    f.facing = { x: fx, y: fy };
    f.hp = hp;
    f.loadout.slot = slot;
    f.energy.current = energy;
    f.defense?.syncFromNet(dash);
    weapons.forEach((w, i) => f.weapons[i]?.syncFromNet(w));
    f.back?.syncFromNet(back);
    if (brace < 0) f.brace = null;
    else {
      f.brace ??= new Brace(f.weapon!);
      f.brace.syncFromNet(brace);
    }
  }

  // Projectiles are only drawn on this side, so plain look-alike objects are enough.
  const previous = new Map(world.projectiles.map((p) => [p.id, p.pos]));
  world.projectiles = snap.projectiles.map(([id, x, y, vx, vy, size, type, target]) => {
    const pos = { x, y };
    const vel = { x: vx, y: vy };
    const prevPos = previous.get(id) ?? add(pos, scale(vel, -DT * SNAPSHOT_EVERY));
    return { id, pos, prevPos, vel, size, damageType: DAMAGE_TYPES[type], targetId: target < 0 ? undefined : target, alive: true } as unknown as Projectile;
  });

  const [scores, countdownLeft, fightTicks, roundOver, lastWinner] = snap.match;
  mirror.scores = new Map(scores);
  mirror.countdownLeft = countdownLeft;
  mirror.fightTicks = fightTicks;
  mirror.roundOver = roundOver;
  mirror.lastWinner = lastWinner < 0 ? null : lastWinner;
  world.events = snap.events;
}
