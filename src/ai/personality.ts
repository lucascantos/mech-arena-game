/** Tunables that make bots feel different from each other. */
export interface Personality {
  /** 0..1: how hard it presses: aggressive bots hold closer than their weapon's sweet spot and gap-close more. */
  aggression: number;
  /** 0..1: chance to react to an incoming dash or shot with its own dodge. */
  reflex: number;
  /** Delay in ticks before a reaction happens (human-like lag). */
  reactionTicks: number;
  /** 0..1: chance per decision to switch strafe direction. */
  fickleness: number;
  /** Max aim error in degrees. */
  aimError: number;
  /** 0..1: how well it leads moving targets. */
  leadSkill: number;
}

export const AGGRESSIVE: Personality = {
  aggression: 0.7,
  reflex: 0.45,
  reactionTicks: 10,
  fickleness: 0.5,
  aimError: 7,
  leadSkill: 0.4,
};

export const BALANCED: Personality = {
  aggression: 0.5,
  reflex: 0.55,
  reactionTicks: 9,
  fickleness: 0.4,
  aimError: 5,
  leadSkill: 0.6,
};

export const CAUTIOUS: Personality = {
  aggression: 0.35,
  reflex: 0.7,
  reactionTicks: 7,
  fickleness: 0.3,
  aimError: 4,
  leadSkill: 0.8,
};
