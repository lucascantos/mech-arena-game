/**
 * Damage type, for armor resistances later. How a shot behaves (exploding,
 * homing) comes from the weapon's class, not from this.
 */
export type DamageType = "bullet" | "energy" | "explosive";

/** Where a weapon goes: in hand (left click, 1-4 to switch) or the single back slot (right click). */
export type Mount = "hand" | "back";

/** auto: fires while held. semi: one shot per click. */
export type FireMode = "auto" | "semi";

/** The numbers every weapon has. Weapon subclasses extend this with their own (e.g. ExplosiveWeaponStats). */
export interface WeaponStats {
  name: string;
  /** Short label for the HUD. */
  shortName: string;
  mount: Mount;
  damageType: DamageType;
  /** Damage per projectile (per pellet for shotguns). */
  damage: number;
  fireMode: FireMode;
  /** Shots per second. */
  fireRate: number;
  /** Shots before a reload is needed. */
  magazine: number;
  /** Seconds to reload a full magazine. */
  reloadTime: number;
  /** Projectiles per shot. */
  pellets: number;
  /** Base cone width in degrees. */
  spread: number;
  /** Degrees added to the cone per shot (bloom). */
  recoil: number;
  /** Cap on recoil bloom in degrees. */
  maxRecoil: number;
  /** Degrees per second the bloom recovers. */
  recoilRecovery: number;
  /** Units per second. */
  projectileSpeed: number;
  /** Size of the projectile's bounding box (square). */
  projectileSize: number;
  /** Distance before the projectile expires. */
  range: number;
  /** Damage is full up to this distance traveled, then drops linearly until max range. */
  falloffStart: number;
  /** Damage multiplier at max range (1 = no falloff). */
  falloffMin: number;
  /** Push applied to whoever gets hit, in units per second. */
  knockback: number;
  /**
   * Seconds the shooter is rooted after each shot (can't move, turn, shoot or
   * dodge) when their legs can't fire on the move. 0 for most weapons.
   */
  selfStagger: number;
  /** Adds to the carrier's weight, which slows movement and dashes. */
  weight: number;
}
