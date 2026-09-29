/**
 * Utilities for hero-specific item compatibility and power spike rules.
 * Ensures items like Blink Dagger are only recommended to heroes who genuinely
 * rely on them for initiation and combo execution, and never to heroes who have
 * native blink skills or standard non-blink item builds.
 */

// Heroes that possess built-in Blink or hyper-mobility abilities.
// Purchasing Blink Dagger on these heroes is redundant, counterproductive, or considered a meme/troll in competitive Dota.
export const NATIVE_BLINK_OR_MOBILITY_HEROES = new Set([
  'antimage',        // Blink (W) - 4s cooldown
  'queenofpain',     // Blink (W) - 6s cooldown
  'weaver',          // Shukuchi + Time Lapse
  'phantom_lancer',  // Doppelganger
  'riki',            // Blink Strike
  'mirana',          // Leap
  'storm_spirit',    // Ball Lightning
  'void_spirit',     // Astral Step
  'ember_spirit',    // Fire Remnant
  'morphling',       // Waveform
  'faceless_void',   // Time Walk
]);

// Curated list of genuine Blink Dagger core/initiator heroes.
// These are heroes whose core teamfight role, initiation, or combo execution depends heavily on Blink Dagger.
export const BLINK_DAGGER_HEROES = new Set([
  // Offlane & Teamfight Initiators
  'axe',
  'slardar',
  'centaur',
  'earthshaker',
  'tidehunter',
  'magnataur',
  'enigma',
  'legion_commander',
  'mars',
  'sand_king',
  'batrider',
  'beastmaster',
  'primal_beast',
  'night_stalker',
  'brewmaster',
  'dark_seer',
  'doom_bringer',
  
  // Mid, Core & Playmaker Burst Initiators
  'puck',
  'tiny',
  'nevermore', // Shadow Fiend
  'templar_assassin',
  'ursa',
  'sven',
  'kunkka',
  'pangolier',
  'pudge',
  'tinker',
  'dragon_knight',

  // Disablers & Pick-off Supports
  'lion',
  'shadow_shaman',
  'rubick',
  'earth_spirit',
  'tusk',
  'elder_titan',
]);

/**
 * Normalizes hero class/name string by removing npc_dota_hero_ prefix and lowercasing.
 */
export function normalizeHeroName(heroNameOrClass?: string): string {
  if (!heroNameOrClass) return '';
  return heroNameOrClass.replace(/^npc_dota_hero_/, '').toLowerCase();
}

/**
 * Checks whether a hero has a native blink or hyper-mobility skill.
 */
export function hasNativeBlinkOrMobility(heroNameOrClass?: string): boolean {
  const clean = normalizeHeroName(heroNameOrClass);
  return NATIVE_BLINK_OR_MOBILITY_HEROES.has(clean);
}

/**
 * Checks whether a hero legitimately builds and relies on Blink Dagger.
 * Automatically excludes heroes with native blink/mobility.
 */
export function isBlinkDaggerHero(heroNameOrClass?: string): boolean {
  const clean = normalizeHeroName(heroNameOrClass);
  if (!clean || hasNativeBlinkOrMobility(clean)) {
    return false;
  }
  return BLINK_DAGGER_HEROES.has(clean);
}

/**
 * Checks if the player already owns Blink Dagger or any of its tier upgrades.
 */
export function hasEquippedBlink(equippedKeys: Set<string>): boolean {
  return (
    equippedKeys.has('item_blink') ||
    equippedKeys.has('item_overwhelming_blink') ||
    equippedKeys.has('item_swift_blink') ||
    equippedKeys.has('item_arcane_blink')
  );
}
