import assert from 'node:assert/strict';
import { enemyUltimateService, EnemyUltimateService } from '../src/services/enemyUltimateService';
import { getHeroUltimate, HERO_ULTIMATES } from '../src/data/heroUltimates';
import { TimingEngine } from '../src/services/timingEngine';
import { alertProfiles } from '../src/services/alertProfiles';
import { audioService } from '../src/services/audioService';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING ENEMY ULTIMATE TRACKER, HOTKEYS & READY ANNOUNCEMENT TESTS ---');

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

// [Test 1] Hero Ultimate Catalog & Level Calculations
console.log('[Test 1] Hero Ultimate catalog and cooldown calculations');
{
  const enigmaUlt = getHeroUltimate('npc_dota_hero_enigma');
  assert.equal(enigmaUlt.heroName, 'Enigma');
  assert.equal(enigmaUlt.abilityName, 'Black Hole');
  assert.deepEqual(enigmaUlt.cooldowns, [200, 180, 160]);

  const voidUlt = getHeroUltimate('npc_dota_hero_faceless_void');
  assert.equal(voidUlt.abilityName, 'Chronosphere');
  assert.deepEqual(voidUlt.cooldowns, [160, 150, 140]);

  const tideUlt = getHeroUltimate('npc_dota_hero_tidehunter');
  assert.equal(tideUlt.abilityName, 'Ravage');
  assert.deepEqual(tideUlt.cooldowns, [150, 150, 150]);

  // Level from clock
  assert.equal(enemyUltimateService.calculateLevelFromClock(600), 1, '10:00 (<17m) should be Level 1');
  assert.equal(enemyUltimateService.calculateLevelFromClock(1200), 2, '20:00 (17m-27m) should be Level 2');
  assert.equal(enemyUltimateService.calculateLevelFromClock(1800), 3, '30:00 (>=27m) should be Level 3');

  console.log('  ✓ Catalog and clock-based ultimate levels verified');
}

// [Test 2] Decision 1: Auto-populates 5 enemy heroes from GSI Draft Data
console.log('[Test 2] Draft synchronization: 5 enemy heroes mapped to slots 1-5');
{
  enemyUltimateService.resetAll();

  // Local player is Radiant (team2), enemy is Dire (team3)
  const draftPayload: GSIPayload = {
    map: { clock_time: 600, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    player: { team_name: 'radiant' } as any,
    draft: {
      team2: {
        pick0_class: 'npc_dota_hero_antimage',
        pick1_class: 'npc_dota_hero_crystal_maiden',
      },
      team3: {
        pick0_class: 'npc_dota_hero_enigma',
        pick1_class: 'npc_dota_hero_faceless_void',
        pick2_class: 'npc_dota_hero_tidehunter',
        pick3_class: 'npc_dota_hero_silencer',
        pick4_class: 'npc_dota_hero_magnataur',
      },
    },
  };

  enemyUltimateService.updateFromGSI(draftPayload.draft, draftPayload.player?.team_name, 600);

  const snapshot = enemyUltimateService.getSnapshot();
  assert.equal(snapshot.slots.length, 5, 'Must have 5 enemy slots');
  assert.equal(snapshot.slots[0].heroName, 'Enigma');
  assert.equal(snapshot.slots[0].abilityName, 'Black Hole');
  assert.equal(snapshot.slots[0].slot, 1);
  assert.equal(snapshot.slots[0].hotkey, 'Alt+1');

  assert.equal(snapshot.slots[1].heroName, 'Faceless Void');
  assert.equal(snapshot.slots[1].abilityName, 'Chronosphere');
  assert.equal(snapshot.slots[1].slot, 2);
  assert.equal(snapshot.slots[1].hotkey, 'Alt+2');

  assert.equal(snapshot.slots[2].heroName, 'Tidehunter');
  assert.equal(snapshot.slots[2].slot, 3);
  assert.equal(snapshot.slots[2].hotkey, 'Alt+3');

  assert.equal(snapshot.slots[3].heroName, 'Silencer');
  assert.equal(snapshot.slots[3].slot, 4);

  assert.equal(snapshot.slots[4].heroName, 'Magnus');
  assert.equal(snapshot.slots[4].slot, 5);

  console.log('  ✓ GSI draft synchronization and 5 enemy slots verified');
}

// [Test 3] Decision 2: Recording via Hotkey/Action and 10-Second Quick Undo
console.log('[Test 3] Cooldown recording and 10s quick-undo');
{
  spokenAudio.length = 0;
  // Record Slot 1 (Enigma Black Hole) at clock 600s (Level 1: 200s cooldown)
  const rec1 = enemyUltimateService.recordCast(1, 600);
  assert.equal(rec1.action, 'recorded');
  assert.ok(rec1.slot);
  assert.equal(rec1.slot.state, 'cooldown');
  assert.equal(rec1.slot.cooldownSeconds, 200);
  assert.equal(rec1.slot.cooldownEndClock, 800);
  assert.equal(rec1.slot.undoActive, true);
  assert.ok(spokenAudio.includes('Enigma ultimate recorded'));

  // Quick Undo: Triggering again within 10s cancels cooldown
  const recUndo = enemyUltimateService.recordCast(1, 602);
  assert.equal(recUndo.action, 'undone');
  assert.ok(recUndo.slot);
  assert.equal(recUndo.slot.state, 'ready');
  assert.equal(recUndo.slot.remainingSeconds, 0);
  assert.equal(recUndo.slot.undoActive, false);
  assert.ok(spokenAudio.includes('Enigma ultimate timer canceled'));

  console.log('  ✓ Recording and quick-undo cancellation passed');
}

// [Test 4] Decision 3: Cooldown countdown & Spoken "Ready" announcement
console.log('[Test 4] Cooldown countdown and spoken ready announcement');
{
  spokenAudio.length = 0;

  // Record Slot 2 (Faceless Void Chronosphere) at clock 1200s (Level 2: 150s cooldown)
  enemyUltimateService.recordCast(2, 1200);
  const snap1 = enemyUltimateService.getSnapshot();
  const voidSlot = snap1.slots[1];
  assert.equal(voidSlot.state, 'cooldown');
  assert.equal(voidSlot.cooldownSeconds, 150); // Level 2
  assert.equal(voidSlot.cooldownEndClock, 1350);

  // Advance clock to 1300s (50s remaining)
  enemyUltimateService.updateFromGSI(undefined, undefined, 1300);
  assert.equal(enemyUltimateService.getSnapshot().slots[1].remainingSeconds, 50);
  assert.equal(enemyUltimateService.getSnapshot().slots[1].state, 'cooldown');

  // Advance clock to 1350s (cooldown complete!)
  enemyUltimateService.updateFromGSI(undefined, undefined, 1350);
  const snapReady = enemyUltimateService.getSnapshot();
  assert.equal(snapReady.slots[1].state, 'ready', 'Void slot must be ready after 1350s');
  assert.equal(snapReady.slots[1].remainingSeconds, 0);
  assert.ok(
    spokenAudio.some((txt) => txt.includes('Faceless Void ultimate is ready') || txt.includes('ready')),
    'Must announce Faceless Void ultimate is ready when cooldown completes',
  );

  console.log('  ✓ Countdown and ready voice announcement verified');
}

// [Test 5] Clipboard formatting and toggle
console.log('[Test 5] Clipboard summary formatting');
{
  enemyUltimateService.setAutoCopyClipboard(true);
  enemyUltimateService.recordCast(3, 700); // Tidehunter (Slot 3) at clock 700s (150s CD)
  const snap = enemyUltimateService.getSnapshot();
  assert.ok(snap.lastClipboardNotice);
  assert.ok(snap.lastClipboardNotice.includes('Tidehunter'));
  assert.ok(snap.lastClipboardNotice.includes('Ravage'));

  enemyUltimateService.clearClipboardNotice();
  assert.equal(enemyUltimateService.getSnapshot().lastClipboardNotice, null);

  console.log('  ✓ Clipboard summary notice verified');
}

// [Test 6] TimingEngine integration and Match Reset
console.log('[Test 6] TimingEngine integration and resetAll');
{
  const engine = new TimingEngine();
  const payload: GSIPayload = {
    map: { matchid: 'match_101', clock_time: 500, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    player: { team_name: 'radiant' } as any,
    draft: {
      team3: {
        pick0_class: 'npc_dota_hero_enigma',
      },
    },
  };

  engine.handleGSIPayload(payload);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].heroName, 'Enigma');

  // Record cast
  enemyUltimateService.recordCast(1, 500);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].state, 'cooldown');

  // Engine resetAll clears enemy cooldowns
  engine.resetAll();
  assert.equal(enemyUltimateService.getSnapshot().slots[0].state, 'ready');

  console.log('  ✓ TimingEngine integration and resetAll verified');
}

// [Test 7] Profile filtering disables audio alerts
console.log('[Test 7] Alert profile filtering');
{
  enemyUltimateService.setEnemyHeroes(['npc_dota_hero_enigma']);
  spokenAudio.length = 0;
  alertProfiles.edit('support', 'enemy_ultimate', false);

  enemyUltimateService.recordCast(1, 100);
  assert.equal(spokenAudio.length, 0, 'No audio when enemy_ultimate disabled in active profile');

  alertProfiles.edit('support', 'enemy_ultimate', true);
  enemyUltimateService.recordCast(1, 100); // Trigger undo
  assert.ok(spokenAudio.length > 0, 'Audio plays when enemy_ultimate enabled');

  alertProfiles.reset('support');
  console.log('  ✓ Alert profile filtering verified');
}

// Corrections recalculate from the cast, persist across casts, and reset per match.
{
  enemyUltimateService.resetAll();
  enemyUltimateService.setEnemyHeroes(['npc_dota_hero_enigma']);
  const stable = enemyUltimateService.getSnapshot();
  assert.equal(enemyUltimateService.getSnapshot(), stable);
  enemyUltimateService.recordCast(1, 600);
  enemyUltimateService.updateFromGSI(undefined, undefined, 650);
  assert.equal(enemyUltimateService.correctEstimate(1, 3, 120), true);
  let slot = enemyUltimateService.getSnapshot().slots[0];
  assert.equal(slot.castClockTime, 600);
  assert.equal(slot.cooldownEndClock, 720);
  assert.equal(slot.remainingSeconds, 70);
  assert.equal(slot.undoActive, true);
  assert.equal(stable.slots[0].state, 'ready', 'Published snapshots stay immutable');
  assert.equal(enemyUltimateService.correctEstimate(1, 3, NaN), false);
  assert.equal(enemyUltimateService.correctEstimate(1, 3, -1), false);
  assert.equal(enemyUltimateService.correctEstimate(1, 3, 3601), false);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].cooldownSeconds, 120);
  assert.equal(enemyUltimateService.recordCast(1, 650).action, 'undone');
  enemyUltimateService.recordCast(1, 1800);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].cooldownSeconds, 120);
  enemyUltimateService.updateFromGSI(undefined, undefined, 1850);
  assert.equal(enemyUltimateService.correctEstimate(1, 1), true);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].remainingSeconds, 150);
  spokenAudio.length = 0;
  enemyUltimateService.correctEstimate(1, 1, 40);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].state, 'ready');
  assert.ok(spokenAudio.some(text => text.includes('estimated ready')));
  enemyUltimateService.resetAll();
  slot = enemyUltimateService.getSnapshot().slots[0];
  assert.equal(slot.manualLevel, undefined);
  assert.equal(slot.manualCooldown, undefined);
  enemyUltimateService.setEnemyHeroes(['npc_dota_hero_enigma']);
  enemyUltimateService.recordCast(1, 1200);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].cooldownSeconds, 180);
  enemyUltimateService.correctEstimate(1, 3, 100);
  enemyUltimateService.updateFromGSI({ team3: { pick0_class: 'npc_dota_hero_faceless_void' } }, 'radiant', 1200);
  assert.equal(enemyUltimateService.getSnapshot().slots[0].manualCooldown, 100, 'GSI preserves manual heroes and corrections');
  enemyUltimateService.resetAll();
}
{
  const tracker = new EnemyUltimateService();
  tracker.setAutoCopyClipboard(false);
  assert.equal(tracker.selectHero(3, 'npc_dota_hero_enigma'), true);
  assert.equal(tracker.selectHero(2, 'npc_dota_hero_enigma'), false, 'No duplicate manual heroes');
  assert.equal(tracker.selectHero(3, 'npc_dota_hero_axe'), false, 'Only empty slots can be selected');
  assert.equal(tracker.selectHero(6, 'npc_dota_hero_axe'), false);
  assert.equal(tracker.selectHero(1, 'invalid'), false);
  tracker.recordCast(3, 600);
  tracker.correctEstimate(3, 3, 120);
  const draft = { team3: { pick0_class: 'npc_dota_hero_enigma', pick1_class: 'npc_dota_hero_faceless_void', pick2_class: 'npc_dota_hero_enigma' } };
  tracker.updateFromGSI(draft, 'radiant', 650);
  let slots = tracker.getSnapshot().slots;
  assert.equal(slots[2].heroName, 'Enigma');
  assert.equal(slots[2].hotkey, 'Alt+3');
  assert.equal(slots[2].remainingSeconds, 70);
  assert.equal(slots[2].manualCooldown, 120);
  assert.equal(slots[0].heroName, 'Faceless Void');
  assert.equal(slots.filter(s => s.heroClass === 'npc_dota_hero_enigma').length, 1);
  tracker.updateFromGSI(draft, 'radiant', 650);
  assert.equal(tracker.getSnapshot().slots.filter(s => s.heroClass).length, 2);
  assert.equal(tracker.clearSelection(1), 'ignored', 'Detected slots cannot be cleared manually');
  assert.equal(tracker.clearSelection(3), 'confirmation-required');
  assert.equal(tracker.getSnapshot().slots[2].remainingSeconds, 70, 'Cancel preserves timer');
  assert.equal(tracker.clearSelection(3, true), 'cleared');
  tracker.updateFromGSI(draft, 'radiant', 650);
  assert.equal(tracker.getSnapshot().slots[2].heroClass, '', 'GSI leaves cleared slot available for replacement');
  assert.equal(tracker.selectHero(3, 'npc_dota_hero_axe'), true);
  assert.equal(tracker.clearSelection(3), 'cleared', 'Unmodified slot clears without confirmation');
  tracker.selectHero(3, 'npc_dota_hero_axe');
  tracker.correctEstimate(3, 2);
  assert.equal(tracker.clearSelection(3), 'confirmation-required', 'Corrections alone require confirmation');
  tracker.resetAll();
  slots = tracker.getSnapshot().slots;
  assert.equal(slots.length, 5);
  assert.ok(slots.every(s => !s.heroClass && s.manualLevel === undefined));
  tracker.updateFromGSI(draft, 'radiant', 0);
  assert.equal(tracker.getSnapshot().slots[0].heroName, 'Enigma');
  tracker.resetAll();
}
console.log('--- ALL ENEMY ULTIMATE TRACKER TESTS PASSED! ---');
