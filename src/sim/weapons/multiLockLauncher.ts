import { secondsToTicks } from "../constants";
import type { Fighter } from "../fighter";
import { add, dist, dot, normalize, scale, sub, vec } from "../vec";
import { canSee } from "../vision";
import type { World } from "../world";
import { Guidance } from "./guidance";
import { HomingWeapon } from "./homingWeapon";

const DEG = Math.PI / 180;
/** Missiles leave the side pods this many degrees off the aim, then curve in. */
const SIDE_ANGLE = 60;
/** Seconds between pairs in a salvo. */
const PAIR_INTERVAL = 0.12;
const MAX_LOCKS = 4;
/** Seconds of painting per lock. */
const LOCK_INTERVAL = 0.3;

/**
 * Back weapon. Hold right click to paint locks on enemies you can see in
 * front of you (one every 0.3s, up to 4, spread over several enemies when
 * there are some), release to launch one homing missile per lock. They leave
 * in pairs, one from each side of the mech, and curve in toward their
 * targets. A tap with no locks fires a single missile at whoever is nearest
 * your aim.
 */
export class MultiLockLauncher extends HomingWeapon {
  /** Target ids painted so far (the same enemy can be painted more than once). */
  locks: number[] = [];
  private painting = false;
  private paintTicks = 0;
  /** Targets of missiles still waiting to leave, launched two at a time. */
  private salvo: (number | undefined)[] = [];
  private pairTicks = 0;

  constructor() {
    super(
      {
        name: "Multi-lock Missiles",
        shortName: "MLM",
        mount: "back",
        damageType: "explosive",
        damage: 16,
        fireMode: "semi",
        fireRate: 1,
        magazine: 8,
        reloadTime: 4,
        pellets: 1,
        spread: 0,
        recoil: 0,
        maxRecoil: 0,
        recoilRecovery: 10,
        projectileSpeed: 600,
        projectileSize: 8,
        range: 1400,
        falloffStart: 1400,
        falloffMin: 1,
        knockback: 150,
        selfStagger: 0,
        weight: 20,
        blastRadius: 50,
        fuse: 2.5,
      },
      new Guidance(300, 90),
    );
  }

  get status(): string {
    return this.painting ? `LOCK ${this.locks.length}/${Math.min(MAX_LOCKS, this.ammo)}` : super.status;
  }

  trigger(held: boolean, owner: Fighter, world: World): void {
    this.triggerWasHeld = held;
    this.locks = this.locks.filter((id) => world.getFighter(id)?.alive);
    if (this.salvo.length > 0 && --this.pairTicks <= 0) this.launchPair(owner, world);
    if (held) {
      if (this.ammo <= 0 && !this.isReloading) this.startReload();
      else if (this.ready) this.paint(owner, world);
      return;
    }
    if (this.painting && owner.canAct()) {
      if (this.ready) this.discharge(owner, world, Math.max(1, this.locks.length));
      this.stopPainting();
    }
  }

  private paint(owner: Fighter, world: World): void {
    this.painting = true;
    if (++this.paintTicks < secondsToTicks(LOCK_INTERVAL) || this.locks.length >= Math.min(MAX_LOCKS, this.ammo)) return;
    this.paintTicks = 0;
    const target = this.pickTarget(owner, world);
    if (target !== undefined) this.locks.push(target);
  }

  /** A visible enemy in the cone: the least-painted one, then the one nearest the aim. */
  private pickTarget(owner: Fighter, world: World): number | undefined {
    const minCos = Math.cos((this.guidance.lockCone / 2) * DEG);
    let best: Fighter | undefined;
    let bestScore = -Infinity;
    for (const f of world.fighters) {
      if (!f.alive || f.team === owner.team || !canSee(owner, world, f.pos)) continue;
      if (dist(owner.pos, f.pos) > this.stats.range * 1.5) continue;
      const cos = dot(owner.facing, normalize(sub(f.pos, owner.pos)));
      if (cos < minCos) continue;
      const score = cos - this.locks.filter((id) => id === f.id).length * 10;
      if (score > bestScore) [best, bestScore] = [f, score];
    }
    return best?.id;
  }

  /** Queues one missile per lock (with no locks, one at whoever is nearest the aim) and launches the first pair. */
  protected fire(owner: Fighter, world: World): void {
    this.salvo = this.locks.length > 0 ? [...this.locks] : [this.guidance.acquire(owner, world, this.stats.range * 1.5)];
    this.launchPair(owner, world);
  }

  /** Next two missiles of the salvo: one out of the left pod, one out of the right. */
  private launchPair(owner: Fighter, world: World): void {
    const pair = this.salvo.splice(0, 2);
    this.pairTicks = secondsToTicks(PAIR_INTERVAL);
    world.emit({ kind: "shot", ownerId: owner.id, count: pair.length });
    const base = Math.atan2(owner.facing.y, owner.facing.x);
    pair.forEach((target, i) => {
      const side = i === 0 ? -1 : 1;
      const out = vec(Math.cos(base + side * 90 * DEG), Math.sin(base + side * 90 * DEG));
      const angle = base + side * SIDE_ANGLE * DEG;
      const spec = this.projectileSpec(owner, vec(Math.cos(angle), Math.sin(angle)));
      const pod = add(owner.pos, scale(out, owner.size.x / 2 + this.stats.projectileSize));
      this.lockedTarget = target;
      this.createProjectile(world, { ...spec, pos: pod }).launch(world);
    });
  }

  private stopPainting(): void {
    this.painting = false;
    this.paintTicks = 0;
    this.locks = [];
  }

  reset(): void {
    super.reset();
    this.stopPainting();
    this.salvo = [];
  }

  holster(): void {
    super.holster();
    this.stopPainting();
  }

  netState(): number[] {
    return [...super.netState(), this.painting ? 1 : 0, ...this.locks];
  }

  syncFromNet(state: number[]): void {
    super.syncFromNet(state);
    this.painting = state[3] === 1;
    this.locks = state.slice(4);
  }
}
