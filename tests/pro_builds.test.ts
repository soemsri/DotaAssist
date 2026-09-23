import assert from "node:assert";
import { apiService } from "../src/services/apiService";
import { getAllyPickClasses, getEnemyPickClasses } from "../src/services/draftService";
import { GSIDraft } from "../src/types/gsi";

console.log("--- RUNNING PRO PLAYER ITEM BUILDS & ALLY DRAFT TESTS ---");

// Test 1: Bundled pro builds loading & hero lookup variations
console.log("[Test 1] Bundled pro player builds lookup");
{
  const amBuild1 = apiService.getProItemBuildForHero("antimage");
  assert.ok(amBuild1, "Should find pro build for 'antimage'");
  assert.strictEqual(amBuild1.proPlayer, "Yatoro");
  assert.strictEqual(amBuild1.team, "Team Spirit");
  assert.strictEqual(amBuild1.role, "Hard Carry");

  // Lookup with npc_dota_hero_ prefix
  const amBuild2 = apiService.getProItemBuildForHero("npc_dota_hero_antimage");
  assert.ok(amBuild2, "Should find pro build for 'npc_dota_hero_antimage'");
  assert.strictEqual(amBuild2.proPlayer, "Yatoro");

  // Case-insensitive lookup
  const amBuild3 = apiService.getProItemBuildForHero("AntiMage");
  assert.ok(amBuild3, "Should find pro build with case insensitivity");

  // Test other heroes
  const axeBuild = apiService.getProItemBuildForHero("axe");
  assert.ok(axeBuild, "Should find pro build for 'axe'");
  assert.strictEqual(axeBuild.proPlayer, "Collapse");
  assert.strictEqual(axeBuild.team, "Team Spirit");

  const stormBuild = apiService.getProItemBuildForHero("npc_dota_hero_storm_spirit");
  assert.ok(stormBuild, "Should find pro build for 'storm_spirit'");
  assert.strictEqual(stormBuild.proPlayer, "bzm");

  console.log("  ✓ Pro builds hero lookups verified");
}

// Test 2: Item phase structure and item detail resolution
console.log("[Test 2] Item phases and item detail resolution (cost, display name)");
{
  const amBuild = apiService.getProItemBuildForHero("antimage")!;
  assert.ok(amBuild.starting.length > 0, "Must have starting items");
  assert.ok(amBuild.early.length > 0, "Must have early game items");
  assert.ok(amBuild.core.length > 0, "Must have core items");
  assert.ok(amBuild.luxury.length > 0, "Must have luxury items");
  assert.ok(amBuild.situational.length > 0, "Must have situational items");

  // Check resolved details
  for (const item of amBuild.core) {
    assert.ok(item.name, "Item must have internal name");
    assert.ok(item.displayName, "Item must have display name");
    assert.strictEqual(item.phase, "core");
    if (item.cost !== null) {
      assert.ok(typeof item.cost === "number" && item.cost > 0, "Item cost must be a positive number if available");
    }
  }

  // Check battlefury or manta in core for Anti-Mage
  const coreItemNames = amBuild.core.map((i) => i.name);
  assert.ok(
    coreItemNames.includes("bfury") || coreItemNames.includes("manta"),
    "Anti-Mage core should include bfury or manta"
  );

  console.log("  ✓ Item phase structure and costs verified");
}

// Test 3: Safe fallback for unknown or missing hero names
console.log("[Test 3] Null / unknown hero handling");
{
  assert.strictEqual(apiService.getProItemBuildForHero(""), null);
  assert.strictEqual(apiService.getProItemBuildForHero("non_existent_hero_xyz"), null);
  console.log("  ✓ Safe null handling verified");
}

// Test 4: Ally pick resolution during draft phase
console.log("[Test 4] Ally pick resolution from GSIDraft");
{
  const mockDraft: GSIDraft = {
    team2: {
      home_team: true,
      pick0_class: "npc_dota_hero_antimage",
      pick1_class: "npc_dota_hero_axe",
      pick2_class: "",
      pick3_class: "",
      pick4_class: "",
    },
    team3: {
      home_team: false,
      pick0_class: "npc_dota_hero_storm_spirit",
      pick1_class: "npc_dota_hero_lion",
      pick2_class: "npc_dota_hero_pudge",
      pick3_class: "",
      pick4_class: "",
    },
    match_id: "12345",
    draft_tag: 0,
  };

  // When player is Radiant (team2)
  const radiantAllies = getAllyPickClasses(mockDraft, "radiant");
  assert.deepStrictEqual(radiantAllies, ["npc_dota_hero_antimage", "npc_dota_hero_axe"]);

  const radiantEnemies = getEnemyPickClasses(mockDraft, "radiant");
  assert.deepStrictEqual(radiantEnemies, ["npc_dota_hero_storm_spirit", "npc_dota_hero_lion", "npc_dota_hero_pudge"]);

  // When player is Dire (team3)
  const direAllies = getAllyPickClasses(mockDraft, "dire");
  assert.deepStrictEqual(direAllies, ["npc_dota_hero_storm_spirit", "npc_dota_hero_lion", "npc_dota_hero_pudge"]);

  const direEnemies = getEnemyPickClasses(mockDraft, "dire");
  assert.deepStrictEqual(direEnemies, ["npc_dota_hero_antimage", "npc_dota_hero_axe"]);

  // When draft or player team is missing
  assert.deepStrictEqual(getAllyPickClasses(undefined, "radiant"), []);
  assert.deepStrictEqual(getAllyPickClasses(mockDraft, undefined), []);

  console.log("  ✓ Ally and enemy pick classes resolution verified");
}

console.log("--- ALL PRO PLAYER ITEM BUILDS & ALLY DRAFT TESTS PASSED! ---");
