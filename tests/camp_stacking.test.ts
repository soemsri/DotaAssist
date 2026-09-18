import assert from 'node:assert/strict';
import { campStackService } from '../src/services/campStackService';
import { TimingEngine } from '../src/services/timingEngine';
import { alertProfiles } from '../src/services/alertProfiles';
import { audioService } from '../src/services/audioService';
import { TimingEventAlert } from '../src/types/meta';

console.log('--- RUNNING CAMP STACKING TIMINGS, YIELDING & PROFILE TESTS ---');

// [Test 1] Scope boundaries: 1:00 (60s) to 15:00 (900s)
console.log('[Test 1] Scope boundary validation (60s - 900s)');
{
  // Before 60s
  assert.equal(campStackService.calculateStackAlert(0), null, 'Clock 0s must not have stack alert');
  assert.equal(campStackService.calculateStackAlert(53), null, 'Clock 53s (<60s) must not have stack alert');

  // After 900s (15:00)
  assert.equal(campStackService.calculateStackAlert(901), null, 'Clock 901s (>900s) must not have stack alert');
  assert.equal(campStackService.calculateStackAlert(953), null, 'Clock 953s (>900s) must not have stack alert');

  // Inside range (e.g. minute 1: 60s to 120s, minute 14: 840s to 900s)
  const alertMin1 = campStackService.calculateStackAlert(93); // 1:33
  assert.ok(alertMin1, 'Minute 1 at 1:33 must produce a stack alert');
  assert.equal(alertMin1.targetSeconds, 113); // 1:53

  const alertMin14 = campStackService.calculateStackAlert(873); // 14:33
  assert.ok(alertMin14, 'Minute 14 at 14:33 must produce a stack alert');
  assert.equal(alertMin14.targetSeconds, 893); // 14:53

  console.log('  ✓ Scope boundaries 60s - 900s verified');
}

// [Test 2] Window appearance (:33 to :55) and countdown to :53
console.log('[Test 2] Window appearance (:33 - :55) and auto-dismissal after :55');
{
  // 1:32 (92s) -> Not yet in 20s lead window (target 1:53)
  assert.equal(campStackService.calculateStackAlert(92), null, '1:32 should not show stack card');

  // 1:33 (93s) -> Exactly 20s lead window
  const alert33 = campStackService.calculateStackAlert(93);
  assert.ok(alert33, '1:33 must show stack card');
  assert.equal(alert33.secondsRemaining, 20);
  assert.equal(alert33.urgent, false);

  // 1:43 (103s) -> Exactly 10s remaining (urgent)
  const alert43 = campStackService.calculateStackAlert(103);
  assert.ok(alert43);
  assert.equal(alert43.secondsRemaining, 10);
  assert.equal(alert43.urgent, true);

  // 1:53 (113s) -> Target pull timing
  const alert53 = campStackService.calculateStackAlert(113);
  assert.ok(alert53);
  assert.equal(alert53.secondsRemaining, 0);
  assert.equal(alert53.urgent, true);

  // 1:55 (115s) -> Window end (pull window still open)
  const alert55 = campStackService.calculateStackAlert(115);
  assert.ok(alert55);
  assert.equal(alert55.secondsRemaining, 0);

  // 1:56 (116s) -> Dismissed
  assert.equal(campStackService.calculateStackAlert(116), null, '1:56 must auto-dismiss stack card');

  console.log('  ✓ Card window :33 - :55 and auto-dismissal verified');
}

// [Test 3] Voice prompt at :43 and yielding to major objectives
console.log('[Test 3] Voice prompt trigger at :43 and yielding condition');
{
  // Without competing major objectives
  const noCompAlerts: TimingEventAlert[] = [];
  assert.equal(
    campStackService.shouldPlayVoice(103, 102, noCompAlerts),
    true,
    'At 1:43 with no major alert, shouldPlayVoice must be true',
  );

  // When clock hasn't crossed :43
  assert.equal(
    campStackService.shouldPlayVoice(102, 101, noCompAlerts),
    false,
    'Before :43 shouldPlayVoice must be false',
  );

  // When clock is past the sampling window (:46)
  assert.equal(
    campStackService.shouldPlayVoice(106, 102, noCompAlerts),
    false,
    'Past sampling window shouldPlayVoice must be false',
  );

  // With competing major objective alert (e.g. Bounty rune 17s away, enabled in profile)
  const competingAlerts: TimingEventAlert[] = [
    {
      id: 'rune_bounty_240',
      title: 'Bounty Runes',
      subtitle: 'Spawns in river and jungle',
      targetSeconds: 240,
      secondsRemaining: 17,
      type: 'rune_bounty',
      urgent: true,
    },
  ];
  alertProfiles.select('support');
  assert.equal(
    campStackService.shouldPlayVoice(223, 222, competingAlerts),
    false,
    'When major objective is pending (secondsRemaining <= 25), stack voice must yield',
  );

  // If competing alert is distant (> 25s away)
  const distantAlerts: TimingEventAlert[] = [
    {
      id: 'tormentor_1200',
      title: 'Tormentor',
      subtitle: 'Spawns at 20:00',
      targetSeconds: 1200,
      secondsRemaining: 977,
      type: 'tormentor',
      urgent: false,
    },
  ];
  assert.equal(
    campStackService.shouldPlayVoice(223, 222, distantAlerts),
    true,
    'When competing alert is distant (>25s), stack voice does not yield',
  );

  console.log('  ✓ Voice trigger at :43 and yielding logic verified');
}

// [Test 4] Default Profile Filtering (Support & Offlane enabled, Carry & Mid disabled)
console.log('[Test 4] Profile defaults and filtering');
{
  alertProfiles.reset('support');
  alertProfiles.reset('offlane');
  alertProfiles.reset('carry');
  alertProfiles.reset('mid');

  alertProfiles.select('support');
  assert.equal(alertProfiles.enabled('camp_stack'), true, 'Support profile must have camp_stack enabled by default');

  alertProfiles.select('offlane');
  assert.equal(alertProfiles.enabled('camp_stack'), true, 'Offlane profile must have camp_stack enabled by default');

  alertProfiles.select('carry');
  assert.equal(alertProfiles.enabled('camp_stack'), false, 'Carry profile must have camp_stack disabled by default');

  alertProfiles.select('mid');
  assert.equal(alertProfiles.enabled('camp_stack'), false, 'Mid profile must have camp_stack disabled by default');

  // Integration with TimingEngine
  const engine = new TimingEngine();
  alertProfiles.select('support');
  const supportAlerts = engine.calculateAlerts(95, false); // 1:35
  assert.ok(
    supportAlerts.some((a) => a.type === 'camp_stack'),
    'TimingEngine must return camp_stack alert for Support role',
  );

  alertProfiles.select('carry');
  const carryAlerts = engine.calculateAlerts(95, false);
  assert.equal(
    carryAlerts.some((a) => a.type === 'camp_stack'),
    false,
    'TimingEngine must filter out camp_stack alert for Carry role',
  );

  console.log('  ✓ Profile defaults and filtering verified');
}

// [Test 5] TimingEngine integration, yielding to runes, and voice deduplication
console.log('[Test 5] TimingEngine voice playback, yielding and deduplication');
{
  let stackCalls = 0;
  const originalPlayCampStackAlert = audioService.playCampStackAlert;
  audioService.playCampStackAlert = () => {
    stackCalls++;
  };

  try {
    alertProfiles.select('support');
    const engine = new TimingEngine();

    // At clock 102s-103s (1:42 - 1:43): Water rune is at 2:00 (120s, diff=17s)
    // Camp stack voice must yield to water rune!
    engine.calculateAlerts(102, false);
    engine.calculateAlerts(103, false);
    assert.equal(stackCalls, 0, 'Camp stack voice must yield to 2:00 water rune at 1:43');

    // At minute 2: 162s (2:42) -> 163s (2:43). Next minute is 3:00 (180s, Lotus pool only, no rune speech)
    engine.calculateAlerts(162, false);
    assert.equal(stackCalls, 0, 'No stack speech before :43');

    // Cross into 163s (2:43)
    engine.calculateAlerts(163, false);
    assert.equal(stackCalls, 1, 'Camp stack speech fires at 2:43 when no major objective voice competes');

    // Re-evaluating at 164s (same minute) must not re-trigger voice
    engine.calculateAlerts(164, false);
    assert.equal(stackCalls, 1, 'Voice must not repeat in same minute');

    // Resetting engine clears played alert state
    engine.resetAll();
    engine.calculateAlerts(162, false);
    engine.calculateAlerts(163, false);
    assert.equal(stackCalls, 2, 'After resetAll, alert can fire again');
  } finally {
    audioService.playCampStackAlert = originalPlayCampStackAlert;
    alertProfiles.reset('support');
  }

  console.log('  ✓ TimingEngine voice playback, yielding and deduplication verified');
}

console.log('--- ALL CAMP STACKING TESTS PASSED! ---');
