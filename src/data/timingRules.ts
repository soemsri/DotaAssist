/** Release-bundled gameplay rules. Changes require review and boundary tests.
 * This patch label describes supported rules, not a detected game version. */
export const TIMING_RULES = Object.freeze({
  patch: '7.41e',
  bountyInterval: 240,
  wisdomInterval: 420,
  lotusInterval: 180,
  dayNightInterval: 300,
  riverInterval: 120,
  powerFirst: 360,
  tormentorFirst: 1200,
  tormentorRespawn: 600,
  aegisDuration: 300,
  roshanEarliest: 480,
  roshanLatest: 660,
  neutralTier1: 420,  // 7:00
  neutralTier2: 1020, // 17:00
  neutralTier3: 1620, // 27:00
  neutralTier4: 2220, // 37:00
  neutralTier5: 3600, // 60:00
  stackStartClock: 60, // 1:00
  stackEndClock: 900,  // 15:00
  stackPullSec: 53,    // :53
  stackLeadSec: 20,    // :33
  stackWindowEndSec: 55, // :55
});

export const NEUTRAL_TIER_TIMINGS = [
  { tier: 1, time: 420, label: 'Tier 1' },
  { tier: 2, time: 1020, label: 'Tier 2' },
  { tier: 3, time: 1620, label: 'Tier 3' },
  { tier: 4, time: 2220, label: 'Tier 4' },
  { tier: 5, time: 3600, label: 'Tier 5' },
] as const;
