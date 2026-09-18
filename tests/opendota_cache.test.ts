import assert from 'node:assert/strict';
import { OpenDotaCache } from '../src/services/openDotaCache';
const values = new Map<string, string>();
const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } } as Storage;
let calls = 0;
let fail = false;
let payload: unknown = [1, 2];
const request = (async () => { calls++; if (fail) throw new Error('offline'); return { ok: true, json: async () => payload } as Response; }) as typeof fetch;
const valid = (value: unknown): value is number[] => Array.isArray(value) && value.every(item => typeof item === 'number');
const cache = new OpenDotaCache(storage, 'patch-a', request);
const [first, second] = await Promise.all([cache.load('heroStats', valid), cache.load('heroStats', valid)]);
assert.deepEqual(first, second); assert.equal(calls, 1, 'Concurrent requests must coalesce');
const fetchedAt = cache.status('heroStats')!.fetchedAt;
assert.ok(fetchedAt);
fail = true;
const restarted = new OpenDotaCache(storage, 'patch-a', request);
assert.deepEqual(await restarted.load('heroStats', valid), [1, 2]);
assert.equal(restarted.status('heroStats')?.state, 'stale');
assert.equal(restarted.status('heroStats')?.fetchedAt, fetchedAt, 'Fallback must retain original fetch time');
const patched = new OpenDotaCache(storage, 'patch-b', request);
await assert.rejects(patched.load('heroStats', valid));
assert.equal(patched.status('heroStats')?.state, 'unavailable');
fail = false; payload = [3];
assert.deepEqual(await restarted.load('heroStats', valid), [3]);
assert.equal(restarted.status('heroStats')?.state, 'fresh');
const previous = values.get('dotaassist.opendota.v1:heroStats');
payload = { error: 'invalid' };
assert.deepEqual(await restarted.load('heroStats', valid), [3]);
assert.equal(values.get('dotaassist.opendota.v1:heroStats'), previous, 'Malformed response must not overwrite a good cache');
values.set('dotaassist.opendota.v1:corrupt', '{bad json');
await assert.rejects(restarted.load('corrupt', valid));
fail = true;
await assert.rejects(restarted.load('heroes/99/matchups', valid), 'Must not substitute another endpoint or hero');
fail = false; payload = [];
assert.deepEqual(await patched.load('heroStats', valid), []);
assert.equal(patched.status('heroStats')?.state, 'fresh');
const blocked = new OpenDotaCache({ getItem: () => null, setItem: () => { throw Error('quota'); } } as unknown as Storage, 'patch-a', request);
await blocked.load('heroStats', valid);
assert.equal(blocked.status('heroStats')?.storageError, true);
fail = true;
assert.deepEqual(await blocked.load('heroStats', valid), [], 'Storage failure should preserve in-session data');
console.log('OpenDota cache restart, patch exclusion, refresh, validation, deduplication and storage failure checks passed.');

// Verify service transformations still use genuine saved responses on failure.
const { OpenDotaService } = await import('../src/services/apiService');
const originalFetch = globalThis.fetch;
let offline = false;
globalThis.fetch = (async (input) => {
  if (offline) throw new Error('offline');
  const path = String(input);
  const body = path.endsWith('heroStats')
    ? [{ id: 1, name: 'npc_dota_hero_antimage', localized_name: 'Anti-Mage', primary_attr: 'agi', attack_type: 'Melee', roles: ['Carry'], '1_win': 60, '1_pick': 100 }]
    : path.endsWith('matchups') ? [{ hero_id: 2, games_played: 100, wins: 40 }]
    : { mid_game_items: { '1': 20 } };
  return { ok: true, json: async () => body } as Response;
}) as typeof fetch;
try {
  const service = new OpenDotaService();
  assert.equal(await service.initData(), true);
  assert.equal(service.getHeroById(1)?.winRate, 60);
  const counters = await service.getCountersForHero(1);
  const items = await service.getPopularItemsForHero(1);
  assert.ok(items.length);
  offline = true;
  assert.equal(await service.initData(), true);
  assert.equal(service.getHeroById(1)?.winRate, 60);
  assert.deepEqual(await service.getCountersForHero(1), counters);
  assert.deepEqual(await service.getPopularItemsForHero(1), items);
  assert.deepEqual(await service.getPopularItemsForHero(1, true), items);
} finally { globalThis.fetch = originalFetch; }
console.log('OpenDota statistics, matchup and item transformation fallback checks passed.');
