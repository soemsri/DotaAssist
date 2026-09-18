import assert from 'node:assert/strict';
import { neutralItemService } from '../src/services/neutralItemService';
import { timingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { alertProfiles } from '../src/services/alertProfiles';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING NEUTRAL ITEMS TIMINGS, GRACE PERIOD & REMINDER TESTS ---');

// Mock spoken utterances
const spokenUtterances: string[] = [];
const origSpeak = (audioService as any).speak.bind(audioService);
(audioService as any).speak = (text: string, langOverride?: string, objective?: any) => {
  spokenUtterances.push(text);
  return origSpeak(text, langOverride, objective);
};

// Helper to construct mock payload with neutral slot
function createPayloadWithNeutral(neutralItemName?: string): GSIPayload {
  return {
    map: {
      clock_time: 600,
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      daytime: true,
      nightstalker_night: false,
      radiant_score: 5,
      dire_score: 3,
    },
    player: {
      gold: 1500,
      gold_reliable: 500,
      gold_unreliable: 1000,
      net_worth: 5000,
      kills: 1,
      deaths: 0,
      assists: 2,
      last_hits: 40,
      denies: 5,
      team_name: 'radiant',
    },
    hero: {
      id: 1,
      name: 'npc_dota_hero_juggernaut',
      level: 7,
      alive: true,
      respawn_seconds: 0,
      buyback_cost: 300,
      buyback_cooldown: 0,
      health: 900,
      max_health: 900,
      health_percent: 100,
      mana: 400,
      max_mana: 400,
      mana_percent: 100,
    },
    items: {
      neutral0: neutralItemName ? { name: neutralItemName } : undefined,
    },
  };
}

// Test 1: Item Tier Classification
console.log('[Test 1] Neutral item tier classification');
assert.equal(neutralItemService.getNeutralItemTier(undefined), 0);
assert.equal(neutralItemService.getNeutralItemTier('empty'), 0);
assert.equal(neutralItemService.getNeutralItemTier(''), 0);

// Tokens
assert.equal(neutralItemService.getNeutralItemTier('item_tier1_token'), 1);
assert.equal(neutralItemService.getNeutralItemTier('item_tier2_token'), 2);
assert.equal(neutralItemService.getNeutralItemTier('item_tier3_token'), 3);
assert.equal(neutralItemService.getNeutralItemTier('item_tier4_token'), 4);
assert.equal(neutralItemService.getNeutralItemTier('item_tier5_token'), 5);

// Known items across tiers
assert.equal(neutralItemService.getNeutralItemTier('item_trusty_shovel'), 1);
assert.equal(neutralItemService.getNeutralItemTier('item_safety_bubble'), 1);
assert.equal(neutralItemService.getNeutralItemTier('item_philosophers_stone'), 2);
assert.equal(neutralItemService.getNeutralItemTier('item_vambrace'), 2);
assert.equal(neutralItemService.getNeutralItemTier('item_paladin_sword'), 3);
assert.equal(neutralItemService.getNeutralItemTier('item_craggy_coat'), 3);
assert.equal(neutralItemService.getNeutralItemTier('item_timeless_relic'), 4);
assert.equal(neutralItemService.getNeutralItemTier('item_spell_prism'), 4);
assert.equal(neutralItemService.getNeutralItemTier('item_apex'), 5);
assert.equal(neutralItemService.getNeutralItemTier('item_fallen_sky'), 5);
console.log('  ✓ Item tier classification verified');

// Test 2: Unlocked Tier by Clock Time
console.log('[Test 2] Unlocked tier by game clock');
assert.equal(neutralItemService.getUnlockedTier(0), 0);
assert.equal(neutralItemService.getUnlockedTier(419), 0);
assert.equal(neutralItemService.getUnlockedTier(420), 1); // 7:00
assert.equal(neutralItemService.getUnlockedTier(1019), 1);
assert.equal(neutralItemService.getUnlockedTier(1020), 2); // 17:00
assert.equal(neutralItemService.getUnlockedTier(1620), 3); // 27:00
assert.equal(neutralItemService.getUnlockedTier(2220), 4); // 37:00
assert.equal(neutralItemService.getUnlockedTier(3600), 5); // 60:00
console.log('  ✓ Unlocked tier calculation verified');

// Test 3: Countdown Alert Card (Decision 3: shows 60s before unlock, disappears when reached)
console.log('[Test 3] Timing Alert card appearance and disappearance');
timingEngine.resetAlerts();
spokenUtterances.length = 0;

// At 350s (70s before Tier 1 at 420s) -> diff = 70s (> 60s), should NOT appear
let alerts = timingEngine.calculateAlerts(350, false);
assert.equal(alerts.some(a => a.type === 'neutral_item'), false, 'Should not appear > 60s before unlock');

// At 370s (50s before Tier 1 at 420s) -> diff = 50s (<= 60s), card SHOULD appear
alerts = timingEngine.calculateAlerts(370, false);
const card50 = alerts.find(a => a.type === 'neutral_item');
assert.ok(card50, 'Card should appear <= 60s before unlock');
assert.equal(card50.secondsRemaining, 50);
assert.equal(card50.urgent, false);
assert.equal(card50.targetSeconds, 420);

// At 405s (15s before Tier 1 at 420s) -> urgent is true, but unlock voice waits
alerts = timingEngine.calculateAlerts(405, false);
const card15 = alerts.find(a => a.type === 'neutral_item');
assert.ok(card15, 'Card should remain visible');
assert.equal(card15.urgent, true);
assert.equal(
  spokenUtterances.some(s => s.includes('Neutral items tier 1')),
  false,
  'Neutral unlock voice must not play early',
);

// At 420s (exact unlock second) -> secondsRemaining = 0 and unlock voice plays
alerts = timingEngine.calculateAlerts(420, false);
const card0 = alerts.find(a => a.type === 'neutral_item');
assert.ok(card0, 'Card should show 0s at exact unlock second');
assert.equal(card0.secondsRemaining, 0);
assert.ok(
  spokenUtterances.some(s => s.includes('Neutral items tier 1 are now unlocked')),
  `Unlock voice should be triggered. Spoken: ${JSON.stringify(spokenUtterances)}`
);

// Re-rendering at the same clock second must not repeat the unlock voice.
timingEngine.calculateAlerts(420, false);
assert.equal(spokenUtterances.filter(s => s.includes('tier 1 are now unlocked')).length, 1);

// At 421s (past unlock) -> card disappears
alerts = timingEngine.calculateAlerts(421, false);
assert.equal(alerts.some(a => a.type === 'neutral_item'), false, 'Card should disappear once unlock time is passed');
console.log('  ✓ Timing alert card 60s window and auto-dismiss verified');

// A late GSI connection must not announce every already-unlocked tier.
timingEngine.resetAll();
spokenUtterances.length = 0;
timingEngine.calculateAlerts(1200, false);
assert.equal(spokenUtterances.some(s => s.includes('now unlocked')), false);

// Test 4: Grace Period (Decisions 1 & 2: 90s grace period after unlock)
console.log('[Test 4] 90-second Grace Period behavior');
neutralItemService.resetAlerts();
spokenUtterances.length = 0;

const emptyPayload = createPayloadWithNeutral(undefined);

// At 450s (30s after Tier 1 unlock at 420s) -> within 90s grace period
const resGrace30 = neutralItemService.checkMissingOrOutdatedReminder(emptyPayload, 450);
assert.equal(resGrace30.alerted, false, 'Grace period should prevent alert at 30s post-unlock');
assert.equal(spokenUtterances.length, 0);

// At 509s (89s after Tier 1 unlock) -> still within grace period
const resGrace89 = neutralItemService.checkMissingOrOutdatedReminder(emptyPayload, 509);
assert.equal(resGrace89.alerted, false, 'Grace period should prevent alert at 89s post-unlock');
assert.equal(spokenUtterances.length, 0);
console.log('  ✓ 90-second grace period verified');

// Test 5: Missing Item Reminder & 2-minute Throttling (Decisions 1 & 2: max 2 reminders)
console.log('[Test 5] Missing neutral item reminder, throttling (120s), and max 2 reminders');
// At 510s (exactly 420 + 90s) -> 1st reminder fires!
const reminder1 = neutralItemService.checkMissingOrOutdatedReminder(emptyPayload, 510);
assert.equal(reminder1.alerted, true, '1st reminder should fire at 90s');
assert.equal(reminder1.type, 'missing');
assert.equal(reminder1.tier, 1);
assert.ok(spokenUtterances.some(s => s.includes('Reminder: Neutral item slot is empty. Tier 1 is available.')));

// At 550s (40s later) -> throttled (< 120s)
const reminderThrottled = neutralItemService.checkMissingOrOutdatedReminder(emptyPayload, 550);
assert.equal(reminderThrottled.alerted, false, 'Should be throttled within 120s interval');

// At 630s (510 + 120s) -> 2nd reminder fires!
const reminder2 = neutralItemService.checkMissingOrOutdatedReminder(emptyPayload, 630);
assert.equal(reminder2.alerted, true, '2nd reminder should fire after 120s');
assert.equal(reminder2.type, 'missing');

// At 760s (630 + 130s) -> capped at 2 reminders, no 3rd reminder
const reminderCapped = neutralItemService.checkMissingOrOutdatedReminder(emptyPayload, 760);
assert.equal(reminderCapped.alerted, false, 'Should not fire 3rd reminder (capped at max 2)');
console.log('  ✓ Missing item reminder, 120s throttling, and 2-reminder cap verified');

// Test 6: Outdated Neutral Item Reminder
console.log('[Test 6] Outdated neutral item reminder');
neutralItemService.resetAlerts();
spokenUtterances.length = 0;

// At 1110s (Tier 2 unlocked at 1020s + 90s grace period)
// Player still has Tier 1 item (item_trusty_shovel)
const outdatedPayload = createPayloadWithNeutral('item_trusty_shovel');
const outdatedAlert = neutralItemService.checkMissingOrOutdatedReminder(outdatedPayload, 1110);
assert.equal(outdatedAlert.alerted, true);
assert.equal(outdatedAlert.type, 'outdated');
assert.equal(outdatedAlert.tier, 2);
assert.ok(
  spokenUtterances.some(s => s.includes('Reminder: Still using Tier 1 neutral item. Tier 2 is available.')),
  `Spoken was: ${JSON.stringify(spokenUtterances)}`
);

// If player equips Tier 2 item (item_philosophers_stone), no further alert
const updatedPayload = createPayloadWithNeutral('item_philosophers_stone');
const noAlertUpdated = neutralItemService.checkMissingOrOutdatedReminder(updatedPayload, 1240);
assert.equal(noAlertUpdated.alerted, false, 'No alert once up-to-date tier is equipped');
console.log('  ✓ Outdated neutral item reminder and resolution verified');

// Test 7: Profile Filtering
console.log('[Test 7] Profile filtering disables neutral item alerts');
try {
  alertProfiles.select('support');
  alertProfiles.edit('support', 'neutral_item', false);
  neutralItemService.resetAlerts();
  spokenUtterances.length = 0;

  // With profile disabled, reminder should not alert
  const disabledReminder = neutralItemService.checkMissingOrOutdatedReminder(emptyPayload, 510);
  assert.equal(disabledReminder.alerted, false, 'Disabled profile should not alert');

  // And countdown card should not appear
  const filteredAlerts = timingEngine.calculateAlerts(370, false);
  assert.equal(filteredAlerts.some(a => a.type === 'neutral_item'), false, 'Disabled profile should filter card');
  console.log('  ✓ Profile filtering verified');
} finally {
  alertProfiles.edit('support', 'neutral_item', true);
  alertProfiles.reset('support');
}

// Test 8: Engine reset clears all state
console.log('[Test 8] Engine reset clears neutral item reminder state');
timingEngine.resetAll();
assert.equal(neutralItemService.getNeutralItemStatus(null, 0).unlockedTier, 0);
console.log('  ✓ Reset logic verified');

// Test 9: getNeutralItemStatus comprehensive state
console.log('[Test 9] getNeutralItemStatus state flags');
const statusEarly = neutralItemService.getNeutralItemStatus(null, 200);
assert.equal(statusEarly.unlockedTier, 0);
assert.equal(statusEarly.nextTier, 1);
assert.equal(statusEarly.nextTierTime, 420);
assert.equal(statusEarly.isMissing, false);
assert.equal(statusEarly.isUpToDate, true);

const statusTier1Missing = neutralItemService.getNeutralItemStatus(createPayloadWithNeutral('empty'), 500);
assert.equal(statusTier1Missing.unlockedTier, 1);
assert.equal(statusTier1Missing.equippedTier, 0);
assert.equal(statusTier1Missing.isMissing, true);
assert.equal(statusTier1Missing.isOutdated, false);
assert.equal(statusTier1Missing.isUpToDate, false);

const statusTier2Outdated = neutralItemService.getNeutralItemStatus(createPayloadWithNeutral('item_trusty_shovel'), 1100);
assert.equal(statusTier2Outdated.unlockedTier, 2);
assert.equal(statusTier2Outdated.equippedTier, 1);
assert.equal(statusTier2Outdated.isMissing, false);
assert.equal(statusTier2Outdated.isOutdated, true);
assert.equal(statusTier2Outdated.isUpToDate, false);

const statusTier2UpToDate = neutralItemService.getNeutralItemStatus(createPayloadWithNeutral('item_philosophers_stone'), 1100);
assert.equal(statusTier2UpToDate.unlockedTier, 2);
assert.equal(statusTier2UpToDate.equippedTier, 2);
assert.equal(statusTier2UpToDate.isMissing, false);
assert.equal(statusTier2UpToDate.isOutdated, false);
assert.equal(statusTier2UpToDate.isUpToDate, true);
console.log('  ✓ getNeutralItemStatus flags verified');

console.log('--- ALL NEUTRAL ITEMS TESTS PASSED! ---');
