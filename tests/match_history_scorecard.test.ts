import assert from 'node:assert';
import { matchTrackerService } from '../src/services/matchTrackerService';
import { MatchRecord } from '../src/types/matchHistory';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING MATCH HISTORY & FUNDAMENTALS SCORECARD TESTS ---');

// Mock localStorage for test environment
const mockStorage: Record<string, string> = {};
(global as any).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  },
};

// [Test 1] CS Pace Pillar Calculation & Grading
console.log('[Test 1] CS Pace Pillar Calculation & Grading');
{
  matchTrackerService.resetAll();
  matchTrackerService.setTelemetryForTesting({
    csAt10: 55,
    deniesAt10: 14,
    role: 'carry', // Benchmark is 50 CS
  });

  const scorecard = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecard.pillars.csPace.actualCs, 55);
  assert.strictEqual(scorecard.pillars.csPace.expectedCs, 50);
  assert.strictEqual(scorecard.pillars.csPace.grade, 'S');
  assert.strictEqual(scorecard.pillars.csPace.status, 'ahead');
  console.log('  ✓ CS Pace ahead of benchmark graded S verified');

  // Below benchmark
  matchTrackerService.setTelemetryForTesting({
    csAt10: 25,
    deniesAt10: 4,
    role: 'carry',
  });
  const scorecardBehind = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecardBehind.pillars.csPace.grade, 'D');
  assert.strictEqual(scorecardBehind.pillars.csPace.status, 'behind');
  console.log('  ✓ CS Pace behind benchmark graded D verified');
}

// [Test 2] Pre-Rune Shove Pillar & Window Tracking
console.log('[Test 2] Pre-Rune Shove Pillar & Window Tracking');
{
  matchTrackerService.resetAll();
  matchTrackerService.setTelemetryForTesting({
    successfulShoves: 3,
    totalRuneWindows: 4,
  });

  const scorecard = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecard.pillars.preRuneShove.successfulShoves, 3);
  assert.strictEqual(scorecard.pillars.preRuneShove.totalRunes, 4);
  assert.strictEqual(scorecard.pillars.preRuneShove.shovePercentage, 75);
  assert.strictEqual(scorecard.pillars.preRuneShove.grade, 'B');
  console.log('  ✓ Pre-Rune shove ratio 75% graded B verified');
}

// [Test 3] Aegis Discipline Pillar & Objective Conversion
console.log('[Test 3] Aegis Discipline Pillar & Objective Conversion');
{
  matchTrackerService.resetAll();
  // Successful Aegis with 2 towers
  matchTrackerService.setTelemetryForTesting({
    aegisCount: 1,
    towersTakenWithAegis: 2,
    wastedAegisCount: 0,
  });
  const scorecardSuccess = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecardSuccess.pillars.aegisDiscipline.score, 100);
  assert.strictEqual(scorecardSuccess.pillars.aegisDiscipline.grade, 'S');
  console.log('  ✓ Aegis with tower conversion scored 100 (S) verified');

  // Wasted Aegis
  matchTrackerService.setTelemetryForTesting({
    aegisCount: 1,
    towersTakenWithAegis: 0,
    wastedAegisCount: 1,
  });
  const scorecardWasted = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecardWasted.pillars.aegisDiscipline.score, 70);
  assert.strictEqual(scorecardWasted.pillars.aegisDiscipline.grade, 'B');
  console.log('  ✓ Wasted Aegis penalized appropriately verified');
}

// [Test 4] Buyback Discipline Pillar (Post 30:00)
console.log('[Test 4] Buyback Discipline Pillar (Post 30:00)');
{
  matchTrackerService.resetAll();
  // Clean late game (no deaths without buyback)
  matchTrackerService.setTelemetryForTesting({
    deathsPost30: 1,
    deathsWithoutBuybackPost30: 0,
    matchDuration: 2400,
  });
  const scorecardClean = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecardClean.pillars.buybackDiscipline.score, 100);
  assert.strictEqual(scorecardClean.pillars.buybackDiscipline.grade, 'S');
  console.log('  ✓ Clean buyback discipline scored 100 (S) verified');

  // Fatal blunder: death without buyback
  matchTrackerService.setTelemetryForTesting({
    deathsPost30: 2,
    deathsWithoutBuybackPost30: 1,
  });
  const scorecardBlunder = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecardBlunder.pillars.buybackDiscipline.score, 60);
  assert.strictEqual(scorecardBlunder.pillars.buybackDiscipline.grade, 'C');
  assert.ok(
    scorecardBlunder.topBlunders.some((b) => b.includes('Buyback')),
    'Blunder list must mention Buyback'
  );
  console.log('  ✓ Death without buyback flagged in top blunders verified');
}

// [Test 5] Spoken Thai Summary Generation (~15s natural speech)
console.log('[Test 5] Spoken Thai Summary Generation (~15s natural speech)');
{
  matchTrackerService.resetAll();
  matchTrackerService.setTelemetryForTesting({
    csAt10: 55,
    deniesAt10: 15,
    successfulShoves: 4,
    totalRuneWindows: 4,
    aegisCount: 1,
    towersTakenWithAegis: 1,
    deathsPost30: 0,
    role: 'carry',
  });

  const scorecard = matchTrackerService.calculateScorecard();
  assert.strictEqual(scorecard.overallGrade, 'S');
  assert.ok(scorecard.spokenSummary.includes('จบแมตช์แล้วครับ'));
  assert.ok(scorecard.spokenSummary.includes('เกรด เอส'));
  assert.ok(scorecard.spokenSummary.includes('คะแนน'));
  console.log('  ✓ Natural Thai TTS spoken summary: "' + scorecard.spokenSummary + '"');
}

// [Test 6] GSI POST_GAME Event & Idempotent Match Finalization
console.log('[Test 6] GSI POST_GAME Event & Idempotent Match Finalization');
{
  matchTrackerService.resetAll();

  // Active game payload
  const activePayload: GSIPayload = {
    map: {
      clock_time: 1950,
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      win_team: 'none',
    },
    hero: {
      id: 1,
      name: 'npc_dota_hero_antimage',
      level: 18,
      respawn_seconds: 0,
      buyback_cost: 1200,
      buyback_cooldown: 0,
    },
    player: {
      kills: 8,
      deaths: 1,
      assists: 4,
      last_hits: 240,
      denies: 12,
      net_worth: 18500,
      gpm: 680,
      xpm: 750,
      gold: 2400,
      team_name: 'radiant',
    },
  };

  matchTrackerService.processGSI(activePayload);
  assert.strictEqual(matchTrackerService.getActiveDebrief(), null);

  // Match completion payload
  const postGamePayload: GSIPayload = {
    ...activePayload,
    map: {
      clock_time: 2150,
      game_state: 'DOTA_GAMERULES_STATE_POST_GAME',
      win_team: 'radiant',
    },
  };

  matchTrackerService.processGSI(postGamePayload);
  const debrief = matchTrackerService.getActiveDebrief();
  assert.ok(debrief !== null, 'Debrief modal must be triggered on POST_GAME');
  assert.strictEqual(debrief.won, true, 'Win detection must match player team');
  assert.strictEqual(debrief.heroDisplayName, 'Antimage');
  assert.ok(debrief.scorecard !== undefined, 'Scorecard must be attached');
  console.log('  ✓ POST_GAME triggers debrief modal and victory resolution verified');

  // Subsequent POST_GAME payloads must not re-trigger or duplicate
  const debriefId = debrief.id;
  matchTrackerService.processGSI(postGamePayload);
  assert.strictEqual(matchTrackerService.getActiveDebrief()?.id, debriefId);
  console.log('  ✓ Match finalization idempotency verified');
}

// [Test 7] Persistence Operations (Save, Query, Delete, Clear)
console.log('[Test 7] Persistence Operations (Save, Query, Delete, Clear)');
(async () => {
  const testRecord: MatchRecord = {
    id: 'test_match_999',
    timestamp: Date.now(),
    heroId: 8,
    heroName: 'npc_dota_hero_juggernaut',
    heroDisplayName: 'Juggernaut',
    role: 'carry',
    matchDuration: 2200,
    won: true,
    kills: 14,
    deaths: 3,
    assists: 9,
    csAt10: 58,
    deniesAt10: 16,
    csBenchmarkAt10: 50,
    netWorth: 22000,
    gpm: 710,
    xpm: 820,
    overallScore: 94,
    overallGrade: 'S',
    dataJson: JSON.stringify({ overallScore: 94, overallGrade: 'S' }),
  };

  await matchTrackerService.saveMatchRecord(testRecord);
  const history = await matchTrackerService.getMatchHistory();
  assert.ok(history.length >= 1);
  assert.strictEqual(history[0].id, 'test_match_999');
  assert.strictEqual(history[0].overallGrade, 'S');
  console.log('  ✓ Save and query match records verified');

  const details = await matchTrackerService.getMatchDetails('test_match_999');
  assert.ok(details !== null);
  assert.strictEqual(details.heroDisplayName, 'Juggernaut');
  console.log('  ✓ Query match details by ID verified');

  await matchTrackerService.deleteMatchRecord('test_match_999');
  const detailsAfterDelete = await matchTrackerService.getMatchDetails('test_match_999');
  assert.strictEqual(detailsAfterDelete, null);
  console.log('  ✓ Delete single match record verified');

  await matchTrackerService.saveMatchRecord(testRecord);
  await matchTrackerService.clearAllMatches();
  const clearedHistory = await matchTrackerService.getMatchHistory();
  assert.strictEqual(clearedHistory.length, 0);
  console.log('  ✓ Clear all matches verified');

  console.log('--- ALL MATCH HISTORY & FUNDAMENTALS SCORECARD TESTS PASSED! ---');
})();
