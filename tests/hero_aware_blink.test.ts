import assert from 'node:assert/strict';
import {
  isBlinkDaggerHero,
  hasNativeBlinkOrMobility,
  hasEquippedBlink,
} from '../src/services/heroItemUtils';
import { tacticalCoach } from '../src/services/tacticalCoach';
import { makeFightPlan } from '../src/services/teamfightAdvisor';
import { apiService } from '../src/services/apiService';
import { GSIPayload } from '../src/types/gsi';

console.log('--- RUNNING HERO-AWARE BLINK DAGGER VALIDATION TESTS ---');

// [Test 1] Hero Item Utility classification
console.log('[Test 1] Hero Item Utility classification');
{
  // Native Blink or hyper-mobility heroes must NEVER be classified as Blink Dagger heroes
  assert.equal(hasNativeBlinkOrMobility('npc_dota_hero_antimage'), true);
  assert.equal(hasNativeBlinkOrMobility('queenofpain'), true);
  assert.equal(hasNativeBlinkOrMobility('storm_spirit'), true);
  assert.equal(hasNativeBlinkOrMobility('void_spirit'), true);
  assert.equal(hasNativeBlinkOrMobility('weaver'), true);

  assert.equal(isBlinkDaggerHero('npc_dota_hero_antimage'), false);
  assert.equal(isBlinkDaggerHero('queenofpain'), false);
  assert.equal(isBlinkDaggerHero('storm_spirit'), false);
  assert.equal(isBlinkDaggerHero('void_spirit'), false);

  // Non-blink heroes (carries, ranged, supports) must NEVER be classified as Blink Dagger heroes
  assert.equal(isBlinkDaggerHero('drow_ranger'), false);
  assert.equal(isBlinkDaggerHero('sniper'), false);
  assert.equal(isBlinkDaggerHero('medusa'), false);
  assert.equal(isBlinkDaggerHero('crystal_maiden'), false);
  assert.equal(isBlinkDaggerHero('bristleback'), false);
  assert.equal(isBlinkDaggerHero('viper'), false);
  assert.equal(isBlinkDaggerHero('witch_doctor'), false);

  // Legitimate Blink Dagger initiators and playmakers
  assert.equal(isBlinkDaggerHero('npc_dota_hero_axe'), true);
  assert.equal(isBlinkDaggerHero('slardar'), true);
  assert.equal(isBlinkDaggerHero('centaur'), true);
  assert.equal(isBlinkDaggerHero('earthshaker'), true);
  assert.equal(isBlinkDaggerHero('tidehunter'), true);
  assert.equal(isBlinkDaggerHero('magnataur'), true);
  assert.equal(isBlinkDaggerHero('enigma'), true);
  assert.equal(isBlinkDaggerHero('lion'), true);
  assert.equal(isBlinkDaggerHero('shadow_shaman'), true);
  assert.equal(isBlinkDaggerHero('puck'), true);
  assert.equal(isBlinkDaggerHero('tiny'), true);

  // Equipped Blink detection
  assert.equal(hasEquippedBlink(new Set(['item_power_treads', 'item_bottle'])), false);
  assert.equal(hasEquippedBlink(new Set(['item_blink'])), true);
  assert.equal(hasEquippedBlink(new Set(['item_overwhelming_blink'])), true);
  assert.equal(hasEquippedBlink(new Set(['item_swift_blink'])), true);
  assert.equal(hasEquippedBlink(new Set(['item_arcane_blink'])), true);

  console.log('  ✓ Hero classification and equipped blink detection verified');
}

// [Test 2] Tactical Coach: No Blink Dagger alerts for Anti-Mage, QoP, Drow, Sniper, CM
console.log('[Test 2] Tactical Coach: Suppresses Blink Dagger for heroes that do not build it');
{
  tacticalCoach.reset();

  const heroesToTest = [
    'npc_dota_hero_antimage',
    'npc_dota_hero_queenofpain',
    'npc_dota_hero_drow_ranger',
    'npc_dota_hero_sniper',
    'npc_dota_hero_crystal_maiden',
    'npc_dota_hero_viper',
    'npc_dota_hero_bristleback',
  ];

  for (const heroName of heroesToTest) {
    tacticalCoach.reset();
    const payload: GSIPayload = {
      map: {
        matchid: `test_no_blink_${heroName}`,
        game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
        clock_time: 600, // 10:00
      } as any,
      hero: {
        name: heroName,
        level: 8,
        health_percent: 100,
        alive: true,
      } as any,
      player: {
        gold: 1800, // Deficit to Blink (2250) is 450 <= 500g
      } as any,
      items: {
        slot0: { name: 'item_power_treads' },
      } as any,
    };

    const state = tacticalCoach.process(payload, null);
    assert.notEqual(
      state.powerSpikeAction?.itemName,
      'Blink Dagger',
      `Hero ${heroName} should NEVER receive Blink Dagger near-item caution`
    );
  }

  console.log('  ✓ Anti-Mage, QoP, Drow, Sniper, CM, Viper, Bristleback never receive Blink Dagger caution');
}

// [Test 3] Tactical Coach: Recommends Blink Dagger to Axe and respects already equipped state
console.log('[Test 3] Tactical Coach: Recommends Blink Dagger to Axe when unequipped, suppresses when owned');
{
  tacticalCoach.reset();

  // Case A: Axe unequipped, gold = 1800 (deficit 450g <= 500g)
  const axePayload: GSIPayload = {
    map: {
      matchid: 'test_axe_blink',
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      clock_time: 600,
    } as any,
    hero: {
      name: 'npc_dota_hero_axe',
      level: 8,
      health_percent: 100,
      alive: true,
    } as any,
    player: {
      gold: 1800,
    } as any,
    items: {
      slot0: { name: 'item_phase_boots' },
      slot1: { name: 'item_vanguard' },
    } as any,
  };

  const stateAxe = tacticalCoach.process(axePayload, null);
  assert.equal(stateAxe.powerSpikeAction?.state, 'near_item');
  assert.equal(stateAxe.powerSpikeAction?.itemName, 'Blink Dagger');
  assert.equal(stateAxe.powerSpikeAction?.deficit, 450);

  // Case B: Axe equips Blink Dagger, later at gold 1800 -> must NOT warn Blink Dagger again
  tacticalCoach.reset();
  const axeEquippedPayload: GSIPayload = {
    ...axePayload,
    items: {
      slot0: { name: 'item_phase_boots' },
      slot1: { name: 'item_vanguard' },
      slot2: { name: 'item_blink' },
    } as any,
  };

  const stateAxeEquipped = tacticalCoach.process(axeEquippedPayload, null);
  assert.notEqual(
    stateAxeEquipped.powerSpikeAction?.itemName,
    'Blink Dagger',
    'Axe with Blink already equipped should not receive Blink caution'
  );

  console.log('  ✓ Axe receives Blink Dagger caution when unequipped, and suppresses when equipped');
}

// [Test 4] Teamfight Advisor: Respects hero appropriateness for Blink Dagger
console.log('[Test 4] Teamfight Advisor: Initiator Blink filtering');
{
  const basePayload: GSIPayload = {
    map: {
      clock_time: 1850,
      matchid: 'test_tf_1',
      game_state: 'DOTA_GAMERULES_STATE_GAME_IN_PROGRESS',
      paused: false,
    } as any,
    hero: {
      name: 'npc_dota_hero_axe',
      alive: true,
      health_percent: 100,
      buyback_cost: 1000,
    } as any,
    player: { team_name: 'radiant', gold: 2000 } as any,
    items: {
      slot0: { name: 'item_blade_mail' },
    } as any,
    draft: {
      team2: { pick0_class: 'npc_dota_hero_axe' },
      team3: { pick0_class: 'npc_dota_hero_lion' },
    } as any,
  };

  // Axe with duty initiate -> has Blink Dagger
  const axePlan = makeFightPlan(basePayload, true, 'offlane', 'initiate', [], false);
  assert.ok(axePlan, 'Fight plan should be generated');
  assert.ok(
    axePlan.items.some((i) => i.name === 'Blink Dagger'),
    'Axe should have Blink Dagger recommended in initiate duty'
  );

  // Viper with duty initiate -> should NOT have Blink Dagger recommended
  const viperPayload: GSIPayload = {
    ...basePayload,
    hero: { ...basePayload.hero!, name: 'npc_dota_hero_viper' },
    draft: {
      team2: { pick0_class: 'npc_dota_hero_viper' },
      team3: { pick0_class: 'npc_dota_hero_lion' },
    } as any,
  };
  const viperPlan = makeFightPlan(viperPayload, true, 'offlane', 'initiate', [], false);
  assert.ok(viperPlan, 'Fight plan should be generated');
  assert.equal(
    viperPlan.items.some((i) => i.name === 'Blink Dagger'),
    false,
    'Viper should not have Blink Dagger recommended in teamfight plan'
  );

  // Anti-Mage with duty initiate -> should NOT have Blink Dagger recommended
  const amPayload: GSIPayload = {
    ...basePayload,
    hero: { ...basePayload.hero!, name: 'npc_dota_hero_antimage' },
    draft: {
      team2: { pick0_class: 'npc_dota_hero_antimage' },
      team3: { pick0_class: 'npc_dota_hero_lion' },
    } as any,
  };
  const amPlan = makeFightPlan(amPayload, true, 'carry', 'initiate', [], false);
  assert.ok(amPlan, 'Fight plan should be generated');
  assert.equal(
    amPlan.items.some((i) => i.name === 'Blink Dagger'),
    false,
    'Anti-Mage should never have Blink Dagger recommended'
  );

  console.log('  ✓ Teamfight Advisor recommends Blink only for genuine initiator heroes');
}

// [Test 5] Pro Item Builds: Core builds do not contain Blink on native mobility heroes
console.log('[Test 5] Pro Item Builds: Core builds do not contain Blink on native mobility heroes');
{
  const qopBuild = apiService.getProItemBuildForHero('queenofpain');
  assert.ok(qopBuild);
  assert.equal(
    qopBuild.core.some((i) => i.name === 'blink'),
    false,
    'Queen of Pain pro build core must not include Blink Dagger'
  );

  const stormBuild = apiService.getProItemBuildForHero('storm_spirit');
  assert.ok(stormBuild);
  assert.equal(
    stormBuild.core.some((i) => i.name === 'blink'),
    false,
    'Storm Spirit pro build core must not include Blink Dagger'
  );

  const amBuild = apiService.getProItemBuildForHero('antimage');
  assert.ok(amBuild);
  assert.equal(
    amBuild.core.some((i) => i.name === 'blink'),
    false,
    'Anti-Mage pro build core must not include Blink Dagger'
  );

  const drowBuild = apiService.getProItemBuildForHero('drow_ranger');
  assert.ok(drowBuild);
  assert.equal(
    drowBuild.core.some((i) => i.name === 'blink'),
    false,
    'Drow Ranger pro build core must not include Blink Dagger'
  );

  const axeBuild = apiService.getProItemBuildForHero('axe');
  assert.ok(axeBuild);
  assert.ok(
    axeBuild.core.some((i) => i.name === 'blink'),
    'Axe pro build core must include Blink Dagger'
  );

  console.log('  ✓ Pro Item Builds correctly exclude Blink on QoP/Storm/AM/Drow and include on Axe');
}

console.log('--- ALL HERO-AWARE BLINK DAGGER VALIDATION TESTS PASSED! ---');
