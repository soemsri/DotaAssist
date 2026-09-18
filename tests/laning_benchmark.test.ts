import assert from 'node:assert/strict';
import { laningBenchmarkService, ROLE_BENCHMARKS } from '../src/services/laningBenchmarkService';
import { alertProfiles } from '../src/services/alertProfiles';
import { audioService } from '../src/services/audioService';
import { timingEngine } from '../src/services/timingEngine';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING LANING STAGE BENCHMARK, PACE TRACKER & REPORT TESTS ---');

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

// [Test 1] Decision 1: Role-based benchmarks & proportional expected CS
console.log('[Test 1] Role-based benchmarks at 10:00 and proportional expected CS');
{
  laningBenchmarkService.resetAll();

  // Verify Role benchmarks
  assert.equal(ROLE_BENCHMARKS.carry.targetCS, 50);
  assert.equal(ROLE_BENCHMARKS.carry.targetDenies, 12);
  assert.equal(ROLE_BENCHMARKS.carry.targetNetWorth, 4000);

  assert.equal(ROLE_BENCHMARKS.mid.targetCS, 45);
  assert.equal(ROLE_BENCHMARKS.mid.targetDenies, 10);
  assert.equal(ROLE_BENCHMARKS.mid.targetNetWorth, 3800);

  assert.equal(ROLE_BENCHMARKS.offlane.targetCS, 35);
  assert.equal(ROLE_BENCHMARKS.offlane.targetDenies, 8);
  assert.equal(ROLE_BENCHMARKS.offlane.targetNetWorth, 3200);

  assert.equal(ROLE_BENCHMARKS.support.targetCS, 12);
  assert.equal(ROLE_BENCHMARKS.support.targetDenies, 4);
  assert.equal(ROLE_BENCHMARKS.support.targetNetWorth, 2200);

  // Set active role to Carry
  alertProfiles.select('carry');

  // At 5:00 (300s): Expected CS for Carry should be (50 / 10) * 5 = 25
  const carryPayload: GSIPayload = {
    player: {
      last_hits: 28,
      denies: 8,
      net_worth: 2100,
      gpm: 420,
    } as any,
  };

  laningBenchmarkService.updateFromGSI(carryPayload, 300);
  const snapshot = laningBenchmarkService.getSnapshot();

  assert.equal(snapshot.role, 'carry');
  assert.equal(snapshot.currentLastHits, 28);
  assert.equal(snapshot.expectedCS, 25);
  assert.equal(snapshot.csDiff, 3);
  assert.equal(snapshot.paceStatus, 'ahead'); // >= 3 is ahead

  console.log('  ✓ Carry role benchmark and 5m expected CS (25) correctly calculated');
}

// [Test 2] Decision 2: Compact Pace Indicator values (+/- CS diff, pace status)
console.log('[Test 2] Compact Pace Indicator status: ahead, on_pace, behind');
{
  laningBenchmarkService.resetAll();
  alertProfiles.select('mid'); // Mid target = 45, at 4:00 (240s) expected = 18

  // Case A: On Pace (19 CS vs 18 expected -> diff +1)
  const onPacePayload: GSIPayload = {
    player: {
      last_hits: 19,
      denies: 5,
      net_worth: 1600,
      gpm: 400,
    } as any,
  };
  laningBenchmarkService.updateFromGSI(onPacePayload, 240);
  let snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.expectedCS, 18);
  assert.equal(snap.csDiff, 1);
  assert.equal(snap.paceStatus, 'on_pace');

  // Case B: Behind Pace (13 CS vs 18 expected -> diff -5)
  const behindPayload: GSIPayload = {
    player: {
      last_hits: 13,
      denies: 2,
      net_worth: 1200,
      gpm: 300,
    } as any,
  };
  laningBenchmarkService.updateFromGSI(behindPayload, 240);
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.expectedCS, 18);
  assert.equal(snap.csDiff, -5);
  assert.equal(snap.paceStatus, 'behind');

  // Case C: Ahead (22 CS vs 18 expected -> diff +4)
  const aheadPayload: GSIPayload = {
    player: {
      last_hits: 22,
      denies: 6,
      net_worth: 1900,
      gpm: 475,
    } as any,
  };
  laningBenchmarkService.updateFromGSI(aheadPayload, 240);
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.expectedCS, 18);
  assert.equal(snap.csDiff, 4);
  assert.equal(snap.paceStatus, 'ahead');

  // Check active boundaries (0:00 - 15:00)
  laningBenchmarkService.updateFromGSI(aheadPayload, -10);
  assert.equal(laningBenchmarkService.getSnapshot().isActive, false, 'Pre-game should not be active');

  laningBenchmarkService.updateFromGSI(aheadPayload, 500);
  assert.equal(laningBenchmarkService.getSnapshot().isActive, true, '500s should be active');

  laningBenchmarkService.updateFromGSI(aheadPayload, 950);
  assert.equal(laningBenchmarkService.getSnapshot().isActive, false, 'After 15m should not be active');

  console.log('  ✓ Pace indicator states and active boundaries verified');
}

// [Test 3] Decision 3: Milestone voice announcements (5:00, 10:00) & Deduplication
console.log('[Test 3] Milestone voice announcements at 5:00 and 10:00 with deduplication');
{
  laningBenchmarkService.resetAll();
  spokenAudio.length = 0;
  alertProfiles.select('carry');

  const payload5m: GSIPayload = {
    player: {
      last_hits: 26,
      denies: 6,
      net_worth: 2050,
      gpm: 410,
    } as any,
  };

  // Clock 299s - no milestone yet
  laningBenchmarkService.updateFromGSI(payload5m, 299);
  assert.equal(spokenAudio.length, 0);

  // Clock 300s (5:00) - triggers 5m milestone
  laningBenchmarkService.updateFromGSI(payload5m, 300);
  assert.equal(spokenAudio.length, 1);
  assert.ok(spokenAudio[0].includes('5 minutes') && spokenAudio[0].includes('26 last hits'));

  // Clock 301s - deduplication: does not trigger again
  laningBenchmarkService.updateFromGSI(payload5m, 301);
  assert.equal(spokenAudio.length, 1);

  // Clock 600s (10:00) - triggers 10m milestone
  const payload10m: GSIPayload = {
    player: {
      last_hits: 54,
      denies: 14,
      net_worth: 4400,
      gpm: 440,
    } as any,
  };
  laningBenchmarkService.updateFromGSI(payload10m, 600);
  assert.equal(spokenAudio.length, 2);
  assert.ok(spokenAudio[1].includes('Ten minutes') && spokenAudio[1].includes('54 last hits') && spokenAudio[1].includes('complete'));

  // Clock 601s - deduplication: does not re-trigger 10m
  laningBenchmarkService.updateFromGSI(payload10m, 601);
  assert.equal(spokenAudio.length, 2);

  console.log('  ✓ 5:00 and 10:00 spoken voice milestones and deduplication verified');
}

// [Test 4] Decision 3: 10-Minute Laning Summary Report Card & Grading
console.log('[Test 4] 10-Minute Laning Summary Report Card generation, grading, and dismissal');
{
  laningBenchmarkService.resetAll();
  alertProfiles.select('carry'); // Target CS = 50

  // 1. Grade S: diff >= 8 (58 CS)
  laningBenchmarkService.updateFromGSI({
    player: { last_hits: 60, denies: 15, net_worth: 4800, gpm: 480 } as any,
  }, 600);
  let snap = laningBenchmarkService.getSnapshot();
  assert.ok(snap.report !== null);
  assert.equal(snap.report?.grade, 'S');
  assert.equal(snap.report?.finalLastHits, 60);

  // Reset and test Grade A: diff >= 0 (50 CS)
  laningBenchmarkService.resetAll();
  laningBenchmarkService.updateFromGSI({
    player: { last_hits: 51, denies: 11, net_worth: 4050, gpm: 405 } as any,
  }, 600);
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.report?.grade, 'A');

  // Reset and test Grade B: diff >= -6 (46 CS)
  laningBenchmarkService.resetAll();
  laningBenchmarkService.updateFromGSI({
    player: { last_hits: 46, denies: 8, net_worth: 3600, gpm: 360 } as any,
  }, 600);
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.report?.grade, 'B');

  // Reset and test Grade C: diff < -6 (35 CS)
  laningBenchmarkService.resetAll();
  laningBenchmarkService.updateFromGSI({
    player: { last_hits: 35, denies: 4, net_worth: 2800, gpm: 280 } as any,
  }, 600);
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.report?.grade, 'C');

  // Test Report Dismissal
  assert.equal(snap.reportDismissed, false);
  laningBenchmarkService.dismissReport();
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.reportDismissed, true);

  console.log('  ✓ Laning summary report grading (S, A, B, C) and dismissal verified');
}

// [Test 5] TimingEngine Integration & Match Reset
console.log('[Test 5] TimingEngine integration and match reset handling');
{
  laningBenchmarkService.resetAll();
  alertProfiles.select('support'); // Target CS = 12

  const gsiPayload: GSIPayload = {
    map: {
      matchid: 'match_123',
      clock_time: 300,
    } as any,
    player: {
      last_hits: 8,
      denies: 3,
      net_worth: 1500,
      gpm: 300,
    } as any,
  };

  timingEngine.handleGSIPayload(gsiPayload);
  let snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.currentLastHits, 8);
  assert.equal(snap.expectedCS, 6); // at 5m for support (12/2) = 6
  assert.equal(snap.paceStatus, 'on_pace'); // diff = +2

  // Match reset via TimingEngine
  timingEngine.resetAll();
  snap = laningBenchmarkService.getSnapshot();
  assert.equal(snap.currentLastHits, 0);
  assert.equal(snap.report, null);

  console.log('  ✓ TimingEngine integration and resetAll verified');
}

console.log('ALL LANING BENCHMARK & PACE TRACKER TESTS PASSED SUCCESSFULLY!');
