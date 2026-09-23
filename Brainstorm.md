# Mech Arena: Brainstorm

A living list of ideas. Nothing here is decided unless it's under **Decisions so far**.

---

## Decisions so far

- **View:** top-down. No art yet; every entity is its bounding box.
- **Controls:** WASD to move, Space to dodge, click to attack, mouse to aim.
- **Stack:** TypeScript, Vite and Canvas 2D. No game engine.
- **Netcode direction:** the game logic in `src/sim/` is deterministic and runs on fixed ticks. Humans, bots and (later) remote players all feed the same `Input`, so an authoritative server can reuse the sim.
- **Weapons replace Attack.** `Weapon` holds stats (damage, spread, recoil, reload, ammo, fire rate, type...) and any fighter can carry any weapon. How a shot is delivered is `Weapon.fire()`: the default spawns projectiles; laser, missiles and melee will be subclasses.
- **Damage types:** Bullet, Energy, Explosive. Only Explosive behaves differently for now (area damage with falloff); Bullet vs Energy will matter through armor resistances.
- **Recoil = spread bloom** (grows per shot, recovers over time). Leg stability should reduce it later.
- **Defense** stays its own class hierarchy. There will be many types.
- **Parts → stats.** A fighter's numbers (HP, size, speed, acceleration, turn rate, recoil/knockback multipliers, dash speed/cooldown multipliers) are computed from its parts in `computeStats()`. Legs are the first part: Bipedal, Quadpod, Treads. Torso/head/arms plug into the same function.
- **Torso** (Light / Medium / Heavy): HP (added to legs HP), weapon capacity (1 / 2 / 3), speed multiplier (weight), defense cooldown multiplier, hitbox size bonus.
- **Bracing** (AC6-style, automatic): weapons with `brace` (Rocket Launcher) root legs without `firesOnTheMove` (Bipedal) for a windup before the shot and a recovery after. Dodge can cancel the windup (shot lost, no ammo spent), not the recovery. Quadpod and Treads fire heavy weapons on the move. The windup shows a telegraph line.
- **Presets.** Builds are named presets (`src/presets/presets.ts`): name, legs, torso, weapons (up to capacity), plus an AI personality for when a bot drives it. New part slots get added as fields.
- **First defense:** `Dodge` (a dash with invulnerability frames and a cooldown).
- **First scene:** two bots dueling. Tab lets you take control of one.

---

## Core pillars (proposal)

1. **Readable combat.** You can tell what's happening from boxes alone: windups, hitboxes and invulnerability are always visible.
2. **Skill over stats.** Timing your dodge and spacing matter more than gear.
3. **Build variety.** Mix and match attacks and defenses into loadouts.
4. **Short matches.** A duel lasts about 1–3 minutes, then you queue again quickly.

---

## Attack ideas

Each attack is an `Attack` subclass. Most have a **windup** (telegraph), an **active** phase (hitbox) and **recovery** (the punish window).

| Name | Type | Notes |
|---|---|---|
| Slash | Melee arc | Fast, short range. The baseline attack. |
| Heavy Smash | Melee, big box | Long windup, big damage, knockback. |
| Lunge | Melee plus movement | Moves forward during the active phase. Doubles as a gap-closer. |
| Blaster | Projectile | Medium speed, and dodgeable by moving sideways. |
| Shotgun | Spread of projectiles | Strong up close, falls off with distance. |
| Railgun | Hitscan beam | Long charge, the line is shown during the charge, huge damage. |
| Mine | Placed object | Arms after a delay and denies an area. |
| Grapple | Projectile that pulls | Drags the target to you, or you to a wall. |
| Flamethrower | Held cone | Damage over time while held; slows you down. |
| Shockwave | Circle around yourself | Pushes enemies away. A get-off-me tool. |

**Shared attack properties to consider:** damage, knockback, hitstun, windup/active/recovery ticks, movement multiplier while attacking, whether you can cancel into a dodge, and whether aim turns during the windup.

---

## Defense ideas

Each defense is a `Defense` subclass, and a fighter has one.

| Name | Notes |
|---|---|
| **Dodge** ✅ | Dash with invulnerability frames and a cooldown. Already built. |
| Block | Hold to reduce damage from the front; you move slower. |
| Parry | Short window; a successful parry stuns the attacker. High risk. |
| Shield Bubble | Absorbs X damage, then breaks and goes on a long cooldown. |
| Blink | Teleports a short distance toward the cursor with no travel time. |
| Phase | Longer invulnerability, but you can't move or attack. |
| Reflect | Sends projectiles back toward whoever fired them. |
| Decoy | Leaves a fake box behind while you briefly go invisible. |

---

## Mechs / characters

- **Chassis** sets the base stats: box size, speed, HP. A bigger box is easier to hit but can have more HP.
  - Light: small and fast.
  - Medium: balanced.
  - Heavy: big and slow, tanky.
- **Loadout:** chassis, 1–2 attacks and 1 defense.
- Maybe **passives** later: regen, dodge refund on a perfect dodge, damage after a dodge.

---

## Resources (undecided)

- Only cooldowns (what we have now), **or**
- **Heat:** attacks build heat, overheating locks you out. Fits mechs well.
- **Energy/stamina:** a shared pool for attacks and defense (Souls-like).

---

## Game modes

- **Duel (1v1).** The main mode. First to 3 rounds.
- **Free-for-all.** 4–8 players.
- **2v2 / team deathmatch.**
- **King of the Hill.** Hold a zone.
- **Bot practice / training room.** Dummies with configurable behavior.
- **Horde / PvE.** Waves of bots, possibly co-op.

---

## Arena ideas

- Walls and pillars for cover (square obstacles block projectiles).
- Hazards: lava tiles, spikes, electric floors that switch on and off.
- A shrinking zone to force fights late in a match.
- Pickups: health, temporary damage buff, dodge refresh.
- Knockback into walls causes extra stun ("wall splat").

---

## Bots / AI

- The current `DuelBot` has modes (approach, circle, retreat), personalities and reactive dodges.
- Next steps:
  - Read enemy windups and dodge on the telegraph, not on the hit.
  - Pick attacks by range.
  - Punish the enemy's recovery frames.
  - Difficulty levels: reaction time, reflex chance, aim error.
- Bots fill empty lobby slots in multiplayer.

---

## Multiplayer plan

1. **Now:** local sim, driven by inputs.
2. **Server:** Node with a WebSocket server running the same `World.step()` at 60 ticks. Clients send `Input`; the server broadcasts snapshots.
3. **Client prediction:** predict your own fighter, reconcile with the server, interpolate the others.
4. **Lag compensation** for hits (rewinding hitboxes on the server).
5. **Lobbies / matchmaking:** room codes first, a proper queue later.
6. Anti-cheat comes for free, since the server is authoritative.

Open networking questions: tick rate over the network (20–30 Hz snapshots?), whether to use rollback netcode for duels, and where to host.

---

## Game feel without art

- Screen shake on hits.
- Hit-stop: freeze 2–4 frames when a hit lands.
- A flash of the box color on damage.
- Dash afterimages (ghost boxes).
- Floating damage numbers.
- Visible telegraphs: an attack's hitbox fades in during the windup.
- Particles as tiny squares.
- Sound: simple synth blips via the Web Audio API.

---

## Tech / tooling ideas

- A debug overlay toggle that draws hitboxes, velocities, AI mode and tick timings.
- Replays: store the seed plus inputs per tick. Deterministic, so replays are tiny.
- Headless bot-vs-bot simulations for balance testing (win rates per loadout).
- Unit tests for the sim (Vitest).
- A config file per ability so balance tweaks don't need code changes.

---

## Open questions

- Melee focus, ranged focus, or both?
- Can fighters pass through each other while dodging? (They can't right now.)
- Friendly fire in team modes?
- Progression: unlocks, cosmetics, ranked, or none?
- Art direction once we move past boxes: pixel art, vector or 3D?
- Mouse-only aim, or controller support too?

Let's add some armored core elements of customization.
Legs
Treads	High durability + stable	Slow movement	Tank
Bipedal	Fast + balanced	No major specialization	All-rounder
Quadpod	Very stable + strong ranged combat	Slow acceleration / less agile	Ranged / artillery

Ok...so we have movement, dash as properties that are affected directly by leg.
Armor, HP, Knockback, Turning, Dodge

Weapon: 
Machine Gun	Lots of weak projectiles
Shotgun	Short-range burst
Laser	Long-range piercing
Missiles	Homing projectiles
Melee	Powerful close-range attack
Heavy Weapon	Slow, huge area damage

Here we have Damage, reload speed, ammo, recoil
Torso:
Heavy
Light
Medium

Properties: HP, Coodown, Weapon Capacity
Head
