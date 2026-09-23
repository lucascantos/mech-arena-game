/** Tunables that make bots feel different from each other. */
export interface Personality {
  /** Distance the bot likes to circle at. */
  preferredRange: number;
  /** 0..1: how often it chooses to press in instead of circling or backing off. */
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
  preferredRange: 160,
  aggression: 0.7,
  reflex: 0.45,
  reactionTicks: 10,
  fickleness: 0.5,
  aimError: 7,
  leadSkill: 0.4,
};

export const BALANCED: Personality = {
  preferredRange: 240,
  aggression: 0.5,
  reflex: 0.55,
  reactionTicks: 9,
  fickleness: 0.4,
  aimError: 5,
  leadSkill: 0.6,
};

export const CAUTIOUS: Personality = {
  preferredRange: 320,
  aggression: 0.35,
  reflex: 0.7,
  reactionTicks: 7,
  fickleness: 0.3,
  aimError: 4,
  leadSkill: 0.8,
};
