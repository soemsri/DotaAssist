import assert from 'node:assert/strict';
import { enemyGlyphService, GLYPH_COOLDOWN, GLYPH_DURATION } from '../src/services/enemyGlyphService';
import { alertProfiles } from '../src/services/alertProfiles';
import { audioService } from '../src/services/audioService';
import { timingEngine } from '../src/services/timingEngine';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING ENEMY GLYPH OF FORTIFICATION TRACKER & T1 RESET TESTS ---');

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

// [Test 1] Constants & Initial State
console.log('[Test 1] Constants and initial state');
{
  enemyGlyphService.resetAll();
  assert.equal(GLYPH_COOLDOWN, 300, 'Glyph cooldown should be 300 seconds (5m)');
  assert.equal(GLYPH_DURATION, 7, 'Glyph invulnerability duration should be 7 seconds');

  const snapshot = enemyGlyphService.getSnapshot();
  assert.equal(snapshot.isReady, true);
  assert.equal(snapshot.isActive, false);
  assert.equal(snapshot.cooldownRemainingSeconds, 0);
  assert.equal(snapshot.firstT1Destroyed, false);
  console.log('  ✓ Initial state and rules constants verified');
}

// [Test 2] Decision 1: GSI Event Detection (Enemy Glyph Activation)
console.log('[Test 2] GSI Event detection: enemy glyph activation');
{
  enemyGlyphService.resetAll();
  spokenAudio.length = 0;

  // Local player is Radiant -> enemy is Dire
  const payload: GSIPayload = {
    player: { team_name: 'radiant' } as any,
    events: [
      {
        event_type: 'glyph_activated',
        team: 'dire',
        game_time: 120,
      } as any,
    ],
  };

  enemyGlyphService.updateFromGSI(payload, 120);

  let snap = enemyGlyphService.getSnapshot();
  assert.equal(snap.enemyTeam, 'dire');
  assert.equal(snap.isReady, false, 'Glyph should not be ready after activation');
  assert.equal(snap.isActive, true, 'Glyph should be active (invulnerable)');
  assert.equal(snap.activatedClockTime, 120);
  assert.equal(snap.cooldownEndClockTime, 420);
  assert.equal(snap.activeRemainingSeconds, 7);
  assert.equal(snap.cooldownRemainingSeconds, 300);

  // Decision 3 audio check
  assert.equal(spokenAudio.length, 1);
  assert.equal(spokenAudio[0], 'Enemy Glyph activated');

  // Time progresses to 124s (4s elapsed, 3s active remaining)
  enemyGlyphService.updateFromGSI(null, 124);
  snap = enemyGlyphService.getSnapshot();
  assert.equal(snap.isActive, true);
  assert.equal(snap.activeRemainingSeconds, 3);
  assert.equal(snap.cooldownRemainingSeconds, 296);

  // Time progresses to 128s (8s elapsed -> active expired, still on cooldown)
  enemyGlyphService.updateFromGSI(null, 128);
  snap = enemyGlyphService.getSnapshot();
  assert.equal(snap.isActive, false, 'Active invulnerability should end after 7s');
  assert.equal(snap.isReady, false);
  assert.equal(snap.cooldownRemainingSeconds, 292);

  console.log('  ✓ GSI Glyph activation, 7s active countdown, and audio alert verified');
}

// [Test 3] Decision 1 & 3: First Tier 1 Tower destruction refreshes cooldown
console.log('[Test 3] First Tier 1 tower destruction immediately refreshes glyph cooldown');
{
  enemyGlyphService.resetAll();
  spokenAudio.length = 0;

  // Activate enemy glyph at clock 300
  enemyGlyphService.recordGlyphActivated(300);
  assert.equal(enemyGlyphService.getSnapshot().isReady, false);
  assert.equal(spokenAudio[0], 'Enemy Glyph activated');

  // Enemy Tier 1 tower killed at clock 350
  const towerKillPayload: GSIPayload = {
    player: { team_name: 'radiant' } as any,
    events: [
      {
        event_type: 'building_killed',
        target: 'npc_dota_badguys_tower1_mid',
        game_time: 350,
      } as any,
    ],
  };

  enemyGlyphService.updateFromGSI(towerKillPayload, 350);

  const snap = enemyGlyphService.getSnapshot();
  assert.equal(snap.firstT1Destroyed, true, 'firstT1Destroyed flag should be set');
  assert.equal(snap.isReady, true, 'Glyph should be refreshed to Ready on first T1 tower kill');
  assert.equal(snap.cooldownRemainingSeconds, 0);

  // Decision 3 audio check: "Enemy Glyph is ready"
  assert.equal(spokenAudio.length, 2);
  assert.equal(spokenAudio[1], 'Enemy Glyph is ready');

  // Second T1 tower destroyed does not re-refresh if already used or on cooldown
  enemyGlyphService.recordGlyphActivated(400);
  assert.equal(enemyGlyphService.getSnapshot().isReady, false);

  const secondTowerPayload: GSIPayload = {
    player: { team_name: 'radiant' } as any,
    events: [
      {
        event_type: 'building_killed',
        target: 'npc_dota_badguys_tower1_top',
        game_time: 410,
      } as any,
    ],
  };

  enemyGlyphService.updateFromGSI(secondTowerPayload, 410);
  assert.equal(enemyGlyphService.getSnapshot().isReady, false, 'Subsequent T1 towers should not refresh glyph');

  console.log('  ✓ T1 tower destruction reset and single-use constraint verified');
}

// [Test 4] Cooldown Natural Expiry & Ready Voice Alert
console.log('[Test 4] Cooldown natural expiry and ready announcement');
{
  enemyGlyphService.resetAll();
  spokenAudio.length = 0;

  enemyGlyphService.recordGlyphActivated(500); // Cooldown ends at 800
  assert.equal(spokenAudio.length, 1);

  // Clock at 799 (1s remaining)
  enemyGlyphService.updateFromGSI(null, 799);
  assert.equal(enemyGlyphService.getSnapshot().isReady, false);
  assert.equal(enemyGlyphService.getSnapshot().cooldownRemainingSeconds, 1);
  assert.equal(spokenAudio.length, 1);

  // Clock at 800 (cooldown complete)
  enemyGlyphService.updateFromGSI(null, 800);
  const snap = enemyGlyphService.getSnapshot();
  assert.equal(snap.isReady, true);
  assert.equal(snap.cooldownRemainingSeconds, 0);
  assert.equal(spokenAudio.length, 2);
  assert.equal(spokenAudio[1], 'Enemy Glyph is ready');

  console.log('  ✓ Natural cooldown completion and voice ready alert verified');
}

// [Test 5] TimingEngine Integration & Alert Card Generation
console.log('[Test 5] TimingEngine integration and 30s alert card generation');
{
  enemyGlyphService.resetAll();
  timingEngine.resetAll();
  alertProfiles.select('carry');

  // Activate enemy glyph at clock 100 -> cooldown ends at 400
  enemyGlyphService.recordGlyphActivated(100);

  // At clock 360 (40s remaining) -> no alert card yet
  let alerts = timingEngine.calculateAlerts(360, false);
  let glyphAlert = alerts.find(a => a.type === 'enemy_glyph');
  assert.equal(glyphAlert, undefined);

  // At clock 375 (25s remaining <= 30s) -> alert card generated
  alerts = timingEngine.calculateAlerts(375, false);
  glyphAlert = alerts.find(a => a.type === 'enemy_glyph');
  assert.ok(glyphAlert !== undefined);
  assert.equal(glyphAlert?.secondsRemaining, 25);
  assert.equal(glyphAlert?.urgent, false);

  // At clock 388 (12s remaining <= 15s) -> urgent alert card
  alerts = timingEngine.calculateAlerts(388, false);
  glyphAlert = alerts.find(a => a.type === 'enemy_glyph');
  assert.ok(glyphAlert !== undefined);
  assert.equal(glyphAlert?.urgent, true);

  // Reset via TimingEngine
  timingEngine.resetAll();
  assert.equal(enemyGlyphService.getSnapshot().isReady, true);

  console.log('  ✓ TimingEngine integration, alert card at <=30s, and resetAll verified');
}

console.log('ALL ENEMY GLYPH TRACKER TESTS PASSED SUCCESSFULLY!');
