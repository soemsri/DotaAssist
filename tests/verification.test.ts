import { timingEngine } from '../src/services/timingEngine';
import { audioService } from '../src/services/audioService';
import { getEnemyPickClasses } from '../src/services/draftService';

console.log('--- RUNNING TIMING ENGINE & AUDIO VERIFICATION ---');

// Test 1: Float clock time around Wisdom Shrine (7:00 = 420s)
// The GSI clock is normalized to whole seconds, so 390.5s -> 30s remaining.
timingEngine.resetAlerts();
let alerts = timingEngine.calculateAlerts(390.5, false);
console.log(`[Test 1] 390.5s (normalized to 30s before Wisdom): Alerts count = ${alerts.length}`);
const wisdomAlert = alerts.find(a => a.type === 'rune_wisdom');
if (!wisdomAlert) {
  throw new Error('Test 1 Failed: Wisdom Shrine alert not found');
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

// Test 3: Bounty Rune (4:00 = 240s) at 227.4s (12.6s remaining <= 15s)
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(227.4, false);
const bountyAlert = alerts.find(a => a.type === 'rune_bounty');
if (!bountyAlert) {
  throw new Error('Test 3 Failed: Bounty rune alert not found');
}
console.log(`[Test 3] ✓ Bounty alert found: ${bountyAlert.title}, ${bountyAlert.secondsRemaining}s remaining`);

// Recurring objectives remain visible as "now" at the exact spawn second.
alerts = timingEngine.calculateAlerts(240, false);
const bountyNow = alerts.find(a => a.type === 'rune_bounty');
if (!bountyNow || bountyNow.targetSeconds !== 240 || bountyNow.secondsRemaining !== 0) {
  throw new Error('Test 3 Failed: exact Bounty spawn second was skipped');
}

const nightfallNow = timingEngine.calculateAlerts(300, false).find(a => a.type === 'day_night');
if (!nightfallNow || nightfallNow.title !== 'Nightfall Coming' || nightfallNow.secondsRemaining !== 0) {
  throw new Error('Test 3 Failed: exact day/night transition was mislabeled or skipped');
}

// Test 3b: Bounty Rune cutoff at 30:00 (1800s)
// 1) Active before 30:00 (e.g. 28:00 = 1680s at 1665s)
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(1665, false);
const bounty28Alert = alerts.find(a => a.type === 'rune_bounty');
if (!bounty28Alert || bounty28Alert.targetSeconds !== 1680) {
  throw new Error('Test 3b Failed: Bounty rune alert at 28:00 should be active');
}

// 2) At 30:00 (1800s) exactly -> no bounty alert
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(1800, false);
if (alerts.some(a => a.type === 'rune_bounty')) {
  throw new Error('Test 3b Failed: Bounty rune alert should be disabled at 30:00');
}

// 3) At 31:45 (1905s) which would be 15s before 32:00 -> no bounty alert
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(1905, false);
if (alerts.some(a => a.type === 'rune_bounty')) {
  throw new Error('Test 3b Failed: Bounty rune alert should not trigger at 31:45 for 32:00 spawn');
}

// 4) At 32:00 (1920s) exact spawn -> no bounty alert
timingEngine.resetAlerts();
alerts = timingEngine.calculateAlerts(1920, false);
if (alerts.some(a => a.type === 'rune_bounty')) {
  throw new Error('Test 3b Failed: Bounty rune alert should not trigger at 32:00');
}
console.log('[Test 3b] ✓ Bounty rune alerts disabled from minute 30 onwards');

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

// Test 7: Tormentor kill and ten-minute respawn tracking
timingEngine.resetAll();
timingEngine.recordTormentorDeath(1_300);
alerts = timingEngine.calculateAlerts(1_850, false);
const tormentorRespawn = alerts.find(a => a.id === 'tormentor_respawn_1900');
if (!tormentorRespawn || tormentorRespawn.secondsRemaining !== 50) {
  throw new Error('Test 7 Failed: Tormentor respawn timer mismatch');
}
console.log(`[Test 7] ✓ Tormentor respawn tracking: ${tormentorRespawn.secondsRemaining}s remaining`);

// Test 8: Roshan GSI state transitions automatically start and reset tracking
timingEngine.resetAll();
timingEngine.handleGSIPayload({
  map: {
    name: 'start', matchid: 'gsi-roshan', game_time: 600, clock_time: 600,
    daytime: true, nightstalker_night: false,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false,
    win_team: 'none', customgamename: '', roshan_state: 'alive',
  },
});
timingEngine.handleGSIPayload({
  map: {
    name: 'start', matchid: 'gsi-roshan', game_time: 601, clock_time: 601,
    daytime: true, nightstalker_night: false,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false,
    win_team: 'none', customgamename: '', roshan_state: 'respawn_base',
  },
});
if (!timingEngine.getRoshanState().isDead || timingEngine.getRoshanState().deathClockTime !== 601) {
  throw new Error('Test 8 Failed: Roshan death was not detected from GSI');
}
timingEngine.handleGSIPayload({
  map: {
    name: 'start', matchid: 'gsi-roshan', game_time: 1_200, clock_time: 1_200,
    daytime: true, nightstalker_night: false,
    game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', paused: false,
    win_team: 'none', customgamename: '', roshan_state: 'alive',
  },
});
if (timingEngine.getRoshanState().isDead) {
  throw new Error('Test 8 Failed: Roshan respawn was not detected from GSI');
}
console.log('[Test 8] ✓ Roshan GSI state synchronization passed');

// Test 9: Enemy draft side follows the local player team
const draft = {
  team2: { pick0_class: 'npc_dota_hero_axe' },
  team3: { pick0_class: 'npc_dota_hero_bane' },
};
const radiantEnemies = getEnemyPickClasses(draft, 'radiant');
const direEnemies = getEnemyPickClasses(draft, 'dire');
if (radiantEnemies[0] !== 'npc_dota_hero_bane' || direEnemies[0] !== 'npc_dota_hero_axe') {
  throw new Error('Test 9 Failed: enemy draft team resolution mismatch');
}
if (getEnemyPickClasses(draft).length !== 0) {
  throw new Error('Test 9 Failed: draft side should not be guessed without a player team');
}
console.log('[Test 9] ✓ Draft enemy team resolution passed');

// Test 10: Thai TTS Phrases & Language Switching
audioService.setVoiceLanguage('th-TH');
audioService.setItemAdviceEnabled(true);
const thaiSettings = audioService.getSettings();
if (thaiSettings.voiceLanguage !== 'th-TH' || !thaiSettings.itemAdviceEnabled) {
  throw new Error('Test 10 Failed: Thai language and item advice configuration failed');
}

import { PHRASES } from '../src/services/audioService';
if (!PHRASES['th-TH'].wisdomShrine.includes('วิสดอม') || !PHRASES['th-TH'].bountyRune.includes('รูนทอง')) {
  throw new Error('Test 10 Failed: Thai phrases dictionary corrupted');
}
console.log('[Test 10] ✓ Thai TTS dictionary and language settings passed');

// Test 11: Item Advice Engine & Timing
timingEngine.resetAll();
let itemAdviceSpoken = false;
const mockItems = [
  { name: 'item_tango', displayName: 'Tango', cost: 90, tier: 'early' as const, reason: 'early', popularityCount: 100, dataSource: 'OpenDota itemPopularity' as const },
  { name: 'item_quelling_blade', displayName: 'Quelling Blade', cost: 100, tier: 'early' as const, reason: 'early', popularityCount: 90, dataSource: 'OpenDota itemPopularity' as const },
  { name: 'item_bfury', displayName: 'Battle Fury', cost: 4100, tier: 'core' as const, reason: 'core', popularityCount: 200, dataSource: 'OpenDota itemPopularity' as const },
];

timingEngine.checkItemAdvice(45, 'npc_dota_hero_antimage', mockItems);
console.log('[Test 11] ✓ Early game item advice triggered successfully');

// Test 11b: Mid game core item advice (12:00 = 720s)
timingEngine.checkItemAdvice(725, 'npc_dota_hero_antimage', mockItems);
console.log('[Test 11] ✓ Mid game core item advice triggered successfully');

// Test 12: Minute 6:00 Gank Window Alert
timingEngine.resetAll();
alerts = timingEngine.calculateAlerts(350, false); // 5:50
const gankAlert = alerts.find((a) => a.id === 'gank_window_min6');
if (!gankAlert || gankAlert.type !== 'danger' || !gankAlert.urgent || gankAlert.secondsRemaining !== 10) {
  throw new Error('Test 12 Failed: Minute 6:00 gank alert missing or incorrect');
}
console.log(`[Test 12] ✓ Minute 6:00 gank alert found: ${gankAlert.title}, ${gankAlert.secondsRemaining}s remaining (type: ${gankAlert.type})`);

// Test 13: Minimap Scanner & Gank Alert Settings and Phrases
audioService.setMinimapScannerEnabled(true);
audioService.setGankAlertsEnabled(true);
audioService.setMinimapPosition('right');
const scannerSettings = audioService.getSettings();
if (!scannerSettings.minimapScannerEnabled || !scannerSettings.gankAlertsEnabled || scannerSettings.minimapPosition !== 'right') {
  throw new Error('Test 13 Failed: Minimap scanner settings mismatch');
}
if (!PHRASES['th-TH'].allEnemiesMissing.includes('ศัตรูหาย') || !PHRASES['th-TH'].gankWindowMinute6.includes('นาทีที่ 6')) {
  throw new Error('Test 13 Failed: Thai missing/gank phrases corrupted');
}
if (!PHRASES['en-US'].allEnemiesMissing.includes('missing') || !PHRASES['en-US'].gankWindowMinute6.includes('Minute 6')) {
  throw new Error('Test 13 Failed: English missing/gank phrases corrupted');
}
console.log('[Test 13] ✓ Minimap scanner settings and phrases verified');

// Test 14: Minimap Scanner Subscription & Service
import { minimapScanner } from '../src/services/minimapScanner';
import { gsiService } from '../src/services/gsiService';

let receivedScanResult = false;
const unsub = minimapScanner.subscribe((res) => {
  if (res) receivedScanResult = true;
});
unsub();

// Verify in-game payload lifecycle with minimapScanner
gsiService.handlePayload({
  map: { game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', clock_time: 120 } as any,
  player: { team_name: 'radiant' } as any,
} as any);

minimapScanner.start();
minimapScanner.stop();
console.log('[Test 14] ✓ Minimap scanner service subscription and lifecycle passed');

// Test 15: Tactical Coach Danger Detection (Pillar 1)
import { tacticalCoach } from '../src/services/tacticalCoach';
tacticalCoach.reset();

// 15a: Normal safe condition
let coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', health_percent: 90, alive: true } as any,
    map: { clock_time: 300, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  { scanned: true, all_missing: false, enemies_visible_count: 3 } as any
);
if (coachResult.dangerLevel !== 'safe') {
  throw new Error('Test 15a Failed: Expected safe danger level');
}

// 15b: Caution condition (all missing but full health)
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', health_percent: 85, alive: true } as any,
    map: { clock_time: 305, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  { scanned: true, all_missing: true, enemies_visible_count: 0 } as any
);
if (coachResult.dangerLevel !== 'caution') {
  throw new Error('Test 15b Failed: Expected caution danger level');
}

// 15c: Danger condition (all missing + low health < 60%)
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', health_percent: 45, alive: true } as any,
    map: { clock_time: 310, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  { scanned: true, all_missing: true, enemies_visible_count: 0 } as any
);
if (coachResult.dangerLevel !== 'danger' || coachResult.dangerReasons.length === 0) {
  throw new Error('Test 15c Failed: Expected danger level with danger reasons');
}
console.log('[Test 15] ✓ Pillar 1: Danger detection (Safe, Caution, Danger) passed');

// Test 16: Tactical Coach Power Spike & Combo Guide (Pillar 2)
tacticalCoach.reset();
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_axe', level: 6, alive: true } as any,
    map: { clock_time: 480, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (!coachResult.powerSpike || coachResult.powerSpike.level !== 6 || !coachResult.powerSpike.isUnlocked) {
  throw new Error('Test 16 Failed: Level 6 power spike not unlocked');
}
if (!coachResult.powerSpike.comboTip.includes('Culling Blade') && !coachResult.powerSpike.comboTip.includes('บลิงก์')) {
  throw new Error('Test 16 Failed: Hero combo tip missing for Axe');
}
console.log('[Test 16] ✓ Pillar 2: Power Spike & Combo Guide passed');

// Test 17: Tactical Coach Neutral Item Slot Vacancy Detector (Pillar 4a)
tacticalCoach.reset();
// 17a: At 7:00 (420s), Tier 1 is unlocked. If slot is empty, alert should be active.
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', level: 7, alive: true } as any,
    map: { clock_time: 430, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: { neutral0: { name: 'empty' } } as any,
  } as any,
  null
);
if (!coachResult.neutralSlot.alertActive || coachResult.neutralSlot.tierUnlocked !== 1 || !coachResult.neutralSlot.isSlotEmpty) {
  throw new Error('Test 17a Failed: Neutral slot empty alert not triggered at Tier 1');
}

// 17b: When neutral item is equipped, alert should clear.
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', level: 7, alive: true } as any,
    map: { clock_time: 435, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: { neutral0: { name: 'item_broom_handle' } } as any,
  } as any,
  null
);
if (coachResult.neutralSlot.alertActive || coachResult.neutralSlot.isSlotEmpty) {
  throw new Error('Test 17b Failed: Neutral slot alert should clear when item equipped');
}
console.log('[Test 17] ✓ Pillar 4a: Neutral Item slot vacancy detector passed');

// Test 18: Tactical Coach Buyback Economy Monitor (Pillar 4b)
tacticalCoach.reset();
// 18a: Early game (< 20m), state should be 'early_game'
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', buyback_cost: 800, buyback_cooldown: 0, alive: true } as any,
    player: { gold: 300 } as any,
    map: { clock_time: 600, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (coachResult.buyback.state !== 'early_game') {
  throw new Error('Test 18a Failed: Expected early_game buyback state before 20m');
}

// 18b: Late game (25m = 1500s), gold 400 < cost 1000 -> deficit of 600
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', buyback_cost: 1000, buyback_cooldown: 0, alive: true } as any,
    player: { gold: 400 } as any,
    map: { clock_time: 1500, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (coachResult.buyback.state !== 'deficit' || coachResult.buyback.deficit !== 600) {
  throw new Error('Test 18b Failed: Expected deficit buyback state with 600g shortfall');
}

// 18c: When player has enough gold
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', buyback_cost: 1000, buyback_cooldown: 0, alive: true } as any,
    player: { gold: 1200 } as any,
    map: { clock_time: 1510, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (coachResult.buyback.state !== 'ready' || coachResult.buyback.deficit !== 0) {
  throw new Error('Test 18c Failed: Expected ready buyback state');
}
console.log('[Test 18] ✓ Pillar 4b: Buyback economy & deficit monitor passed');

// Test 19: Tactical Coach Adaptive Counter-Item Advisor (Pillar 3)
tacticalCoach.reset();
const mockDraft = {
  team2: { pick0_class: 'npc_dota_hero_antimage' }, // Allied Radiant
  team3: {
    pick0_class: 'npc_dota_hero_riki',          // Invis
    pick1_class: 'npc_dota_hero_lion',          // CC
    pick2_class: 'npc_dota_hero_bristleback',   // Regen / Tank
    pick3_class: 'npc_dota_hero_phantom_assassin', // Evasion
  },
};
coachResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    player: { team_name: 'radiant' } as any,
    draft: mockDraft as any,
    map: { clock_time: 100, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: { slot0: { name: 'item_black_king_bar' } } as any,
  } as any,
  null
);
if (coachResult.threats.length < 3) {
  throw new Error(`Test 19 Failed: Expected multiple threat categories, got ${coachResult.threats.length}`);
}
const invisThreat = coachResult.threats.find(t => t.threatType === 'invis');
if (!invisThreat || !invisThreat.recommendedCounters.some(i => i.displayName.includes('Dust'))) {
  throw new Error('Test 19 Failed: Invis threat should recommend Dust');
}
const ccThreat = coachResult.threats.find(t => t.threatType === 'cc');
if (!ccThreat) {
  throw new Error('Test 19 Failed: CC threat missing');
}
const bkbItem = ccThreat.recommendedCounters.find(i => i.name === 'item_black_king_bar');
if (!bkbItem || !bkbItem.isEquipped) {
  throw new Error('Test 19 Failed: BKB should be marked as equipped since player has it in slot0');
}
console.log('[Test 19] ✓ Pillar 3: Adaptive Counter-Items Advisor passed');

// Test 20: Tactical Coach Macro Strategy Phase Transitions (Pillar 5)
coachResult = tacticalCoach.process(
  { map: { clock_time: 300, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any } as any,
  null
);
if (coachResult.macroPhase.phase !== 'laning') {
  throw new Error('Test 20a Failed: Expected laning phase at 5:00');
}

coachResult = tacticalCoach.process(
  { map: { clock_time: 900, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any } as any,
  null
);
if (coachResult.macroPhase.phase !== 'mid') {
  throw new Error('Test 20b Failed: Expected mid phase at 15:00');
}

coachResult = tacticalCoach.process(
  { map: { clock_time: 1500, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any } as any,
  null
);
if (coachResult.macroPhase.phase !== 'roshan') {
  throw new Error('Test 20c Failed: Expected roshan phase at 25:00');
}

coachResult = tacticalCoach.process(
  { map: { clock_time: 2100, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any } as any,
  null
);
if (coachResult.macroPhase.phase !== 'late') {
  throw new Error('Test 20d Failed: Expected late phase at 35:00');
}
console.log('[Test 20] ✓ Pillar 5: Macro Strategy Phase transitions passed');

// Test 21: Bilingual Coaching Audio Phrases completeness
const thaiPhrases = PHRASES['th-TH'];
const engPhrases = PHRASES['en-US'];

if (
  !thaiPhrases.levelSpike(6, 'Axe', 'ทริค').includes('เลเวล 6') ||
  !thaiPhrases.neutralItemMissing(1).includes('ปลดล็อกไอเทมป่า') ||
  !thaiPhrases.buybackDeficit(500).includes('บายแบ็ค') ||
  !thaiPhrases.overextendDanger.includes('อันตราย') ||
  !thaiPhrases.counterItemAdvice('ล่องหน', 'Dust').includes('แก้ทาง') ||
  !thaiPhrases.noTpScroll.includes('ไม่มีใบวาป')
) {
  throw new Error('Test 21 Failed: Thai coaching phrases corrupted or missing');
}

if (
  !engPhrases.levelSpike(6, 'Axe', 'tip').includes('Level 6') ||
  !engPhrases.neutralItemMissing(1).includes('Tier 1') ||
  !engPhrases.buybackDeficit(500).includes('buyback') ||
  !engPhrases.overextendDanger.includes('Danger') ||
  !engPhrases.counterItemAdvice('Invis', 'Dust').includes('Countering') ||
  !engPhrases.noTpScroll.includes('Town Portal Scroll')
) {
  throw new Error('Test 21 Failed: English coaching phrases corrupted or missing');
}
console.log('[Test 21] ✓ Bilingual coaching audio phrases verified');

// Test 22: Tactical Coach Town Portal Scroll Detection (Pillar 4c)
tacticalCoach.reset();

// 22a: Player has TP scroll with 1 charge -> alert inactive
let tpResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    map: { clock_time: 120, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: { teleport0: { name: 'item_tpscroll', charges: 1 } } as any,
  } as any,
  null
);
if (!tpResult.tpScroll.hasTp || tpResult.tpScroll.charges !== 1 || tpResult.tpScroll.alertActive) {
  throw new Error('Test 22a Failed: Expected hasTp true, charges 1, alertActive false');
}

// 22b: Player used TP, teleport0 empty, hero alive, clock >= 60s -> alertActive true
tpResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    map: { clock_time: 180, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: { teleport0: { name: 'empty' } } as any,
  } as any,
  null
);
if (tpResult.tpScroll.hasTp || tpResult.tpScroll.charges !== 0 || !tpResult.tpScroll.alertActive) {
  throw new Error('Test 22b Failed: Expected alertActive true when no TP scroll and alive');
}

// 22c: Hero is dead -> alert suppressed because hero respawns with free TP
tpResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: false } as any,
    map: { clock_time: 200, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: { teleport0: { name: 'empty' } } as any,
  } as any,
  null
);
if (tpResult.tpScroll.alertActive) {
  throw new Error('Test 22c Failed: Expected alertActive false when dead (free TP on respawn)');
}

// 22d: Player has Boots of Travel -> hasTp true, isTravelBoots true, alert suppressed
tpResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_tinker', alive: true } as any,
    map: { clock_time: 900, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: { teleport0: { name: 'item_travel_boots' } } as any,
  } as any,
  null
);
if (!tpResult.tpScroll.hasTp || !tpResult.tpScroll.isTravelBoots || tpResult.tpScroll.alertActive) {
  throw new Error('Test 22d Failed: Expected Boots of Travel to satisfy TP requirement');
}

// 22e: Player has TP scroll in backpack or inventory slot
tpResult = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    map: { clock_time: 300, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: {
      teleport0: { name: 'empty' },
      slot0: { name: 'item_tpscroll', charges: 2 },
    } as any,
  } as any,
  null
);
if (!tpResult.tpScroll.hasTp || tpResult.tpScroll.charges !== 2 || tpResult.tpScroll.alertActive) {
  throw new Error('Test 22e Failed: Expected TP scroll in main inventory slot to be detected');
}
console.log('[Test 22] ✓ Pillar 4c: Town Portal Scroll detection & alert logic passed');

// ==========================================
// TEST 23: Neutral Creep Items Advisor Engine & Integration
// ==========================================
import { neutralAdvisor, getHeroArchetype } from '../src/services/neutralAdvisor';

// 23a: Archetype mapping verification
const amArch = getHeroArchetype('npc_dota_hero_antimage');
if (amArch.archetype !== 'PhysicalCarryMelee') {
  throw new Error(`Test 23a Failed: Anti-Mage expected PhysicalCarryMelee, got ${amArch.archetype}`);
}

const cmArch = getHeroArchetype('npc_dota_hero_crystal_maiden');
if (cmArch.archetype !== 'SupportUtility') {
  throw new Error(`Test 23a Failed: Crystal Maiden expected SupportUtility, got ${cmArch.archetype}`);
}

const axeArch = getHeroArchetype('npc_dota_hero_axe');
if (axeArch.archetype !== 'TankInitiator') {
  throw new Error(`Test 23a Failed: Axe expected TankInitiator, got ${axeArch.archetype}`);
}

const invokerArch = getHeroArchetype('npc_dota_hero_invoker');
if (invokerArch.archetype !== 'SpellCaster') {
  throw new Error(`Test 23a Failed: Invoker expected SpellCaster, got ${invokerArch.archetype}`);
}

// 23b: Ranked recommendations verification
const amTier1 = neutralAdvisor.getRecommendations('antimage', 1);
if (!amTier1 || amTier1.length === 0) {
  throw new Error('Test 23b Failed: No Tier 1 recommendations for Anti-Mage');
}
const sTierItems = amTier1.filter((i) => i.tierRank === 'S');
if (sTierItems.length === 0) {
  throw new Error('Test 23b Failed: Expected at least 1 S-tier recommendation for Anti-Mage');
}
if (!sTierItems.some((i) => i.key === 'broom_handle' || i.key === 'duelist_gloves')) {
  throw new Error('Test 23b Failed: Expected Broom Handle or Duelist Gloves as S-tier for Anti-Mage');
}

// Verify item stats and rationales exist
const firstRec = amTier1[0];
if (!firstRec.displayName || !firstRec.statsSummary || !firstRec.reasonTh || !firstRec.reasonEn) {
  throw new Error('Test 23b Failed: Item recommendation missing required metadata fields');
}

// 23c: All 5 tiers recommendation query
const allTiers = neutralAdvisor.getAllTierRecommendations('crystal_maiden');
for (let t = 1; t <= 5; t++) {
  if (!allTiers[t] || allTiers[t].length === 0) {
    throw new Error(`Test 23c Failed: Missing Tier ${t} items for Crystal Maiden`);
  }
}

// 23d: TacticalCoach neutral slot integration
audioService.setVoiceLanguage('th-TH');
const coachWithNeutral = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    map: { clock_time: 450, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
    items: {
      neutral0: { name: 'empty' },
      teleport0: { name: 'item_tpscroll', charges: 1 },
    } as any,
  } as any,
  null
);

if (coachWithNeutral.neutralSlot.tierUnlocked !== 1) {
  throw new Error(`Test 23d Failed: Expected tierUnlocked 1, got ${coachWithNeutral.neutralSlot.tierUnlocked}`);
}
if (!coachWithNeutral.neutralSlot.alertActive) {
  throw new Error('Test 23d Failed: Expected alertActive true for empty neutral slot at 7:30');
}
if (!coachWithNeutral.neutralSlot.recommendations || coachWithNeutral.neutralSlot.recommendations.length === 0) {
  throw new Error('Test 23d Failed: Expected recommendations attached to neutralSlot');
}
if (!coachWithNeutral.neutralSlot.heroRole) {
  throw new Error('Test 23d Failed: Expected heroRole attached to neutralSlot');
}

// 23e: Audio phrase formatting with hero & top items
const thReminder = thaiPhrases.neutralItemMissing(1, 'Anti-Mage', 'Broom Handle หรือ Duelist Gloves');
if (!thReminder.includes('Anti-Mage') || !thReminder.includes('Broom Handle')) {
  throw new Error(`Test 23e Failed: Thai neutral reminder phrase missing hero or items: ${thReminder}`);
}

const enReminder = engPhrases.neutralItemMissing(1, 'Anti-Mage', 'Broom Handle or Duelist Gloves');
if (!enReminder.includes('Anti-Mage') || !enReminder.includes('Broom Handle')) {
  throw new Error(`Test 23e Failed: English neutral reminder phrase missing hero or items: ${enReminder}`);
}

console.log('[Test 23] ✓ Neutral Creep Items Advisor engine & integration passed');

// ==========================================
// TEST 24: Lane Assistant Support Role Detector
// ==========================================
import { isSupportHero } from '../src/services/neutralAdvisor';

if (!isSupportHero('npc_dota_hero_crystal_maiden') || !isSupportHero('crystal_maiden')) {
  throw new Error('Test 24 Failed: Crystal Maiden should be recognized as Support');
}
if (!isSupportHero('npc_dota_hero_lion') || !isSupportHero('witch_doctor') || !isSupportHero('dazzle')) {
  throw new Error('Test 24 Failed: Classic supports should be recognized as Support');
}
if (isSupportHero('npc_dota_hero_antimage') || isSupportHero('sniper') || isSupportHero('phantom_assassin')) {
  throw new Error('Test 24 Failed: Hard carries should not be recognized as Support');
}
console.log('[Test 24] ✓ Lane Assistant Support role detection passed');

// ==========================================
// TEST 25: Lane Assistant Creep Pull & Stack Alert Engine
// ==========================================
tacticalCoach.reset();
let pullSmallCount = 0;
let pullLargeCount = 0;
let stackCount = 0;

const originalPull = audioService.playCreepPullAlert.bind(audioService);
const originalStack = audioService.playJungleStackAlert.bind(audioService);

audioService.playCreepPullAlert = (isLargeCamp: boolean) => {
  if (isLargeCamp) pullLargeCount++;
  else pullSmallCount++;
};
audioService.playJungleStackAlert = () => {
  stackCount++;
};

// 25a: Minute 0 (< 60s) -> should NOT trigger alerts because neutrals haven't spawned yet
audioService.setLaneAssistantMode('auto');
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_crystal_maiden', alive: true } as any,
    map: { clock_time: 38, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (pullLargeCount !== 0) {
  throw new Error('Test 25a Failed: Pull alert should not trigger before 1:00 (first neutral spawn)');
}

// 25b: Minute 1:08 -> Small Camp Pull (:15)
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_crystal_maiden', alive: true } as any,
    map: { clock_time: 68, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (pullSmallCount !== 1) {
  throw new Error(`Test 25b Failed: Expected 1 small pull alert, got ${pullSmallCount}`);
}

// 25c: Minute 1:38 -> Large Camp Pull (:45)
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_crystal_maiden', alive: true } as any,
    map: { clock_time: 98, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (pullLargeCount !== 1) {
  throw new Error(`Test 25c Failed: Expected 1 large pull alert, got ${pullLargeCount}`);
}

// 25d: Minute 1:46 -> Jungle Stack (:53)
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_crystal_maiden', alive: true } as any,
    map: { clock_time: 106, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (stackCount !== 1) {
  throw new Error(`Test 25d Failed: Expected 1 stack alert, got ${stackCount}`);
}

// 25e: Hero is dead -> alerts should be suppressed
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_crystal_maiden', alive: false } as any,
    map: { clock_time: 128, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any, // 2:08
  } as any,
  null
);
if (pullSmallCount !== 1) {
  throw new Error('Test 25e Failed: Alerts should be suppressed while hero is dead');
}

// 25f: Auto mode with non-support hero (Anti-Mage) -> should NOT trigger
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    map: { clock_time: 128, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any, // 2:08
  } as any,
  null
);
if (pullSmallCount !== 1) {
  throw new Error('Test 25f Failed: Auto mode should not trigger pull alert for non-support hero');
}

// 25g: Always mode with Anti-Mage -> should trigger
audioService.setLaneAssistantMode('always');
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    map: { clock_time: 128, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any, // 2:08
  } as any,
  null
);
if (pullSmallCount !== 2) {
  throw new Error(`Test 25g Failed: Always mode should trigger pull alert for all heroes, got ${pullSmallCount}`);
}

// 25h: Post-laning (> 10:00 / 600s) -> should NOT trigger
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', alive: true } as any,
    map: { clock_time: 608, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any, // 10:08
  } as any,
  null
);
if (pullSmallCount !== 2) {
  throw new Error('Test 25h Failed: Alerts should stop after 10:00 (end of laning phase)');
}

// 25i: Verify voice phrases
if (
  PHRASES['th-TH'].creepPullSmall !== 'พูลครีป' ||
  PHRASES['th-TH'].creepPullLarge !== 'พูลครีปใหญ่' ||
  PHRASES['th-TH'].jungleStack !== 'สแต็กครีปป่า' ||
  PHRASES['en-US'].creepPullSmall !== 'Pull creeps' ||
  PHRASES['en-US'].creepPullLarge !== 'Pull large camp' ||
  PHRASES['en-US'].jungleStack !== 'Stack jungle camp'
) {
  throw new Error('Test 25i Failed: Pull & Stack audio phrases mismatched');
}

// Restore originals and reset mode
audioService.playCreepPullAlert = originalPull;
audioService.playJungleStackAlert = originalStack;
audioService.setLaneAssistantMode('auto');
console.log('[Test 25] ✓ Lane Assistant Creep Pull & Stack alert engine passed');

// Test 26: Adaptive Talent Tree Advisor Engine (Pillar 6)
import { talentAdvisor } from '../src/services/talentAdvisor';

// 26a: Anti-Mage against magic burst threat -> Recommend Left (+9 Strength) at level 10
const amMagicBurstTiers = talentAdvisor.getTalentRecommendations('npc_dota_hero_antimage', [{ threatType: 'magic_burst' } as any]);
if (!amMagicBurstTiers || amMagicBurstTiers.length !== 4) {
  throw new Error('Test 26a Failed: Expected 4 talent tiers for Anti-Mage');
}
const amTier10 = amMagicBurstTiers.find((t) => t.level === 10);
if (!amTier10 || amTier10.recommended !== 'left' || !amTier10.reasonEn.includes('magic') || !amTier10.reasonTh.includes('เลือด')) {
  throw new Error(`Test 26a Failed: Expected Left (+9 Strength) recommendation for AM against magic burst, got ${amTier10?.recommended}`);
}

// 26b: Anti-Mage with no threats -> Default to Right (+9 Attack Speed) at level 10
const amDefaultTiers = talentAdvisor.getTalentRecommendations('npc_dota_hero_antimage', []);
const amDefaultTier10 = amDefaultTiers.find((t) => t.level === 10);
if (!amDefaultTier10 || amDefaultTier10.recommended !== 'right') {
  throw new Error(`Test 26b Failed: Expected Right (+9 Attack Speed) default recommendation for AM, got ${amDefaultTier10?.recommended}`);
}

// 26c: Juggernaut against illusion threat -> Recommend Right (+150 Blade Fury DPS) at level 10
const juggIllusionTiers = talentAdvisor.getTalentRecommendations('npc_dota_hero_juggernaut', [{ threatType: 'illusions' } as any]);
const juggTier10 = juggIllusionTiers.find((t) => t.level === 10);
if (!juggTier10 || juggTier10.recommended !== 'right' || !juggTier10.reasonEn.includes('illusion')) {
  throw new Error(`Test 26c Failed: Expected Right (+150 Blade Fury DPS) for Juggernaut against illusions, got ${juggTier10?.recommended}`);
}

// 26d: Generic heuristic for uncurated hero (e.g. Pudge)
const pudgeTiers = talentAdvisor.getTalentRecommendations('npc_dota_hero_pudge', [{ threatType: 'magic_burst' } as any]);
if (!pudgeTiers || pudgeTiers.length !== 4) {
  throw new Error('Test 26d Failed: Expected 4 talent tiers generated for uncurated hero');
}
const pudgeTier10 = pudgeTiers.find((t) => t.level === 10);
if (!pudgeTier10 || pudgeTier10.recommended !== 'left') {
  throw new Error('Test 26d Failed: Fallback heuristic should recommend Left (survival) against magic burst');
}

// 26e: Bilingual phrase formatting
const enPhrase = PHRASES['en-US'].talentRecommendation(10, 'left', '+9 Strength', 'Bonus HP');
const thPhrase = PHRASES['th-TH'].talentRecommendation(10, 'ซ้าย', '+9 Strength', 'เพิ่มเลือด');
if (!enPhrase.includes('Level 10 reached') || !thPhrase.includes('เลเวล 10')) {
  throw new Error('Test 26e Failed: Talent recommendation speech phrases invalid');
}
console.log('[Test 26] ✓ Adaptive Talent Tree Advisor engine passed');

// Test 27: Talent Milestone Voice Announcement in Tactical Coach
tacticalCoach.reset();
audioService.setVoiceLanguage('en-US');
audioService.setTalentAlertsEnabled(true);

let talentAlertCalls: { level: number; pickSide: string; talentName: string; reason?: string }[] = [];
const originalTalentAlert = audioService.playTalentAlert.bind(audioService);
audioService.playTalentAlert = (level, pickSide, talentName, reason, _force) => {
  talentAlertCalls.push({ level, pickSide, talentName, reason });
};

// 27a: Hero level 9 -> no talent alert
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', level: 9, alive: true } as any,
    map: { clock_time: 600, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (talentAlertCalls.length !== 0) {
  throw new Error('Test 27a Failed: Talent alert should not trigger at level 9');
}

// 27b: Hero levels up to 10 -> triggers level 10 talent alert
const lvl10CoachState = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', level: 10, alive: true } as any,
    map: { clock_time: 610, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (talentAlertCalls.length !== 1 || talentAlertCalls[0].level !== 10) {
  throw new Error(`Test 27b Failed: Expected 1 alert for level 10, got ${talentAlertCalls.length}`);
}
if (!lvl10CoachState.talentAnalysis?.activeMilestoneAdvice || lvl10CoachState.talentAnalysis.activeMilestoneAdvice.level !== 10) {
  throw new Error('Test 27b Failed: activeMilestoneAdvice should be set to level 10');
}

// 27c: Next tick still at level 10 -> should NOT duplicate alert
tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', level: 10, alive: true } as any,
    map: { clock_time: 611, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (talentAlertCalls.length !== 1) {
  throw new Error('Test 27c Failed: Repeated tick at level 10 should not re-trigger voice alert');
}

// 27d: Hero reaches level 15 -> triggers level 15 talent alert
const lvl15CoachState = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', level: 15, alive: true } as any,
    map: { clock_time: 900, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (talentAlertCalls.length !== 2 || talentAlertCalls[1].level !== 15) {
  throw new Error(`Test 27d Failed: Expected level 15 alert, got ${talentAlertCalls.length}`);
}
if (lvl15CoachState.talentAnalysis?.activeMilestoneAdvice?.level !== 15) {
  throw new Error('Test 27d Failed: activeMilestoneAdvice should be set to level 15');
}

// Restore original
audioService.playTalentAlert = originalTalentAlert;
console.log('[Test 27] ✓ Talent milestone voice alert trigger and state engine passed');

// Reset language and position back for general safety
audioService.setVoiceLanguage('en-US');
audioService.setMinimapPosition('left');

// Test 28: 124+ Heroes Talent Coverage, Hybrid API & Cache Fallback
import rawDotaTalents from '../src/data/dotaTalents.json';
import { apiService } from '../src/services/apiService';

// 28a: Total hero coverage in bundled dataset
const heroKeys = Object.keys(rawDotaTalents);
if (heroKeys.length < 124) {
  throw new Error(`Test 28a Failed: Expected >= 124 heroes in dotaTalents.json, got ${heroKeys.length}`);
}
console.log(`[Test 28a] ✓ Total heroes covered in talent database: ${heroKeys.length} heroes`);

// 28b: Verified real talent attributes for diverse heroes
const sniperTiers = apiService.getHeroTalents('npc_dota_hero_sniper');
if (!sniperTiers || sniperTiers.length !== 4) {
  throw new Error('Test 28b Failed: Sniper talent tiers missing or incomplete');
}
const sniperLvl10 = sniperTiers.find((t) => t.level === 10);
if (!sniperLvl10?.right.en.includes('Headshot') && !sniperLvl10?.left.en.includes('Take Aim')) {
  throw new Error('Test 28b Failed: Sniper level 10 real talent names mismatch');
}

const invokerTiers = apiService.getHeroTalents('invoker');
if (!invokerTiers || invokerTiers.length !== 4) {
  throw new Error('Test 28b Failed: Invoker talent tiers missing or incomplete');
}
const invokerLvl10 = invokerTiers.find((t) => t.level === 10);
if (!invokerLvl10?.right.en.includes('Tornado') && !invokerLvl10?.left.en.includes('Ice Wall')) {
  throw new Error('Test 28b Failed: Invoker level 10 real talent names mismatch');
}

const pudgeTiersFromApi = apiService.getHeroTalents('pudge');
if (!pudgeTiersFromApi || pudgeTiersFromApi.length !== 4) {
  throw new Error('Test 28b Failed: Pudge talent tiers missing or incomplete');
}
const pudgeLvl10 = pudgeTiersFromApi.find((t) => t.level === 10);
if (!pudgeLvl10?.left.en.includes('Armor') && !pudgeLvl10?.right.en.includes('Rot')) {
  throw new Error('Test 28b Failed: Pudge level 10 real talent names mismatch');
}

// 28c: Dynamic threat evaluation on 124+ heroes dataset (e.g. Slark against Magic Burst)
const slarkMagicTiers = talentAdvisor.getTalentRecommendations('npc_dota_hero_slark', [{ threatType: 'magic_burst' } as any]);
if (!slarkMagicTiers || slarkMagicTiers.length !== 4) {
  throw new Error('Test 28c Failed: Expected 4 tiers for Slark');
}
const slarkLvl10 = slarkMagicTiers.find((t) => t.level === 10);
if (slarkLvl10 && !slarkLvl10.left.en && !slarkLvl10.right.en) {
  throw new Error('Test 28c Failed: Slark level 10 talents missing text');
}

console.log('[Test 28] ✓ 124+ Heroes Talent Coverage, Hybrid API & Cache Fallback passed');

// Test 29: Performance Optimization & Sub-Second Throttling Memoization
// 29a: Talent Advisor in-memory caching returns identical object reference on subsequent calls
const talentCall1 = talentAdvisor.getTalentRecommendations('npc_dota_hero_slark', [{ threatType: 'magic_burst' } as any]);
const talentCall2 = talentAdvisor.getTalentRecommendations('npc_dota_hero_slark', [{ threatType: 'magic_burst' } as any]);
if (talentCall1 !== talentCall2) {
  throw new Error('Test 29a Failed: Expected talentAdvisor to return cached memoized array reference');
}

// 29b: Tactical Coach sub-second caching returns identical object reference within same second
tacticalCoach.reset();
const coachCall1 = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', health_percent: 90, alive: true, level: 10 } as any,
    map: { clock_time: 300.1, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
const coachCall2 = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', health_percent: 90, alive: true, level: 10 } as any,
    map: { clock_time: 300.7, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (coachCall1 !== coachCall2) {
  throw new Error('Test 29b Failed: Expected tacticalCoach to return cached state on sub-second updates');
}

// 29c: Tactical Coach invalidates and computes fresh state when clock second advances
const coachCall3 = tacticalCoach.process(
  {
    hero: { name: 'npc_dota_hero_antimage', health_percent: 90, alive: true, level: 10 } as any,
    map: { clock_time: 301.0, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' } as any,
  } as any,
  null
);
if (coachCall1 === coachCall3) {
  throw new Error('Test 29c Failed: Expected tacticalCoach to compute new state when second changes');
}
console.log('[Test 29] ✓ Performance optimization: Talent & Tactical Coach sub-second caching passed');

// Test 30: Dynamic Skill Build & Level-up Advisor Engine
import rawSkillBuilds from '../src/data/dotaSkillBuilds.json';
import { skillAdvisor } from '../src/services/skillAdvisor';

// 30a: Verify 127 heroes covered in bundled dotaSkillBuilds.json
const skillHeroKeys = Object.keys(rawSkillBuilds);
if (skillHeroKeys.length < 127) {
  throw new Error(`Test 30a Failed: Expected 127 heroes in dotaSkillBuilds.json, got ${skillHeroKeys.length}`);
}
for (const key of ['antimage', 'axe', 'juggernaut', 'invoker', 'nevermore', 'crystal_maiden', 'pudge']) {
  const heroBuild = (rawSkillBuilds as any)[key];
  if (!heroBuild || heroBuild.abilities.length < 4 || heroBuild.progression.length !== 25) {
    throw new Error(`Test 30a Failed: Incomplete build data for hero ${key}`);
  }
}
console.log(`[Test 30a] ✓ 127 Heroes Skill Build coverage & progression integrity passed (${skillHeroKeys.length} heroes)`);

// 30b: Level 1 unspent point detection and standard Q recommendation
const lvl1Payload: any = {
  hero: { name: 'npc_dota_hero_antimage', level: 1, alive: true },
  abilities: {
    ability0: { name: 'antimage_mana_break', level: 0 },
    ability1: { name: 'antimage_blink', level: 0 },
    ability2: { name: 'antimage_counterspell', level: 0 },
    ability3: { name: 'antimage_mana_void', level: 0 },
  },
  map: { clock_time: 10, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' },
};
const lvl1Analysis = skillAdvisor.evaluateSkillBuild(lvl1Payload, []);
if (!lvl1Analysis || lvl1Analysis.unspentPoints !== 1) {
  throw new Error(`Test 30b Failed: Expected 1 unspent point at level 1, got ${lvl1Analysis?.unspentPoints}`);
}
if (lvl1Analysis.currentRecommendation?.slot !== 'Q' || lvl1Analysis.currentRecommendation?.skillName !== 'Mana Break') {
  throw new Error(`Test 30b Failed: Expected [Q] Mana Break recommendation, got [${lvl1Analysis.currentRecommendation?.slot}] ${lvl1Analysis.currentRecommendation?.skillName}`);
}
console.log('[Test 30b] ✓ Level 1 unspent point detection and Q recommendation passed');

// 30c: Situational threat override: Anti-Mage against magic_burst threat at Level 2
const lvl2MagicThreatPayload: any = {
  hero: { name: 'npc_dota_hero_antimage', level: 2, alive: true },
  abilities: {
    ability0: { name: 'antimage_mana_break', level: 1 },
    ability1: { name: 'antimage_blink', level: 0 },
    ability2: { name: 'antimage_counterspell', level: 0 },
    ability3: { name: 'antimage_mana_void', level: 0 },
  },
  map: { clock_time: 75, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' },
};
const lvl2MagicAnalysis = skillAdvisor.evaluateSkillBuild(lvl2MagicThreatPayload, [{ threatType: 'magic_burst' } as any]);
if (lvl2MagicAnalysis?.currentRecommendation?.slot !== 'E' || lvl2MagicAnalysis?.currentRecommendation?.skillName !== 'Counterspell') {
  throw new Error(`Test 30c Failed: Expected situational [E] Counterspell against magic burst, got [${lvl2MagicAnalysis?.currentRecommendation?.slot}]`);
}

// 30c-2: Normal Level 2 without magic threat recommends standard Blink (W)
const lvl2NormalAnalysis = skillAdvisor.evaluateSkillBuild(lvl2MagicThreatPayload, []);
if (lvl2NormalAnalysis?.currentRecommendation?.slot !== 'W' || lvl2NormalAnalysis?.currentRecommendation?.skillName !== 'Blink') {
  throw new Error(`Test 30c-2 Failed: Expected default [W] Blink recommendation without threat, got [${lvl2NormalAnalysis?.currentRecommendation?.slot}]`);
}
console.log('[Test 30c] ✓ Situational threat override (magic burst -> Counterspell) passed');

// 30d: Smart Auto-Dismissal: User levels up Counterspell in GSI -> unspentPoints becomes 0 and recommendation clears
const lvl2SkilledPayload: any = {
  hero: { name: 'npc_dota_hero_antimage', level: 2, alive: true },
  abilities: {
    ability0: { name: 'antimage_mana_break', level: 1 },
    ability1: { name: 'antimage_blink', level: 0 },
    ability2: { name: 'antimage_counterspell', level: 1 },
    ability3: { name: 'antimage_mana_void', level: 0 },
  },
  map: { clock_time: 80, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' },
};
const lvl2SkilledAnalysis = skillAdvisor.evaluateSkillBuild(lvl2SkilledPayload, [{ threatType: 'magic_burst' } as any]);
if (lvl2SkilledAnalysis?.unspentPoints !== 0 || lvl2SkilledAnalysis?.currentRecommendation !== null) {
  throw new Error('Test 30d Failed: Recommendation should automatically clear when point is spent in GSI');
}
console.log('[Test 30d] ✓ Smart Auto-Dismissal upon leveling up in GSI passed');

// 30e: Milestone Talent detection at Level 10
const lvl10TalentPayload: any = {
  hero: { name: 'npc_dota_hero_antimage', level: 10, alive: true },
  abilities: {
    ability0: { name: 'antimage_mana_break', level: 4 },
    ability1: { name: 'antimage_blink', level: 3 },
    ability2: { name: 'antimage_counterspell', level: 1 },
    ability3: { name: 'antimage_mana_void', level: 1 },
  },
  map: { clock_time: 600, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' },
};
const lvl10Analysis = skillAdvisor.evaluateSkillBuild(lvl10TalentPayload, []);
if (lvl10Analysis?.unspentPoints !== 1 || !lvl10Analysis?.currentRecommendation?.isTalent) {
  throw new Error(`Test 30e Failed: Expected Talent recommendation at level 10, got [${lvl10Analysis?.currentRecommendation?.slot}]`);
}
console.log('[Test 30e] ✓ Milestone Talent detection at Level 10 passed');

// 30f: Tactical Coach state integration & instant invalidation on skill up
tacticalCoach.reset();
const coachLvl10WithPoint = tacticalCoach.process(lvl10TalentPayload, null);
if (!coachLvl10WithPoint.skillBuildAnalysis?.currentRecommendation) {
  throw new Error('Test 30f Failed: Tactical Coach should contain skill build recommendation');
}

// User skills talent in GSI (special_bonus_hp_regen_3 reaches level 1)
const lvl10SpentPayload: any = {
  ...lvl10TalentPayload,
  abilities: {
    ...lvl10TalentPayload.abilities,
    ability6: { name: 'special_bonus_hp_regen_3', level: 1 },
  },
};
const coachLvl10PointSpent = tacticalCoach.process(lvl10SpentPayload, null);
if (coachLvl10PointSpent.skillBuildAnalysis?.currentRecommendation !== null) {
  throw new Error('Test 30f Failed: Tactical Coach should clear skill recommendation when talent is spent');
}
console.log('[Test 30f] ✓ Tactical Coach integration and instant ability-change cache invalidation passed');

// Test 31: Smart Ward Placement & Vision Timer Engine
import { visionEngine } from '../src/services/visionEngine';

console.log('\n--- Running Test 31: Smart Ward Placement & Vision Timer Engine ---');

// 31a: Tactical ward spot catalogue integrity
const allSpots = visionEngine.getAllSpots();
if (!allSpots || allSpots.length < 20) {
  throw new Error(`Test 31a Failed: Expected at least 20 ward spots, got ${allSpots?.length}`);
}
const hasObserver = allSpots.some((s) => s.type === 'observer');
const hasSentry = allSpots.some((s) => s.type === 'sentry_deward');
const hasTormentor = allSpots.some((s) => s.id.includes('tormentor'));
const hasRoshan = allSpots.some((s) => s.id.includes('roshan'));
if (!hasObserver || !hasSentry || !hasTormentor || !hasRoshan) {
  throw new Error('Test 31a Failed: Missing required tactical spot types (observer, sentry_deward, tormentor, roshan)');
}
console.log(`[Test 31a] ✓ Ward catalogue verified with ${allSpots.length} strategic spots across Observer & Sentry hotspots`);

// 31b: Automatic GSI Ward Detection and 360s countdown
visionEngine.reset();
const basePayload: any = {
  map: { clock_time: 120, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', matchid: '12345' },
  player: { team_name: 'radiant', wards_placed: 0 },
};

// Initial state: no wards placed yet
let vState = visionEngine.process(basePayload, 120);
if (vState.activeWards.length !== 0 || vState.nearestExpirySeconds !== null) {
  throw new Error('Test 31b Failed: Active wards should be empty initially');
}

// Player places first ward at 120s
const ward1Payload: any = {
  ...basePayload,
  player: { team_name: 'radiant', wards_placed: 1 },
};
vState = visionEngine.process(ward1Payload, 120);
if (vState.activeWards.length !== 1 || vState.nearestExpirySeconds !== 360) {
  throw new Error(`Test 31b Failed: Expected 1 active ward with 360s remaining, got ${vState.activeWards.length} wards and ${vState.nearestExpirySeconds}s`);
}
const ward1 = vState.activeWards[0];
if (ward1.expiresAtClockTime !== 480 || ward1.totalDurationSeconds !== 360) {
  throw new Error('Test 31b Failed: Incorrect ward expiry clock time calculation');
}

// 30 seconds pass (clock = 150s) and player places second ward
const ward2Payload: any = {
  map: { clock_time: 150, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', matchid: '12345' },
  player: { team_name: 'radiant', wards_placed: 2 },
};
vState = visionEngine.process(ward2Payload, 150);
if (vState.activeWards.length !== 2) {
  throw new Error(`Test 31b Failed: Expected 2 active wards, got ${vState.activeWards.length}`);
}
// Ward 1 has 330s left (480 - 150), Ward 2 has 360s left (150 + 360 - 150 = 360)
if (vState.nearestExpirySeconds !== 330) {
  throw new Error(`Test 31b Failed: Expected nearest expiry to be 330s, got ${vState.nearestExpirySeconds}`);
}
console.log('[Test 31b] ✓ Automatic GSI ward detection and multi-ward 360s countdown passed');

// 31c: Expiration cleanup and Voice Alert policy (fires alert once at remaining <= 0)
let audioExpiredAlertCalled = 0;
const originalPlayWardExpiredAlert = audioService.playWardExpiredAlert.bind(audioService);
audioService.playWardExpiredAlert = () => {
  audioExpiredAlertCalled++;
};

try {
  // Advance to 480s (ward 1 expires)
  const expirePayload1: any = {
    map: { clock_time: 480, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', matchid: '12345' },
    player: { team_name: 'radiant', wards_placed: 2 },
  };
  vState = visionEngine.process(expirePayload1, 480);
  if (audioExpiredAlertCalled !== 1) {
    throw new Error(`Test 31c Failed: Expected ward expiration audio alert called once, got ${audioExpiredAlertCalled}`);
  }
  // Ward 1 is pruned, Ward 2 remains (expires at 150 + 360 = 510, so 510 - 480 = 30s remaining)
  if (vState.activeWards.length !== 1 || vState.nearestExpirySeconds !== 30) {
    throw new Error(`Test 31c Failed: Ward 1 should be pruned, expected 1 remaining ward with 30s, got ${vState.activeWards.length} wards with ${vState.nearestExpirySeconds}s`);
  }

  // Advance clock slightly (485s) - should NOT repeat audio alert for ward 1
  visionEngine.process(
    { map: { clock_time: 485, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', matchid: '12345' }, player: { team_name: 'radiant', wards_placed: 2 } } as any,
    485
  );
  if (audioExpiredAlertCalled !== 1) {
    throw new Error(`Test 31c Failed: Audio alert should not repeat for already expired ward, count: ${audioExpiredAlertCalled}`);
  }

  // Advance clock to 510s - second ward expires and triggers alert #2
  vState = visionEngine.process(
    { map: { clock_time: 510, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS', matchid: '12345' }, player: { team_name: 'radiant', wards_placed: 2 } } as any,
    510
  );
  if (audioExpiredAlertCalled !== 2) {
    throw new Error(`Test 31c Failed: Second ward expiration should trigger second audio alert, count: ${audioExpiredAlertCalled}`);
  }
  if (vState.activeWards.length !== 0 || vState.nearestExpirySeconds !== null) {
    throw new Error('Test 31c Failed: All wards should be cleaned up after expiry');
  }
  console.log('[Test 31c] ✓ Ward expiration cleanup and non-spammy voice alert policy passed');
} finally {
  audioService.playWardExpiredAlert = originalPlayWardExpiredAlert;
}

// 31d: Objective and Team Adaptive Recommendations
// At minute 20 (1200s, Daytime), Tormentor and South Roshan pit should be heavily prioritized
const minute20Spots = visionEngine.getRecommendedSpots(1200, 'radiant', true);
const topSpotIds = minute20Spots.slice(0, 3).map((s) => s.id);
const hasTormentorOrRoshanInTop = topSpotIds.some((id) => id.includes('tormentor') || id.includes('roshan'));
if (!hasTormentorOrRoshanInTop) {
  throw new Error(`Test 31d Failed: Expected Tormentor or Roshan in top recommended spots at 20:00, got: ${topSpotIds.join(', ')}`);
}

// Dire team recommendations should include Dire-safe spots and exclude Radiant-only spots
const direSpots = visionEngine.getRecommendedSpots(300, 'dire', true);
if (direSpots.some((s) => s.team === 'radiant')) {
  throw new Error('Test 31d Failed: Dire recommendations should not contain Radiant-only spots');
}
console.log('[Test 31d] ✓ Objective-adaptive (Tormentor/Roshan) and team-filtering (Radiant/Dire) passed');

// 31e: Tactical Coach state integration and cache invalidation on ward placement
tacticalCoach.reset();
visionEngine.reset();
const coachWardBasePayload: any = {
  hero: { name: 'npc_dota_hero_crystal_maiden', alive: true, level: 5, health_percent: 100 },
  player: { team_name: 'radiant', wards_placed: 3 },
  map: { clock_time: 200, game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS' },
};
const coachWithWardState1 = tacticalCoach.process(coachWardBasePayload, null);
if (!coachWithWardState1.visionState) {
  throw new Error('Test 31e Failed: Tactical Coach should contain visionState');
}

// Instant cache invalidation when player places another ward (wards_placed 3 -> 4) within the exact same second
const coachWardPlacedPayload: any = {
  ...coachWardBasePayload,
  player: { team_name: 'radiant', wards_placed: 4 },
};
const coachWithWardState2 = tacticalCoach.process(coachWardPlacedPayload, null);
if (coachWithWardState1 === coachWithWardState2) {
  throw new Error('Test 31e Failed: Tactical Coach cache should instantly invalidate when wards_placed changes');
}
if (coachWithWardState2.visionState?.activeWards.length !== 1) {
  throw new Error(`Test 31e Failed: Expected 1 newly detected active ward, got ${coachWithWardState2.visionState?.activeWards.length}`);
}
console.log('[Test 31e] ✓ Tactical Coach integration and instant ward-placement cache invalidation passed');

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
