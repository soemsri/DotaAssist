import { timingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { getEnemyPickClasses } from '../src/services/draftService';

console.log('--- RUNNING TIMING ENGINE & AUDIO VERIFICATION ---');

// Test 1: Float clock time around Wisdom Shrine (7:00 = 420s)
// The GSI clock is normalized to whole seconds, so 390.5s -> 30s remaining.
timingEngine.resetAlerts();
let alerts = timingEngine.calculateAlerts(390.5, false);
console.log(`[Test 1] 390.5s (normalized to 30s before Wisdom): Alerts count = ${alerts.length}`);
const wisdomAlert = alerts.find(a => a.type === 'rune_wisdom');
if (!wisdomAlert) {
  throw new Error('Test 1 Failed: Wisdom Shrine alert not found');
}
console.log(`  ✓ Wisdom alert found: ${wisdomAlert.title}, ${wisdomAlert.secondsRemaining}s remaining (urgent: ${wisdomAlert.urgent})`);

// Test 2: Power Rune (6:00 = 360s) at 341.2s (18.8s remaining <= 20s)
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(341.2, false);
const powerAlert = alerts.find(a => a.type === 'rune_power');
if (!powerAlert) {
  throw new Error('Test 2 Failed: Power rune alert not found');
}
console.log(`[Test 2] ✓ Power alert found: ${powerAlert.title}, ${powerAlert.secondsRemaining}s remaining`);

// Test 3: Bounty Rune (4:00 = 240s) at 227.4s (12.6s remaining <= 15s)
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(227.4, false);
const bountyAlert = alerts.find(a => a.type === 'rune_bounty');
if (!bountyAlert) {
  throw new Error('Test 3 Failed: Bounty rune alert not found');
}
console.log(`[Test 3] ✓ Bounty alert found: ${bountyAlert.title}, ${bountyAlert.secondsRemaining}s remaining`);

// Recurring objectives remain visible as "now" at the exact spawn second.
alerts = timingEngine.calculateAlerts(240, false);
const bountyNow = alerts.find(a => a.type === 'rune_bounty');
if (!bountyNow || bountyNow.targetSeconds !== 240 || bountyNow.secondsRemaining !== 0) {
  throw new Error('Test 3 Failed: exact Bounty spawn second was skipped');
}

const nightfallNow = timingEngine.calculateAlerts(300, false).find(a => a.type === 'day_night');
if (!nightfallNow || nightfallNow.title !== 'Nightfall Coming' || nightfallNow.secondsRemaining !== 0) {
  throw new Error('Test 3 Failed: exact day/night transition was mislabeled or skipped');
}

// Test 4: Tormentor (20:00 = 1200s) at 1172.0s (28s remaining <= 30s)
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(1172.0, false);
const tormentorAlert = alerts.find(a => a.type === 'tormentor');
if (!tormentorAlert) {
  throw new Error('Test 4 Failed: Tormentor alert not found');
}
console.log(`[Test 4] ✓ Tormentor alert found: ${tormentorAlert.title}, ${tormentorAlert.secondsRemaining}s remaining`);

// Test 5: Roshan manual kill and tracking
timingEngine.resetAlerts();
timingEngine.recordRoshanDeath(600); // died at 10:00
const state = timingEngine.getRoshanState();
if (!state.isDead || state.deathClockTime !== 600) {
  throw new Error('Test 5 Failed: Roshan state not recorded');
}

// Aegis active at 12:00 (720s) -> 180s left until 15:00 (900s)
alerts = timingEngine.calculateAlerts(720, false);
const aegisAlert = alerts.find(a => a.id === 'roshan_aegis');
if (!aegisAlert) {
  throw new Error('Test 5 Failed: Aegis alert missing');
}
console.log(`[Test 5] ✓ Roshan Aegis tracking: ${aegisAlert.title}, ${aegisAlert.secondsRemaining}s remaining`);

// Earliest respawn wait at 17:00 (1020s) -> 60s left until 18:00 (1080s)
alerts = timingEngine.calculateAlerts(1020, false);
const respawnWait = alerts.find(a => a.id === 'roshan_window_wait');
if (!respawnWait) {
  throw new Error('Test 5 Failed: Roshan respawn wait missing');
}
console.log(`[Test 5] ✓ Roshan respawn wait tracking: ${respawnWait.title}`);

// Window active at 19:00 (1140s) -> between 18m and 21m
alerts = timingEngine.calculateAlerts(1140, false);
const respawnActive = alerts.find(a => a.id === 'roshan_window_active');
if (!respawnActive) {
  throw new Error('Test 5 Failed: Roshan respawn active missing');
}
console.log(`[Test 5] ✓ Roshan respawn active window tracking: ${respawnActive.title}`);

// Test 6: Audio service settings
audioService.setMasterVolume(0.9);
audioService.setVoiceEnabled(true);
audioService.setSfxEnabled(true);
audioService.setVoiceLanguage('en-US');
const settings = audioService.getSettings();
if (settings.masterVolume !== 0.9 || !settings.voiceEnabled || settings.voiceLanguage !== 'en-US') {
  throw new Error('Test 6 Failed: Audio settings mismatch');
}
console.log(`[Test 6] ✓ Audio service configuration passed`);

// Test 7: Tormentor kill and ten-minute respawn tracking
timingEngine.resetAll();
timingEngine.recordTormentorDeath(1_300);
alerts = timingEngine.calculateAlerts(1_850, false);
const tormentorRespawn = alerts.find(a => a.id === 'tormentor_respawn_1900');
if (!tormentorRespawn || tormentorRespawn.secondsRemaining !== 50) {
  throw new Error('Test 7 Failed: Tormentor respawn timer mismatch');
}
console.log(`[Test 7] ✓ Tormentor respawn tracking: ${tormentorRespawn.secondsRemaining}s remaining`);

// Test 8: Roshan GSI state transitions automatically start and reset tracking
timingEngine.resetAll();
timingEngine.handleGSIPayload({
  map: {
    name: 'start', matchid: 'gsi-roshan', game_time: 600, clock_time: 600,
    daytime: true, nightstalker_night: false,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false,
    win_team: 'none', customgamename: '', roshan_state: 'alive',
  },
});
timingEngine.handleGSIPayload({
  map: {
    name: 'start', matchid: 'gsi-roshan', game_time: 601, clock_time: 601,
    daytime: true, nightstalker_night: false,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false,
    win_team: 'none', customgamename: '', roshan_state: 'respawn_base',
  },
});
if (!timingEngine.getRoshanState().isDead || timingEngine.getRoshanState().deathClockTime !== 601) {
  throw new Error('Test 8 Failed: Roshan death was not detected from GSI');
}
timingEngine.handleGSIPayload({
  map: {
    name: 'start', matchid: 'gsi-roshan', game_time: 1_200, clock_time: 1_200,
    daytime: true, nightstalker_night: false,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false,
    win_team: 'none', customgamename: '', roshan_state: 'alive',
  },
});
if (timingEngine.getRoshanState().isDead) {
  throw new Error('Test 8 Failed: Roshan respawn was not detected from GSI');
}
console.log('[Test 8] ✓ Roshan GSI state synchronization passed');

// Test 9: Enemy draft side follows the local player team
const draft = {
  team2: { pick0_class: 'npc_dota_hero_axe' },
  team3: { pick0_class: 'npc_dota_hero_bane' },
};
const radiantEnemies = getEnemyPickClasses(draft, 'radiant');
const direEnemies = getEnemyPickClasses(draft, 'dire');
if (radiantEnemies[0] !== 'npc_dota_hero_bane' || direEnemies[0] !== 'npc_dota_hero_axe') {
  throw new Error('Test 9 Failed: enemy draft team resolution mismatch');
}
if (getEnemyPickClasses(draft).length !== 0) {
  throw new Error('Test 9 Failed: draft side should not be guessed without a player team');
}
console.log('[Test 9] ✓ Draft enemy team resolution passed');

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
