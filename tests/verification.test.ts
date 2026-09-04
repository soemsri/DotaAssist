import { timingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';

console.log('--- RUNNING TIMING ENGINE & AUDIO VERIFICATION ---');

// Test 1: Float clock time around Wisdom Rune (7:00 = 420s)
// 390.5s -> 29.5s remaining (< 30s)
timingEngine.resetAlerts();
let alerts = timingEngine.calculateAlerts(390.5, false);
console.log(`[Test 1] 390.5s (29.5s to Wisdom): Alerts count = ${alerts.length}`);
const wisdomAlert = alerts.find(a => a.type === 'rune_wisdom');
if (!wisdomAlert) {
  throw new Error('Test 1 Failed: Wisdom rune alert not found');
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

// Test 3: Bounty Rune (3:00 = 180s) at 167.4s (12.6s remaining <= 15s)
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(167.4, false);
const bountyAlert = alerts.find(a => a.type === 'rune_bounty');
if (!bountyAlert) {
  throw new Error('Test 3 Failed: Bounty rune alert not found');
}
console.log(`[Test 3] ✓ Bounty alert found: ${bountyAlert.title}, ${bountyAlert.secondsRemaining}s remaining`);

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

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
