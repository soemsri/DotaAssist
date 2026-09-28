import assert from 'node:assert/strict';
import { tacticalCoach } from '../src/services/tacticalCoach';
import { audioService } from '../src/services/audioService';
import { alertProfiles } from '../src/services/alertProfiles';
import { objectiveTracker } from '../src/services/objectiveTracker';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING LIVE COACHING, SMART SUPPRESSION & NEXT ACTION TESTS ---');

const createBasePayload = (clockTime: number = 300): GSIPayload => ({
  map: {
    name: 'start',
    matchid: 'match_coach_test',
    game_time: clockTime + 90,
    clock_time: clockTime,
    daytime: true,
    nightstalker_night: false,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
    paused: false,
    win_team: 'none',
    customgamename: '',
  },
  player: {
    steamid: '12345',
    name: 'Player 1',
    activity: 'playing',
    kills: 1,
    deaths: 0,
    assists: 2,
    last_hits: 25,
    denies: 5,
    kill_streak: 1,
    commands_per_minute: 120,
    gold: 1500,
    gold_reliable: 200,
    gold_unreliable: 1300,
    gpm: 450,
    xpm: 500,
    net_worth: 3500,
    team_name: 'radiant',
  },
  hero: {
    id: 1,
    name: 'npc_dota_hero_antimage',
    level: 6,
    alive: true,
    respawn_seconds: 0,
    buyback_cost: 300,
    buyback_cooldown: 0,
    health: 900,
    max_health: 1000,
    health_percent: 90,
    mana: 400,
    max_mana: 500,
    mana_percent: 80,
    silenced: false,
    stunned: false,
    disarmed: false,
    magicimmune: false,
    hexed: false,
    muted: false,
    break: false,
    aghs_scepter: false,
    aghs_shard: false,
    smoked: false,
    has_debuff: false,
  },
  items: {
    slot0: { name: 'item_power_treads', purchaser: 0 },
    teleport0: { name: 'item_tpscroll', purchaser: 0, charges: 2 },
    neutral0: { name: 'item_seeds_of_serenity', purchaser: 0 },
  },
});

// [Test 1] Combat Detection & Smart Fight Suppression
console.log('[Test 1] Combat Detection & Smart Fight Suppression');
{
  tacticalCoach.reset();

  // 1a. Normal state: not in combat
  const normalPayload = createBasePayload(120);
  const stateNormal = tacticalCoach.process(normalPayload, null);
  assert.equal(stateNormal.inCombat, false, 'Player in healthy state should not be in combat');
  assert.equal(audioService.isInCombat(), false);

  // 1b. Stunned hero: in combat
  tacticalCoach.reset();
  const stunnedPayload = createBasePayload(120);
  stunnedPayload.hero!.stunned = true;
  const stateStunned = tacticalCoach.process(stunnedPayload, null);
  assert.equal(stateStunned.inCombat, true, 'Stunned hero must be flagged as inCombat');
  assert.equal(audioService.isInCombat(), true);

  // 1c. Low HP (< 30%): in combat
  tacticalCoach.reset();
  const lowHpPayload = createBasePayload(120);
  lowHpPayload.hero!.health_percent = 25;
  const stateLowHp = tacticalCoach.process(lowHpPayload, null);
  assert.equal(stateLowHp.inCombat, true, 'Hero with HP < 30% must be flagged as inCombat');

  // 1d. Smart suppression stops non-critical coaching speech
  let speechTriggered = false;
  const originalSpeak = audioService.speak.bind(audioService);
  audioService.speak = () => { speechTriggered = true; };

  try {
    // When in combat, playNoTpScrollAlert without force should be suppressed
    audioService.setCombatState(true);
    speechTriggered = false;
    audioService.playNoTpScrollAlert(false);
    assert.equal(speechTriggered, false, 'No TP alert must be suppressed while in combat');

    // With force=true, speech should proceed even in combat
    audioService.playNoTpScrollAlert(true);
    assert.equal(speechTriggered, true, 'Forced TP alert should proceed even in combat');
  } finally {
    audioService.speak = originalSpeak;
    audioService.setCombatState(false);
  }

  console.log('  ✓ Combat detection and smart suppression verified');
}

// [Test 2] NextActionItem Priorities: Tormentor vs Wisdom vs Stacking
console.log('[Test 2] NextActionItem Priority Matrix Ordering');
{
  tacticalCoach.reset();

  // At 19:45 (1185s): Tormentor window is active (Priority: 95)
  const tormentorPayload = createBasePayload(1185);
  const tormentorState = tacticalCoach.process(tormentorPayload, null);
  assert.ok(tormentorState.nextAction, 'Expected active nextAction during Tormentor window');
  assert.equal(tormentorState.nextAction?.id, 'TORMENTOR_SPAWN');
  assert.equal(tormentorState.nextAction?.priorityScore, 95);
  assert.equal(tormentorState.nextAction?.icon, '🛡️');

  // At 6:40 (400s): Wisdom Rune window (Priority: 90)
  tacticalCoach.reset();
  const wisdomPayload = createBasePayload(400);
  const wisdomState = tacticalCoach.process(wisdomPayload, null);
  assert.ok(wisdomState.nextAction, 'Expected active nextAction during Wisdom Rune window');
  assert.equal(wisdomState.nextAction?.id, 'WISDOM_RUNE');
  assert.equal(wisdomState.nextAction?.priorityScore, 90);
  assert.equal(wisdomState.nextAction?.icon, '⚡');

  console.log('  ✓ Priority ordering verified');
}

// [Test 3] Economy Risk: Unreliable Gold Risk Alert
console.log('[Test 3] Unreliable Gold Risk trigger and Voice Callout');
{
  tacticalCoach.reset();
  let speechCalled = false;
  let spokenText = '';
  const origSpeak = audioService.speak.bind(audioService);
  audioService.speak = (text: string) => {
    speechCalled = true;
    spokenText = text;
  };

  try {
    const goldRiskPayload = createBasePayload(500);
    goldRiskPayload.player!.gold_unreliable = 1850;
    goldRiskPayload.hero!.health_percent = 35; // Danger zone (< 40%)

    const goldState = tacticalCoach.process(goldRiskPayload, null);
    assert.ok(goldState.nextAction, 'Expected active nextAction for high unreliable gold');
    assert.equal(goldState.nextAction?.id, 'UNRELIABLE_GOLD_RISK');
    assert.equal(goldState.nextAction?.urgency, 'urgent');
    assert.equal(goldState.nextAction?.icon, '💰');
    assert.equal(speechCalled, true, 'Speech should be enqueued for high unreliable gold risk');
  } finally {
    audioService.speak = origSpeak;
  }

  console.log('  ✓ Unreliable gold risk verified');
}

// [Test 4] Neutral Tier Item Unlocked but Slot Empty
console.log('[Test 4] Neutral Tier Unlocked with Empty Slot');
{
  tacticalCoach.reset();
  const emptyNeutralPayload = createBasePayload(450); // 7:30 (Tier 1 unlocked at 7:00)
  emptyNeutralPayload.items!.neutral0 = undefined; // empty slot

  const neutralState = tacticalCoach.process(emptyNeutralPayload, null);
  assert.ok(neutralState.nextAction, 'Expected nextAction for empty neutral slot');
  assert.equal(neutralState.nextAction?.id, 'NEUTRAL_TIER');
  assert.equal(neutralState.nextAction?.priorityScore, 85);
  assert.equal(neutralState.nextAction?.icon, '📦');
  assert.equal(neutralState.nextAction?.shortPillEn, '📦 Equip Neutral T1');

  console.log('  ✓ Neutral tier nextAction verified');
}

// [Test 5] Missing TP Scroll Action
console.log('[Test 5] Missing TP Scroll when Out in Field');
{
  tacticalCoach.reset();
  const noTpPayload = createBasePayload(300);
  noTpPayload.items!.teleport0 = undefined; // No TP scroll

  const tpState = tacticalCoach.process(noTpPayload, null);
  assert.ok(tpState.nextAction, 'Expected nextAction for missing TP scroll');
  assert.equal(tpState.nextAction?.id, 'NO_TP_SCROLL');
  assert.equal(tpState.nextAction?.icon, '📜');

  console.log('  ✓ Missing TP action verified');
}

// [Test 6] Lotus Harvest Window
console.log('[Test 6] Lotus Pool Harvest Window (:00 every 3 minutes)');
{
  tacticalCoach.reset();
  // 2:50 (170s) -> 10 seconds before 3:00 spawn
  const lotusPayload = createBasePayload(170);
  const lotusState = tacticalCoach.process(lotusPayload, null);
  assert.ok(lotusState.nextAction, 'Expected nextAction for Lotus Pool');
  assert.equal(lotusState.nextAction?.id, 'LOTUS_HARVEST');
  assert.equal(lotusState.nextAction?.icon, '🌿');

  console.log('  ✓ Lotus harvest action verified');
}

// [Test 7] Role Adaptation: Camp Stack for Support vs Carry
console.log('[Test 7] Role Adaptation for Camp Stacking');
{
  tacticalCoach.reset();
  // Clock 112s (1:52) -> Stacking window (:48 - :55)
  const stackPayload = createBasePayload(112);

  // If role is Support -> NextAction should suggest Camp Stacking
  alertProfiles.select('support');
  const supportState = tacticalCoach.process(stackPayload, null);
  assert.ok(supportState.nextAction, 'Support role should have NextAction for camp stacking');
  assert.equal(supportState.nextAction?.id, 'CAMP_STACK');
  assert.equal(supportState.nextAction?.icon, '🎯');

  // If role is Carry -> Stacking rule is filtered out for carry
  tacticalCoach.reset();
  alertProfiles.select('carry');
  const carryState = tacticalCoach.process(stackPayload, null);
  assert.notEqual(carryState.nextAction?.id, 'CAMP_STACK', 'Carry role must not be given Camp Stacking next action');

  // Reset back to support
  alertProfiles.select('support');

  console.log('  ✓ Role adaptation for camp stacking verified');
}

// [Test 8] Pre-game / Inactive Game State produces null NextAction
console.log('[Test 8] Inactive Game State check');
{
  tacticalCoach.reset();
  const preGamePayload = createBasePayload(-30);
  preGamePayload.map!.game_state = 'DOTA_GAMERULES_STATE_PRE_GAME';

  const preGameState = tacticalCoach.process(preGamePayload, null);
  assert.equal(preGameState.nextAction, null, 'Pre-game state should not produce next actions');

  console.log('  ✓ Inactive game state produces null verified');
}

// [Test 9] Next Action Pill Settings Toggle & Clipboard Notice Integration
console.log('[Test 9] Next Action Pill Settings Toggle & Clipboard Notice Integration');
{
  // Settings toggle
  assert.equal(audioService.getSettings().nextActionPillEnabled !== false, true);
  audioService.updateSettings({ nextActionPillEnabled: false });
  assert.equal(audioService.getSettings().nextActionPillEnabled, false);
  audioService.updateSettings({ nextActionPillEnabled: true });
  assert.equal(audioService.getSettings().nextActionPillEnabled, true);

  // Clipboard notice
  objectiveTracker.setClipboardNotice('🌿 Harvest Lotus');
  assert.equal(objectiveTracker.getSnapshot().lastClipboardNotice, '🌿 Harvest Lotus');
  objectiveTracker.clearClipboardNotice();
  assert.equal(objectiveTracker.getSnapshot().lastClipboardNotice, null);

  console.log('  ✓ Next action pill settings toggle and clipboard notice verified');
}

console.log('--- ALL LIVE COACHING, SMART SUPPRESSION & NEXT ACTION TESTS PASSED! ---');
