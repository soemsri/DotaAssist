import assert from 'node:assert/strict';
import { tacticalCoach } from '../src/services/tacticalCoach';
import { laningBenchmarkService } from '../src/services/laningBenchmarkService';
import { alertProfiles } from '../src/services/alertProfiles';
import { audioService } from '../src/services/audioService';
import { GSIPayload } from '../src/types/gsi';
import { MinimapScanResult } from '../src/services/minimapScanner';

console.log('--- RUNNING SMURF & IMMORTAL COACHING INSIGHTS TESTS (BalloonDota Principles) ---');

// Mock localStorage if in Node
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

// Track spoken audio
const spokenAudio: string[] = [];
const origSpeak = (audioService as any).speak.bind(audioService);
(audioService as any).speak = (text: string, langOverride?: string, objective?: any) => {
  spokenAudio.push(text);
  return origSpeak(text, langOverride, objective);
};

// [Test 1] Pre-Rune Wave Shove (:40 before 2, 4, 6, 8, 10m)
console.log('[Test 1] Pre-Rune Wave Shove Alert for Midlane');
{
  tacticalCoach.reset();
  spokenAudio.length = 0;
  alertProfiles.select('mid');

  const baseLaningPayload: GSIPayload = {
    map: {
      matchid: 'test_smurf_1',
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      clock_time: 102, // 1:42 (18s before 2:00 Water Rune)
    } as any,
    hero: {
      name: 'npc_dota_hero_storm_spirit',
      level: 2,
      health_percent: 100,
      alive: true,
    } as any,
    player: { gold: 400 } as any,
  };

  const state1 = tacticalCoach.process(baseLaningPayload, null);
  assert.ok(state1.preRuneShove !== null, 'Pre-rune shove should be active at 1:42');
  assert.equal(state1.preRuneShove?.runeType, 'water');
  assert.equal(state1.preRuneShove?.targetMinute, 2);
  assert.equal(state1.preRuneShove?.secondsRemaining, 18);
  assert.ok(state1.preRuneShove?.tipEn.includes('Push mid wave into tower'));

  // Voice should have been triggered
  assert.ok(spokenAudio.length >= 1);
  assert.ok(spokenAudio[spokenAudio.length - 1].includes('Pre-rune shove') || spokenAudio[spokenAudio.length - 1].includes('ดันเวฟ'));

  // Deduplication check: clock 104s
  const prevCount = spokenAudio.length;
  const payload104 = {
    ...baseLaningPayload,
    map: { ...baseLaningPayload.map, clock_time: 104 } as any,
  };
  tacticalCoach.process(payload104, null);
  assert.equal(spokenAudio.length, prevCount, 'Should not repeat shove audio in same window');

  // Outside window: at 2:05 (125s)
  const payload125 = {
    ...baseLaningPayload,
    map: { ...baseLaningPayload.map, clock_time: 125 } as any,
  };
  const stateOutside = tacticalCoach.process(payload125, null);
  assert.equal(stateOutside.preRuneShove, null, 'Should be null outside :40-:55 window');

  // Minute 6:00 Power Rune shove at 5:43 (343s)
  const payload343 = {
    ...baseLaningPayload,
    map: { ...baseLaningPayload.map, clock_time: 343 } as any,
  };
  const statePower = tacticalCoach.process(payload343, null);
  assert.ok(statePower.preRuneShove !== null);
  assert.equal(statePower.preRuneShove?.runeType, 'power');
  assert.equal(statePower.preRuneShove?.targetMinute, 6);

  console.log('  ✓ Pre-Rune Shove timing, runeType (water/power), and audio alert verified');
}

// [Test 2] Anti-Wandering & Roam Punish
console.log('[Test 2] Anti-Wandering & Roam Punish Coaching Advisor');
{
  tacticalCoach.reset();
  spokenAudio.length = 0;
  alertProfiles.select('mid');

  const minimapMissing: MinimapScanResult = {
    scanned: true,
    all_missing: true,
    enemies_visible_count: 0,
    confidence: 'high',
    timestamp: 1000,
  };

  const roamingPayload: GSIPayload = {
    map: {
      matchid: 'test_smurf_2',
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      clock_time: 250, // 4:10
    } as any,
    hero: {
      name: 'npc_dota_hero_queenofpain',
      level: 4,
      health_percent: 85,
      alive: true,
    } as any,
    player: { gold: 800 } as any,
  };

  // Case A: Mid role
  const stateMid = tacticalCoach.process(roamingPayload, minimapMissing);
  assert.ok(stateMid.antiWanderingRoam !== null);
  assert.equal(stateMid.antiWanderingRoam?.isMid, true);
  assert.ok(stateMid.antiWanderingRoam?.tipEn.includes('Shove mid wave and damage Tier 1 tower'));

  assert.ok(spokenAudio.some((s) => s.includes('roaming') || s.includes('เดินแก๊ง')));

  // Case B: Throttling within 75s
  const audioCountBefore = spokenAudio.length;
  const roamingPayload280: GSIPayload = {
    ...roamingPayload,
    map: { ...roamingPayload.map, clock_time: 280 } as any,
  };
  tacticalCoach.process(roamingPayload280, minimapMissing);
  assert.equal(spokenAudio.length, audioCountBefore, 'Voice should be throttled within 75s');

  // Case C: Side lane role (Carry)
  tacticalCoach.reset();
  alertProfiles.select('carry');
  const stateCarry = tacticalCoach.process(roamingPayload, minimapMissing);
  assert.ok(stateCarry.antiWanderingRoam !== null);
  assert.equal(stateCarry.antiWanderingRoam?.isMid, false);
  assert.ok(stateCarry.antiWanderingRoam?.tipEn.includes('fall back near your tower'));

  console.log('  ✓ Anti-Wandering advice for mid (push T1) and side-lanes (fall back) verified');
}

// [Test 3] Power Spike Actionability & Near-Item Caution
console.log('[Test 3] Power Spike Actionability & Near-Item Caution');
{
  tacticalCoach.reset();
  spokenAudio.length = 0;
  alertProfiles.select('mid');

  // Case A: Level 6 Spike
  const lvl6Payload: GSIPayload = {
    map: {
      matchid: 'test_smurf_3',
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      clock_time: 420, // 7:00
    } as any,
    hero: {
      name: 'npc_dota_hero_storm_spirit',
      level: 6,
      health_percent: 100,
      alive: true,
    } as any,
    player: { gold: 1200 } as any,
  };

  const stateLvl6 = tacticalCoach.process(lvl6Payload, null);
  assert.equal(stateLvl6.powerSpikeAction?.state, 'ready');
  assert.ok(stateLvl6.powerSpikeAction?.tipEn.includes('Group with team or Smoke'));

  // Case B: Near-Item Caution (within 500 gold of BKB 4050g)
  tacticalCoach.reset();
  spokenAudio.length = 0;

  const nearBkbPayload: GSIPayload = {
    map: {
      matchid: 'test_smurf_3b',
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      clock_time: 800, // 13:20
    } as any,
    hero: {
      name: 'npc_dota_hero_storm_spirit',
      level: 10,
      health_percent: 90,
      alive: true,
    } as any,
    player: { gold: 3700 } as any, // 4050 - 3700 = 350g deficit <= 500g
    items: {
      slot0: { name: 'item_bottle' },
      slot1: { name: 'item_power_treads' },
    } as any,
    draft: {
      // Enemy with heavy stuns -> triggers BKB recommendation
      team3: {
        pick0: { class: 'npc_dota_hero_lion' },
        pick1: { class: 'npc_dota_hero_tidehunter' },
      },
    } as any,
  };

  const stateNear = tacticalCoach.process(nearBkbPayload, null);
  assert.equal(stateNear.powerSpikeAction?.state, 'near_item');
  assert.equal(stateNear.powerSpikeAction?.itemName, 'Black King Bar (BKB)');
  assert.equal(stateNear.powerSpikeAction?.deficit, 350);
  assert.ok(stateNear.powerSpikeAction?.tipEn.includes('Play safe near vision'));

  // Voice should alert player about near item
  assert.ok(spokenAudio.some((s) => s.includes('Black King Bar') || s.includes('350')));

  console.log('  ✓ Level 6 spike prompt and near-item deficit warning verified');
}

// [Test 4] High Ground Siege Discipline (Aegis Rule)
console.log('[Test 4] High Ground Siege Discipline (Aegis Rule)');
{
  tacticalCoach.reset();
  spokenAudio.length = 0;

  const lateGamePayload: GSIPayload = {
    map: {
      matchid: 'test_smurf_4',
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      clock_time: 1500, // 25:00
    } as any,
    hero: {
      name: 'npc_dota_hero_juggernaut',
      level: 18,
      health_percent: 100,
      alive: true,
    } as any,
    player: { gold: 2000 } as any,
    items: {
      slot0: { name: 'item_bfury' },
      slot1: { name: 'item_manta' },
    } as any,
  };

  // Without Aegis: Caution
  const stateNoAegis = tacticalCoach.process(lateGamePayload, null);
  assert.ok(stateNoAegis.highGroundSiege !== null);
  assert.equal(stateNoAegis.highGroundSiege?.caution, true);
  assert.equal(stateNoAegis.highGroundSiege?.hasAegis, false);
  assert.ok(stateNoAegis.highGroundSiege?.tipEn.includes('Do not force high ground without Aegis'));

  // With Aegis equipped: Safe to siege
  const payloadWithAegis: GSIPayload = {
    ...lateGamePayload,
    items: {
      ...lateGamePayload.items,
      slot2: { name: 'item_aegis' },
    } as any,
  };
  const stateWithAegis = tacticalCoach.process(payloadWithAegis, null);
  assert.ok(stateWithAegis.highGroundSiege !== null);
  assert.equal(stateWithAegis.highGroundSiege?.caution, false);
  assert.equal(stateWithAegis.highGroundSiege?.hasAegis, true);
  assert.ok(stateWithAegis.highGroundSiege?.tipEn.includes('Aegis secured'));

  console.log('  ✓ High Ground Aegis discipline and caution verified');
}

// [Test 5] Farm Loop Guidance in Laning Benchmark Service
console.log('[Test 5] Farm Loop Guidance for Mid & Carry in LaningBenchmarkService');
{
  laningBenchmarkService.resetAll();

  const midPayload: GSIPayload = {
    player: { last_hits: 30, denies: 8, net_worth: 2500, gpm: 420 } as any,
  };

  // Mid at 6:00 (360s)
  alertProfiles.select('mid');
  laningBenchmarkService.updateFromGSI(midPayload, 360);
  let snap = laningBenchmarkService.getSnapshot();
  assert.ok(snap.farmLoopTip !== null && snap.farmLoopTip !== undefined);
  assert.ok(snap.farmLoopTip.includes('Farm Loop') || snap.farmLoopTip.includes('ลูปฟาร์ม'));
  assert.ok(snap.farmLoopTip.includes('jungle camp') || snap.farmLoopTip.includes('แคมป์ป่า'));

  // Carry at 6:00 (360s)
  alertProfiles.select('carry');
  laningBenchmarkService.updateFromGSI(midPayload, 360);
  snap = laningBenchmarkService.getSnapshot();
  assert.ok(snap.farmLoopTip !== null && snap.farmLoopTip !== undefined);
  assert.ok(snap.farmLoopTip.includes('Lane > Jungle') || snap.farmLoopTip.includes('ครีปเลน > ครีปป่า'));

  // Support at 6:00 (360s) -> no farm loop tip
  alertProfiles.select('support');
  laningBenchmarkService.updateFromGSI(midPayload, 360);
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.farmLoopTip, null);

  console.log('  ✓ Farm Loop tips for Mid and Carry correctly provided');
}

console.log('--- ALL SMURF & IMMORTAL COACHING INSIGHTS TESTS PASSED! ---');
