/**
 * Damage type. Right now only "explosive" behaves differently (it explodes);
 * bullet vs energy will matter once armor has per-type resistances.
 */
export type DamageType = "bullet" | "energy" | "explosive";

/** auto: fires while held. semi: one shot per click. */
export type FireMode = "auto" | "semi";

/** Everything that defines a weapon's behavior. Pure data so it's easy to tune. */
export interface WeaponStats {
  name: string;
  /** Short label for the HUD. */
  shortName: string;
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
  /** Distance before the projectile expires (explosives detonate there). */
  range: number;
  /** Push applied to whoever gets hit, in units per second. */
  knockback: number;
  /** Explosion radius; 0 means no explosion. */
  blastRadius: number;
  /**
   * Heavy weapons: on legs that can't fire on the move, the shot fires
   * instantly and then the mech self-staggers (rooted, can't act) for
   * `recovery` seconds.
   */
  brace?: { recovery: number };
}
