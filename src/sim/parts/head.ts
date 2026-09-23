/**
 * Head part: the mech's sensors. Decides how far you see, how easily you
 * lock on, how fresh your radar picture is, and how often your shots crit.
 */
export interface Head {
  name: string;
  shortName: string;
  /**
   * Extra view on top of the base 924 × 600 area, as a fraction (0.2 = see
   * 20% farther). The base view is the minimum: heads can only add to it.
   */
  viewBonus: number;
  /** Lock-on engages when the cursor is within this many world units of an enemy's box. */
  lockOnRadius: number;
  /** Seconds between radar pings (minimap dots and edge arrows). */
  radarInterval: number;
  /** Chance (0–1) that a shot crits, dealing CRIT_MULTIPLIER × damage. */
  critChance: number;
}

/** Balanced sensors. */
export const STANDARD_HEAD: Head = {
  name: "Standard",
  shortName: "STD",
  viewBonus: 0,
  lockOnRadius: 40,
  radarInterval: 1.0,
  critChance: 0.05,
};

/** Sees farther and refreshes the radar twice as often, but locking on is fiddly and it rarely crits. */
export const SCOUT_HEAD: Head = {
  name: "Scout",
  shortName: "SCT",
  viewBonus: 0.2,
  lockOnRadius: 25,
  radarInterval: 0.5,
  critChance: 0.03,
};

/** Locks on easily and crits often, at the cost of a slow radar. */
export const HUNTER_HEAD: Head = {
  name: "Hunter",
  shortName: "HNT",
  viewBonus: 0,
  lockOnRadius: 80,
  radarInterval: 1.5,
  critChance: 0.1,
};
