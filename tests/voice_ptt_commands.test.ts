import assert from 'node:assert/strict';
import { timingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { objectiveTracker } from '../src/services/objectiveTracker';
import { voiceCommandService } from '../src/services/voiceCommandService';
import { VoicePttState } from '../src/types/voice';

console.log('--- RUNNING VOICE PUSH-TO-TALK & BILINGUAL COMMAND TESTS ---');

// Mock localStorage if in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

// Track spoken utterances
const spokenUtterances: string[] = [];
const origSpeak = (audioService as any).speak.bind(audioService);
(audioService as any).speak = (text: string, langOverride?: string, objective?: any) => {
  spokenUtterances.push(text);
  return origSpeak(text, langOverride, objective);
};

// -------------------------------------------------------------
// Test 1: PTT State Transitions & Listeners
// -------------------------------------------------------------
console.log('[Test 1] PTT State Transitions & Waveform');
voiceCommandService.reset();
voiceCommandService.setActivationMode('ptt');

let capturedPttState: VoicePttState | null = null;
const unsub = voiceCommandService.subscribePttState((st) => {
  capturedPttState = st;
});

assert.equal(capturedPttState?.isPttActive, false, 'PTT initially inactive');
assert.equal(capturedPttState?.activationMode, 'ptt', 'Activation mode is PTT');

// Start PTT
voiceCommandService.startPtt();
assert.equal(capturedPttState?.isPttActive, true, 'PTT becomes active after startPtt()');
assert.equal(voiceCommandService.getPttState().isPttActive, true);
assert.equal(voiceCommandService.getStatus(), 'listening', 'Status is listening while PTT active');

// Verify waveform array exists
const bars = voiceCommandService.getPttState().waveformBars;
assert.equal(Array.isArray(bars), true, 'Waveform bars is an array');
assert.equal(bars.length, 6, 'Waveform has 6 frequency bars');

// Stop PTT
voiceCommandService.stopPtt();
assert.equal(capturedPttState?.isPttActive, false, 'PTT becomes inactive after stopPtt()');
assert.deepEqual(voiceCommandService.getPttState().waveformBars, [0, 0, 0, 0, 0, 0], 'Waveform bars reset to 0');
assert.equal(voiceCommandService.getStatus(), 'disabled', 'Status returns to disabled after PTT release');
unsub();
console.log('  ✓ PTT state transition and waveform reset verified');

// -------------------------------------------------------------
// Test 2: Bilingual Command Matching & Ambiguity Resolution
// -------------------------------------------------------------
console.log('[Test 2] Bilingual Command Matching (Thai & English)');

// Thai objective matches
const matchThRoshan = voiceCommandService.matchCommand('โรชานตาย', 'th-TH');
assert.equal(matchThRoshan?.rule.intent, 'roshan_death', 'Matches Thai roshan death');

const matchThTormentor = voiceCommandService.matchCommand('ทอร์เมนเตอร์ตาย', 'th-TH');
assert.equal(matchThTormentor?.rule.intent, 'tormentor_death', 'Matches Thai tormentor death');

const matchThUndo = voiceCommandService.matchCommand('ยกเลิก', 'th-TH');
assert.equal(matchThUndo?.rule.intent, 'undo_objective', 'Matches Thai undo');

// English objective matches
const matchEnRoshan = voiceCommandService.matchCommand('roshan dead', 'en-US');
assert.equal(matchEnRoshan?.rule.intent, 'roshan_death', 'Matches English roshan death');

const matchEnTormentor = voiceCommandService.matchCommand('tormentor dead', 'en-US');
assert.equal(matchEnTormentor?.rule.intent, 'tormentor_death', 'Matches English tormentor death');

const matchEnUndo = voiceCommandService.matchCommand('undo', 'en-US');
assert.equal(matchEnUndo?.rule.intent, 'undo_objective', 'Matches English undo');

// Cross-language fallback (speaking English in Thai mode or vice versa)
const matchCrossEnInTh = voiceCommandService.matchCommand('roshan down', 'th-TH');
assert.equal(matchCrossEnInTh?.rule.intent, 'roshan_death', 'Cross-language English phrase recognized in Thai mode');

const matchCrossThInEn = voiceCommandService.matchCommand('โรชาน', 'en-US');
assert.equal(matchCrossThInEn?.rule.intent, 'roshan_death', 'Cross-language Thai phrase recognized in English mode');

// Longest phrase resolution (ambiguity check)
const matchCancelRoshan = voiceCommandService.matchCommand('cancel roshan', 'en-US');
assert.equal(matchCancelRoshan?.rule.intent, 'undo_objective', 'cancel roshan resolves to undo_objective, NOT roshan_death');

const matchThCancelRoshan = voiceCommandService.matchCommand('ยกเลิกโรชาน', 'th-TH');
assert.equal(matchThCancelRoshan?.rule.intent, 'undo_objective', 'ยกเลิกโรชาน resolves to undo_objective, NOT roshan_death');

const matchCancelTormentor = voiceCommandService.matchCommand('cancel tormentor', 'en-US');
assert.equal(matchCancelTormentor?.rule.intent, 'undo_objective', 'cancel tormentor resolves to undo_objective, NOT tormentor_death');

console.log('  ✓ Bilingual command matching and longest-phrase resolution passed');

// -------------------------------------------------------------
// Test 3: PTT Gating / False Positive Suppression
// -------------------------------------------------------------
console.log('[Test 3] PTT Noise Gate & False Positive Suppression');
voiceCommandService.reset();
voiceCommandService.setActivationMode('ptt');

// Simulate speech arriving when PTT was NEVER held (e.g. Discord chat)
const ignoredResult = voiceCommandService.processTranscript('roshan dead', 0.95, 1200, { fromMic: true });
assert.equal(ignoredResult.success, false, 'Transcript should be ignored when PTT is inactive');
assert.equal(ignoredResult.intent, null);
assert.equal(timingEngine.getRoshanState().isDead, false, 'Roshan should NOT be recorded when PTT inactive');

// Now press PTT, speak, and release
voiceCommandService.startPtt();
const activeResult = voiceCommandService.processTranscript('roshan dead', 0.95, 1200, { fromMic: true });
voiceCommandService.stopPtt();

assert.equal(activeResult.success, true, 'Transcript processed successfully while PTT active');
assert.equal(activeResult.intent, 'roshan_death');
assert.equal(timingEngine.getRoshanState().isDead, true, 'Roshan recorded via voice PTT');
console.log('  ✓ Discord chatter suppression and PTT activation gating verified');

// -------------------------------------------------------------
// Test 4: Voice-driven Roshan Recording & Voice Undo
// -------------------------------------------------------------
console.log('[Test 4] Voice-driven Roshan Recording & Voice Undo (Thai)');
timingEngine.resetAll();
objectiveTracker.resetAll();
spokenUtterances.length = 0;
audioService.updateSettings({ voiceLanguage: 'th-TH' });

// 1. Record Roshan via Thai voice command
voiceCommandService.startPtt();
const roshanRes = voiceCommandService.processTranscript('โรชานตาย', 0.9, 1500);
voiceCommandService.stopPtt();

assert.equal(roshanRes.success, true);
assert.equal(roshanRes.intent, 'roshan_death');
assert.equal(timingEngine.getRoshanState().isDead, true);
assert.equal(timingEngine.getRoshanState().deathClockTime, 1500);
assert.equal(objectiveTracker.isRoshanUndoActive(), true, 'Undo window active for 10s');
assert.equal(spokenUtterances.includes('บันทึกเวลาโรชานตายเรียบร้อยแล้ว'), true);

// 2. Undo Roshan via Thai voice command "ยกเลิก"
voiceCommandService.startPtt();
const undoRes = voiceCommandService.processTranscript('ยกเลิก', 0.9, 1502);
voiceCommandService.stopPtt();

assert.equal(undoRes.success, true);
assert.equal(undoRes.intent, 'undo_objective');
assert.equal(timingEngine.getRoshanState().isDead, false, 'Roshan timer undone by voice command');
assert.equal(objectiveTracker.isRoshanUndoActive(), false, 'Undo window closed after undo');
assert.equal(spokenUtterances.includes('ยกเลิกการจับเวลาโรชานแล้ว'), true);
console.log('  ✓ Thai voice Roshan recording and quick undo passed');

// -------------------------------------------------------------
// Test 5: Voice-driven Tormentor Recording & Voice Undo (English)
// -------------------------------------------------------------
console.log('[Test 5] Voice-driven Tormentor Recording & Voice Undo (English)');
timingEngine.resetAll();
objectiveTracker.resetAll();
spokenUtterances.length = 0;
audioService.updateSettings({ voiceLanguage: 'en-US' });

// 1. Record Tormentor via English voice command
voiceCommandService.startPtt();
const tormRes = voiceCommandService.processTranscript('tormentor dead', 0.9, 1200);
voiceCommandService.stopPtt();

assert.equal(tormRes.success, true);
assert.equal(tormRes.intent, 'tormentor_death');
assert.equal(timingEngine.getTormentorState().isDead, true);
assert.equal(timingEngine.getTormentorState().deathClockTime, 1200);
assert.equal(objectiveTracker.isTormentorUndoActive(), true, 'Tormentor undo window active for 10s');
assert.equal(spokenUtterances.includes('Tormentor slain recorded.'), true);

// 2. Undo Tormentor via English voice command "undo"
voiceCommandService.startPtt();
const undoTormRes = voiceCommandService.processTranscript('undo', 0.9, 1203);
voiceCommandService.stopPtt();

assert.equal(undoTormRes.success, true);
assert.equal(undoTormRes.intent, 'undo_objective');
assert.equal(timingEngine.getTormentorState().isDead, false, 'Tormentor timer undone by voice command');
assert.equal(objectiveTracker.isTormentorUndoActive(), false, 'Tormentor undo window closed after undo');
assert.equal(spokenUtterances.includes('Tormentor timer canceled.'), true);
console.log('  ✓ English voice Tormentor recording and quick undo passed');

// -------------------------------------------------------------
// Test 6: Continuous Mode (Always-Listening Fallback)
// -------------------------------------------------------------
console.log('[Test 6] Continuous Listening Mode');
timingEngine.resetAll();
objectiveTracker.resetAll();
voiceCommandService.setActivationMode('continuous');
assert.equal(voiceCommandService.getActivationMode(), 'continuous');

// In continuous mode, transcripts are accepted even if startPtt was not called
const contResult = voiceCommandService.processTranscript('roshan dead', 0.9, 1800);
assert.equal(contResult.success, true, 'Continuous mode processes transcripts directly');
assert.equal(timingEngine.getRoshanState().isDead, true, 'Roshan recorded in continuous mode');

// Switch back to PTT mode
voiceCommandService.setActivationMode('ptt');
assert.equal(voiceCommandService.getActivationMode(), 'ptt');
console.log('  ✓ Continuous mode fallback verified');

console.log('--- ALL VOICE PUSH-TO-TALK & BILINGUAL COMMAND TESTS PASSED! ---');
