import { PiercingSlug } from "../projectiles/piercingSlug";
import { Projectile, type ProjectileSpec } from "../projectiles/projectile";
import type { Fighter } from "../fighter";
import type { Vec2 } from "../vec";
import type { World } from "../world";
import { ChargeWeapon } from "./chargeWeapon";
import { Weapon } from "./weapon";

/** Light and very fast, but wild and weak past close range. */
export class SubmachineGun extends Weapon {
  constructor() {
    super({
      name: "SMG",
      shortName: "SMG",
      mount: "hand",
      damageType: "bullet",
      damage: 3,
      fireMode: "auto",
      fireRate: 16,
      magazine: 40,
      reloadTime: 1.6,
      pellets: 1,
      spread: 8,
      recoil: 0.8,
      maxRecoil: 10,
      recoilRecovery: 30,
      projectileSpeed: 950,
      projectileSize: 4,
      range: 1000,
      falloffStart: 250,
      falloffMin: 0.3,
      knockback: 8,
      selfStagger: 0,
      weight: 6,
    });
  }
}

/** Hold to charge a very fast slug; a full charge hits hard. Everyone sees the aiming line while you charge. */
export class LinearRifle extends ChargeWeapon {
  constructor() {
    super({
      name: "Linear Rifle",
      shortName: "LR",
      mount: "hand",
      damageType: "bullet",
      damage: 40,
      fireMode: "semi",
      fireRate: 2,
      magazine: 5,
      reloadTime: 2.4,
      pellets: 1,
      spread: 0.5,
      recoil: 2,
      maxRecoil: 4,
      recoilRecovery: 10,
      projectileSpeed: 2400,
      projectileSize: 6,
      range: 1800,
      falloffStart: 1000,
      falloffMin: 0.7,
      knockback: 120,
      selfStagger: 0,
      weight: 16,
      chargeTime: 0.8,
      minPower: 0.35,
      chargingSpeed: 0.85,
      chargeTell: "aimLine",
    });
  }
}

/**
 * A lighter laser cannon for the hand: hold to charge, release to fire a slug
 * so fast it's nearly instant. Fully charged, the slug pierces every mech in
 * its line (cover still stops it); a partial charge is a weaker single hit.
 */
export class Railgun extends ChargeWeapon {
  constructor() {
    super({
      name: "Railgun",
      shortName: "RG",
      mount: "hand",
      damageType: "energy",
      damage: 45,
      fireMode: "semi",
      fireRate: 1.2,
      magazine: 4,
      reloadTime: 2.8,
      pellets: 1,
      spread: 0,
      recoil: 1,
      maxRecoil: 2,
      recoilRecovery: 10,
      projectileSpeed: 4200,
      projectileSize: 6,
      range: 1800,
      falloffStart: 1800,
      falloffMin: 1,
      knockback: 160,
      selfStagger: 0,
      weight: 18,
      chargeTime: 1,
      minPower: 0.3,
      chargingSpeed: 0.8,
      chargeTell: "none", // no warning: the first sign is the slug
    });
  }

  /** Fully charged: a piercing slug; otherwise an ordinary one. */
  protected createProjectile(world: World, spec: ProjectileSpec): Projectile {
    return this.chargeFraction >= 1 ? new PiercingSlug(world, spec) : new Projectile(world, spec);
  }
}

/** Shot size (world units) of a tap and of a full charge. */
const BUSTER_TAP_SIZE = 5;
const BUSTER_FULL_SIZE = 26;

/**
 * Arm cannon, Mega Man style: tap for quick pistol-like shots, or hold to
 * charge and release a big shot. The shot grows with the charge (much bigger
 * at full, so it's easier to land) along with its damage and push.
 */
export class ArmCannon extends ChargeWeapon {
  constructor() {
    super({
      name: "Arm Cannon",
      shortName: "AC",
      mount: "hand",
      damageType: "energy",
      damage: 36,
      fireMode: "semi",
      fireRate: 4,
      magazine: 10,
      reloadTime: 1.8,
      pellets: 1,
      spread: 1,
      recoil: 1.5,
      maxRecoil: 5,
      recoilRecovery: 14,
      projectileSpeed: 1300,
      projectileSize: BUSTER_TAP_SIZE,
      range: 1400,
      falloffStart: 700,
      falloffMin: 0.6,
      knockback: 220,
      selfStagger: 0,
      weight: 10,
      chargeTime: 1.2,
      minPower: 0.25,
      chargingSpeed: 0.95,
      chargeTell: "gather",
    });
  }

  /** Tap: a pistol-sized shot; the charge grows it up to a big one. */
  protected projectileSpec(owner: Fighter, dir: Vec2): ProjectileSpec {
    const spec = super.projectileSpec(owner, dir);
    return { ...spec, size: BUSTER_TAP_SIZE + (BUSTER_FULL_SIZE - BUSTER_TAP_SIZE) * this.chargeFraction };
  }
}
