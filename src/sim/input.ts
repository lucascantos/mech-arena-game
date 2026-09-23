/**
 * Everything a fighter can "press" in one tick. Humans, bots and (later) the
 * network all produce this same shape, so the sim doesn't care who is playing.
 */
export interface Input {
  /** Movement axes, each in [-1, 1]. Normalized by the sim. */
  moveX: number;
  moveY: number;
  /** Aim direction (does not need to be normalized). */
  aimX: number;
  aimY: number;
  /** Trigger of the equipped weapon is held. */
  fire: boolean;
  /** Start reloading the equipped weapon. */
  reload: boolean;
  /** Weapon slot to switch to this tick, or -1 to keep the current one. */
  selectSlot: number;
  /** Uses the defense ability (e.g. dodge). */
  defend: boolean;
}

export const emptyInput = (): Input => ({
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimY: 0,
  fire: false,
  reload: false,
  selectSlot: -1,
  defend: false,
});
