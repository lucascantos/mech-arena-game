import type { Ability } from "./abilities/ability";
import type { Defense } from "./abilities/defense";
import { Brace } from "./brace";
import { DT } from "./constants";
import type { Input } from "./input";
import { BIPEDAL, type Legs } from "./parts/legs";
import { computeStats, type FighterStats, type Parts } from "./parts/stats";
import { MEDIUM_TORSO, type Torso } from "./parts/torso";
import type { Weapon } from "./weapons/weapon";
import type { World } from "./world";
import { add, approach, clampUnit, normalize, rotateToward, scale, vec, type Vec2 } from "./vec";

/** How quickly knockback fades (per second, exponential). */
const KNOCKBACK_DECAY = 8;
const DEG = Math.PI / 180;

export interface FighterConfig {
  id: number;
  name: string;
  team: number;
  color: string;
  pos: Vec2;
  legs?: Legs;
  torso?: Torso;
}

export class Fighter {
  readonly id: number;
  readonly name: string;
  readonly team: number;
  readonly color: string;
  readonly spawn: Vec2;

  readonly parts: Parts;
  /** Final numbers from all parts. */
  readonly stats: FighterStats;

  /** Center of the bounding box. */
  pos: Vec2;
  /** Position at the start of the last tick, for render interpolation. */
  prevPos: Vec2;
  vel: Vec2 = vec();
  /** Velocity from being hit; added on top of movement and fades out. */
  knockback: Vec2 = vec();
  /** Unit vector the fighter is aiming at. Turns toward the input aim at `turnRate`. */
  facing: Vec2 = vec(1, 0);
  hp: number;

  readonly weapons: Weapon[] = [];
  weaponSlot = 0;
  defense: Defense | null = null;
  /** Set while recovering from a heavy weapon's self-stagger. */
  brace: Brace | null = null;

  constructor(config: FighterConfig) {
    this.id = config.id;
    this.name = config.name;
    this.team = config.team;
    this.color = config.color;
    this.parts = { legs: config.legs ?? BIPEDAL, torso: config.torso ?? MEDIUM_TORSO };
    this.stats = computeStats(this.parts);
    this.hp = this.stats.maxHp;
    this.spawn = { ...config.pos };
    this.pos = { ...config.pos };
    this.prevPos = { ...config.pos };
  }

  get size(): Vec2 {
    return this.stats.size;
  }

  get maxHp(): number {
    return this.stats.maxHp;
  }

  /** Throws if the torso can't carry another weapon. */
  equipWeapon(weapon: Weapon): this {
    if (this.weapons.length >= this.stats.weaponCapacity) {
      throw new Error(`${this.name}: ${this.parts.torso.name} torso carries at most ${this.stats.weaponCapacity} weapon(s)`);
    }
    this.weapons.push(weapon);
    return this;
  }

  setDefense(defense: Defense): this {
    defense.attach(this);
    this.defense = defense;
    return this;
  }

  /** The weapon in hand, if any. */
  get weapon(): Weapon | undefined {
    return this.weapons[this.weaponSlot];
  }

  selectWeapon(slot: number): void {
    if (slot === this.weaponSlot || slot < 0 || slot >= this.weapons.length) return;
    this.weapon?.holster();
    this.weaponSlot = slot;
  }

  get abilities(): Ability[] {
    return this.defense ? [this.defense] : [];
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  get invulnerable(): boolean {
    return this.abilities.some((a) => a.grantsInvulnerability());
  }

  /** False while dead, braced, or while an ability (e.g. a dash) is locking the fighter. */
  canAct(): boolean {
    return this.alive && !this.brace && !this.abilities.some((a) => a.blocksActions());
  }

  /** Called by a heavy weapon right after firing on legs that must brace. Stops dead. */
  startBrace(weapon: Weapon): void {
    this.brace = new Brace(weapon);
    this.vel = vec();
  }

  /** Returns the damage actually dealt (0 if invulnerable or dead). */
  takeDamage(amount: number): number {
    if (!this.alive || this.invulnerable) return 0;
    const dealt = Math.min(this.hp, amount);
    this.hp -= dealt;
    return dealt;
  }

  /** Stable legs shrug off part of the push. */
  applyKnockback(impulse: Vec2): void {
    this.knockback = add(this.knockback, scale(impulse, this.stats.knockbackMultiplier));
  }

  respawn(): void {
    this.hp = this.maxHp;
    this.pos = { ...this.spawn };
    this.prevPos = { ...this.spawn };
    this.vel = vec();
    this.knockback = vec();
    this.brace = null;
    this.weaponSlot = 0;
    for (const w of this.weapons) w.reset();
    for (const a of this.abilities) a.reset();
  }

  /** Reads one tick of input: aim, weapons, defense, desired velocity. */
  applyInput(input: Input, world: World): void {
    if (!this.alive) {
      this.vel = vec();
      return;
    }
    const aim = normalize(vec(input.aimX, input.aimY));
    if (!this.brace && (aim.x !== 0 || aim.y !== 0)) {
      this.facing = rotateToward(this.facing, aim, this.stats.turnRate * DEG * DT);
    }

    if (input.defend) this.defense?.tryActivate(input, world);
    if (!this.brace) {
      if (input.selectSlot >= 0) this.selectWeapon(input.selectSlot);
      if (input.reload) this.weapon?.startReload();
      this.weapon?.trigger(input.fire && this.canAct(), this, world);
    }

    if (this.brace) {
      this.vel = vec(); // rooted; only knockback can move a braced mech
    } else if (!this.abilities.some((a) => a.controlsMovement())) {
      const desired = scale(clampUnit(vec(input.moveX, input.moveY)), this.stats.moveSpeed);
      this.vel = approach(this.vel, desired, this.stats.acceleration * DT);
    }
  }

  /** Advances timers and integrates position. */
  update(world: World): void {
    this.prevPos = { ...this.pos };
    for (const ability of this.abilities) ability.update(world);
    this.weapon?.update();
    if (this.brace && (!this.alive || !this.brace.update())) this.brace = null;
    this.pos = add(this.pos, scale(add(this.vel, this.knockback), DT));
    this.knockback = scale(this.knockback, Math.exp(-KNOCKBACK_DECAY * DT));
  }
}
