import assert from 'node:assert/strict';
import { buybackService } from '../src/services/buybackService';
import { timingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING BUYBACK TRACKER & OBJECTIVE-LINKED ALERT TESTS ---');

// Mock audioService.speak to capture voice output
const spokenUtterances: string[] = [];
const origSpeak = (audioService as any).speak.bind(audioService);
(audioService as any).speak = (text: string, langOverride?: string, objective?: any) => {
  spokenUtterances.push(text);
  return origSpeak(text, langOverride, objective);
};

// Helper to create mock GSI payload
function createMockPayload(opts: {
  gold?: number;
  buybackCost?: number;
  buybackCooldown?: number;
  clockTime?: number;
}): GSIPayload {
  return {
    map: {
      clock_time: opts.clockTime ?? 600,
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      daytime: true,
      nightstalker_night: false,
      radiant_score: 10,
      dire_score: 8,
    },
    player: {
      gold: opts.gold ?? 2000,
      gold_reliable: 1000,
      gold_unreliable: 1000,
      net_worth: 15000,
      kills: 5,
      deaths: 2,
      assists: 7,
      last_hits: 150,
      denies: 10,
      team_name: 'radiant',
    },
    hero: {
      id: 1,
      name: 'npc_dota_hero_antimage',
      level: 18,
      alive: true,
      respawn_seconds: 0,
      buyback_cost: opts.buybackCost ?? 1200,
      buyback_cooldown: opts.buybackCooldown ?? 0,
      health: 1600,
      max_health: 1600,
      health_percent: 100,
      mana: 800,
      max_mana: 800,
      mana_percent: 100,
    },
  };
}

// Test 1: Buyback Calculation with Surplus Gold (Safe to spend)
console.log('[Test 1] Buyback calculation when affordable with safe-to-spend surplus');
{
  const payload = createMockPayload({ gold: 2500, buybackCost: 1500, buybackCooldown: 0, clockTime: 1200 });
  const status = buybackService.calculateBuyback(payload);

  assert.equal(status.hasBuyback, true, 'Buyback should be ready');
  assert.equal(status.canAfford, true, 'Player can afford buyback');
  assert.equal(status.cost, 1500, 'Cost matches payload');
  assert.equal(status.currentGold, 2500, 'Gold matches payload');
  assert.equal(status.surplusGold, 1000, 'Safe-to-spend surplus gold is +1000');
  assert.equal(status.missingGold, 0, 'Missing gold is 0 when affordable');
  assert.equal(status.cooldown, 0, 'Cooldown is 0');
  assert.equal(status.isLateGame, false, 'Clock 1200s (20m) is not late game (30m+)');
  console.log('  ✓ Affordable buyback and surplus gold calculation verified');
}

// Test 2: Buyback Calculation when Short on Gold (Missing gold)
console.log('[Test 2] Buyback calculation when insufficient gold');
{
  const payload = createMockPayload({ gold: 900, buybackCost: 1500, buybackCooldown: 0, clockTime: 1900 });
  const status = buybackService.calculateBuyback(payload);

  assert.equal(status.hasBuyback, false, 'Buyback should not be ready');
  assert.equal(status.canAfford, false, 'Player cannot afford buyback');
  assert.equal(status.surplusGold, -600, 'Surplus gold is negative');
  assert.equal(status.missingGold, 600, 'Missing gold is exactly 600g');
  assert.equal(status.isLateGame, true, 'Clock 1900s (31m40s) is late game');
  console.log('  ✓ Insufficient gold and missing gold calculation verified');
}

// Test 3: Buyback Calculation when on Cooldown
console.log('[Test 3] Buyback calculation during cooldown');
{
  const payload = createMockPayload({ gold: 3000, buybackCost: 1500, buybackCooldown: 75, clockTime: 2100 });
  const status = buybackService.calculateBuyback(payload);

  assert.equal(status.hasBuyback, false, 'Buyback should be false when on cooldown');
  assert.equal(status.cooldown, 75, 'Cooldown matches payload');
  assert.equal(status.canAfford, true, 'Player can afford the cost once off cooldown');
  console.log('  ✓ Cooldown status verified');
}

// Test 4: Null and empty payload safety
console.log('[Test 4] Fallback behavior on null or missing data');
{
  const nullStatus = buybackService.calculateBuyback(null);
  assert.equal(nullStatus.hasBuyback, false);
  assert.equal(nullStatus.currentGold, 0);
  assert.equal(nullStatus.cost, 0);
  assert.equal(nullStatus.surplusGold, 0);
  assert.equal(nullStatus.missingGold, 0);
  console.log('  ✓ Null payload safety verified');
}

// Test 5: Objective-linked voice alert behavior & throttling
console.log('[Test 5] Objective-linked voice alerts and throttling');
{
  buybackService.resetAlerts();
  spokenUtterances.length = 0;

  // Case 5a: Before 30 minutes (<1800s), no alert should trigger
  const earlyPayload = createMockPayload({ gold: 500, buybackCost: 1500, clockTime: 1200 }); // 20:00
  const alertedEarly = buybackService.checkObjectiveLinkedAlert('Tormentor', earlyPayload);
  assert.equal(alertedEarly, false, 'Should not trigger buyback warning before late game');
  assert.equal(spokenUtterances.length, 0);

  // Case 5b: At 30:00+ (1800s), but buyback IS ready, no alert should trigger
  const readyPayload = createMockPayload({ gold: 2000, buybackCost: 1500, clockTime: 1850 });
  const alertedReady = buybackService.checkObjectiveLinkedAlert('Wisdom shrine', readyPayload);
  assert.equal(alertedReady, false, 'Should not trigger warning if buyback is ready');
  assert.equal(spokenUtterances.length, 0);

  // Case 5c: At 30:00+ (1900s), missing 500 gold -> triggers alert!
  const missingPayload = createMockPayload({ gold: 1000, buybackCost: 1500, clockTime: 1900 });
  const alertedMissing = buybackService.checkObjectiveLinkedAlert('Roshan window', missingPayload);
  assert.equal(alertedMissing, true, 'Should trigger warning when missing gold in late game');
  assert.equal(spokenUtterances.length, 1);
  assert.ok(
    spokenUtterances[0].includes('Roshan window soon, and Buyback is not ready. Missing 500 gold.'),
    `Spoken text was: ${spokenUtterances[0]}`
  );

  // Case 5d: Another objective triggers within 180s cooldown window (e.g. at 1950s, 50s later)
  const quickNextPayload = createMockPayload({ gold: 1000, buybackCost: 1500, clockTime: 1950 });
  const alertedThrottled = buybackService.checkObjectiveLinkedAlert('Tormentor', quickNextPayload);
  assert.equal(alertedThrottled, false, 'Should be throttled within 3 minutes (180s)');
  assert.equal(spokenUtterances.length, 1, 'No new speech should be emitted');

  // Case 5e: After 180s (at 2100s = 1900 + 200s), alert triggers again (cooldown case)
  const cdPayload = createMockPayload({ gold: 2000, buybackCost: 1500, buybackCooldown: 45, clockTime: 2100 });
  const alertedAfterCooldown = buybackService.checkObjectiveLinkedAlert('Tormentor', cdPayload);
  assert.equal(alertedAfterCooldown, true, 'Should alert after 180s throttling window expires');
  assert.equal(spokenUtterances.length, 2);
  assert.ok(
    spokenUtterances[1].includes('Tormentor soon, and Buyback is on cooldown for 45 seconds.'),
    `Spoken text was: ${spokenUtterances[1]}`
  );

  // Case 5f: resetAlerts() clears throttle immediately
  buybackService.resetAlerts();
  const resetPayload = createMockPayload({ gold: 500, buybackCost: 1500, clockTime: 2110 });
  const alertedAfterReset = buybackService.checkObjectiveLinkedAlert('Wisdom shrine', resetPayload);
  assert.equal(alertedAfterReset, true, 'Should alert immediately after resetAlerts');
  assert.equal(spokenUtterances.length, 3);
  console.log('  ✓ Objective-linked voice alerts and throttling verified');
}

// Test 6: Integration with TimingEngine
console.log('[Test 6] TimingEngine integration with GSI payload and objective triggers');
{
  timingEngine.resetAll();
  spokenUtterances.length = 0;

  // Send GSI payload at 2090s (34:50), 10s before 35:00 Wisdom Shrine
  // Buyback missing 400g
  const lateGsiPayload = createMockPayload({ gold: 1100, buybackCost: 1500, clockTime: 2090 });
  timingEngine.handleGSIPayload(lateGsiPayload);

  // Calculate alerts at 2090s (within 30s of 2100s Wisdom Shrine)
  timingEngine.calculateAlerts(2090, false);

  // Check that speech contains Wisdom shrine alert AND objective-linked buyback alert
  assert.ok(
    spokenUtterances.some(s => s.includes('Wisdom shrine') && s.includes('Missing 400 gold')),
    `Spoken utterances did not include expected buyback warning. Found: ${JSON.stringify(spokenUtterances)}`
  );

  // When match resets, buyback alerts are also reset
  timingEngine.resetAll();
  assert.equal(timingEngine.getLastClockTime(), 0);
  console.log('  ✓ TimingEngine objective integration verified');
}

console.log('--- ALL BUYBACK TRACKER & OBJECTIVE-LINKED ALERT TESTS PASSED! ---');
