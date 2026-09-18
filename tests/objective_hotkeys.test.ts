import assert from 'node:assert/strict';
import { timingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { objectiveTracker, matchesHotkey, parseHotkey } from '../src/services/objectiveTracker';

console.log('--- RUNNING OBJECTIVE HOTKEYS, QUICK-UNDO & CLIPBOARD TESTS ---');

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

// Intercept spoken utterances to verify voice feedback
const spokenUtterances: string[] = [];
const origSpeak = (audioService as any).speak.bind(audioService);
(audioService as any).speak = (text: string, langOverride?: string, objective?: any) => {
  spokenUtterances.push(text);
  return origSpeak(text, langOverride, objective);
};

// Test 1: Hotkey parsing and event matching
console.log('[Test 1] Hotkey matching validation');
assert.deepEqual(parseHotkey('Alt+F9'), { alt: true, ctrl: false, shift: false, meta: false, key: 'f9' });
assert.deepEqual(parseHotkey('Ctrl+Shift+F10'), { alt: false, ctrl: true, shift: true, meta: false, key: 'f10' });
assert.deepEqual(parseHotkey('Alt+F8'), { alt: true, ctrl: false, shift: false, meta: false, key: 'f8' });

const mockEventAltF9 = {
  altKey: true,
  ctrlKey: false,
  shiftKey: false,
  metaKey: false,
  key: 'F9',
  code: 'F9',
} as unknown as KeyboardEvent;

const mockEventF9WithoutAlt = {
  altKey: false,
  ctrlKey: false,
  shiftKey: false,
  metaKey: false,
  key: 'F9',
  code: 'F9',
} as unknown as KeyboardEvent;

assert.equal(matchesHotkey(mockEventAltF9, 'Alt+F9'), true, 'Alt+F9 matches mock event');
assert.equal(matchesHotkey(mockEventF9WithoutAlt, 'Alt+F9'), false, 'F9 without Alt should not match Alt+F9');
assert.equal(matchesHotkey(mockEventAltF9, 'Alt+F8'), false, 'Alt+F9 should not match Alt+F8');
console.log('  ✓ Hotkey parsing and matching verified');

// Test 2: Hotkey conflict detection
console.log('[Test 2] Hotkey conflict handling');
const sameKeys = objectiveTracker.setHotkeys('Alt+F9', 'Alt+F9');
assert.equal(sameKeys.success, false, 'Should reject identical hotkeys for Roshan and Tormentor');

const conflictInteraction = objectiveTracker.setHotkeys('Ctrl+Shift+F10', 'Alt+F8', 'Ctrl+Shift+F10');
assert.equal(conflictInteraction.success, false, 'Should reject hotkey conflicting with overlay interaction hotkey');

const validKeys = objectiveTracker.setHotkeys('Alt+F9', 'Alt+F8', 'Ctrl+Shift+F10');
assert.equal(validKeys.success, true, 'Valid distinct hotkeys should be accepted');
console.log('  ✓ Hotkey conflict detection verified');

// Test 3: Formatting for Clipboard (Roshan & Tormentor)
console.log('[Test 3] Timing summary formatting for clipboard');
// 1515 seconds = 25:15
// Aegis = 25:15 + 5:00 = 30:15
// Earliest Respawn = 25:15 + 8:00 = 33:15
// Latest Respawn = 25:15 + 11:00 = 36:15
const roshanSummary = objectiveTracker.formatRoshanSummary(1515);
assert.equal(roshanSummary, 'Roshan 25:15 | Aegis 30:15 | Respawn 33:15-36:15');

// 1200 seconds = 20:00
// Tormentor Respawn = 20:00 + 10:00 = 30:00
const tormentorSummary = objectiveTracker.formatTormentorSummary(1200);
assert.equal(tormentorSummary, 'Tormentor 20:00 | Respawn 30:00');
console.log('  ✓ Clipboard summary strings verified');

// Test 4: Roshan recording & 10s voice quick undo
console.log('[Test 4] Roshan recording & 10-second quick undo');
timingEngine.resetAll();
objectiveTracker.resetAll();
spokenUtterances.length = 0;

// Record Roshan death at 1515s
const rec1 = objectiveTracker.recordRoshan(1515);
assert.equal(rec1.action, 'recorded');
assert.equal(timingEngine.getRoshanState().isDead, true);
assert.equal(timingEngine.getRoshanState().deathClockTime, 1515);
assert.equal(spokenUtterances.includes('Roshan slain recorded.'), true, 'Voice should announce Roshan slain recorded');

let snapshot = objectiveTracker.getSnapshot();
assert.equal(snapshot.roshanActive, true, 'Roshan undo window should be active');
assert.ok(snapshot.roshanRemainingSec > 0 && snapshot.roshanRemainingSec <= 10, 'Remaining undo seconds should be <= 10');

// Trigger again within 10s (simulate quick undo press)
const recUndo = objectiveTracker.recordRoshan(1517);
assert.equal(recUndo.action, 'undone');
assert.equal(timingEngine.getRoshanState().isDead, false, 'Roshan death should be reset after undo');
assert.equal(spokenUtterances.includes('Roshan timer canceled.'), true, 'Voice should announce Roshan timer canceled');

snapshot = objectiveTracker.getSnapshot();
assert.equal(snapshot.roshanActive, false, 'Roshan undo window should be closed after undo');
console.log('  ✓ Roshan death recording and quick undo passed');

// Test 5: Tormentor recording & 10s voice quick undo
console.log('[Test 5] Tormentor recording & 10-second quick undo');
timingEngine.resetAll();
objectiveTracker.resetAll();
spokenUtterances.length = 0;

const torm1 = objectiveTracker.recordTormentor(1200);
assert.equal(torm1.action, 'recorded');
assert.equal(timingEngine.getTormentorState().isDead, true);
assert.equal(timingEngine.getTormentorState().deathClockTime, 1200);
assert.equal(spokenUtterances.includes('Tormentor slain recorded.'), true, 'Voice should announce Tormentor slain recorded');

snapshot = objectiveTracker.getSnapshot();
assert.equal(snapshot.tormentorActive, true, 'Tormentor undo window should be active');

// Trigger again within 10s (simulate quick undo)
const tormUndo = objectiveTracker.recordTormentor(1202);
assert.equal(tormUndo.action, 'undone');
assert.equal(timingEngine.getTormentorState().isDead, false, 'Tormentor state should be reset after undo');
assert.equal(spokenUtterances.includes('Tormentor timer canceled.'), true, 'Voice should announce Tormentor timer canceled');
console.log('  ✓ Tormentor death recording and quick undo passed');

// Test 6: Auto-copy toggle
console.log('[Test 6] Auto-copy to clipboard setting toggle');
objectiveTracker.resetAll();
objectiveTracker.setAutoCopyClipboard(true);
assert.equal(objectiveTracker.getAutoCopyClipboard(), true);
objectiveTracker.recordRoshan(1800);
assert.equal(objectiveTracker.getSnapshot().lastClipboardNotice, 'Roshan 30:00 | Aegis 35:00 | Respawn 38:00-41:00');

objectiveTracker.resetAll();
objectiveTracker.setAutoCopyClipboard(false);
assert.equal(objectiveTracker.getAutoCopyClipboard(), false);
objectiveTracker.recordRoshan(1800);
assert.equal(objectiveTracker.getSnapshot().lastClipboardNotice, null, 'Clipboard notice should not be set when auto-copy is disabled');
console.log('  ✓ Auto-copy clipboard setting verified');

console.log('--- ALL OBJECTIVE HOTKEYS, UNDO & CLIPBOARD TESTS PASSED! ---');
