import assert from 'node:assert/strict';
import { VoiceQueue, VoiceReminder } from '../src/services/voiceQueue';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
let clock = 100;
let wall = 0;
let disabled = new Set<string>();
let spoken: string[] = [];
let callbacks: (() => void)[] = [];
let cancelled = 0;
const queue = new VoiceQueue({
  speak: (text, _lang, done) => { spoken.push(text); callbacks.push(done); },
  cancel: () => { cancelled++; },
}, () => clock, objective => !disabled.has(objective), () => wall);
const reminder = (id: string, deadline: number, objective: VoiceReminder['objective'] = 'roshan'): VoiceReminder => ({
  id, objective, deadline, text: now => `${id} in ${deadline - now!} seconds`,
});
queue.enqueue(reminder('later', 130));
queue.enqueue(reminder('urgent', 110));
queue.enqueue(reminder('urgent', 110));
await flush();
assert.deepEqual(spoken, ['urgent in 10 seconds']);
clock = 106;
callbacks.shift()!();
await flush();
assert.equal(spoken[1], 'later in 24 seconds', 'Countdown must use clock at dequeue');
queue.enqueue(reminder('expires', 108));
clock = 109;
callbacks.shift()!();
await flush();
assert.equal(spoken.length, 2, 'Expired reminder must not speak');
queue.enqueue(reminder('disabled', 150, 'rune_power'));
queue.enqueue(reminder('keep', 160, 'tormentor'));
await flush();
const staleDone = callbacks.shift()!;
disabled.add('rune_power');
queue.reconcile();
await flush();
assert.equal(cancelled, 1);
assert.equal(spoken.at(-1), 'keep in 51 seconds');
staleDone(); // A cancelled utterance can report onend after the next one starts.
queue.enqueue(reminder('next', 170));
await flush();
assert.notEqual(spoken.at(-1), 'next in 61 seconds');
queue.setEnabled(false);
assert.equal(cancelled, 2);
queue.setEnabled(true);
await flush();
assert.equal(spoken.length, 4, 'Re-enabling must not restore cleared speech');
queue.enqueue(reminder('stale', 200));
wall = 35001;
await flush();
assert.equal(spoken.length, 4, 'Stale disconnected reminders must expire even if game clock stops');
queue.enqueue(reminder('paused', 200));
await flush();
assert.equal(spoken.at(-1), 'paused in 91 seconds', 'Wall time must not advance the game clock');
queue.clear();

// Real timing engine -> reminder context -> speech driver integration.
const utterances: { text: string; onend?: () => void; onerror?: () => void }[] = [];
let nativeCancels = 0;
Object.assign(globalThis, {
  window: {
    addEventListener() {}, removeEventListener() {},
    speechSynthesis: { getVoices: () => [], cancel: () => { nativeCancels++; }, speak: (u: typeof utterances[number]) => { utterances.push(u); } },
  },
  SpeechSynthesisUtterance: class { constructor(public text: string) {} },
});
const { audioService } = await import('../src/services/audioService');
const { alertProfiles } = await import('../src/services/alertProfiles');
const { TimingEngine } = await import('../src/services/timingEngine');
const engine = new TimingEngine();
engine.calculateAlerts(1190, false);
await flush();
assert.match(utterances[0].text, /in 10 seconds$/);
engine.calculateAlerts(1194, false);
utterances[0].onend!();
await flush();
assert.match(utterances[1].text, /in 6 seconds$/);
alertProfiles.select('offlane'); // Disables power/water, which is the second reminder.
assert.equal(nativeCancels, 1);
await flush();
assert.match(utterances[2].text, /Tormentor ready in 6 seconds/);
audioService.setVoiceEnabled(false);
assert.equal(nativeCancels, 2);
audioService.setVoiceEnabled(true);
await flush();
assert.equal(utterances.length, 3);
engine.resetAll();
engine.calculateAlerts(341, false);
alertProfiles.select('support');
engine.resetAll();
engine.calculateAlerts(342, false);
await flush();
assert.match(utterances.at(-1)!.text, /Power Rune in 18 seconds/);
engine.resetAll();
assert.equal(nativeCancels, 3, 'Resetting match must cancel active speech');
// Release any cancelled native callbacks; they must not resurrect pending work.
for (const utterance of utterances) utterance.onend?.();
await flush();
console.log('Voice urgency, countdown freshness, expiry, cancellation, mute, stale callbacks, and timing integration passed.');
