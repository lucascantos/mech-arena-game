import type { Ability } from "./abilities/ability";
import type { BackUnit } from "./back/backUnit";
import type { Defense } from "./abilities/defense";
import type { Brace } from "./brace";
import { DT } from "./constants";
import { Loadout } from "./loadout";
import { Stamina } from "./stamina";
import type { Input } from "./input";
import type { FighterConfig } from "./fighterConfig";
import { STANDARD_HEAD } from "./parts/head";
import { BIPEDAL } from "./parts/legs";
import { computeStats, type FighterStats, type Parts } from "./parts/stats";
import { MEDIUM_TORSO } from "./parts/torso";
import type { Weapon } from "./weapons/weapon";
import type { World } from "./world";
import { add, approach, clampUnit, normalize, rotateToward, scale, vec, type Vec2 } from "./vec";

/** How quickly knockback fades (per second, exponential). */
const KNOCKBACK_DECAY = 8;
const DEG = Math.PI / 180;

export type { FighterConfig };

export class Fighter {
  readonly id: number;
  readonly name: string;
  readonly team: number;
  readonly color: string;
  /** Where it (re)spawns; the match may move it between rounds. */
  spawn: Vec2;

  readonly parts: Parts;
  /** Final numbers from all parts and equipped weapons (weight). */
  stats: FighterStats;

  /** Center of the bounding box. */
  pos: Vec2;
  /** Position at the start of the last tick, for render interpolation. */
  prevPos: Vec2;
  vel: Vec2 = vec();
  /** Velocity from being hit; added on top of movement and fades out. */
  knockback: Vec2 = vec();
  /** Unit vector the fighter is aiming at. Turns toward the input aim at `turnRate`. */
  facing: Vec2 = vec(1, 0);
  /** Length of the input aim (where a grenade lands) and the locked enemy's id or -1 (what a sword lunges at). */
  aimDistance = 0;
  lockTarget = -1;
  hp: number;

  /** Main weapons and the back unit. */
  readonly loadout = new Loadout();
  readonly weapons: Weapon[] = this.loadout.weapons;
  defense: Defense | null = null;
  /** Spent by dashes (and future actions); refills over time. */
  readonly stamina: Stamina;
  /** Set while recovering from a heavy weapon's self-stagger. */
  brace: Brace | null = null;

  constructor(config: FighterConfig) {
    this.id = config.id;
    this.name = config.name;
    this.team = config.team;
    this.color = config.color;
    this.parts = { legs: config.legs ?? BIPEDAL, torso: config.torso ?? MEDIUM_TORSO, head: config.head ?? STANDARD_HEAD };
    this.stats = computeStats(this.parts);
    this.hp = this.stats.maxHp;
    this.stamina = new Stamina(this.stats.maxStamina);
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

  /** Hand weapons only; throws if the torso can't carry another. */
  equipWeapon(weapon: Weapon): this {
    this.loadout.equip(weapon, this.stats.weaponCapacity, `${this.name} (${this.parts.torso.name} torso)`);
    return this.reweigh();
  }

  /** Puts a unit in the (single) back slot. */
  setBackUnit(unit: BackUnit): this {
    this.loadout.mountBack(unit);
    return this.reweigh();
  }

  /** Everything carried adds weight. */
  private reweigh(): this {
    this.stats = computeStats(this.parts, this.loadout.carried);
    return this;
  }

  get back(): BackUnit | null {
    return this.loadout.back;
  }

  setDefense(defense: Defense): this {
    defense.attach(this);
    this.defense = defense;
    return this;
  }

  /** The weapon in hand, if any. */
  get weapon(): Weapon | undefined {
    return this.loadout.weapon;
  }

  /** The defense plus any ability the gear brings (a sword's lunge). */
  get abilities(): Ability[] {
    return this.defense ? [this.defense, ...this.loadout.abilities] : this.loadout.abilities;
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

  /**
   * Returns the damage actually dealt (0 if invulnerable or dead). `dir` is
   * the way the damage travels; a raised shield can soak it from the front.
   */
  takeDamage(amount: number, dir?: Vec2): number {
    if (!this.alive || this.invulnerable) return 0;
    if (dir && this.back) amount = this.back.absorb(this, dir, amount);
    if (amount <= 0) return 0;
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
    this.stamina.refill();
    this.loadout.reset();
    for (const a of this.abilities) a.reset();
  }

  /** Reads one tick of input: aim, weapons, defense, desired velocity. */
  applyInput(input: Input, world: World): void {
    if (!this.alive) {
      this.vel = vec();
      return;
    }
    const aim = normalize(vec(input.aimX, input.aimY));
    this.aimDistance = Math.hypot(input.aimX, input.aimY);
    this.lockTarget = input.target;
    if (!this.brace && (aim.x !== 0 || aim.y !== 0)) {
      this.facing = rotateToward(this.facing, aim, this.stats.turnRate * DEG * DT);
    }

    if (input.defend) this.defense?.tryActivate(input, world);
    if (!this.brace) this.loadout.handleInput(input, this, world);

    if (this.brace) {
      this.vel = vec(); // rooted; only knockback can move a braced mech
    } else if (!this.abilities.some((a) => a.controlsMovement())) {
      const speed = this.stats.moveSpeed * this.loadout.moveMultiplier;
      const desired = scale(clampUnit(vec(input.moveX, input.moveY)), speed);
      this.vel = approach(this.vel, desired, this.stats.acceleration * DT);
    }
  }

  /** Advances timers and integrates position. */
  update(world: World): void {
    this.prevPos = { ...this.pos };
    for (const ability of this.abilities) ability.update(world);
    if (this.alive) this.stamina.update(this.stats.staminaRegen);
    this.loadout.update(this);
    if (this.brace && (!this.alive || !this.brace.update())) this.brace = null;
    this.pos = add(this.pos, scale(add(this.vel, this.knockback), DT));
    this.knockback = scale(this.knockback, Math.exp(-KNOCKBACK_DECAY * DT));
  }
}
