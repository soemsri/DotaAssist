import assert from 'node:assert/strict';
import { AlertProfiles, alertProfiles, suggestRole } from '../src/services/alertProfiles';
import { TimingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { TIMING_RULES } from '../src/data/timingRules';

const data = new Map<string, string>();
const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
const profiles = new AlertProfiles(storage);
profiles.select('carry');
profiles.edit('mid', 'roshan', false);
profiles.observe('npc_dota_hero_axe', 'one');
assert.equal(profiles.getSnapshot().pending?.role, 'offlane');
assert.equal(profiles.getSnapshot().active, 'carry', 'Suggestion must not change active profile');
profiles.select('mid');
profiles.observe('npc_dota_hero_axe', 'one');
assert.equal(profiles.getSnapshot().pending, null, 'Confirmed suggestion must not repeat');
profiles.observe(undefined);
assert.equal(profiles.getSnapshot().active, 'mid');
profiles.observe('npc_dota_hero_axe', 'two');
assert.ok(profiles.getSnapshot().pending, 'New match should suggest again');
profiles.dismiss();
assert.equal(profiles.getSnapshot().active, 'mid');
profiles.observe('npc_dota_hero_crystal_maiden', 'two');
assert.equal(profiles.getSnapshot().pending?.role, 'support');
assert.equal(suggestRole('unknown'), null);
const restored = new AlertProfiles(storage);
assert.equal(restored.getSnapshot().active, 'mid');
assert.equal(restored.enabled('roshan'), false);
restored.reset('mid');
assert.equal(restored.enabled('roshan'), true);
assert.equal(new AlertProfiles({ getItem: () => '{broken', setItem: () => {} }).getSnapshot().active, 'support');
const blocked = new AlertProfiles({ getItem: () => null, setItem: () => { throw new Error('blocked'); } });
blocked.select('carry');
assert.equal(blocked.getSnapshot().active, 'carry');
assert.ok(blocked.getSnapshot().error);

let sounds = 0;
const original = audioService.playBountyRuneAlert;
audioService.playBountyRuneAlert = () => { sounds++; };
try {
  alertProfiles.select('support');
  alertProfiles.edit('support', 'rune_bounty', false);
  const engine = new TimingEngine();
  assert.equal(engine.calculateAlerts(-10, true).some(a => a.type === 'rune_bounty'), false);
  assert.equal(engine.calculateAlerts(230, false).some(a => a.type === 'rune_bounty'), false);
  assert.equal(sounds, 0);
  alertProfiles.edit('support', 'rune_bounty', true);
  engine.calculateAlerts(231, false);
  assert.equal(sounds, 0, 'Changing profiles must not replay a consumed reminder');
  engine.calculateAlerts(470, false);
  assert.equal(sounds, 1);
} finally { audioService.playBountyRuneAlert = original; alertProfiles.reset('support'); }

// Boundary fixtures for the shipped patch: change only alongside reviewed rules.
assert.equal(TIMING_RULES.patch, '7.41e');
for (const [time, kind, target] of [[240, 'rune_bounty', 240], [241, 'rune_bounty', undefined], [120, 'rune_power', 120], [240, 'rune_power', 240], [360, 'rune_power', 360], [420, 'rune_wisdom', 420], [1200, 'tormentor', 1200], [180, 'lotus', 180], [300, 'day_night', 300]] as const) {
  assert.equal(new TimingEngine().calculateAlerts(time, false).find(a => a.type === kind)?.targetSeconds, target);
}
const boss = new TimingEngine();
boss.recordRoshanDeath(100);
assert.equal(boss.calculateAlerts(399, false).find(a => a.id === 'roshan_aegis')?.secondsRemaining, 1);
assert.ok(boss.calculateAlerts(400, false).some(a => a.id === 'roshan_window_wait'));
assert.ok(boss.calculateAlerts(580, false).some(a => a.id === 'roshan_window_active'));
assert.ok(boss.calculateAlerts(760, false).some(a => a.id === 'roshan_alive'));
boss.recordTormentorDeath(1200);
assert.equal(boss.calculateAlerts(1799, false).find(a => a.type === 'tormentor')?.secondsRemaining, 1);
assert.ok(boss.calculateAlerts(1800, false).some(a => a.id === 'tormentor_ready_1800'));
console.log('Profile persistence, confirmation, filtering, audio deduplication, and bundled rules boundary tests passed.');
