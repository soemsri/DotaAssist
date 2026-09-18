import heroesData from './dotaHeroes.json';

export interface HeroUltimateInfo {
  heroClass: string;
  heroName: string;
  abilityName: string;
  cooldowns: [number, number, number]; // Level 1, 2, 3 cooldown in seconds
  baseCooldown: number;
}

/**
 * Standard ultimate abilities and cooldowns for Dota 2 heroes.
 * Cooldowns represent [Level 1, Level 2, Level 3].
 */
export const HERO_ULTIMATES: Record<string, { abilityName: string; cooldowns: [number, number, number] }> = {
  // High-Impact Teamfight Ultimates
  npc_dota_hero_enigma: { abilityName: 'Black Hole', cooldowns: [200, 180, 160] },
  npc_dota_hero_faceless_void: { abilityName: 'Chronosphere', cooldowns: [160, 150, 140] },
  npc_dota_hero_tidehunter: { abilityName: 'Ravage', cooldowns: [150, 150, 150] },
  npc_dota_hero_silencer: { abilityName: 'Global Silence', cooldowns: [130, 130, 130] },
  npc_dota_hero_magnataur: { abilityName: 'Reverse Polarity', cooldowns: [120, 120, 120] },
  npc_dota_hero_warlock: { abilityName: 'Chaotic Offering', cooldowns: [170, 170, 170] },
  npc_dota_hero_mars: { abilityName: 'Arena of Blood', cooldowns: [90, 90, 90] },
  npc_dota_hero_treant: { abilityName: 'Overgrowth', cooldowns: [100, 100, 100] },
  npc_dota_hero_disruptor: { abilityName: 'Static Storm', cooldowns: [90, 80, 70] },
  npc_dota_hero_earthshaker: { abilityName: 'Echo Slam', cooldowns: [150, 130, 110] },
  npc_dota_hero_crystal_maiden: { abilityName: 'Freezing Field', cooldowns: [110, 100, 90] },
  npc_dota_hero_winter_wyvern: { abilityName: "Winter's Curse", cooldowns: [85, 80, 75] },
  npc_dota_hero_naga_siren: { abilityName: 'Song of the Siren', cooldowns: [180, 160, 140] },
  npc_dota_hero_phoenix: { abilityName: 'Supernova', cooldowns: [120, 120, 120] },
  npc_dota_hero_brewmaster: { abilityName: 'Primal Split', cooldowns: [120, 110, 100] },
  npc_dota_hero_sand_king: { abilityName: 'Epicenter', cooldowns: [120, 110, 100] },
  npc_dota_hero_lich: { abilityName: 'Chain Frost', cooldowns: [100, 80, 60] },
  npc_dota_hero_witch_doctor: { abilityName: 'Death Ward', cooldowns: [100, 90, 80] },
  npc_dota_hero_snapfire: { abilityName: 'Mortimer Kisses', cooldowns: [120, 110, 100] },
  npc_dota_hero_dawnbreaker: { abilityName: 'Solar Guardian', cooldowns: [120, 110, 100] },
  npc_dota_hero_elder_titan: { abilityName: 'Earth Splitter', cooldowns: [120, 110, 100] },
  npc_dota_hero_dark_seer: { abilityName: 'Wall of Replica', cooldowns: [100, 100, 100] },
  npc_dota_hero_undying: { abilityName: 'Flesh Golem', cooldowns: [125, 125, 125] },
  npc_dota_hero_pugna: { abilityName: 'Life Drain', cooldowns: [7, 7, 7] },
  npc_dota_hero_death_prophet: { abilityName: 'Exorcism', cooldowns: [150, 150, 150] },
  npc_dota_hero_skeleton_king: { abilityName: 'Reincarnation', cooldowns: [180, 140, 100] },
  npc_dota_hero_doom_bringer: { abilityName: 'Doom', cooldowns: [140, 130, 120] },
  npc_dota_hero_bane: { abilityName: "Fiend's Grip", cooldowns: [140, 130, 120] },
  npc_dota_hero_batrider: { abilityName: 'Flaming Lasso', cooldowns: [120, 110, 100] },
  npc_dota_hero_beastmaster: { abilityName: 'Primal Roar', cooldowns: [100, 80, 60] },
  npc_dota_hero_bloodseeker: { abilityName: 'Rupture', cooldowns: [70, 70, 70] },
  npc_dota_hero_bounty_hunter: { abilityName: 'Track', cooldowns: [4, 4, 4] },
  npc_dota_hero_centaur: { abilityName: 'Stampede', cooldowns: [100, 100, 100] },
  npc_dota_hero_chaos_knight: { abilityName: 'Phantasm', cooldowns: [110, 110, 110] },
  npc_dota_hero_chen: { abilityName: 'Hand of God', cooldowns: [150, 140, 130] },
  npc_dota_hero_clinkz: { abilityName: 'Death Pact', cooldowns: [60, 50, 40] },
  npc_dota_hero_clockwerk: { abilityName: 'Hookshot', cooldowns: [60, 45, 30] },
  npc_dota_hero_dark_willow: { abilityName: 'Bedlam / Terrorize', cooldowns: [100, 90, 80] },
  npc_dota_hero_dazzle: { abilityName: 'Bad Juju', cooldowns: [15, 15, 15] },
  npc_dota_hero_dragon_knight: { abilityName: 'Elder Dragon Form', cooldowns: [100, 100, 100] },
  npc_dota_hero_drow_ranger: { abilityName: 'Marksmanship', cooldowns: [0, 0, 0] },
  npc_dota_hero_earth_spirit: { abilityName: 'Magnetize', cooldowns: [100, 90, 80] },
  npc_dota_hero_ember_spirit: { abilityName: 'Fire Remnant', cooldowns: [30, 30, 30] },
  npc_dota_hero_enchantress: { abilityName: 'Little Friends', cooldowns: [20, 15, 10] },
  npc_dota_hero_grimstroke: { abilityName: 'Soulbind', cooldowns: [100, 80, 60] },
  npc_dota_hero_gyrocopter: { abilityName: 'Call Down', cooldowns: [90, 75, 60] },
  npc_dota_hero_hoodwink: { abilityName: 'Sharpshooter', cooldowns: [45, 45, 45] },
  npc_dota_hero_huskar: { abilityName: 'Life Break', cooldowns: [16, 14, 12] },
  npc_dota_hero_invoker: { abilityName: 'Cataclysm', cooldowns: [40, 30, 20] },
  npc_dota_hero_jakiro: { abilityName: 'Macropyre', cooldowns: [80, 70, 60] },
  npc_dota_hero_juggernaut: { abilityName: 'Omnislash', cooldowns: [130, 130, 130] },
  npc_dota_hero_keeper_of_the_light: { abilityName: 'Spirit Form', cooldowns: [85, 85, 85] },
  npc_dota_hero_kunkka: { abilityName: 'Ghostship', cooldowns: [80, 70, 60] },
  npc_dota_hero_legion_commander: { abilityName: 'Duel', cooldowns: [50, 50, 50] },
  npc_dota_hero_leshrac: { abilityName: 'Pulse Nova', cooldowns: [1, 1, 1] },
  npc_dota_hero_life_stealer: { abilityName: 'Infest', cooldowns: [80, 65, 50] },
  npc_dota_hero_lina: { abilityName: 'Laguna Blade', cooldowns: [70, 60, 50] },
  npc_dota_hero_lion: { abilityName: 'Finger of Death', cooldowns: [140, 110, 80] },
  npc_dota_hero_lone_druid: { abilityName: 'True Form', cooldowns: [100, 100, 100] },
  npc_dota_hero_luna: { abilityName: 'Eclipse', cooldowns: [140, 140, 140] },
  npc_dota_hero_lycan: { abilityName: 'Shapeshift', cooldowns: [125, 110, 95] },
  npc_dota_hero_marci: { abilityName: 'Unleash', cooldowns: [100, 80, 60] },
  npc_dota_hero_medusa: { abilityName: 'Stone Gaze', cooldowns: [90, 90, 90] },
  npc_dota_hero_meepo: { abilityName: 'Divided We Stand', cooldowns: [0, 0, 0] },
  npc_dota_hero_mirana: { abilityName: 'Moonlight Shadow', cooldowns: [140, 120, 100] },
  npc_dota_hero_monkey_king: { abilityName: "Wukong's Command", cooldowns: [120, 110, 100] },
  npc_dota_hero_morphling: { abilityName: 'Morph', cooldowns: [140, 100, 60] },
  npc_dota_hero_muerta: { abilityName: 'Pierce the Veil', cooldowns: [75, 60, 45] },
  npc_dota_hero_necrolyte: { abilityName: "Reaper's Scythe", cooldowns: [120, 120, 120] },
  npc_dota_hero_nevermore: { abilityName: 'Requiem of Souls', cooldowns: [120, 110, 100] },
  npc_dota_hero_night_stalker: { abilityName: 'Dark Ascension', cooldowns: [140, 130, 120] },
  npc_dota_hero_nyx_assassin: { abilityName: 'Vendetta', cooldowns: [90, 75, 60] },
  npc_dota_hero_obsidian_destroyer: { abilityName: "Sanity's Eclipse", cooldowns: [160, 145, 130] },
  npc_dota_hero_ogre_magi: { abilityName: 'Multicast', cooldowns: [0, 0, 0] },
  npc_dota_hero_omniknight: { abilityName: 'Guardian Angel', cooldowns: [140, 120, 100] },
  npc_dota_hero_oracle: { abilityName: 'False Promise', cooldowns: [110, 85, 60] },
  npc_dota_hero_pangolier: { abilityName: 'Rolling Thunder', cooldowns: [80, 75, 70] },
  npc_dota_hero_phantom_assassin: { abilityName: 'Coup de Grace', cooldowns: [0, 0, 0] },
  npc_dota_hero_phantom_lancer: { abilityName: 'Juxtapose', cooldowns: [0, 0, 0] },
  npc_dota_hero_primal_beast: { abilityName: 'Pulverize', cooldowns: [40, 36, 32] },
  npc_dota_hero_puck: { abilityName: 'Dream Coil', cooldowns: [75, 70, 65] },
  npc_dota_hero_pudge: { abilityName: 'Dismember', cooldowns: [30, 25, 20] },
  npc_dota_hero_queenofpain: { abilityName: 'Sonic Wave', cooldowns: [125, 125, 125] },
  npc_dota_hero_razor: { abilityName: 'Eye of the Storm', cooldowns: [80, 70, 60] },
  npc_dota_hero_riki: { abilityName: 'Tricks of the Trade', cooldowns: [18, 16, 14] },
  npc_dota_hero_ringmaster: { abilityName: 'Wheel of Wonder', cooldowns: [90, 80, 70] },
  npc_dota_hero_rubick: { abilityName: 'Spell Steal', cooldowns: [20, 12, 4] },
  npc_dota_hero_shadow_demon: { abilityName: 'Demonic Purge', cooldowns: [60, 60, 60] },
  npc_dota_hero_shadow_shaman: { abilityName: 'Mass Serpent Ward', cooldowns: [130, 120, 110] },
  npc_dota_hero_shredder: { abilityName: 'Chakram', cooldowns: [8, 8, 8] },
  npc_dota_hero_skywrath_mage: { abilityName: 'Mystic Flare', cooldowns: [60, 40, 20] },
  npc_dota_hero_slardar: { abilityName: 'Corrosive Haze', cooldowns: [5, 5, 5] },
  npc_dota_hero_slark: { abilityName: 'Shadow Dance', cooldowns: [60, 50, 40] },
  npc_dota_hero_sniper: { abilityName: 'Assassinate', cooldowns: [20, 15, 10] },
  npc_dota_hero_spectre: { abilityName: 'Shadow Step', cooldowns: [60, 50, 40] },
  npc_dota_hero_spirit_breaker: { abilityName: 'Nether Strike', cooldowns: [90, 70, 50] },
  npc_dota_hero_storm_spirit: { abilityName: 'Ball Lightning', cooldowns: [0, 0, 0] },
  npc_dota_hero_sven: { abilityName: "God's Strength", cooldowns: [110, 110, 110] },
  npc_dota_hero_techies: { abilityName: 'Proximity Mines', cooldowns: [45, 40, 35] },
  npc_dota_hero_terrorblade: { abilityName: 'Sunder', cooldowns: [120, 80, 40] },
  npc_dota_hero_tinker: { abilityName: 'Rearm', cooldowns: [8, 7, 6] },
  npc_dota_hero_tiny: { abilityName: 'Grow', cooldowns: [0, 0, 0] },
  npc_dota_hero_troll_warlord: { abilityName: 'Battle Trance', cooldowns: [90, 80, 70] },
  npc_dota_hero_tusk: { abilityName: 'Walrus PUNCH!', cooldowns: [20, 15, 10] },
  npc_dota_hero_abyssal_underlord: { abilityName: "Fiend's Gate", cooldowns: [110, 100, 90] },
  npc_dota_hero_ursa: { abilityName: 'Enrage', cooldowns: [70, 50, 30] },
  npc_dota_hero_vengefulspirit: { abilityName: 'Nether Swap', cooldowns: [50, 40, 30] },
  npc_dota_hero_venomancer: { abilityName: 'Noxious Plague', cooldowns: [120, 100, 80] },
  npc_dota_hero_viper: { abilityName: 'Viper Strike', cooldowns: [50, 40, 30] },
  npc_dota_hero_visage: { abilityName: 'Summon Familiars', cooldowns: [130, 130, 130] },
  npc_dota_hero_void_spirit: { abilityName: 'Astral Step', cooldowns: [30, 25, 20] },
  npc_dota_hero_weaver: { abilityName: 'Time Lapse', cooldowns: [70, 55, 40] },
  npc_dota_hero_windrunner: { abilityName: 'Focus Fire', cooldowns: [70, 50, 30] },
  npc_dota_hero_zuus: { abilityName: "Thundergod's Wrath", cooldowns: [120, 110, 100] },
  npc_dota_hero_axe: { abilityName: 'Culling Blade', cooldowns: [75, 65, 55] },
  npc_dota_hero_antimage: { abilityName: 'Mana Void', cooldowns: [70, 70, 70] },
  npc_dota_hero_kez: { abilityName: 'Raptor Dance', cooldowns: [90, 75, 60] },
  npc_dota_hero_abaddon: { abilityName: 'Borrowed Time', cooldowns: [70, 60, 50] },
  npc_dota_hero_alchemist: { abilityName: 'Chemical Rage', cooldowns: [60, 60, 60] },
  npc_dota_hero_ancient_apparition: { abilityName: 'Ice Blast', cooldowns: [60, 50, 40] },
  npc_dota_hero_arc_warden: { abilityName: 'Tempest Double', cooldowns: [70, 60, 50] },
  npc_dota_hero_bristleback: { abilityName: 'Warpath', cooldowns: [0, 0, 0] },
  npc_dota_hero_broodmother: { abilityName: 'Spin Web', cooldowns: [0, 0, 0] },
};

/**
 * Normalizes a Dota 2 hero class or name and returns ultimate details.
 */
export function getHeroUltimate(heroClassOrName: string): HeroUltimateInfo {
  const normalizedClass = heroClassOrName.startsWith('npc_dota_hero_')
    ? heroClassOrName
    : `npc_dota_hero_${heroClassOrName.toLowerCase().replace(/[\s-]/g, '_')}`;

  const heroRecord = heroesData.find(
    (h) => h.name === normalizedClass || h.localized_name.toLowerCase() === heroClassOrName.toLowerCase(),
  );

  const heroName = heroRecord?.localized_name || heroClassOrName.replace(/^npc_dota_hero_/, '').replace(/_/g, ' ');
  const lookup = HERO_ULTIMATES[normalizedClass] || HERO_ULTIMATES[heroRecord?.name || ''];

  if (lookup) {
    return {
      heroClass: heroRecord?.name || normalizedClass,
      heroName,
      abilityName: lookup.abilityName,
      cooldowns: lookup.cooldowns,
      baseCooldown: lookup.cooldowns[0] || 100,
    };
  }

  // Fallback for custom or unlisted heroes
  return {
    heroClass: normalizedClass,
    heroName,
    abilityName: 'Ultimate',
    cooldowns: [120, 100, 80],
    baseCooldown: 100,
  };
}
