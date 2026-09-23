import { SpinUpWeapon } from "./spinUpWeapon";

/**
 * Back weapon. A huge belt of bullets: slow for the first second while the
 * barrels spin up, then a torrent. You move slower while it's turning, and
 * bipedal legs can't move at all (quad legs and treads can).
 */
export class GatlingGun extends SpinUpWeapon {
  constructor() {
    super({
      name: "Gatling Gun",
      shortName: "GG",
      mount: "back",
      damageType: "bullet",
      damage: 4,
      fireMode: "auto",
      fireRate: 20,
      minFireRate: 4,
      spinUpTime: 1,
      spinningSpeed: 0.8,
      rootsLightLegs: true,
      magazine: 150,
      reloadTime: 5,
      pellets: 1,
      spread: 6,
      recoil: 0.5,
      maxRecoil: 8,
      recoilRecovery: 25,
      projectileSpeed: 1100,
      projectileSize: 5,
      range: 1300,
      falloffStart: 500,
      falloffMin: 0.4,
      knockback: 10,
      selfStagger: 0,
      weight: 24,
    });
  }
}
