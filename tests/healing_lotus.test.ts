import assert from 'node:assert/strict';
import { TimingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { alertProfiles } from '../src/services/alertProfiles';
import { voiceCommandService } from '../src/services/voiceCommandService';

console.log('--- RUNNING HEALING LOTUS TIMINGS, AUDIO ALERTS & VOICE QUERY TESTS ---');

// Mock localStorage for Node environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

// [Test 1] Timing Engine Lotus Card Appearance and Urgency
console.log('[Test 1] Lotus timing card and urgency thresholds');
const engine = new TimingEngine();

// At 139s (41s before 180s = 3:00): card should not appear yet (> 40s)
const alerts139 = engine.calculateAlerts(139, false);
assert.equal(alerts139.some(a => a.type === 'lotus'), false, 'Lotus card should not appear at 41s before spawn');

// At 140s (40s before 180s): card appears
const alerts140 = engine.calculateAlerts(140, false);
const lotusCard140 = alerts140.find(a => a.type === 'lotus');
assert.ok(lotusCard140, 'Lotus card must appear at 40s before spawn');
assert.equal(lotusCard140.title, 'Healing Lotus');
assert.equal(lotusCard140.targetSeconds, 180);
assert.equal(lotusCard140.secondsRemaining, 40);
assert.equal(lotusCard140.urgent, false, 'Lotus card is not urgent at 40s');

// At 165s (15s before 180s): card should be urgent
const alerts165 = engine.calculateAlerts(165, false);
const lotusCard165 = alerts165.find(a => a.type === 'lotus');
assert.ok(lotusCard165);
assert.equal(lotusCard165.secondsRemaining, 15);
assert.equal(lotusCard165.urgent, true, 'Lotus card must be urgent at <= 15s');
console.log('  ✓ Lotus timing card boundaries and urgency verified');

// [Test 2] Audio alert trigger and deduplication
console.log('[Test 2] Audio alert trigger and deduplication at 15s window');
let lotusSounds = 0;
const origPlayLotusAlert = audioService.playLotusAlert.bind(audioService);
audioService.playLotusAlert = () => { lotusSounds++; };

try {
  alertProfiles.select('support');
  const freshEngine = new TimingEngine();

  // At 160s (20s before): audio should not play yet
  freshEngine.calculateAlerts(160, false);
  assert.equal(lotusSounds, 0, 'Audio must not play at 20s');

  // At 165s (15s before): audio plays
  freshEngine.calculateAlerts(165, false);
  assert.equal(lotusSounds, 1, 'Audio must play at 15s');

  // At 166s (14s before): audio should not play again (deduplication)
  freshEngine.calculateAlerts(166, false);
  assert.equal(lotusSounds, 1, 'Audio must not replay for the same spawn');

  // Next spawn at 360s (6:00): at 345s (15s before 360s), plays second time
  freshEngine.calculateAlerts(345, false);
  assert.equal(lotusSounds, 2, 'Audio must play for next lotus window');
} finally {
  audioService.playLotusAlert = origPlayLotusAlert;
  alertProfiles.reset('support');
}
console.log('  ✓ Audio alert trigger and deduplication verified');

// [Test 3] Alert Profile filtering
console.log('[Test 3] Alert Profile role filtering');
const profileEngine = new TimingEngine();

// Support: lotus enabled by default
alertProfiles.select('support');
assert.equal(alertProfiles.enabled('lotus'), true);
assert.ok(profileEngine.calculateAlerts(170, false).some(a => a.type === 'lotus'));

// Mid: lotus disabled by default
alertProfiles.select('mid');
assert.equal(alertProfiles.enabled('lotus'), false);
assert.equal(profileEngine.calculateAlerts(170, false).some(a => a.type === 'lotus'), false, 'Mid role should have lotus filtered out');

// Explicit enable for mid
alertProfiles.edit('mid', 'lotus', true);
assert.equal(alertProfiles.enabled('lotus'), true);
assert.ok(profileEngine.calculateAlerts(170, false).some(a => a.type === 'lotus'), 'Editing profile should re-enable lotus');

alertProfiles.reset('mid');
alertProfiles.select('support');
console.log('  ✓ Alert Profile filtering verified');

// [Test 4] Voice Command query_lotus
console.log('[Test 4] Voice Command query_lotus recognition & response');
audioService.setVoiceLanguage('th-TH');

// Thai queries
const resTh1 = voiceCommandService.processTranscript('เวลาดอกบัว');
assert.ok(resTh1, 'Transcript "เวลาดอกบัว" should be recognized');
assert.equal(resTh1.intent, 'query_lotus');
assert.ok(resTh1.feedbackText.includes('ดอกบัวฟื้นฟู'));

const resTh2 = voiceCommandService.processTranscript('ดอกบัวเกิดตอนไหน');
assert.ok(resTh2);
assert.equal(resTh2.intent, 'query_lotus');

// English queries
audioService.setVoiceLanguage('en-US');
const resEn1 = voiceCommandService.processTranscript('lotus time');
assert.ok(resEn1, 'Transcript "lotus time" should be recognized');
assert.equal(resEn1.intent, 'query_lotus');
assert.ok(resEn1.feedbackText.includes('Healing Lotus'));

const resEn2 = voiceCommandService.processTranscript('next lotus');
assert.ok(resEn2);
assert.equal(resEn2.intent, 'query_lotus');

console.log('  ✓ Voice command queries in Thai and English verified');
console.log('--- ALL HEALING LOTUS TESTS PASSED! ---');
