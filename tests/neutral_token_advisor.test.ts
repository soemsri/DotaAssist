import assert from 'node:assert/strict';
import { tacticalCoach } from '../src/services/tacticalCoach';
import { audioService } from '../src/services/audioService';
import { neutralAdvisor } from '../src/services/neutralAdvisor';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING HERO-AWARE NEUTRAL TOKEN ACQUISITION & ADVISOR TESTS ---');

// Mock audio speech recording
const spokenUtterances: string[] = [];
const origSpeak = (audioService as any).speak.bind(audioService);
(audioService as any).speak = (text: string, langOverride?: string, objective?: any) => {
  spokenUtterances.push(text);
  return origSpeak(text, langOverride, objective);
};

const createBasePayload = (clockTime: number = 480, heroName: string = 'npc_dota_hero_antimage'): GSIPayload => ({
  map: {
    name: 'start',
    matchid: 'match_neutral_test',
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
    last_hits: 40,
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
    name: heroName,
    level: 7,
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
  },
});

// [Test 1] Token Detection Across Slots (neutral0, slot0-slot5, backpack0-backpack2)
console.log('[Test 1] Token Detection across inventory, backpack, and neutral slot');
{
  tacticalCoach.reset();

  // 1a. Token in neutral slot
  const payloadNeutral = createBasePayload(450, 'npc_dota_hero_antimage');
  payloadNeutral.items!.neutral0 = { name: 'item_tier1_token' };
  const stateNeutral = tacticalCoach.process(payloadNeutral, null);
  assert.equal(stateNeutral.neutralSlot.hasToken, true);
  assert.equal(stateNeutral.neutralSlot.tokenTier, 1);
  assert.equal(stateNeutral.neutralSlot.isSlotEmpty, true, 'Unopened token must leave isSlotEmpty=true');
  assert.equal(stateNeutral.neutralSlot.equippedItemName, null, 'Unopened token must not be considered equipped item');

  // 1b. Token in inventory slot2
  tacticalCoach.reset();
  const payloadInventory = createBasePayload(450, 'npc_dota_hero_antimage');
  payloadInventory.items!.slot2 = { name: 'item_tier1_token' };
  const stateInv = tacticalCoach.process(payloadInventory, null);
  assert.equal(stateInv.neutralSlot.hasToken, true);
  assert.equal(stateInv.neutralSlot.tokenTier, 1);

  // 1c. Token in backpack1
  tacticalCoach.reset();
  const payloadBackpack = createBasePayload(450, 'npc_dota_hero_antimage');
  payloadBackpack.items!.backpack1 = { name: 'item_tier1_token' };
  const stateBp = tacticalCoach.process(payloadBackpack, null);
  assert.equal(stateBp.neutralSlot.hasToken, true);
  assert.equal(stateBp.neutralSlot.tokenTier, 1);

  console.log('  ✓ Token detected across neutral slot, main inventory, and backpack');
}

// [Test 2] Hero-Tailored Recommendations on Token Acquisition
console.log('[Test 2] Hero-Tailored Recommendations by Archetype');
{
  // 2a. Anti-Mage (Physical Carry Melee)
  const amRecs = neutralAdvisor.getRecommendations('npc_dota_hero_antimage', 1);
  const amTop = amRecs.filter(r => r.tierRank === 'S').map(r => r.displayName);
  assert.ok(amTop.includes('Broom Handle'), 'Anti-Mage should have Broom Handle in S-tier');
  assert.ok(amTop.includes('Duelist Gloves'), 'Anti-Mage should have Duelist Gloves in S-tier');

  // 2b. Crystal Maiden (Support Utility)
  const cmRecs = neutralAdvisor.getRecommendations('npc_dota_hero_crystal_maiden', 1);
  const cmTop = cmRecs.filter(r => r.tierRank === 'S').map(r => r.displayName);
  assert.ok(cmTop.includes('Arcane Ring'), 'Crystal Maiden should have Arcane Ring in S-tier');
  assert.ok(cmTop.includes('Trusty Shovel'), 'Crystal Maiden should have Trusty Shovel in S-tier');
  assert.ok(cmRecs.some(r => r.displayName === 'Safety Bubble' && r.tierRank === 'A'), 'Crystal Maiden should have Safety Bubble in A-tier');

  // 2c. Zeus (Spell Caster Nuker)
  const zeusRecs = neutralAdvisor.getRecommendations('npc_dota_hero_zeus', 1);
  const zeusTop = zeusRecs.filter(r => r.tierRank === 'S').map(r => r.displayName);
  assert.ok(zeusTop.includes('Arcane Ring'), 'Zeus should have Arcane Ring in S-tier');
  assert.ok(zeusTop.includes('Occult Bracelet'), 'Zeus should have Occult Bracelet in S-tier');

  // 2d. Sniper (Physical Carry Ranged)
  const sniperRecs = neutralAdvisor.getRecommendations('npc_dota_hero_sniper', 1);
  const sniperTop = sniperRecs.filter(r => r.tierRank === 'S').map(r => r.displayName);
  assert.ok(sniperTop.includes('Duelist Gloves'), 'Sniper should have Duelist Gloves in S-tier');
  assert.ok(sniperTop.includes('Occult Bracelet'), 'Sniper should have Occult Bracelet in S-tier');
  assert.equal(sniperRecs.some(r => r.displayName === 'Broom Handle'), false, 'Sniper must not be recommended melee Broom Handle');

  console.log('  ✓ Archetype-tailored S-rank recommendations verified for AM, CM, Zeus, and Sniper');
}

// [Test 3] Voice Alerts Triggering on Token Acquisition ("ตอนได้มา")
console.log('[Test 3] Voice Alerts Triggering on Token Acquisition');
{
  tacticalCoach.reset();
  spokenUtterances.length = 0;
  audioService.setVoiceLanguage('th-TH');

  // 3a. Player obtains Tier 1 token as Anti-Mage in Thai
  const p1 = createBasePayload(450, 'npc_dota_hero_antimage');
  p1.items!.neutral0 = { name: 'item_tier1_token' };

  tacticalCoach.process(p1, null);
  assert.ok(
    spokenUtterances.some(s => s.includes('ได้รับเหรียญป่า เทียร์ 1 แล้ว!') && s.includes('Broom Handle')),
    `Expected Thai acquisition alert with hero recommendation. Spoken: ${JSON.stringify(spokenUtterances)}`
  );

  // 3b. Subsequent tick with same token must not re-trigger voice
  const prevCount = spokenUtterances.length;
  tacticalCoach.process(p1, null);
  assert.equal(spokenUtterances.length, prevCount, 'No duplicate voice alerts for held token');

  // 3c. English voice alert test
  tacticalCoach.reset();
  spokenUtterances.length = 0;
  audioService.setVoiceLanguage('en-US');

  const pEn = createBasePayload(450, 'npc_dota_hero_crystal_maiden');
  pEn.items!.slot1 = { name: 'item_tier1_token' };
  tacticalCoach.process(pEn, null);

  assert.ok(
    spokenUtterances.some(s => s.includes('Tier 1 Neutral Token received!') && s.includes('Arcane Ring')),
    `Expected English acquisition alert. Spoken: ${JSON.stringify(spokenUtterances)}`
  );

  console.log('  ✓ Token acquisition voice announcements verified in Thai and English');
}

// [Test 4] Transition from Token to Equipped Item and Next Tier Token
console.log('[Test 4] Token consumption and subsequent tier token acquisition');
{
  tacticalCoach.reset();
  spokenUtterances.length = 0;
  audioService.setVoiceLanguage('th-TH');

  // Step 1: Holding Tier 1 Token
  const pT1 = createBasePayload(450, 'npc_dota_hero_antimage');
  pT1.items!.neutral0 = { name: 'item_tier1_token' };
  tacticalCoach.process(pT1, null);
  assert.equal(spokenUtterances.filter(s => s.includes('เทียร์ 1')).length, 1);

  // Step 2: Player selects and equips Broom Handle
  const pEquipped = createBasePayload(470, 'npc_dota_hero_antimage');
  pEquipped.items!.neutral0 = { name: 'item_broom_handle' };
  const stateEquipped = tacticalCoach.process(pEquipped, null);
  assert.equal(stateEquipped.neutralSlot.hasToken, false);
  assert.equal(stateEquipped.neutralSlot.isSlotEmpty, false);
  assert.equal(stateEquipped.neutralSlot.equippedItemName, 'broom handle');

  // Step 3: At minute 17:30 (1050s), player acquires Tier 2 token in inventory while broom handle is still equipped
  const pT2 = createBasePayload(1050, 'npc_dota_hero_antimage');
  pT2.items!.neutral0 = { name: 'item_broom_handle' };
  pT2.items!.slot3 = { name: 'item_tier2_token' };
  const stateT2 = tacticalCoach.process(pT2, null);

  assert.equal(stateT2.neutralSlot.hasToken, true);
  assert.equal(stateT2.neutralSlot.tokenTier, 2);
  // Recommendations should now be for Tier 2!
  assert.equal(stateT2.neutralSlot.recommendations[0].tier, 2);
  assert.ok(
    spokenUtterances.some(s => s.includes('ได้รับเหรียญป่า เทียร์ 2 แล้ว!')),
    `Expected Tier 2 acquisition voice alert. Spoken: ${JSON.stringify(spokenUtterances)}`
  );

  console.log('  ✓ Token consumption and transition to Tier 2 verified');
}

// [Test 5] NextAction Priority and HUD Information
console.log('[Test 5] NextAction Candidate NEUTRAL_TOKEN_ACQUIRED priority');
{
  tacticalCoach.reset();
  const pToken = createBasePayload(450, 'npc_dota_hero_antimage');
  pToken.items!.neutral0 = { name: 'item_tier1_token' };

  const state = tacticalCoach.process(pToken, null);
  assert.ok(state.nextAction, 'Next action must be present');
  assert.equal(state.nextAction?.id, 'NEUTRAL_TOKEN_ACQUIRED');
  assert.equal(state.nextAction?.priorityScore, 91, 'NEUTRAL_TOKEN_ACQUIRED must have priority 91');
  assert.equal(state.nextAction?.icon, '🎁');
  assert.ok(state.nextAction?.titleTh.includes('ได้รับเหรียญป่า T1!'));
  assert.ok(state.nextAction?.shortPillTh.includes('🎁 เหรียญ T1'));

  console.log('  ✓ NextAction high priority NEUTRAL_TOKEN_ACQUIRED verified');
}

console.log('--- ALL HERO-AWARE NEUTRAL TOKEN ADVISOR TESTS PASSED! ---');
